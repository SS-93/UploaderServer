const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const uploadController = require('../Controllers/upload.controller');
// const ParkedUpload = require ('../Controllers/upload.controller')
const {ParkedUpload, OcrText} = require ('../Models/upload.model')


// const multer = require('multer');
// const upload = multer({ storage: multer.memoryStorage() });

// Define the upload route
// router.post('/bulk-upload', upload.array('documents', 10), uploadController.uploadMultipleFiles);
// router.post('/bulk-uploads', uploadController.uploadMiddleware, uploadController.uploadFiles);
router.post('/bulk-upload', uploadController.uploadMiddleware, uploadController.uploadFiles);
router.post('/bulk-uploads', uploadController.uploadMiddleware, uploadController.bulkUploadFilesWithoutClaim);
router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadSingleFile);
// Add this route to handle sorting a parked document to a claim
router.post('/sort/:documentId/to-claim/:claimId', uploadController.sortDocumentToClaim);



router.get('/images/:key', uploadController.handleGetImage);
router.get('/documents/:key', uploadController.handleGetFile);
router.get('/documents/:key/signed-url', uploadController.getSignedUrl);
router.get('/recent-uploads', uploadController.getParkedUploads);
router.put('/recent-uploads', uploadController.updateDocumentTextContent);
router.put('/recent-uploads/:parkId', uploadController.updateParkingSessionDocuments);
router.put('/recent-uploads/:parkId', uploadController.updateParkingSessionDocuments);

router.get('/parked-uploads/:parkId', uploadController.getParkedUploads); // Fetch parked uploads by ParkId
router.put('/parked-uploads/:parkId', uploadController.updateParkingSessionDocuments); // Update documents based on ParkId
router.put('/parked-uploads/:parkId', uploadController.updateDocumentTextContent); // Update documents based on ParkId

router.put('/documents/:documentId', uploadController.updateDocumentDetails); //! IN USE 
router.put('/documentstext/:id', uploadController.updateDocumentTextContent); //! IN USE 

//? Edit

router.put('/documents/:documentId', async (req, res) => {
  const { documentId } = req.params;
  const { textContent, fileName,  } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await ParkedUpload.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update the fields
    if (textContent !== undefined) document.textContent = textContent;
    if (fileName !== undefined) document.filename = fileName;
    // if (category !== undefined) document.category = category;

    await document.save();

    res.status(200).json({ message: 'Document updated successfully.', document });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document.' });
  }
});
// router.put('/documents/:documentId', uploadController.editDocumentDetails);
// router.put('/documents/edit/:documentId', (req, res) => {
//   req.params.documentId = Number(req.params.documentId);  // Ensure documentId is cast to Number
//   // Continue with the request handling logic
//   uploadController.editDocumentDetails(req, res);
// });

//? OCR
// router.put('/ocr-text/by-documentId', uploadController.updateOcrTextByDocumentId);

// // Route to get all OCR text entries by documentId
// router.get('/ocr-text/:documentId', uploadController.getOcrTextsByDocumentId);

// Example route to update document details by documentId
// router.put('/documents/edit/:documentId', uploadController.updateDocumentDetails);

// // routes/documentRoutes.js
// router.put('/documents/edit/:documentId', uploadController.updateMultipleDocuments);


// Route to save OCR text for a document by documentId
router.put('/ocr-text/:documentId', uploadController.saveOcrText);

// router.put('/documents/edit/:documentId/', uploadController.editDocument);

// Route to fetch document by documentId
router.get('/document/:documentId', uploadController.getDocumentByDocumentId);

