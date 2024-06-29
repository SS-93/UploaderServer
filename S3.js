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

    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
       Bucket: process.env.S3_BUCKET_NAME,
       Body: fileStream,
       Key: path.basename(file.path)
 };
 return S3.upload(uploadParams).promise();
};

const getFileStream = (fileKey) => {
    const downloadParams = {
        Key: fileKey,
        Bucket: process.env.S3_BUCKET_NAME
    }

    return S3.getobject(downloadParams).createReadStream();
};

module.exports = {uploadFile, getFileStream};