const multer = require ("multer")
const multerS3 = require ("multer-s3")
const AWS = require ('aws-sdk')
const Upload = require("../Models/upload.model")



const S3 = new AWS.S3({
  acccesKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKeyId: process.env.AWS_SECRET_ACCESS_KEY
//   region: process.env.AWS_REGION,
});

const upload = multer ({
  storage: multerS3,
  bucket: process.env.AWS_S3_iluploadmetest,
  acl: "public-read",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: (req, file, cb) =>  {
    cb(null, {fieldName: file.fieldName});
  },
  key: (req, file, cb ) => {
    cb(null, `${Date.now().toString()}-${file.originalname}`);
  },
  
})



const uploadFiles = upload.array("files", 10);

exports.uploadFiles = (req, res) => {

    uploadFiles(req, res, (err) => {
        if (err) {
            return res.status(500).send("Failed to upload files")
        }
        res.status(200).send("Fies uploaded successfully")
    });
};