//? Route to update the OCR text of a document by documentId 
router.put('/documents/:documentId', async (req, res) => {
  const { documentId } = req.params;
  const { textContent } = req.body;

  try {
    const document = await ParkedUpload.findOne({ documentId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    document.textContent = textContent; // Update the textContent field
    await document.save();

    res.status(200).json({ message: 'Text content updated successfully.' });
  } catch (error) {
    console.error('Error updating text content:', error);
    res.status(500).json({ error: 'Failed to update text content.' });
  }
});
// routes/documentRoutes.js
router.put('/documents/edit-batch/:documentId', uploadController.updateDocumentsBatch);


router.delete('/documents/:documentId', uploadController.deleteDocument);

router.put('/parks/:parkId/documents', uploadController.updateParkDocuments);

// Route to handle bulk moving of documents
router.post('/move-documents/:claimId', uploadController.moveDocumentsToClaim);
// router.post('/move-documents/:claimId', uploadController.sortDocumentToClaim);

router.post('/move-document/:claimId/:documentId', uploadController.moveSingleDocumentToClaim);

// router.put('/update-document/:documentId', uploadController.updateDocumentTextContent);

// router.get('/documents/:key', uploadController.updateDocumentTextContent);
// // text content update. 
// router.put('/update-document/:documentId', async (req, res) => {
//     const { documentId } = req.params;
//     const { textContent } = req.body;
  
//     try {
//       const result = await ParkedUpload.findByIdAndUpdate(
//         documentId,
//         { textContent },
//         { new: true }
//       );
  
//       if (!result) {
//         return res.status(404).json({ message: 'Document not found' });
//       }
  
//       res.status(200).json({ message: 'Document text content updated successfully', document: result });
//     } catch (error) {
//       console.error('Error updating document text content:', error);
//       res.status(500).json({ error: 'Failed to update document text content' });
//     }
//   });
  


// // Update documents associated with a ParkingSession
// router.put('/park-sessions/:parkingSessionId/documents', uploadController.updateParkingSessionDocuments);

// Route to get document details by ID
// router.get('/get-document/:id', async (req, res) => {
//     const { id } = req.params;
  
//     try {
//       // Find the document by its ID
//       const document = await ParkedUpload.findById(id);
  
//       if (!document) {
//         return res.status(404).json({ error: 'Document not found' });
//       }
  
//       // Return the document details
//       res.status(200).json(document);
//     } catch (error) {
//       console.error('Error fetching document details:', error);
//       res.status(500).json({ error: 'Failed to fetch document details' });
//     }
//   });
  

// Route to update document text content
router.put('/update-document/:documentId', async (req, res) => {
    const { documentId } = req.params;
    const { textContent } = req.body;
  
    try {
      const updatedDocument = await ParkedUpload.findByIdAndUpdate(
        documentId,
        { textContent },
        { new: true }
      );
  
      if (!updatedDocument) {
        return res.status(404).json({ message: 'Document not found' });
      }
  
      res.status(200).json({ message: 'Document text content updated successfully', document: updatedDocument });
    } catch (error) {
      console.error('Error updating document text content:', error);
      res.status(500).json({ error: 'Failed to update document text content' });
    }
  });

  // router.put('/ocr-text/by-url', async (req, res) => {
  //   const { documentUrl, ocrTextContent } = req.body;
  
  //   try {
  //     // Find the document by its fileUrl
  //     const document = await ParkedUpload.findOne({ documentUrl });
  //     if (!document) {
  //       return res.status(404).json({ message: 'Document not found' });
  //     }
  
  //     // Check if OCR text already exists for this fileUrl
  //     let ocrText = await OcrText.findOne({ documentUrl });
  //     if (ocrText) {
  //       // Update existing OCR text
  //       ocrText.ocrTextContent = ocrTextContent;
  //       ocrText.updatedAt = new Date();
  //     } else {
  //       // Create new OCR text entry
  //       ocrText = new OcrText({ documentUrl, ocrTextContent });
  //     }
  
  //     await ocrText.save();
  //     res.status(200).json({ message: 'OCR text content updated successfully', ocrText });
  //   } catch (err) {
  //     console.error('Error updating OCR text content:', err);
  //     res.status(500).json({ error: 'Failed to update OCR text content' });
  //   }
  // });
  
  
// router.post('/update-document-text/:id', async (req, res) => {
//     const { id } = req.params;
//     const { textContent } = req.body;
  
//     // Check if ID is valid
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ error: 'Invalid document ID format' });
//     }
  
//     try {
//       // Update the document text content
//       const updatedDocument = await ParkedUpload.findByIdAndUpdate(
//         id,
//         { textContent },
//         { new: true, runValidators: true }
//       );
  
//       if (!updatedDocument) {
//         return res.status(404).json({ error: 'Document not found' });
//       }
  
//       res.status(200).json({ message: 'Document text content updated successfully', updatedDocument });
//     } catch (error) {
//       console.error('Error updating document text content:', error);
//       res.status(500).json({ error: 'Failed to update document text content' });
//     }
//   });
  
  // Route to get document details by ID
router.get('/get-document/:id', async (req, res) => {
    const { id } = req.params;
  
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid document ID format' });
    }
  
    try {
      // Find the document by its ID
      const document = await ParkedUpload.findById(id);
  
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
  
      // Return the document details
      res.status(200).json(document);
    } catch (error) {
      console.error('Error fetching document details:', error);
      res.status(500).json({ error: 'Failed to fetch document details' });
    }
  });

//  Edit documents without a claim 
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
//updated and edit multiple parked documents 
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





module.exports = router;


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