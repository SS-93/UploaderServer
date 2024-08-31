
// Controllers/upload.controller.js
const multer = require('multer');
const { ParkedUpload, Upload} = require('../Models/upload.model'); // Adjust the path to your actual model file
const { uploadFile, getFileStream, getSignedUrl } = require('../S3');
const Claim = require('../Models/claims.model');
const mongoose = require('mongoose')

// Configure multer to use a specific destination
const storage = multer.memoryStorage();
const upload = multer({ storage: storage});

const Park = require('../Models/park.model'); // Import Park model
const ParkingSession = require('../Models/parkingsession.model'); // Import ParkingSession model


exports.uploadSingleFile = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File is missing' });
  }

  try {
    const uploadedFiles = [];
    const files = [file]; // Wrap the single file in an array

    for (const file of files) {
      const result = await uploadFile(file); // Upload to S3
      const signedUrl = await getSignedUrl(result.Key); // Generate signed URL

      const newUpload = new Upload({
        filename: result.Key,
        originalName: file.originalname,
        fileUrl: signedUrl, // Save the signed URL
        mimetype: file.mimetype, // Save the mimetype
        claimId: req.body.claimId, // Ensure claimId is passed and saved
      });

      await newUpload.save(); // Save to database
      uploadedFiles.push(newUpload);
    }

    res.status(200).json({ message: 'File uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Error saving file to database:', error);
    res.status(500).json({ error: 'Failed to save file information' });
  }
};

