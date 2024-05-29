require("dotenv").config();
const express = require("express");
// const validateSession = require ('/Middleware/validateSession.js')
const app = express();

const ClaimFile = require("./Controllers/claims.controller");
const uploadRoutes = require("./Routes/upload.routes")

// const ClaimsRouter = require ('./routes/claims') 



// (async () => { await S3.putObject ({
  
//   Body: "hello World",
//   Bucket: "iluploadmetest",
//   Key:"For NikNak.txt",
// })
// .promise();}) ();

 

const mongoose = require("mongoose");

mongoose.connect(`${process.env.MONGO}/UploaderServer`);

const db = mongoose.connection;
db.once("open", () => {
  console.log(`connected to ${MONGO}`);
});



const { PORT, MONGO } = process.env;

app.use(express.json());
app.use(require("cors")());

app.use("/new", ClaimFile);
app.use(uploadRoutes)

// app.use("/find", ClaimsRouter)

app.listen(PORT, () => console.log(`App is listening on port ${PORT}`));
