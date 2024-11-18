const mongoose = require('mongoose');

const EntitySchema = new mongoose.Schema({
  potentialClaimNumbers: [String],
  potentialClaimantNames: [String],
  potentialEmployerNames: [String],
  potentialInsurerNames: [String],
  potentialMedicalProviderNames: [String],
  potentialPhysicianNames: [String],
  potentialDatesOfBirth: [String],
  potentialDatesOfInjury: [String],
  potentialInjuryDescriptions: [String]
}, { _id: false });

// Schema for parked documents (not yet associated with a claim)
const ParkingSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimetype: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  textContent: { type: String, default: '' },
  category: { type: String, required: false },
  OcrId: { type: Number, required: true, unique: true },
  entities: { type: EntitySchema, required: false }
});

// Schema for regular uploads (associated with a claim)
const UploadSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  claimId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
    required: true
  },
  OcrId: {
    type: Number,
    required: true
  }
});

// Create models for both schemas
const ParkedUpload = mongoose.model('ParkedUpload', ParkingSchema);
const Upload = mongoose.model('Upload', UploadSchema);

module.exports = { Upload, ParkedUpload };
