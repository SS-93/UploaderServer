const mongoose = require('mongoose');

// Schema for individual match details (new)
const matchDetailSchema = new mongoose.Schema({
    claimNumber: String,
    claimantName: String,
    physicianName: String,
    dateOfInjury: Date,
    employerName: String,
    injuryDescription: String
});

// Schema for individual matches (new)
const matchResultSchema = new mongoose.Schema({
    score: Number,
    matchedFields: [String],
    confidence: {
        claimNumber: Number,
        name: Number,
        physicianName: Number,
        dateOfInjury: Number,
        employerName: Number,
        injuryDescription: Number
    },
    claim: matchDetailSchema,
    isRecommended: Boolean
});

// Updated match history schema
const matchHistorySchema = new mongoose.Schema({
    matchedAt: { type: Date, default: Date.now },
    score: Number,
    matchedFields: [String],
    confidence: Object,
    matchDetails: {
        claimNumber: String,
        claimantName: String,
        physicianName: String,
        dateOfInjury: Date,
        employerName: String
    },
    isRecommended: Boolean,
    // New fields
    totalMatches: { type: Number, default: 0 },
    topScore: { type: Number, default: 0 },
    allMatches: { type: [matchResultSchema], default: [] }
});

// Main upload schema (maintaining existing structure)
const uploadSchema = new mongoose.Schema({
    OcrId: { type: Number, required: true, unique: true },
    fileName: String,
    fileUrl: String,
    mimetype: String,
    textContent: String,
    category: String,
    uploadDate: { type: Date, default: Date.now },
    // Keep existing entities schema
    entities: {
        potentialClaimNumbers: [String],
        potentialClaimantNames: [String],
        potentialEmployerNames: [String],
        potentialInsurerNames: [String],
        potentialMedicalProviderNames: [String],
        potentialPhysicianNames: [String],
        potentialDatesOfBirth: [Date],
        potentialDatesOfInjury: [Date],
        potentialInjuryDescriptions: [String]
    },
    matchHistory: [matchHistorySchema],
    // Updated best match schema
    bestMatch: {
        score: Number,
        claimId: String,
        matchedAt: Date,
        matchDetails: matchDetailSchema,
        allMatches: [matchResultSchema]
    },
    processingStatus: {
        isProcessed: { type: Boolean, default: false },
        lastProcessed: Date
    }
});

const Upload = mongoose.model('Upload', uploadSchema);
const ParkedUpload = mongoose.model('ParkedUpload', uploadSchema);

module.exports = { Upload, ParkedUpload };
