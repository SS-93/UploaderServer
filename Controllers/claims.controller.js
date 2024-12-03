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
        const OcrId = await generateUniqueOcrId(); // Generate OcrId here

        const newDocument = {
            fileName: fileName || file.originalname,
            fileUrl: result.Location,
            category: category || 'Uncategorized',
            OcrId: OcrId, // Add OcrId to document
            textContent: '' // Initialize empty text content
        };

        claim.documents.push(newDocument);
        await claim.save();

        const newUpload = new Upload({
            filename: result.Key,
            originalName: file.originalname,
            fileUrl: result.Location,
            mimetype: file.mimetype,
            claimId: claimId,
            OcrId: OcrId // Add OcrId to upload record
        });
        await newUpload.save();

        // Return the OcrId in the response
        res.json({
            ...newDocument,
            OcrId: OcrId
        });
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

// Add bulk upload route
router.post('/claims/:claimId/documents/bulk', upload.array('documents'), async (req, res) => {
  const { claimId } = req.params;
  const files = req.files;
  
  // Split using | as delimiter instead of comma
  const fileNames = (req.body.fileNames || '').split('|');
  const categories = (req.body.categories || '').split('|');

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  try {
    // Find existing claim first
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const uploadedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file);
      const OcrId = await generateUniqueOcrId();

      // Ensure we have a valid fileName
      const fileName = fileNames[i] || file.originalname;
      if (!fileName) {
        throw new Error(`Missing filename for file at index ${i}`);
      }

      const newDocument = {
        fileName: fileName,
        fileUrl: result.Location,
        category: categories[i] || 'Uncategorized',
        OcrId: OcrId,
        textContent: ''
      };

      // Create Upload record first
      const newUpload = new Upload({
        filename: result.Key,
        originalName: fileName, // Use the same fileName
        fileUrl: result.Location,
        mimetype: file.mimetype,
        claimId: claimId,
        OcrId: OcrId
      });
      await newUpload.save();

      uploadedDocs.push(newDocument);
    }

    // Update claim with all new documents at once
    const updatedClaim = await Claim.findByIdAndUpdate(
      claimId,
      { $push: { documents: { $each: uploadedDocs } } },
      { new: true, runValidators: false }
    );

    res.json({
      message: 'Bulk upload successful',
      documents: uploadedDocs
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: err.message || 'Bulk upload failed' });
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
            phoneNumber: req.body.phoneNumber,
            employerName: req.body.employerName,
            physicianName: req.body.physicianName,
            injuryDescription: req.body.injuryDescription
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

// Update OCR text route
router.put('/ocr-text/:OcrId', async (req, res) => {
  const { OcrId } = req.params;
  const { text } = req.body;

  if (!OcrId) {
    return res.status(400).json({ error: 'OcrId is required' });
  }

  try {
    // Find the claim containing the document with the given OcrId
    const claim = await Claim.findOne({ 'documents.OcrId': parseInt(OcrId) });
    
    if (!claim) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update only the textContent of the specific document
    const result = await Claim.findOneAndUpdate(
      { 'documents.OcrId': parseInt(OcrId) },
      { $set: { 'documents.$.textContent': text } },
      { 
        new: true,
        runValidators: false // Disable validation since we're only updating document text
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Failed to update document text' });
    }

    // Find the updated document
    const updatedDoc = result.documents.find(doc => doc.OcrId === parseInt(OcrId));

    res.status(200).json({
      message: 'OCR text saved successfully',
      document: updatedDoc
    });

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

// Enhanced search endpoint
router.get('/search', async (req, res) => {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;
  
      // Parse the search query to check for operators
      const searchTerms = query.toLowerCase();
      let searchCriteria = {};
      
      if (searchTerms.includes('doc:')) {
        // Search in document content and entities
        const docQuery = searchTerms.split('doc:')[1].split(' ')[0];
        searchCriteria = {
          $or: [
            { 'documents.textContent': { $regex: docQuery, $options: 'i' } },
            { 'documents.entities.potentialClaimantNames': { $regex: docQuery, $options: 'i' } },
            { 'documents.entities.potentialEmployerNames': { $regex: docQuery, $options: 'i' } },
            { 'documents.entities.potentialInsurerNames': { $regex: docQuery, $options: 'i' } },
            { 'documents.entities.potentialMedicalProviderNames': { $regex: docQuery, $options: 'i' } },
            { 'documents.entities.potentialPhysicianNames': { $regex: docQuery, $options: 'i' } },
            { 'documents.entities.potentialInjuryDescriptions': { $regex: docQuery, $options: 'i' } }
          ]
        };
      } else if (searchTerms.includes('name:')) {
        const nameQuery = searchTerms.split('name:')[1].split(' ')[0];
        searchCriteria = { name: { $regex: nameQuery, $options: 'i' } };
      } else if (searchTerms.includes('adj:')) {
        const adjQuery = searchTerms.split('adj:')[1].split(' ')[0];
        searchCriteria = { adjuster: { $regex: adjQuery, $options: 'i' } };
      } else if (searchTerms.includes('claim:')) {
        const claimQuery = searchTerms.split('claim:')[1].split(' ')[0];
        searchCriteria = { claimnumber: { $regex: claimQuery, $options: 'i' } };
      } else {
        // Default search across all fields
        searchCriteria = {
          $or: [
            { claimnumber: { $regex: searchTerms, $options: 'i' } },
            { name: { $regex: searchTerms, $options: 'i' } },
            { adjuster: { $regex: searchTerms, $options: 'i' } },
            { 'documents.textContent': { $regex: searchTerms, $options: 'i' } },
            { 'documents.entities.potentialClaimantNames': { $regex: searchTerms, $options: 'i' } },
            { 'documents.entities.potentialInjuryDescriptions': { $regex: searchTerms, $options: 'i' } }
          ]
        };
      }
  
      const searchResults = await Claim.aggregate([
        { $match: searchCriteria },
        {
          $addFields: {
            matchingDocuments: {
              $filter: {
                input: '$documents',
                as: 'doc',
                cond: {
                  $or: [
                    { $regexMatch: { input: '$$doc.textContent', regex: searchTerms, options: 'i' } },
                    { $regexMatch: { input: { $toString: '$$doc.entities' }, regex: searchTerms, options: 'i' } }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            claimnumber: 1,
            name: 1,
            date: 1,
            adjuster: 1,
            phoneNumber: 1,
            matchingDocuments: 1,
            documentCount: { $size: '$documents' },
            matchCount: { $size: '$matchingDocuments' }
          }
        },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ]);
  
      const total = await Claim.countDocuments(searchCriteria);
  
      res.json({
        results: searchResults,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      });
  
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

// Get all documents for a claim
router.get('/claims/:claimId/documents', async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim.documents || []);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Document search endpoint
router.get('/claims/:claimId/documents/search', async (req, res) => {
  try {
    const { query } = req.query;
    const { claimId } = req.params;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // First, find the specific claim
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Filter documents in memory for the specific claim
    const matchingDocuments = claim.documents.filter(doc => {
      const textContent = (doc.textContent || '').toLowerCase();
      const fileName = (doc.fileName || '').toLowerCase();
      const category = (doc.category || '').toLowerCase();
      const searchTerm = query.toLowerCase();

      return textContent.includes(searchTerm) || 
             fileName.includes(searchTerm) || 
             category.includes(searchTerm);
    });

    // Format the results
    const formattedResults = matchingDocuments.map(doc => {
      const textContent = doc.textContent || '';
      const searchIndex = textContent.toLowerCase().indexOf(query.toLowerCase());
      let snippet = '';
      let score = 0;

      // Calculate score
      if (textContent.toLowerCase().includes(query.toLowerCase())) score += 2;
      if (doc.fileName.toLowerCase().includes(query.toLowerCase())) score += 1;
      if (doc.category.toLowerCase().includes(query.toLowerCase())) score += 1;
      
      // Create snippet if there's a match in textContent
      if (searchIndex !== -1) {
        const start = Math.max(0, searchIndex - 50);
        const end = Math.min(textContent.length, searchIndex + query.length + 50);
        snippet = textContent.slice(start, end);
      }

      return {
        _id: doc._id,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        category: doc.category,
        OcrId: doc.OcrId,
        matchDetails: {
          score,
          textMatches: snippet ? [{
            snippet,
            query
          }] : []
        }
      };
    });

    // Sort by score
    formattedResults.sort((a, b) => b.matchDetails.score - a.matchDetails.score);

    res.json({
      results: formattedResults,
      total: formattedResults.length,
      searchTerm: query
    });

  } catch (err) {
    console.error('Document search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
