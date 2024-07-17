const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimetype: { type: String, required: true},
  uploadDate: { type: Date, default: Date.now },
  claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true }
});

module.exports = mongoose.model('Upload', UploadSchema);


// const mongoose = require("mongoose");

// const uploadSchema = new mongoose.Schema({
//     filename: {
//         type: String,
//         required: true,
//     },
//     originalName: {
//         type: String,
//         required: true,
//     },
//     s3Url: {
//         type: String,
//         required: true,
//     },
//     uploadDate: {
//         type: Date,
//         default: Date.now,
//     },
// });

// module.exports = mongoose.model("Upload", uploadSchema);


// const mongoose = require ("mongoose")

// const uploadSchema = new mongoose.Schema({
//     filename: {
//         type: String,
//         required: true,
     
//     },
//     originalName: {
//         type: String, 
//         required: true,
//     },
// s3Url:{ type: String,
//     required: true,

// },
// uploadDate: {
//     type: Date,
//     default: Date.now,
// },

// }); 


// module.exports = mongoose.model ("Upload", uploadSchema);