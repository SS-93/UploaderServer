
// Controllers/upload.controller.
const multer = require('multer');
const { ParkedUpload, Upload} = require('../Models/upload.model'); // Adjust the path to your actual model file
const { uploadFile, getFileStream, getSignedUrl } = require('../S3');

const mongoose = require('mongoose')


const Claim = require('../Models/claims.model');


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
      message: `${uploadedFiles.length} file(s) uploaded successfully and associated with the                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            claim`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Error saving file(s) to database:', error);
    res.status(500).json({ error: 'Failed to save file information' });
  }
};


const generateUniqueDocumentId = async () => {
  let isUnique = false;
  let documentId;
  
  while (!isUnique) {
    // Generate random 4-digit number
    documentId = Math.floor(1000 + Math.random() * 9000);
    
    // Check if this documentId already exists in the ParkedUpload collection
    const existingDocument = await ParkedUpload.findOne({ documentId });
    if (!existingDocument) {
      isUnique = true; // If no document found, this ID is unique
    }
  }

  return documentId;
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

 const documentId = await generateUniqueDocumentId();

      const newUpload = new ParkedUpload({
        filename: result.Key,
        originalName: file.originalname,
        fileUrl: signedUrl,
        mimetype: file.mimetype,
        parkId: parkId, // Ensure parkId is passed correctly
        documentId: documentId, // Ensure documentId is passed correctly
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


// exports.updateParkDocuments = async (req, res) => {
//   const { parkId } = req.params; // Extract parkId from the request
//   const updates = req.body; // Array of document updates

//   try {
//     // Fetch the park by ID
//     const park = await Park.findById(parkId);

//     if (!park) {
//       return res.status(404).json({ message: 'Park not found' });
//     }

//     // Iterate over each update and apply changes
//     updates.forEach((update) => {
//       const document = park.documents.id(update._id); // Find the document by its ID

//       if (document) {
//         if (update.fileName !== undefined) document.fileName = update.fileName;
//         if (update.category !== undefined) document.category = update.category;
//       } else {
//         console.warn(`Document with ID ${update._id} not found`);
//       }
//     });

//     // Save the updated park with modified documents
//     await park.save();

//     res.status(200).json({ message: 'Documents updated successfully' });
//   } catch (err) {
//     console.error('Error updating park documents:', err);
//     res.status(500).json({ error: 'Failed to update park documents' });
//   }
// };

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


//! IN USE

// Function to edit document details such as filename, category, etc.
// exports.editDocumentDetails = async (req, res) => {
//   const { documentId } = req.params;
//   const updates = req.body; // Object containing the updates for the document

//   try {
//     // Find the document by its documentId
//     const document = await ParkedUpload.findOne({ documentId });
//     if (!document) {
//       return res.status(404).json({ error: 'Document not found' });
//     }

//     // Update document fields based on the provided updates
//     if (updates.fileName !== undefined) document.filename = updates.fileName;
//     if (updates.category !== undefined) document.category = updates.category;
//     // Add more fields here if needed
//     if (updates.mimetype !== undefined) document.mimetype = updates.mimetype;

//     // Save the updated document
//     await document.save();

//     res.status(200).json({ message: 'Document updated successfully', document });
//   } catch (err) {
//     console.error('Error updating document:', err);
//     res.status(500).json({ error: 'Failed to update document' });
//   }
// };

exports.editDocumentDetails = async (req, res) => {
  const { documentId } = req.params;  // Ensure that documentId is extracted from the request params
  const updates = req.body;           // The updates sent in the request body

  try {
    // Validate if documentId is a valid number
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const document = await ParkedUpload.findOne({ documentId: Number(documentId) });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Apply updates
    if (updates.fileName !== undefined) document.filename = updates.fileName;
    if (updates.category !== undefined) document.category = updates.category;

    // Save the updated document
    await document.save();

    res.status(200).json({ message: 'Document updated successfully', document });
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({ error: 'Failed to update document' });
  }
};


// exports.editDocumentDetails = async (req, res) => {
//   const { id } = req.params; // Document ID from the request parameters
//   const updates = req.body; // Object containing the updates for the document

//   try {
//     // Find the document by its ID
//     const document = await ParkedUpload.findById(documentId);

//     if (!document) {
//       return res.status(404).json({ message: 'Document not found' });
//     }

//     // Update document fields based on the provided updates
//     if (updates.fileName !== undefined) document.filename = updates.fileName;
//     if (updates.category !== undefined) document.category = updates.category;
//     // Add more fields here if needed

//     // Save the updated document
//     await document.save();

//     res.status(200).json({ message: 'Document updated successfully', document });
//   } catch (err) {
//     console.error('Error updating document:', err);
//     res.status(500).json({ error: 'Failed to update document' });
//   }
// };

exports.updateDocumentTextContent = async (req, res) => {
  const { id } = req.params;ß
  const { textContent } = req.body;

  try {
      const document = await ParkedUpload.findByIdAndUpdate(id);

      if (!document) {
          return res.status(404).json({ message: 'Document not found' });
      }

      document.textContent = textContent;
      await document.save();

      res.status(200).json({ message: 'Document text content updated successfully', document });
  } catch (err) {
      console.error('Error updating document text content:', err);
      res.status(500).json({ error: 'Failed to update document text content' });
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


// Update multiple or single document details (filename, category)
// upload.controller.js
//! Remove
exports.updateDocumentDetailsById = async (req, res) => {
  const { documentId } = req.params;  // Get documentId from the URL parameter
  console.log(`Received request to update document with ID: ${documentId}`);

  try {
    // Find the document by its documentId field
    const document = await ParkedUpload.findOne({ documentId: Number(documentId) });

    if (!document) {
      console.error(`Document with ID ${documentId} not found.`);
      return res.status(404).json({ message: 'Document not found' });
    }

    const updates = req.body;  // This contains the updated fields like fileName, category
    if (updates.fileName !== undefined) document.filename = updates.fileName;
    if (updates.category !== undefined) document.category = updates.category;

    // Save the updated document
    await document.save();

    return res.status(200).json({ message: 'Document updated successfully', document });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ error: 'Failed to update document' });
  }
};

//! Remove
// controller/documentController.js
exports.updateDocumentsBatch = async (req, res) => {
  try {
    const updates = req.body; // Expecting an array of document updates

    // Iterate over the updates and apply changes
    const updatePromises = updates.map((update) =>
      ParkedUpload.findOneAndUpdate(
        { documentId: update.documentId },
        { filename: update.fileName, category: update.category },
        { new: true }
      )
    );

    const updatedDocuments = await Promise.all(updatePromises);

    return res.status(200).json({ message: 'Documents updated successfully', updatedDocuments });
  } catch (error) {
    console.error('Error updating documents:', error);
    return res.status(500).json({ message: 'Error updating documents', error });
  }
};

// controller/documentController.js
exports.updateMultipleDocuments = async (req, res) => {
  try {
    const updates = req.body; // Expecting an array of document updates

    // Iterate over each update and apply changes to the respective documents
    const updatePromises = updates.map(update => {
      return ParkedUpload.findOneAndUpdate(
        { documentId: update.documentId },
        { filename: update.fileName, category: update.category },
        { new: true }
      );
    });

    // Wait for all the documents to be updated
    const updatedDocuments = await Promise.all(updatePromises);

    return res.status(200).json({ message: 'Documents updated successfully', updatedDocuments });
  } catch (error) {
    console.error('Error updating documents:', error);
    return res.status(500).json({ message: 'Failed to update documents', error });
  }
};

exports.editDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { fileName, category } = req.body;

    // Find the document by documentId and update its fileName and category
    const updatedDocument = await Document.findOneAndUpdate(
      { documentId },
      { filename: fileName, category },
      { new: true }
    );

    if (!updatedDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }

    return res.status(200).json({ message: 'Document updated successfully', updatedDocument });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ message: 'Error updating document', error });
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
      // Initialize bulk operations for both Claim and ParkedUpload collections
      const bulkUpdateClaim = Claim.collection.initializeUnorderedBulkOp();
      const bulkRemoveParked = ParkedUpload.collection.initializeUnorderedBulkOp();

      docsToMove.forEach((doc) => {
          console.log(`Adding document ${doc._id} to Claim ${claimId}`);

          // Add the document to the claim's documents array using $push
          bulkUpdateClaim.find({ _id: new mongoose.Types.ObjectId(claimId) }).updateOne({
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

          // Remove the document from ParkedUpload
          bulkRemoveParked.find({ _id: doc._id }).deleteOne();
      });

      // Execute both bulk operations only if there are operations queued
      if (bulkUpdateClaim.s.currentBatch && bulkUpdateClaim.s.currentBatch.operations.length > 0) {
          await bulkUpdateClaim.execute();
      } else {
          console.log("No operations to execute in bulkUpdateClaim.");
      }

      if (bulkRemoveParked.s.currentBatch && bulkRemoveParked.s.currentBatch.operations.length > 0) {
          await bulkRemoveParked.execute();
      } else {
          console.log("No operations to execute in bulkRemoveParked.");
      }
  } catch (error) {
      console.error('Error processing batch:', error);
      throw new Error('Batch processing failed');
  }
}

// New function to move a single document from ParkedUpload to a Claim
exports.moveSingleDocumentToClaim = async (req, res) => {
  const { claimId, documentId } = req.params;  // Get claimId and documentId from request parameters

  try {
    // Find the document in ParkedUpload by its documentId
    const doc = await ParkedUpload.findById(documentId);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Initialize bulk operations for Claim and ParkedUpload
    const bulkUpdateClaim = Claim.collection.initializeUnorderedBulkOp();
    const bulkRemoveParked = ParkedUpload.collection.initializeUnorderedBulkOp();

    // Add the document to the claim's documents array
    bulkUpdateClaim.find({ _id: new mongoose.Types.ObjectId(claimId) }).updateOne({
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

    // Remove the document from ParkedUpload
    bulkRemoveParked.find({ _id: doc._id }).deleteOne();

    // Execute both bulk operations
    if (bulkUpdateClaim.s.currentBatch && bulkUpdateClaim.s.currentBatch.operations.length > 0) {
      await bulkUpdateClaim.execute();
    }

    if (bulkRemoveParked.s.currentBatch && bulkRemoveParked.s.currentBatch.operations.length > 0) {
      await bulkRemoveParked.execute();
    }

    res.status(200).json({ message: 'Document moved successfully!' });
  } catch (error) {
    console.error('Error moving document:', error);
    res.status(500).json({ error: 'Failed to move document' });
  }
};

// update text content to

// exports.updateDocumentTextContent = async (req, res) => {
//   const { documentId } = req.params; // Document ID from the request parameters
//   const { textContent } = req.body; // Extract text content from the request body

//   try {
//     // Find the document by its ID
//     const document = await ParkedUpload.findById(documentId);

//     if (!document) {
//       return res.status(404).json({ message: 'Document not found' });
//     }

//     // Update document's textContent field
//     document.textContent = textContent;

//     // Save the updated document
//     await document.save();

//     res.status(200).json({ message: 'Document text content updated successfully', document });
//   } catch (err) {
//     console.error('Error updating document text content:', err);
//     res.status(500).json({ error: 'Failed to update document text content' });
//   }
// };


//? OCR

// Function to save or update OCR text for a document by documentId
exports.saveOcrText = async (req, res) => {
  const { documentId, ocrTextContent } = req.body; // Extract documentId and OCR text

  try {
    // Find the parked upload by its documentId
    const document = await ParkedUpload.findOne({ documentId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Update the document's textContent with the new OCR text
    document.textContent = ocrTextContent;

    // Save the updated document
    await document.save();

    res.status(200).json({ message: 'OCR text content saved successfully', document });
  } catch (err) {
    console.error('Error saving OCR text content:', err);
    res.status(500).json({ error: 'Failed to save OCR text content' });
  }
};

// Controller to fetch document by documentId
exports.getDocumentByDocumentId = async (req, res) => {
  const { documentId } = req.params;

  try {
    const document = await ParkedUpload.findOne({ documentId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json({ document });
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};
exports.updateDocumentDetails = async (req, res) => {
  try {
    // Extract and convert documentId to a number
    const documentId = Number(req.params.documentId);

    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid documentId' });
    }

    const { textContent } = req.body;  // Assuming you're updating the textContent

    // Find the document by documentId
    const document = await ParkedUpload.findOne({ documentId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document details (in this case, textContent)
    document.textContent = textContent;
    await document.save();

    res.status(200).json({ message: 'Document updated successfully', document });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};




// exports.updateOcrTextByDocumentId = async (req, res) => {
//   const { documentId, ocrTextContent } = req.body;  // Extracting documentId and ocrTextContent

//   try {
//     // Find the parked upload by its documentId
//     const document = await ParkedUpload.findOne({ documentId });
//     if (!document) {
//       return res.status(404).json({ message: 'Document not found' });
//     }

//     // Create a new OCR text entry linked to the documentId
//     const ocrText = new OcrText({
//       documentUrl: document.fileUrl,  // Using the file URL from the found document
//       documentId: documentId,
//       ocrTextContent: ocrTextContent
//     });

//     // Save the OCR text extraction
//     await ocrText.save();

//     res.status(200).json({ message: 'OCR text content added successfully', ocrText });
//   } catch (err) {
//     console.error('Error updating OCR text content:', err);
//     res.status(500).json({ error: 'Failed to update OCR text content' });
//   }
// };

// // Fetch all OCR text entries by documentId
// exports.getOcrTextsByDocumentId = async (req, res) => {
//   const { documentId } = req.params;

//   try {
//     const ocrTexts = await OcrText.find({ documentId });

//     if (!ocrTexts || ocrTexts.length === 0) {
//       return res.status(404).json({ message: 'No OCR text found for the given documentId' });
//     }

//     res.status(200).json({ ocrTexts });
//   } catch (err) {
//     console.error('Error fetching OCR text content:', err);
//     res.status(500).json({ error: 'Failed to fetch OCR text content' });
//   }
// };






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


// Helper function to process a batch of documents
// async function processBatch(claimId, docsToMove) {
//   try {
//     const bulkUpdateClaim = Claim.collection.initializeUnorderedBulkOp();
//     const bulkRemoveParked = ParkedUpload.collection.initializeUnorderedBulkOp();

//     console.log("Bulk Update Collection:", Claim.collection.collectionName);  // Log collection name
//     console.log("Bulk Remove Collection:", ParkedUpload.collection.collectionName);  // Log collection name


//     docsToMove.forEach((doc) => {
//       console.log(`Processing document with ID: ${doc._id} to be added to Claim ID: ${claimId}`);  // Log each document being processed

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
//       console.log(`Adding document ${doc._id} to Claim ${claimId}`);

//       // Remove the document from ParkedUpload - Use deleteOne instead of removeOne
//       // bulkRemoveParked.find({ _id: doc._id }).deleteOne();
//     });

//     // Execute both bulk operations
//     await bulkUpdateClaim.execute();
//     await bulkRemoveParked.execute();
//     console.log("Bulk operations executed successfully.");
//   } catch (error) {
//     console.error('Error processing batch:', error);
//     throw new Error('Batch processing failed');
//   }
// }

// async function processBatch(claimId, docsToMove) {
//   try {
//     const bulkUpdateClaim = Claim.collection.initializeUnorderedBulkOp();
//     const bulkRemoveParked = ParkedUpload.collection.initializeUnorderedBulkOp();

//     console.log("Bulk Update Collection:", Claim.collection.collectionName);
//     console.log("Bulk Remove Collection:", ParkedUpload.collection.collectionName);

//     docsToMove.forEach((doc) => {
//       console.log(`Processing document with ID: ${doc._id} to be added to Claim ID: ${claimId}`);
      
//       // Log document fields
//       console.log('Document details:', {
//         fileName: doc.filename,
//         fileUrl: doc.fileUrl,
//         uploadDate: doc.uploadDate,
//         textContent: doc.textContent,
//         category: doc.category,
//       });

//       // Correct usage of new ObjectId
//       const updateCondition = { _id: new mongoose.Types.ObjectId(claimId) };  // Corrected line
//       console.log('Update condition for claim:', updateCondition);
      
//       bulkUpdateClaim.find(updateCondition).updateOne({
//         $push: {
//           documents: {
//             _id: new mongoose.Types.ObjectId(),  // Corrected line for creating a new ObjectId
//             fileName: doc.filename,
//             fileUrl: doc.fileUrl,
//             uploadDate: doc.uploadDate,
//             textContent: doc.textContent,
//             category: doc.category,
//           },
//         },
//       });

//       console.log(`Adding document ${doc._id} to Claim ${claimId}`);

//       // Correct usage of new ObjectId for removal
//       const removeCondition = { _id: new mongoose.Types.ObjectId(doc._id) };  // Corrected line
//       console.log('Remove condition for parked upload:', removeCondition);
      
//       bulkRemoveParked.find(removeCondition).deleteOne();
//     });

//     // Check if there are any operations to execute
//     if (bulkUpdateClaim.s.batches.length > 0) {
//       console.log("Executing bulk update claim operation...");
//       await bulkUpdateClaim.execute();
//     } else {
//       console.log("No operations to execute in bulkUpdateClaim.");
//     }

//     if (bulkRemoveParked.s.batches.length > 0) {
//       console.log("Executing bulk remove parked operation...");
//       await bulkRemoveParked.execute();
//     } else {
//       console.log("No operations to execute in bulkRemoveParked.");
//     }

//   } catch (error) {
//     console.error('Error processing batch:', error);
//     throw new Error('Batch processing failed');
//   }
// }