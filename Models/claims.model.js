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
        default: Date.now,
     
    },
    adjuster: {
        type: String,
        required: true,
       
    },
    documents: [{
        fileName: String,
        fileUrl: String,
        category: String,
        OcrId: Number,
        textContent: String
    }]
});

// Add just the indexes
ClaimSchema.index({ claimnumber: 1 }, { background: true });
ClaimSchema.index({ name: 1 }, { background: true });
ClaimSchema.index({ date: -1 }, { background: true });
ClaimSchema.index({ adjuster: 1 }, { background: true });

// Add text indexes for document content
ClaimSchema.index({ 
  'documents.textContent': 'text',
  'documents.fileName': 'text',
  claimnumber: 'text',
  name: 'text',
  adjuster: 'text'
}, {
  weights: {
    'documents.textContent': 10,
    'documents.fileName': 5,
    claimnumber: 3,
    name: 2,
    adjuster: 1
  },
  name: "TextSearchIndex"
});

const ClaimModel = mongoose.model('ClaimModel', ClaimSchema);

module.exports = ClaimModel;
