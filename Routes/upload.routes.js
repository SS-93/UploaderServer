const express = require('express');
const router = express.Router();
const uploadController = require('../Controllers/upload.controller');
// const ParkedUpload = require ('../Controllers/upload.controller')
const ParkedUpload = require ('../Models/upload.model')


// const multer = require('multer');
// const upload = multer({ storage: multer.memoryStorage() });

// Define the upload route
// router.post('/bulk-upload', upload.array('documents', 10), uploadController.uploadMultipleFiles);
// router.post('/bulk-uploads', uploadController.uploadMiddleware, uploadController.uploadFiles);
router.post('/bulk-upload', uploadController.uploadMiddleware, uploadController.uploadFiles);
router.post('/bulk-uploads', uploadController.uploadMiddleware, uploadController.bulkUploadFilesWithoutClaim);
router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadSingleFile);
router.get('/images/:key', uploadController.handleGetImage);
router.get('/documents/:key', uploadController.handleGetFile);
router.get('/documents/:key/signed-url', uploadController.getSignedUrl);
router.get('/recent-uploads', uploadController.getParkedUploads);
router.put('/recent-uploads/:parkId', uploadController.updateParkingSessionDocuments);
router.put('/recent-uploads/:parkId', uploadController.updateParkingSessionDocuments);

router.get('/parked-uploads/:parkId', uploadController.getParkedUploads); // Fetch parked uploads by ParkId
router.put('/parked-uploads/:parkId', uploadController.updateParkingSessionDocuments); // Update documents based on ParkId

router.put('/documents/:documentId', uploadController.updateDocumentDetails);

router.delete('/documents/:documentId', uploadController.deleteDocument);

router.put('/parks/:parkId/documents', uploadController.updateParkDocuments);

// // Update documents associated with a ParkingSession
router.put('/park-sessions/:parkingSessionId/documents', uploadController.updateParkingSessionDocuments);

//  Edit documents without a claim 
router.put('/documents', async (req, res) => {
    const updates = req.body; // Assuming this is an array of document updates

    try {
        // Iterate over each update and apply it to the correct document
        for (const update of updates) {
            const document = await ParkedUpload.findById(update._id); // Make sure ParkedUpload is correctly imported
            if (document) {
                if (update.fileName) document.fileName = update.fileName;
                if (update.category) document.category = update.category;
                // Apply other updates as needed

                await document.save(); // Save each updated document
            }
        }

        res.status(200).json({ message: 'Documents updated successfully' });
    } catch (err) {
        console.error('Error updating documents:', err);
        res.status(500).json({ error: 'Failed to update documents' });
    }
});

