const express = require ('express');
const multer = require ('multer');
const { getAllClaims, uploadDocument, getDocument, getClaimById, createClaim, bulkUploadDocuments } = require ('../Controllers/claims.controller');
const uploadController = require('../Controllers/upload.controller');

const router = express.Router();
const upload = multer ({ dest:'uploads/'});

router.post ('/claims, createClaim')
router.get('/list', getAllClaims);
router.get('/claims/:id', getClaimById);
// router.post('/claims/:claimId/documents', upload.single('document'), uploadDocument);
router.get('/documents/:key', getDocument);
router.post('/claims/:claimId/documents', claimController.upload.single('document'), claimController.uploadSingleFile);
router.post('/ocr/read/:documentId', claimController.performOCR);

// ... existing imports

router.post('/claims/:claimId/documents/bulk-upload', upload.array('documents'), claimController.bulkUploadDocuments);

// ... rest of your existing routes