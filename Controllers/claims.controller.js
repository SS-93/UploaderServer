const express = require("express");
const { ObjectId } = require('mongodb');
const multer = require('multer');
const { uploadFile, getFileStream, getSignedUrl } = require('../S3');
const Claim = require('../Models/claims.model');
const {Upload} = require('../Models/upload.model');

const router = express.Router();

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const errorResponse = (res, err) => {
    res.status(500).json({ Error: err.message });
};

// Upload a single file to S3 and link it to a claim
//! V1
router.post('/claims/:claimId/documents', upload.single('document'), async (req, res) => {
    const file = req.file;
    const { claimId } = req.params;
    const { fileName, category } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'File is Missing' });
    }

    try {
        const result = await uploadFile(file);
        const claim = await Claim.findById(claimId);

        const newDocument = {
            fileName: fileName || file.originalname,
            fileUrl: result.Location,
            category: category || 'Uncategorized'
        };

        claim.documents.push(newDocument);
        await claim.save();

        const newUpload = new Upload({
            filename: result.Key,
            originalName: file.originalname,
            fileUrl: result.Location,
            mimetype: file.mimetype,
            claimId: claimId,
        });
        await newUpload.save();

        res.json(newDocument);
    } catch (err) {
        console.error('Error uploading to S3', err);
        res.status(500).json({ error: 'Failed to upload to S3' });
    }
});

// Create a new claim
router.post('/claims', async (req, res) => {
    try {
        const claimFile = {
            claimnumber: req.body.claimnumber,
            name: req.body.name,
            date: req.body.date,
            adjuster: req.body.adjuster,
        };

        const claim = new Claim(claimFile);
        const newClaim = await claim.save();

        res.status(200).json({
            message: 'New Claim Filed!',
            order: newClaim,
        });
    } catch (err) {
        errorResponse(res, err);
    }
});

// Get all claims
router.get('/list', async (req, res) => {
    try {
        const getAllClaims = await Claim.find();
        getAllClaims.length > 0 ?
            res.status(200).json({ getAllClaims }) :
            res.status(404).json({ message: "No Claims Found" });
    } catch (err) {
        errorResponse(res, err);
    }
});

// Get claim by ID
router.get('/find/:id', async (req, res) => {
    try {
        const objectId = new ObjectId(req.params.id);
        const singleClaim = await Claim.findOne({ _id: objectId });

        if (!singleClaim) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        res.status(200).json({ found: singleClaim });
    } catch (err) {
        res.status(400).json({ error: 'Invalid ID format' });
    }
});

// Get documents of a claim by claim ID
router.get('/claims/:claimId/documents', async (req, res) => {
    try {
        const { claimId } = req.params;
        const claim = await Claim.findById(claimId).populate('documents');
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }
        res.status(200).json(claim.documents);
    } catch (err) {
        errorResponse(res, err);
    }
});

// Get file stream from S3
router.get('/documents/:key', (req, res) => {
    const key = req.params.key;
    try {
        const readStream = getFileStream(key);
        res.setHeader('Content-Disposition', `attachment; filename="${key}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        readStream.pipe(res);
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).json({ error: 'Failed to fetch file' });
    }
});

// Update document details (name, category)
router.put('/claims/:claimId/documents/:documentId', async (req, res) => {
    const { claimId, documentId } = req.params;
    const { fileName, category } = req.body;

    try {
        // Find the claim by ID
        const claim = await Claim.findById(claimId);
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        // Find the document within the claim's documents array
        const document = claim.documents.id(documentId);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Update the document fields
        if (fileName) document.fileName = fileName;
        if (category) document.category = category;

        // Save the updated claim
        await claim.save();

        res.status(200).json({ message: 'Document updated successfully', document });
    } catch (err) {
        console.error('Error updating document:', err);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

//!V1

// Update multiple document details (name, category)
router.put('/claims/:claimId/documents', async (req, res) => {
    const { claimId } = req.params;
    const updates = req.body; // Assuming this is an array of document updates

    try {
        const claim = await Claim.findById(claimId);
        if (!claim) {
            return res.status(404).json({ message: 'Claim not found' });
        }

        // Iterate over each update and apply it to the correct document
        updates.forEach(update => {
            const document = claim.documents.id(update._id);
            if (document) {
                if (update.fileName) document.fileName = update.fileName;
                if (update.category) document.category = update.category;
                // Apply other updates as needed
            }
        });

        // Save the updated claim with the modified documents
        await claim.save();

        res.status(200).json({ message: 'Documents updated successfully' });
    } catch (err) {
        console.error('Error updating documents:', err);
        res.status(500).json({ error: 'Failed to update documents' });
    }
});

// Delete a document by its ID
router.delete('/claims/:claimId/documents/:documentId', async (req, res) => {
    const { claimId, documentId } = req.params;

    try {
        // Use MongoDB's $pull operator to remove the document by its ID
        const result = await Claim.updateOne(
            { _id: claimId },
            { $pull: { documents: { _id: documentId } } }
        );

        if (result.nModified === 0) {
            return res.status(404).json({ message: 'Document or Claim not found' });
        }

        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});



// Get signed URL for a file
router.get('/documents/:key/signed-url', async (req, res) => {
    const key = req.params.key;
    try {
        const url = await getSignedUrl(key);
        res.status(200).json({ url });
    } catch (error) {
        res.status500.json({ error: 'Failed to get signed URL' });
    }
});

module.exports = router;

