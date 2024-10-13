// // Controllers/ocr.controller.js

// const OcrTextsUnited = require('../Models/ocr.model');
// const ParkedUpload = require('../Models/upload.model'); // Ensure this is correctly imported

// exports.updateOcrTextByDocumentId = async (req, res) => {
//   const { documentId, ocrTextContent } = req.body;

//   try {
//     // Find the parked upload by its documentId
//     const document = await ParkedUpload.findOne({ documentId });
//     if (!document) {
//       return res.status(404).json({ message: 'Document not found' });
//     }

//     // Create a new OCR text entry linked to the documentId
//     const ocrText = new OcrTextsUnited({
//       documentUrl: document.fileUrl, // Using the file URL from the found document
//       documentId: documentId,
//       ocrTextContent: ocrTextContent,
//     });

//     // Save the OCR text extraction
//     await ocrText.save();

//     res.status(200).json({ message: 'OCR text content added successfully', ocrText });
//   } catch (err) {
//     console.error('Error updating OCR text content:', err);
//     res.status(500).json({ error: 'Failed to update OCR text content' });
//   }
// };

// exports.getOcrTextsByDocumentId = async (req, res) => {
//   const { documentId } = req.params;

//   try {
//     const ocrTexts = await OcrTextsUnited.find({ documentId });

//     if (!ocrTexts || ocrTexts.length === 0) {
//       return res.status(404).json({ message: 'No OCR text found for the given documentId' });
//     }

//     res.status(200).json({ ocrTexts });
//   } catch (err) {
//     console.error('Error fetching OCR text content:', err);
//     res.status(500).json({ error: 'Failed to fetch OCR text content' });
//   }
// };



// UploaderServer/Server/Controllers/claims.controller.js
const Claim = require('../Models/claims.model');
const Upload = require('../Models/upload.model');

// Other controller functions like getAllClaims, uploadDocument, etc.

// Save OCR Text Controller Function
const saveOcrText = async (req, res) => {
  const { claimId, ocrId } = req.params;
  const { textContent } = req.body;

  try {
    // Validate input
    if (!textContent || textContent.trim() === '') {
      return res.status(400).json({ message: 'OCR text content is required' });
    }

    // Find and update the document's textContent inside the claim document array
    const updatedClaim = await Claim.findOneAndUpdate(
      { _id: claimId, 'documents.OcrId': ocrId }, // Match both claim and document
      { $set: { 'documents.$.textContent': textContent } }, // Directly update the textContent
      { new: true, runValidators: true } // Return the updated document
    );

    if (!updatedClaim) {
      return res.status(404).json({ message: 'Claim or document not found' });
    }

    res.status(200).json({ message: 'OCR text updated successfully', updatedClaim });
  } catch (error) {
    console.error('Error updating OCR text:', error);
    res.status(500).json({ message: 'Failed to update OCR text', error: error.message });
  }
};

// Export Controller Functions
module.exports = {

  saveOcrText,
};