router.put('/documents/:parkId/documents', async (req, res) => {
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



module.exports = router;

// const express = require('express');
// const router = express.Router();
// const uploadController = require('../Controllers/upload.controller');
// // const ParkedUpload = require ('../Controllers/upload.controller')
// const ParkedUpload = require ('../Models/upload.model')


// // const multer = require('multer');
// // const upload = multer({ storage: multer.memoryStorage() });

// // Define the upload route
// // router.post('/bulk-upload', upload.array('documents', 10), uploadController.uploadMultipleFiles);
// router.post('/bulk-upload', uploadController.uploadMiddleware, uploadController.uploadFiles);
// router.post('/bulk-uploads', uploadController.uploadMiddleware, uploadController.bulkUploadFilesWithoutClaim);
// router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadSingleFile);
// router.get('/images/:key', uploadController.handleGetImage);
// router.get('/documents/:key', uploadController.handleGetFile);
// router.get('/documents/:key/signed-url', uploadController.getSignedUrl);
// router.get('/recent-uploads', uploadController.getParkedUploads);

// router.get('/parked-uploads/', uploadController.getParkedUploads); // Fetch parked uploads by ParkId
// router.put('/parked-uploads/', uploadController.updateParkedDocuments); // Update documents based on ParkId
// router.put('/claims/:claimId/documents', uploadController.updateDocuments);
// router.put('/parking-session/:parkingSessionId/documents', uploadController.updateParkingSessionDocuments);// Update documents based on ParkSessionId



// //  Edit documents without a claim 
// router.put('/documents', async (req, res) => {
//     const updates = req.body; // Assuming this is an array of document updates

//     try {
//         // Iterate over each update and apply it to the correct document
//         for (const update of updates) {
//             const document = await ParkedUpload.findById(update._id); // Make sure ParkedUpload is correctly imported
//             if (document) {
//                 if (update.fileName) document.fileName = update.fileName;
//                 if (update.category) document.category = update.category;
//                 // Apply other updates as needed

//                 await document.save(); // Save each updated document
//             }
//         }

//         res.status(200).json({ message: 'Documents updated successfully' });
//     } catch (err) {
//         console.error('Error updating documents:', err);
//         res.status(500).json({ error: 'Failed to update documents' });
//     }
// });

// router.put('/documents/:parkId/documents', async (req, res) => {
//     const { claimId } = req.params;
//     const updates = req.body; // Assuming this is an array of document updates

//     try {
//         const claim = await Claim.findById(claimId);
//         if (!claim) {
//             return res.status(404).json({ message: 'Claim not found' });
//         }

//         // Iterate over each update and apply it to the correct document
//         updates.forEach(update => {
//             const document = claim.documents.id(update._id);
//             if (document) {
//                 if (update.fileName) document.fileName = update.fileName;
//                 if (update.category) document.category = update.category;
//                 // Apply other updates as needed
//             }
//         });

//         // Save the updated claim with the modified documents
//         await claim.save();

//         res.status(200).json({ message: 'Documents updated successfully' });
//     } catch (err) {
//         console.error('Error updating documents:', err);
//         res.status(500).json({ error: 'Failed to update documents' });
//     }
// });

// // Add a route to fetch documents based on parkingSessionId:
// router.get('/parking-session/:parkingSessionId/documents', async (req, res) => {
//     const { parkingSessionId } = req.params;
//     try {
//         const parkingSession = await ParkingSession.findById(parkingSessionId).populate('documents');
//         if (!parkingSession) {
//             return res.status(404).json({ message: 'Parking session not found' });
//         }
//         res.status(200).json(parkingSession.documents);
//     } catch (err) {
//         console.error('Error fetching documents:', err);
//         res.status(500).json({ error: 'Failed to fetch documents' });
//     }
// });

// module.exports = router;





// // const express = require('express');
// // const router = express.Router();
// // const uploadController = require('../Controllers/upload.controller');

// // // Define the upload route
// // router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadSingleFile);
// // router.get('/images/:key', uploadController.handleGetImage);
// // router.get('/documents/:key', uploadController.handleGetFile);



// // module.exports = router;





// // const express = require ("express");
// // const router = express.Router();
// // const uploadController = require ("../Controllers/upload.controller")


// // router.post ("/uploads", uploadController.uploadFiles)
// // router.post("/images", uploadController.uploadFiles);


// // module.exports = router;





// // const express = require ("express");
// // const router = express.Router();
// // const uploadController = require ("../Controllers/upload.controller")


// // router.post ("/uploads", uploadController.uploadFiles)
// // router.post("/images", uploadController.uploadFiles);


// // module.exports = router;


// // const express = require("express");
// // const multer = require ('multer');
// // const router = express.Router();
// // const { handleUpload, handleGetImage } = require("../Controllers/upload.controller");
// // const upload = multer ({dest: 'uploads/'}) 

// // // Ensure these routes match what you are using in the frontend
// // // router.post("/uploads", uploadController.uploadFiles);
// // router.post("/images", upload.single('image'), handleUpload);
// // router.post('images/:key', handleGetImage)

// // module.exports = router;





// // const express = require ("express");
// // const router = express.Router();
// // const uploadController = require ("../Controllers/upload.controller")


// // router.post ("/uploads", uploadController.uploadFiles)
// // router.post("/images", uploadController.uploadFiles);


// // module.exports = router;




// // const express = require ("express");
// // const router = express.Router();
// // const uploadController = require ("../Controllers/upload.controller")


// // router.post ("/uploads", uploadController.uploadFiles)
// // router.post("/images", uploadController.uploadFiles);


// // module.exports = router;