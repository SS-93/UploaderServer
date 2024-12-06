const express = require('express');
const router = express.Router();
const uploadController = require('../Controllers/upload.controller');
const { ParkedUpload, OcrText } = require('../Models/upload.model');

const aiController = require('../Controllers/ai.controller');


// Bulk upload route
router.post('/bulk-upload', uploadController.uploadMiddleware, uploadController.bulkUploadFilesWithoutClaim);

// Single file upload route
router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadSingleFile);

// Sort document to claim
router.post('/sort-to-claim/:claimNumber/:OcrId', uploadController.sortDocumentToClaim);

// Get image
router.get('/images/:key', uploadController.handleGetImage);

// Get file
router.get('/documents/:key', uploadController.handleGetFile);

// Get signed URL
router.get('/documents/:key/signed-url', uploadController.getSignedUrl);

// Get recent uploads
router.get('/recent-uploads', uploadController.getParkedUploads);

// Update document text content
router.put('/documents/:OcrId', uploadController.updateDocumentTextContent);

// Get parked uploads by ParkId
router.get('/parked-uploads/:parkId', uploadController.getParkedUploads);

// // Update documents based on ParkId
// router.put('/parked-uploads/:parkId', uploadController.updateParkingSessionDocuments);

// Update document details
router.put('/documents/:OcrId', uploadController.updateDocumentDetails);

// Delete document
router.delete('/documents/:OcrId', uploadController.deleteDocument);

// Get document by OcrId
router.get('/document/:OcrId', uploadController.getDocumentByOcrId);

// Save OCR text
router.put('/ocr-text/:OcrId', uploadController.saveOcrText);

// Update multiple documents
router.put('/documents/update-multiple', uploadController.updateMultipleDocuments);

// Add these routes to your existing routes file
router.get('/ocr-text/:OcrId', uploadController.getOcrText);
router.put('/ocr-text/:OcrId', uploadController.saveOcrText);

// delete multiple documents
router.delete('/documents/delete-multiple', uploadController.deleteDocument);

//NER processing 

//NER processing 
router.post('/perform-ner', aiController.performNER);

// New route for saving updated entities
router.post('/save-entities', aiController.saveUpdatedEntities);

router.get('/suggested-claims/:OcrId', aiController.getSuggestedClaims);

router.post('/sort/:claimId/:OcrId', uploadController.sortDocumentToClaim);   
router.post('/sort-document/:claimId/:OcrId', uploadController.sortDocumentToClaim); 


module.exports = router;
