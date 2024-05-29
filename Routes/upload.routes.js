const express = require ("express");
const router = express.Router();
const uploadController = require ("../Controllers/upload.controller")


router.post ("/upload", uploadController.uploadFiles)


module.exports = router;