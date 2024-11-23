const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema ({
    fileName: String,
    fileUrl: String,
    uploadDate: {
        type: Date,
        default: Date.now
    },
    textContent:{
        type: String, 
        default: '',
    },
    category: {
        type: String, 
        required: false
    },
    OcrId: {
        type: Number,
        required: false, 
        unique: false,
    },
});

const MatchHistorySchema = new mongoose.Schema({
    documentId: {
        type: String,  // OcrId of the document
        required: false
    },
    score: {
        type: Number,
        required: false
    },
    matchedFields: [{
        type: String
    }],
    confidence: {
        type: Map,
        of: Number
    },
    matchDate: {
        type: Date,
        default: Date.now
    },
    isAccepted: {
        type: Boolean,
        default: false
    }
});

const ClaimSchema = new mongoose.Schema({
    claimnumber: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    adjuster: {
        type: String,
        required: true,
    },
    employerName: {
        type: String,
        default: '',
    },
    injuryDescription: {
        type: String,
        default: '',
    },
    physicianName: {
        type: String,
        default: '',
    },
    documents: [{
        fileName: String,
        fileUrl: String,
        category: String,
        OcrId: Number,
        textContent: String
    }],
    matchHistory: [MatchHistorySchema]
});

// Maintain existing indexes
ClaimSchema.index({ claimnumber: 1 }, { background: true });
ClaimSchema.index({ name: 1 }, { background: true });
ClaimSchema.index({ date: -1 }, { background: true });
ClaimSchema.index({ adjuster: 1 }, { background: true });

// Add new indexes for the new fields
ClaimSchema.index({ employerName: 1 }, { background: true });
ClaimSchema.index({ physicianName: 1 }, { background: true });

// Update text indexes to include new fields
ClaimSchema.index({ 
    'documents.textContent': 'text',
    'documents.fileName': 'text',
    claimnumber: 'text',
    name: 'text',
    adjuster: 'text',
    employerName: 'text',
    injuryDescription: 'text',
    physicianName: 'text'
}, {
    weights: {
        'documents.textContent': 10,
        'documents.fileName': 5,
        claimnumber: 3,
        name: 2,
        adjuster: 1,
        employerName: 2,
        injuryDescription: 4,
        physicianName: 1
    },
    name: "TextSearchIndex"
});

const ClaimModel = mongoose.model('ClaimModel', ClaimSchema);

module.exports = ClaimModel;
