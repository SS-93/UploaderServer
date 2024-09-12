const mongoose = require('mongoose');

// Schema for storing OCR text linked to a document
const OcrTextSchemaII = new mongoose.Schema({
  documentUrl: { type: String, required: true },  // Still tracking document URL for convenience
  documentId: { type: String, required: true },   // Track the documentId for each OCR text extraction
  ocrTextContent: { type: String, required: true }, // The extracted text
  createdAt: { type: Date, default: Date.now },   // Timestamp for when the OCR extraction was created
  updatedAt: { type: Date, default: Date.now }    // Timestamp for the last update
});

const OcrTextsUnited = mongoose.model('OcrTextUnited', OcrTextSchemaII);

module.exports = OcrTextsUnited;
