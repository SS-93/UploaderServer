// Controllers/upload.controller.js
const multer = require('multer');
const Upload = require('../Models/upload.model'); // Adjust the path to your actual model file
const { uploadFile, getFileStream, getSignedUrl } = require('../S3');

// Configure multer to use a specific destination
const upload = multer({ dest: 'uploads/' });

exports.uploadSingleFile = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File is missing' });
  }

  try {
    const result = await uploadFile(file); // Upload to S3
    console.log('S3 Upload Result', result);

    const signedUrl = getSignedUrl(result.Key); // Generate signed URL

    const newUpload = new Upload({
      filename: file.filename,
      originalName: file.originalname,
      fileUrl: signedUrl, // Save the signed URL
      claimId: req.body.claimId, // Ensure claimId is passed and saved
    });
    await newUpload.save();

    res.status(200).json({ message: 'File uploaded successfully', file: newUpload });
  } catch (error) {
    console.error('Error saving file to database:', error);
    res.status(500).json({ error: 'Failed to save file information' });
  }
};

exports.handleGetImage = (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
};





// Export the multer middleware
exports.uploadMiddleware = upload.single('document');


// const { uploadFile, getFileStream } = require('../S3')

// const handleUpload = async (req, res) => {
//   const file = req.file;
//   if(!file) {
//     return res.status(400).json({error: 'File is Missing'})
//  }

//  try { const result = await uploadFile(file);
//   console.log('S3 Upload Result', result)
//   res.json ({imageUrl: result.Location});

  
//  } catch (error) {
//   console.error ('Error uploading to S3:', error);
//   res.status(500).json({error: 'Failed to upload to S3'})
  
//  }
// };

// const handleGetImage = (req, res) => {
//   const key = req.params.key;
//   const readStream = getFileStream(key)
//   readStream.pipe(res)
// };


// module.exports = { handleUpload, handleGetImage}










// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const AWS = require("aws-sdk")
// const Upload = require("../Models/upload.model");



// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.AWS_BUCKET_NAME,
//     acl: "public-read",
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     metadata: (req, file, cb) => {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: (req, file, cb) => {
//       cb(null, `${Date.now().toString()}-${file.originalname}`);
//     },
//   }),
// });

// const uploadFiles = upload.array("files", 10);

// exports.uploadFiles = async (req, res) => {
//   try {
//     await new Promise((resolve, reject) => {
//       uploadFiles(req, res, (err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });

//     const uploads = req.files.map((file) => ({
//       filename: file.originalname,
//       s3Url: file.location,
//     }));

//     await Upload.insertMany(uploads);
//     res.status(200).send("Files uploaded and saved successfully");
//   } catch (err) {
//     res.status(500).send("Failed to upload file or save file details");
//   }
// };

// Test S3 connection
// (async () => {
//   try {
//     await s3.putObject({
//       Body: "Hello World",
//       Bucket: process.env.
// AWS_BUCKET_NAME,
//       Key: "TestingII.txt",
//     }).promise();
//     console.log("Test file uploaded successfully");
//   } catch (error) {
//     console.error("Failed to upload test file", error);
//   }
// })();





// const multer = require ("multer")
// const multerS3 = require ("multer-s3")
// const AWS = require ('aws-sdk')
// const Upload = require("../Models/upload.model")

// const s3 = new AWS.S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: process.env.AWS_REGION
//   });


// const upload = multer({


  
//     storage: multerS3({
//       s3: s3,
//       bucket: process.env.
// AWS_BUCKET_NAME,
//       acl: "public-read",
//       contentType: multerS3.AUTO_CONTENT_TYPE,
//       metadata: (req, file, cb) => {
//         cb(null, { fieldName: file.fieldname });
//       },
//       key: (req, file, cb) => {
//         cb(null, `${Date.now().toString()}-${file.originalname}`);
//       },
//     }),
  
// })



// const uploadFiles = upload.array("files", 10);

// exports.uploadFiles = async (req, res) => {
//     try { 
//         await new Promise ((resolve, reject)=> {
//             uploadFiles(req, res, (err )=> {
//                 if (err) reject (err);
//                 else resolve();
//             });
//         });
//     const uploads = req.files.map(file => ({
//         filename: file.originalname,
//         s3Url: file.location,
//     }));

//     await Upload.insertMany(uploads);
//     res.status(200).send("Files uploaded and saved successfully")
        
//     } catch (err) {
//         res.status(500).send("Failed to upload File or save File details")
        
//     }
// };


// (async () => {
//     try {
//       await s3.putObject({
//         Body: "Hello World",
//         Bucket: iluploadmetest,
//         Key: "TestingII.txt",
//       }).promise();
//       console.log("Test file uploaded successfully");
//     } catch (error) {
//       console.error("Failed to upload test file", error);
//     }
//   })();



// const { uploadFile, getFileStream } = require('../S3')

// const multer = require('multer');
// const Upload = require('../Models/upload.model');

// const upload = multer ({ dest: 'uploads/'});

// exports.uploadSingleFile = async (req, res) => {
//   const file = req.file;

//   if (!file) {
//     return res.status(400).json({ error: 'File is missing' });
//   }

//   try {
//     const result = await uploadFile(file); // Upload to S3
//     console.log('S3 Upload Result', result);

//     const newUpload = new Upload({
//       filename: file.filename,
//       originalName: file.originalname,
//       fileUrl: result.Location, // Save the S3 URL
//     });

//     await newUpload.save();

//     res.status(200).json({ message: 'File uploaded successfully', file: newUpload });
//   } catch (error) {
//     console.error('Error saving file to database:', error);
//     res.status(500).json({ error: 'Failed to save file information' });
//   }
// };

// exports.handleGetImage = (req, res) => {
//   const key = req.params.key;
//   const readStream = getFileStream(key);
//   readStream.pipe(res);
// };

// // Export the multer middleware
// exports.uploadMiddleware = upload.single('document');



// // const handleUpload = async (req, res) => {
// //   const file = req.file;
// //   if(!file) {
// //     return res.status(400).json({error: 'File is Missing'})
// //  }

// //  try { const result = await uploadFile(file);
// //   console.log('S3 Upload Result', result)
// //   res.json ({imageUrl: result.Location});

  
// //  } catch (error) {
// //   console.error ('Error uploading to S3:', error);
// //   res.status(500).json({error: 'Failed to upload to S3'})
  
// //  }
// // };

// exports. handleGetImage = (req, res) => {
//   const key = req.params.key;
//   const readStream = getFileStream(key)
//   readStream.pipe(res)
// };


// exports.uploadMiddleware = upload.single('document')










// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const AWS = require("aws-sdk")
// const Upload = require("../Models/upload.model");



// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.AWS_BUCKET_NAME,
//     acl: "public-read",
//     contentType: multerS3.AUTO_CONTENT_TYPE,
//     metadata: (req, file, cb) => {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: (req, file, cb) => {
//       cb(null, `${Date.now().toString()}-${file.originalname}`);
//     },
//   }),
// });

// const uploadFiles = upload.array("files", 10);

// exports.uploadFiles = async (req, res) => {
//   try {
//     await new Promise((resolve, reject) => {
//       uploadFiles(req, res, (err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });

//     const uploads = req.files.map((file) => ({
//       filename: file.originalname,
//       s3Url: file.location,
//     }));

//     await Upload.insertMany(uploads);
//     res.status(200).send("Files uploaded and saved successfully");
//   } catch (err) {
//     res.status(500).send("Failed to upload file or save file details");
//   }
// };

// Test S3 connection
// (async () => {
//   try {
//     await s3.putObject({
//       Body: "Hello World",
//       Bucket: process.env.
// AWS_BUCKET_NAME,
//       Key: "TestingII.txt",
//     }).promise();
//     console.log("Test file uploaded successfully");
//   } catch (error) {
//     console.error("Failed to upload test file", error);
//   }
// })();





// const multer = require ("multer")
// const multerS3 = require ("multer-s3")
// const AWS = require ('aws-sdk')
// const Upload = require("../Models/upload.model")

// const s3 = new AWS.S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: process.env.AWS_REGION
//   });


// const upload = multer({


  
//     storage: multerS3({
//       s3: s3,
//       bucket: process.env.
// AWS_BUCKET_NAME,
//       acl: "public-read",
//       contentType: multerS3.AUTO_CONTENT_TYPE,
//       metadata: (req, file, cb) => {
//         cb(null, { fieldName: file.fieldname });
//       },
//       key: (req, file, cb) => {
//         cb(null, `${Date.now().toString()}-${file.originalname}`);
//       },
//     }),
  
// })



// const uploadFiles = upload.array("files", 10);

// exports.uploadFiles = async (req, res) => {
//     try { 
//         await new Promise ((resolve, reject)=> {
//             uploadFiles(req, res, (err )=> {
//                 if (err) reject (err);
//                 else resolve();
//             });
//         });
//     const uploads = req.files.map(file => ({
//         filename: file.originalname,
//         s3Url: file.location,
//     }));

//     await Upload.insertMany(uploads);
//     res.status(200).send("Files uploaded and saved successfully")
        
//     } catch (err) {
//         res.status(500).send("Failed to upload File or save File details")
        
//     }
// };


// (async () => {
//     try {
//       await s3.putObject({
//         Body: "Hello World",
//         Bucket: iluploadmetest,
//         Key: "TestingII.txt",
//       }).promise();
//       console.log("Test file uploaded successfully");
//     } catch (error) {
//       console.error("Failed to upload test file", error);
//     }
//   })();