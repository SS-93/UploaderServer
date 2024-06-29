const mongoose = require ("mongoose")

const uploadSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
    },
s3Url:{ type: String,
    required: true,

},
uploadDate: {
    type: Date,
    default: Date.now,
},

}); 


module.exports = mongoose.model ("Upload", uploadSchema);