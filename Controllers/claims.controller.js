const router = require("express").Router();
const { ObjectId } = require('mongodb');
const multer = require ('multer')
const {uploadFile, getFileStream} = require('../S3')
const upload = multer ({ dest: 'uploads/'})


const Claim = require('../Models/claims.model');

function errorResponse(res, err) {
    res.status(500).json({
        Error: err.message,
    });
}

// New Claims
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

// All Claims
router.get('/list', async (req, res) => {
    try {
        const getAllClaims = await Claim.find();

        getAllClaims.length > 0 ?
            res.status(200).json({ getAllClaims })
            :
            res.status(404).json({ message: "No Claims Found" });

    } catch (err) {
        errorResponse(res, err);
    }
});

// Find Claim by ID
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


// Upload Document to Claim

router.post('/claims/:claimId/documents', upload.single('document'), async (req, res) => {
    const file = req.file;
    const { claimId } = req.params;
    
    if(!file) {
        return res.status(400).json({error: 'File is Missing'})
    }

    try { 
        
        const result = await uploadFile(file);
        const claim = await Claim.findById(claimId);
        const newDocument = {
            fileName: file.originalname,
            fileUrl: result.Location
        };

        claim.documents.push(newDocument);
        await claim.save();
        res.json(newDocument);

    } catch (err) {
        console.error('Error uploading to S3', err);
        res.status(500).json({error: 'Failed to upload to S3'})
        
    }
});

// Get Documents from S3 
router.get ('doccuments/:key', (req, res) => {
    const key = req.params.key;
    const readStream = getFileStream(key);
    readStream.pipe(res)
})

module.exports = router;