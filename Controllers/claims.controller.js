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

const generateUniqueOcrId = async () => {
  let isUnique = false;
  let OcrId;
  
  while (!isUnique) {
    OcrId = Math.floor(1000 + Math.random() * 9000);
    const existingDocument = await Claim.findOne({ OcrId });
    if (!existingDocument) {
      isUnique = true;
    }
  }
  return OcrId;
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

// Add this new route handler for bulk upload
router.post('/claims/:claimId/documents/bulk-upload', upload.array('documents'), async (req, res) => {
    const { claimId } = req.params;
    const files = req.files;
    const fileNames = req.body.fileNames.split(',');
    const categories = req.body.categories.split(',');

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const claim = await Claim.findById(claimId);
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        const uploadPromises = files.map(async (file, index) => {
            const result = await uploadFile(file);
            const OcrId = await generateUniqueOcrId(); // Generate unique OcrId
            return {
                fileName: fileNames[index] || file.originalname,
                fileUrl: result.Location,
                category: categories[index] || 'Uncategorized',
                mimetype: file.mimetype,
                OcrId: OcrId // Add the OcrId to the document
            };
        });

        const uploadedDocuments = await Promise.all(uploadPromises);

        claim.documents.push(...uploadedDocuments);
        await claim.save();

        // Create Upload documents
        const uploadDocuments = uploadedDocuments.map(doc => ({
            fileName: doc.fileName,
            originalName: doc.fileName,
            fileUrl: doc.fileUrl,
            mimetype: doc.mimetype,
            claimId: claimId,
            OcrId: doc.OcrId
        }));

        await Upload.insertMany(uploadDocuments);

        res.status(200).json({ message: 'Bulk upload successful', documents: uploadedDocuments });
    } catch (err) {
        console.error('Error during bulk upload:', err);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});

// ... rest of your existing code

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

// fetch a document's ocrId

router.get('/claims/:claimId/documents/:documentId/ocrId', async (req, res) => {
    const { claimId, documentId } = req.params;
  
    try {
      const claim = await Claim.findById(claimId);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }
  
      const document = claim.documents.id(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
  
      res.json({ OcrId: document.OcrId });
    } catch (err) {
      console.error('Error fetching OcrId:', err);
      res.status(500).json({ error: 'Failed to fetch OcrId' });
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

// Save OCR text for a document
router.put('/ocr-text/:OcrId', async (req, res) => {
    const { OcrId } = req.params;
    const { text } = req.body;
  
    try {
      // Find the claim containing the document with the given OcrId
      const claim = await Claim.findOne({ 'documents.OcrId': OcrId });
  
      if (!claim) {
        return res.status(404).json({ error: 'Document not found' });
      }
  
      // Find the specific document within the claim
      const document = claim.documents.find(doc => doc.OcrId == OcrId);
  
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
  
      // Update the textContent of the document
      document.textContent = text;
  
      // Save the updated claim
      await claim.save();
  
      res.status(200).json({ message: 'OCR text saved successfully' });
    } catch (err) {
      console.error('Error saving OCR text:', err);
      res.status(500).json({ error: 'Failed to save OCR text' });
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

// Add this new route for the query matrix
router.get('/matrix/claims', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [claims, totalCount] = await Promise.all([
            Claim.find()
                .select('claimnumber name date adjuster documents')
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Claim.countDocuments()
        ]);

        const formattedClaims = claims.map(claim => ({
            _id: claim._id,
            claimnumber: claim.claimnumber,
            name: claim.name,
            date: claim.date,
            adjuster: claim.adjuster,
            documentCount: claim.documents?.length || 0
        }));

        res.status(200).json({
            claims: formattedClaims,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalItems: totalCount,
                itemsPerPage: limit
            }
        });
    } catch (err) {
        console.error('Matrix claims fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch claims for matrix' });
    }
});

module.exports = router;