exports.uploadFiles = async (req, res) => {
  // Handle both single and multiple file uploads
  const files = req.files || (req.file ? [req.file] : []);

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files were uploaded' });
  }

  const { claimId, category } = req.body; // Extract claimId and category from the request body

  try {
    // Fetch the corresponding claim from the database using claimId
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Upload to S3
      const result = await uploadFile(file);
      // Generate signed URL
      const signedUrl = await getSignedUrl(result.Key);

      // Create a new document object and associate it with the claim
      const newDocument = {
        fileName: file.originalname,
        fileUrl: signedUrl,
        category: category || 'Uncategorized',
      };
      claim.documents.push(newDocument);

      // Save the document metadata in the Upload collection
      const newUpload = new Upload({
        filename: result.Key,
        originalName: file.originalname,
        fileUrl: signedUrl,
        mimetype: file.mimetype,
        claimId: claimId, // Ensure claimId is passed and saved
      });

      await newUpload.save(); // Save to database
      uploadedFiles.push(newDocument);
    }

    // Save the claim back to the database with the new documents
    await claim.save();

    res.status(200).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully and associated with the claim`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Error saving file(s) to database:', error);
    res.status(500).json({ error: 'Failed to save file information' });
  }
};


exports.bulkUploadFilesWithoutClaim = async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files were uploaded' });
  }

  try {
    const uploadedFiles = [];
    const { parkId, category } = req.body; // Extract parkId and category from the request body

    for (const file of files) {
      const result = await uploadFile(file);
      const signedUrl = await getSignedUrl(result.Key);

      const newUpload = new ParkedUpload({
        filename: result.Key,
        originalName: file.originalname,
        fileUrl: signedUrl,
        mimetype: file.mimetype,
        parkId, // Ensure parkId is passed correctly
        category: Array.isArray(category) ? category[0] : category || 'Uncategorized',  // Ensure category is a string
      });

      await newUpload.save();
      uploadedFiles.push(newUpload);
    }

    res.status(200).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Error during bulk upload:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};





exports.getParkedUploads = async (req, res) => {
  try {
    const { parkId } = req.params;
    const parkedUploads = await ParkedUpload.find({ parkId }).sort({ uploadDate: -1 });
    res.status(200).json({ files: parkedUploads });
  } catch (error) {
    console.error('Error fetching parked uploads:', error);
    res.status(500).json({ error: 'Failed to fetch parked uploads' });
  }
};

exports.updateParkDocuments = async (req, res) => {
  const { parkId } = req.params; // The ID of the park
  const updates = req.body; // Array of document updates

  try {
    // Fetch the park by ID
    const park = await Park.findById(parkId);

    if (!park) {
      return res.status(404).json({ message: 'Park not found' });
    }

    // Iterate over each update and apply it to the correct document
    updates.forEach((update) => {
      const document = park.documents.id(update._id); // Find the document by its ID

      if (document) {
        // Update the fields of the document
        if (update.fileName) document.fileName = update.fileName;
        if (update.category) document.category = update.category;
        // Apply other updates as needed
      }
    });

    // Save the updated park with the modified documents
    await park.save();

    res.status(200).json({ message: 'Documents updated successfully' });
  } catch (err) {
    console.error('Error updating park documents:', err);
    res.status(500).json({ error: 'Failed to update park documents' });
  }
};

// Update documents associated with a ParkingSession

exports.updateParkingSessionDocuments = async (req, res) => {
  const { parkingSessionId } = req.params; // The ID of the parking session
  const updates = req.body; // Array of document updates

  try {
    // Fetch the parking session by ID
    const parkingSession = await ParkingSession.findById(parkingSessionId);

    if (!parkingSession) {
      return res.status(404).json({ message: 'Parking session not found' });
    }

    // Iterate over each update and apply it to the correct document
    updates.forEach((update) => {
      const document = parkingSession.documents.id(update._id); // Find the document by its ID

      if (document) {
        // Update the fields of the document
        if (update.fileName) document.fileName = update.fileName;
        if (update.category) document.category = update.category;
        // Apply other updates as needed
      }
    });

    // Save the updated parking session with the modified documents
    await parkingSession.save();

    res.status(200).json({ message: 'Documents updated successfully' });
  } catch (err) {
    console.error('Error updating parking session documents:', err);
    res.status(500).json({ error: 'Failed to update parking session documents' });
  }
};



exports.updateDocumentDetails = async (req, res) => {
  const { documentId } = req.params; // Document ID from the request parameters
  const updates = req.body; // Object containing the updates for the document

  try {
    // Find the document by its ID
    const document = await ParkedUpload.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Update document fields based on the provided updates
    if (updates.fileName !== undefined) document.filename = updates.fileName;
    if (updates.category !== undefined) document.category = updates.category;
    // Add more fields here if needed

    // Save the updated document
    await document.save();

    res.status(200).json({ message: 'Document updated successfully', document });
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  const { documentId } = req.params; // Document ID from the request parameters

  try {
    // Find and delete the document by its ID
    const document = await ParkedUpload.findByIdAndDelete(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};



// Add this function to handle sorting documents from parked uploads to claims
// exports.sortDocumentToClaim = async (req, res) => {
//   const { documentId, claimId } = req.params; // Get the document ID and claim ID from the request parameters

//   try {
//     // Find the parked document by its ID
//     const parkedDocument = await ParkedUpload.findById(documentId);

//     if (!parkedDocument) {
//       return res.status(404).json({ message: 'Document not found in parked uploads' });
//     }

//     // Find the claim by its ID
//     const claim = await Claim.findById(claimId);
//     if (!claim) {
//       return res.status(404).json({ message: 'Claim not found' });
//     }

//     // Create a new document object using the parked document details
//     const newDocument = {
//       fileName: parkedDocument.filename,
//       fileUrl: parkedDocument.fileUrl,
//       uploadDate: parkedDocument.uploadDate,
//       textContent: parkedDocument.textContent,
//       category: parkedDocument.category
//     };

//     // Add the new document to the claim's documents array
//     claim.documents.push(newDocument);

//     // Save the updated claim
//     await claim.save();

//     // Remove the document from the parked uploads after it's moved to the claim
//     await ParkedUpload.findByIdAndDelete(documentId);

//     res.status(200).json({ message: 'Document sorted to claim successfully', document: newDocument });
//   } catch (error) {
//     console.error('Error sorting document to claim:', error);
//     res.status(500).json({ error: 'Failed to sort document to claim' });
//   }
// };

// Add this function to handle sorting documents from parked uploads to claims
exports.sortDocumentToClaim = async (req, res) => {
  const { documentId, claimId } = req.params; // Get the document ID and claim ID from the request parameters

  try {
    // Find the parked document by its ID
    const parkedDocument = await ParkedUpload.findById(documentId);

    if (!parkedDocument) {
      return res.status(404).json({ message: 'Document not found in parked uploads' });
    }

    // Find the claim by its ID
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    // Create a new document object using the parked document details
    const newDocument = {
      fileName: parkedDocument.filename,
      fileUrl: parkedDocument.fileUrl,
      uploadDate: parkedDocument.uploadDate,
      textContent: parkedDocument.textContent,
      category: parkedDocument.category,
    };

    // Add the new document to the claim's documents array
    claim.documents.push(newDocument);

    // Save the updated claim
    await claim.save();

    // Remove the document from the parked uploads after it's moved to the claim
    await ParkedUpload.findByIdAndDelete(documentId);

    res.status(200).json({ message: 'Document sorted to claim successfully', document: newDocument });
  } catch (error) {
    console.error('Error sorting document to claim:', error);
    res.status(500).json({ error: 'Failed to sort document to claim' });
  }
};


// Function to move documents to a claim in batches
// exports.moveDocumentsToClaim = async (req, res) => {
//   const { claimId } = req.params;
//   const { filter, batchSize } = req.body;  // Assuming filter and batchSize are sent in the request body

//   try {
//     const cursor = ParkedUpload.find(filter).cursor();
//     let docsToMove = [];
//     let counter = 0;

//     for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
//       docsToMove.push(doc);
//       counter++;

//       if (counter >= (batchSize || 100)) {
//         await processBatch(claimId, docsToMove);
//         docsToMove = [];
//         counter = 0;
//       }
//     }

//     // Process any remaining documents
//     if (docsToMove.length > 0) {
//       await processBatch(claimId, docsToMove);
//     }

//     res.status(200).json({ message: 'Documents moved successfully!' });
//   } catch (error) {
//     console.error('Error moving documents:', error);
//     res.status(500).json({ error: 'Failed to move documents' });
//   }
// };

// // Helper function to process a batch of documents
// async function processBatch(claimId, docsToMove) {
//   try {
//     const bulkUpdateClaim = Claim.collection.initializeUnorderedBulkOp();
//     const bulkRemoveParked = ParkedUpload.collection.initializeUnorderedBulkOp();

//     docsToMove.forEach((doc) => {
//       // Add the document to the claim's documents array
//       bulkUpdateClaim.find({ _id: claimId }).updateOne({
//         $push: {
//           documents: {
//             _id: new mongoose.Types.ObjectId(),
//             fileName: doc.filename,
//             fileUrl: doc.fileUrl,
//             uploadDate: doc.uploadDate,
//             textContent: doc.textContent,
//             category: doc.category,
//           },
//         },
//       });

//       // Remove the document from ParkedUpload - Use deleteOne instead of removeOne
//       bulkRemoveParked.find({ _id: doc._id }).deleteOne();
//     });

//     // Execute both bulk operations
//     await bulkUpdateClaim.execute();
//     await bulkRemoveParked.execute();
//   } catch (error) {
//     console.error('Error processing batch:', error); // Add a log here
//     throw new Error('Batch processing failed');  // Throw an error to be caught in the calling function
//   }
// }

exports.moveDocumentsToClaim = async (req, res) => {
  const { claimId } = req.params;
  const { filter, batchSize } = req.body;  // Assuming filter and batchSize are sent in the request body

  try {
    const cursor = ParkedUpload.find(filter).cursor();
    let docsToMove = [];
    let counter = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      docsToMove.push(doc);
      counter++;

      if (counter >= (batchSize || 100)) {
        await processBatch(claimId, docsToMove);
        docsToMove = [];
        counter = 0;
      }
    }

    // Process any remaining documents
    if (docsToMove.length > 0) {
      await processBatch(claimId, docsToMove);
    }

    res.status(200).json({ message: 'Documents moved successfully!' });
  } catch (error) {
    console.error('Error moving documents:', error);
    res.status(500).json({ error: 'Failed to move documents' });
  }
};

// Helper function to process a batch of documents
async function processBatch(claimId, docsToMove) {
  try {
    const bulkUpdateClaim = Claim.collection.initializeUnorderedBulkOp();
    const bulkRemoveParked = ParkedUpload.collection.initializeUnorderedBulkOp();

    docsToMove.forEach((doc) => {
      // Add the document to the claim's documents array
      bulkUpdateClaim.find({ _id: claimId }).updateOne({
        $push: {
          documents: {
            _id: new mongoose.Types.ObjectId(),
            fileName: doc.filename,
            fileUrl: doc.fileUrl,
            uploadDate: doc.uploadDate,
            textContent: doc.textContent,
            category: doc.category,
          },
        },
      });

      // Remove the document from ParkedUpload - Use deleteOne instead of removeOne
      bulkRemoveParked.find({ _id: doc._id }).deleteOne();
    });

    // Execute both bulk operations
    await bulkUpdateClaim.execute();
    await bulkRemoveParked.execute();
  } catch (error) {
    console.error('Error processing batch:', error);
    throw new Error('Batch processing failed');
  }
}



exports.handleGetImage = (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
}; 



exports.handleGetFile = (req, res) => {
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
};

exports.getSignedUrl = async (req, res) => {
  const key = req.params.key;
  try { const url = await getSignedUrl(key)
res.status(200).json({url});    
  } catch (error) {
    res.status(500).json({error:'Failed to get signed URL'})
    
  }
}




// exports.uploadMiddleware = upload.single('document');
exports.uploadMiddleware = upload.array('documents', 10);


