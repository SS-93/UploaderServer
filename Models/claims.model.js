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

const ClaimModel = mongoose.model('ClaimModel', ClaimSchema);

module.exports = ClaimModel;
