const mongoose = require('mongoose');

// Schema for parked documents (not yet associated with a claim)
const ParkingSchema = new mongoose.Schema({
  fileName: { type: String, required: true },

  fileUrl: { type: String, required: true },
  mimetype: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  textContent: { type: String, default: '' },
  category: { type: String, required: false },

  OcrId: { type: Number, required: true, unique: true },
  
    // documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkedUpload', required: false },
});



// Schema for regular uploads (associated with a claim)
const UploadSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimetype: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },  // claimId is required here
});

// const OcrTextSchema = new mongoose.Schema({
//   documentUrl: { type: String, required: true },  // Still tracking document URL for convenience
//   OcrId: { type: String, required: true },   // Track the documentId for each OCR text extraction
//   documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkedUpload', required: true },
//   createdAt: { type: Date, default: Date.now },   // Timestamp for when the OCR extraction was created
//   updatedAt: { type: Date, default: Date.now }    // Timestamp for the last update
// });




// Create models for both schemas



// Create models for both schemas
const ParkedUpload = mongoose.model('ParkedUpload', ParkingSchema);
const Upload = mongoose.model('Upload', UploadSchema);
// const OcrText = mongoose.model('OcrText', OcrTextSchema);

module.exports = { Upload, ParkedUpload };


