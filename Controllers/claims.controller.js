const express = require("express");
const { ObjectId } = require('mongodb');
const multer = require('multer');
const { uploadFile, getFileStream, getSignedUrl } = require('../S3');
const Claim = require('../Models/claims.model');
const Upload = require('../Models/upload.model');
const { performOCR} = require('../TesseractServices.js')
const OCRProcessor = require('../ocrProcessor.js')
const router = express.Router();

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const ocrProcessor = new OCRProcessor()

const errorResponse = (res, err) => {
    res.status(500).json({ Error: err.message });
};

// Upload a single file to S3 and link it to a claim
router.post('/claims/:claimId/documents', upload.single('document'), async (req, res) => {
    const file = req.file;
    const { claimId } = req.params;
    const { fileName } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'File is Missing' });
    }

    try {
        const result = await uploadFile(file);
        const claim = await Claim.findById(claimId);

        const newDocument = {
            fileName: fileName || file.originalname,
            fileUrl: result.Location,
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

// Perform OCR processing
let text;
if (file.mimetype === 'application/pdf') {
    text = await ocrProcessor.handlePDF(file.path);
} else {
    text = await ocrProcessor.extractText(file.path);
}

await Claim.updateOne(
    { 'documents._id': newDocument._id },
    { $set: { 'documents.$.textContent': text }, $inc: { aggregatedText: ` ${text}` } }
);

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

// Initiate OCR processing for a document
router.post('/ocr/read/:documentId', async(req, res)=> {
    try {
        
        const {documentId} = req.params;
        const document = await Claim.findOne({'documents._id': documentId}, {"documents.$":1});
        if(!document) {
            return res.status(404).json({ message: 'Document not found'})
        }
        const doc = document.docucments[0];
        const text = await performOCR(doc.fileUrl);

        await Claim.updateOne(
            {'documents._id': documentId},
            {$set: {'documents.$.textContent': text}, $inc: { aggregatedText: ' ${text}'}}
        );

        res.status(200).json({text});
    } catch (error) {

        console.error('Error performing OCR', error);
        res.status(500).json({error: "Failed to perform OCR"})
        
    }


    router.get('documents/:documentId/text', async (req, res)=> {
        try {
            const {documentId} = req.params;
            const document = await Claim.findOne({ 'documents._id': documentId}, {'documents.$': 1 })

            if (!document) {
                return res.status(404).json ({message: "Document not found"})
            }

            const doc = document.documents[0];
            res.status(200).json({text: doc.textContent});

            
        } catch (error) {

            console.error('Error fetching text', error);
            res.status(500).json({error: 'Failed to fetch text'})
            
        }
    })
})

module.exports = router;


// const router = require("express").Router();
// const { ObjectId } = require('mongodb');
// const multer = require('multer');
// const { uploadFile, getFileStream } = require('../S3');
// const Claim = require('../Models/claims.model');
// const { getSignedUrl } = require('../S3');


// // Configure multer to use memory storage 
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });
// // const upload = multer({ dest: 'uploads/' });

// const errorResponse = (res, err) => {
//     res.status(500).json({ Error: err.message });
// };

// // Upload a single gile to S3 and link it to a claim
// router.post('/claims/:claimId/documents', upload.single('document'), async (req, res) => {
//     const file = req.file;
//     const { claimId } = req.params;
//     const { fileName } = req.body;

//     if (!file) {
//         return res.status(400).json({ error: 'File is Missing' });
//     }

//     try {
//         const result = await uploadFile(file);
//         const claim = await Claim.findById(claimId);

//         const newDocument = {
//             fileName: fileName || file.originalname,
//             fileUrl: result.Location,
//         };

//         claim.documents.push(newDocument);
//         await claim.save();
//         res.json(newDocument);
//     } catch (err) {
//         console.error('Error uploading to S3', err);
//         res.status(500).json({ error: 'Failed to upload to S3' });
//     }
// });

// // All Claims
// router.get('/list', async (req, res) => {
//     try {
//         const getAllClaims = await Claim.find();

//         getAllClaims.length > 0 ?
//             res.status(200).json({ getAllClaims })
//             :
//             res.status(404).json({ message: "No Claims Found" });

//     } catch (err) {
//         errorResponse(res, err);
//     }
// });

// // Find Claim by ID
// router.get('/find/:id', async (req, res) => {
//     try {
//         const objectId = new ObjectId(req.params.id);
//         const singleClaim = await Claim.findOne({ _id: objectId });

//         if (!singleClaim) {
//             return res.status(404).json({ message: 'Claim not found' });
//         }

//         res.status(200).json({ found: singleClaim });
//     } catch (err) {
//         res.status(400).json({ error: 'Invalid ID format' });
//     }
// });

// // New Claims
// router.post('/claims', async (req, res) => {
//     try {
//         const claimFile = {
//             claimnumber: req.body.claimnumber,
//             name: req.body.name,
//             date: req.body.date,
//             adjuster: req.body.adjuster,
//         };

//         const claim = new Claim(claimFile);

//         const newClaim = await claim.save();

//         res.status(200).json({
//             message: 'New Claim Filed!',
//             order: newClaim,
//         });

//     } catch (err) {
//         errorResponse(res, err);
//     }
// });

// //Find Claim Documents by Id

// router.get('/claims/:claimId/documents', async (req, res) => {
//     try {
//         const { claimId } = req.params;
//         const claim = await Claim.findById(claimId).populate('documents');
//         if (!claim) {
//             return res.status(404).json({ message: 'Claim not found' });
//         }
//         res.status(200).json(claim.documents);
        
//     } catch (err) {
//         errorResponse(res, err);
//     }
// });

// // // Return signed URL for a document
// // router.get('/documents/:key/signed-url', async (req, res) => {
// //     const { key } = req.params;
// //     try {
// //         const url = await getSignedUrl(key);
// //         res.status(200).json({ url });
// //     } catch (err) {
// //         res.status(500).json({ error: 'Failed to get signed URL' });
// //     }
// // });

// // Retrieve signed Url for Documents 


// // router.get('/documents/:key', (req, res) => {
// //     const key = req.params.key;
// //     const readStream = getFileStream(key);
// //     readStream.pipe(res);
// // });




// //Retrieve signed URL for a document



// router.get('/documents/:key/signed-url', async (req, res)=> {
//     const {key} = req.params;
//     try {
//         const url = await getSignedUrl(key)
//         res.status(200).json({url});

//     }catch (err) {
//         res.status(500).json({error: 'Failed to get signed URL'})
//     }
// });





// module.exports = router;
