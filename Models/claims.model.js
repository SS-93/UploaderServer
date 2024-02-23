const mongoose = require ('mongoose')



const ClaimSchema = new mongoose.Schema({

    claimnumber: { type: String,
    required: true},

    name:{ type: String, required: true},

    date: {type: Date,
    required: false},

    adjuster: { type: String,
    required: false},


});

module.exports = mongoose.model ('ClaimModel', ClaimSchema)
