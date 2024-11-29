const mongoose = require('mongoose');

// 1. First, define the EntitySchema
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

// 2. Define MatchDetailSchema before using it
const MatchDetailSchema = new mongoose.Schema({
    score: { type: Number, required: true },
    matchedAt: { type: Date, default: Date.now },
    matchedFields: [String],
    confidence: {
        claimNumber: Number,
        name: Number,
        employerName: Number,
        dateOfInjury: Number,
        physicianName: Number
    },
    matchDetails: {
        claimNumber: String,
        name: String,
        employerName: String,
        dateOfInjury: Date,
        physicianName: String
    },
    isRecommended: { type: Boolean, default: false },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' }
});

// 3. Define MatchHistorySchema after MatchDetailSchema
const MatchHistorySchema = new mongoose.Schema({
    processedAt: { type: Date, default: Date.now },
    score: { type: Number, required: true },
    isRecommended: { type: Boolean, default: false },
    matches: MatchDetailSchema,
    claim: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'ClaimModel' },
        claimNumber: String,
        name: String,
        date: Date,
        adjuster: String,
        employerName: String,
        injuryDescription: String,
        physicianName: String,
        dateOfBirth: Date
    }
});

// 4. Define ParkingSchema after all required schemas
const ParkingSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimetype: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    textContent: { type: String, default: '' },
    category: { type: String, default: 'Uncategorized' },
    OcrId: { type: Number, required: true, unique: true },
    entities: { type: EntitySchema },
    matchHistory: [MatchDetailSchema],
    bestMatch: {
        score: Number,
        claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
        matchedAt: Date
    },
    processingStatus: {
        isProcessed: { type: Boolean, default: false },
        lastProcessed: Date,
        error: String
    }
});

// 5. Define UploadSchema after all required schemas
const UploadSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimetype: { type: String, required: true },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },
    OcrId: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now },
    textContent: { type: String, default: '' },
    category: { type: String, default: 'Uncategorized' },
    entities: { type: EntitySchema },
    matchHistory: [MatchDetailSchema],
    bestMatch: {
        score: Number,
        claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
        matchedAt: Date
    },
    sortingHistory: [{
        attemptedAt: { type: Date, default: Date.now },
        success: Boolean,
        method: { type: String, enum: ['auto', 'manual'] },
        targetClaimId: mongoose.Schema.Types.ObjectId,
        score: Number,
        error: String
    }]
});

// 6. Create models after all schemas are defined
const ParkedUpload = mongoose.model('ParkedUpload', ParkingSchema);
const Upload = mongoose.model('Upload', UploadSchema);
const MatchHistory = mongoose.model('MatchHistory', MatchHistorySchema);

module.exports = { 
    Upload, 
    ParkedUpload,
    MatchHistory 
};
