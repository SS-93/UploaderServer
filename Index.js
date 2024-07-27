require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");



const ClaimFile = require("./Controllers/claims.controller");
const uploadRoutes = require("./Routes/upload.routes");
// const OcrProcessor = require('./ocrProcessor')

const { uploadFile, getFileStream, getSignedUrl } = require('./S3');

const app = express();
const { PORT, MONGO } = process.env;

mongoose.connect(`${MONGO}/UploaderServer`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => {
    console.log(`connected to ${MONGO}`);
});

app.use(express.json());
app.use(cors());

app.use("/new", ClaimFile);
app.use('/dms', uploadRoutes);

app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));

module.exports = {uploadFile, getFileStream, getSignedUrl};



// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const ClaimFile = require("./Controllers/claims.controller");
// const uploadRoutes = require("./Routes/upload.routes");

// const app = express();
// const { PORT, MONGO } = process.env;

// mongoose.connect(`${MONGO}/UploaderServer`, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

// const db = mongoose.connection;
// db.once("open", () => {
//     console.log(`connected to ${MONGO}`);
// });

// app.use(express.json());
// app.use(cors());

// app.use("/new", ClaimFile);
// app.use('/dms', uploadRoutes);



// const AWS = require('aws-sdk');
// const fs = require('fs');
// const path = require('path');
// const { Readable } = require('stream');

// const s3 = new AWS.S3({
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     region: process.env.AWS_REGION,
// });

// const uploadFile = (file) => {
//     const fileStream = fs.createReadStream(file.path);

//     const uploadParams = {
//         Bucket: process.env.S3_BUCKET_NAME,
//         Body: fileStream,
//         Key: path.basename(file.path),
//         ACL: 'public-read'
//     };

//     return s3.upload(uploadParams).promise();
// };

// const getFileStream = (fileKey) => {
//     const downloadParams = {
//         Key: fileKey,
//         Bucket: process.env.S3_BUCKET_NAME,
//     };

//     return s3.getObject(downloadParams).createReadStream();
// };

// app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));

// module.exports = { uploadFile, getFileStream };


// // require("dotenv").config();
// // const express = require("express");
// // // const validateSession = require ('/Middleware/validateSession.js')
// // const app = express();

// // const ClaimFile = require("./Controllers/claims.controller");
// // const uploadRoutes = require("./Routes/upload.routes")

// // // const ClaimsRouter = require ('./routes/claims') 



// // // (async () => { await S3.putObject ({
  
// // //   Body: "hello World",
// // //   Bucket: "iluploadmetest",
// // //   Key:"For NikNak.txt",
// // // })
// // // .promise();}) ();

 

// // const mongoose = require("mongoose");

// // mongoose.connect(`${process.env.MONGO}/UploaderServer`);

// // const db = mongoose.connection;
// // db.once("open", () => {
// //   console.log(`connected to ${MONGO}`);
// // });



// // const { PORT, MONGO } = process.env;

// // app.use(express.json());
// // app.use(require("cors")());

// // app.use("/new", ClaimFile);
// // app.use('/dms', uploadRoutes)

// // // app.use("/find", ClaimsRouter)

// // app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));


// // require("dotenv").config();
// // const express = require("express");
// // // const validateSession = require ('/Middleware/validateSession.js')
// // const app = express();

// // const ClaimFile = require("./Controllers/claims.controller");
// // const uploadRoutes = require("./Routes/upload.routes")

// // // const ClaimsRouter = require ('./routes/claims') 



// // // (async () => { await S3.putObject ({
  
// // //   Body: "hello World",
// // //   Bucket: "iluploadmetest",
// // //   Key:"For NikNak.txt",
// // // })
// // // .promise();}) ();

// // const mongoose = require("mongoose");

// // mongoose.connect(`${process.env.MONGO}/UploaderServer`);

// // const db = mongoose.connection;
// // db.once("open", () => {
// //   console.log(`connected to ${MONGO}`);
// // });



// // const { PORT, MONGO } = process.env;

// // app.use(express.json());
// // app.use(require("cors")());

// // app.use("/new", ClaimFile);
// // app.use('/dms', uploadRoutes)

// // // app.use("/find", ClaimsRouter)

// // app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));