const express = require ('express');
const multer = require ('multer');
const { getAllClaims, uploadDocument, getDocument, getClaimById, createClaim } = require ('../Controllers/claims.controller');

const router = express.Router();
const upload = multer ({ dest:'uploads/'});

router.post ('/claims, createClaim')
router.get('/claims', getAllClaims);
router.get('/claims/:id', getClaimById);
router.post('/claims/:claimId/documents', upload.single('document'), uploadDocument);
router.get('/documents/:key', getDocument);

module.exports = router;


// const express = require ('express');
// const multer = require ('multer');
// const { getAllClaims, uploadDocument, getDocument, getClaimById, createClaim } = require ('../Controllers/claims.controller');

// const router = express.Router();
// const upload = multer ({ dest:'uploads/'});

// router.post ('/claims, createClaim')
// router.get('/claims', getAllClaims);
// router.get('/claims/:id', getClaimById);
// router.post('/claims/:claimId/documents', upload.single('document'), uploadDocument);
// router.get('/documents/:key', getDocument);

// module.exports = router;