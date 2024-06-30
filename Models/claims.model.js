const mongoose = require ('mongoose')


const DocumentSchema = new mongoose.Schema ({
    fileName: String,
    fileUrl: String,
    uploadDate: {
        type: Date,
        default: Date.now
    }
});


const ClaimSchema = new mongoose.Schema({

    claimnumber: { type: String,
    required: true},

    name:{ type: String, required: true},

    date: {type: Date,
    required: false},

    adjuster: { type: String,
    required: false},
    documents: [DocumentSchema],


});

module.exports = mongoose.model ('ClaimModel', ClaimSchema)
