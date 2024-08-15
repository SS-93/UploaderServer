const mongoose = require('mongoose');

// Schema for parked documents (not yet associated with a claim)
const ParkingSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimetype: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  textContent: { type: String, default: '' },
  category: { type: String, required: false },
});

// Schema for regular uploads (associated with a claim)
const UploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimetype: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },  // claimId is required here
});

// Create models for both schemas
const ParkedUpload = mongoose.model('ParkedUpload', ParkingSchema);
const Upload = mongoose.model('Upload', UploadSchema);

module.exports = { Upload, ParkedUpload };


// const mongoose = require('mongoose');


// // Schema for parked documents (not yet associated with a claim)
// const ParkingSchema = new mongoose.Schema({
//   filename: { type: String, required: true },
//   originalName: { type: String, required: true },
//   fileUrl: { type: String, required: true },
//   mimetype: { type: String, required: true },
//   uploadDate: { type: Date, default: Date.now },
//   textContent: { type: String, default: '' },
//   category: { type: String, required: false },
// });

// const UploadSchema = new mongoose.Schema({
//   filename: { type: String, required: true },
//   originalName: { type: String, required: true },
//   fileUrl: { type: String, required: true },
//   mimetype: { type: String, required: true},
//   uploadDate: { type: Date, default: Date.now },
//   claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true }
// });

// module.exports = mongoose.model('Upload', UploadSchema, ParkingSchema);


// // const mongoose = require("mongoose");

// // const uploadSchema = new mongoose.Schema({
// //     filename: {
// //         type: String,
// //         required: true,
// //     },
// //     originalName: {
// //         type: String,
// //         required: true,
// //     },
// //     s3Url: {
// //         type: String,
// //         required: true,
// //     },
// //     uploadDate: {
// //         type: Date,
// //         default: Date.now,
// //     },
// // });

// // module.exports = mongoose.model("Upload", uploadSchema);


// // const mongoose = require ("mongoose")

// // const uploadSchema = new mongoose.Schema({
// //     filename: {
// //         type: String,
// //         required: true,
     
// //     },
// //     originalName: {
// //         type: String, 
// //         required: true,
// //     },
// // s3Url:{ type: String,
// //     required: true,

// // },
// // uploadDate: {
// //     type: Date,
// //     default: Date.now,
// // },

// // }); 


// // module.exports = mongoose.model ("Upload", uploadSchema);