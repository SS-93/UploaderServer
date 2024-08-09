const AWS = require ('aws-sdk') 
const fs = require ('fs')
const path = require ('path')
require('dotenv').config();

const S3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

 const uploadFile = (file) => {

    // const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
       Bucket: process.env.S3_BUCKET_NAME,
       Body: file.buffer,
      //  Key: path.basename(file.path),
      // Key: Date.now().toString() + '-' + file.originalname,
      Key: file.originalname,
       ACL: 'public-read',
       ContentType: file.mimetype,
       ContentDisposition: 'attachment',
 };
 return S3.upload(uploadParams).promise();
};

const getSignedUrl = (fileUrl) => {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileUrl,
      Expires: 60 * 60 * 24 * 7, // URL expires 30 days  
      // Expires: 60 * 60 * 24 * 30, // URL expires 30 days  
    };
  
    return S3.getSignedUrlPromise('getObject', params);
  };

const getFileStream = (fileKey) => {
    const downloadParams = {
        Key: fileKey,
        Bucket: process.env.S3_BUCKET_NAME
    }

    return S3.getObject(downloadParams).createReadStream();
};



module.exports = {uploadFile, getFileStream, getSignedUrl};
// const AWS = require ('aws-sdk') 
// const fs = require ('fs')
// const path = require ('path')
// require('dotenv').config();
// const S3 = require ('aws-sdk/clients/s3')

// const { Readable } = require ('stream')

// const s3 = new S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: process.env.AWS_REGION,
// });

// // 
//  const uploadFile = (file) => {

//     const fileStream = fs.createReadStream(file.path);

//     const uploadParams = {
//        Bucket: process.env.S3_BUCKET_NAME,
//        Body: Readable.from(file.buffer),
//        Key: path.basename(file.path)
//  };
//  return S3.upload(uploadParams).promise();
// };

// const getFileStream = (fileKey) => {
//     const downloadParams = {
//         Key: fileKey,
//         Bucket: process.env.S3_BUCKET_NAME
//     }

//     return S3.getobject(downloadParams).createReadStream();
// };

// module.exports = {uploadFile, getFileStream};