const express = require('express');
const router = express.Router();
const uploadController = require('../Controllers/upload.controller');

// Define the upload route
router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadSingleFile);
router.get('/images/:key', uploadController.handleGetImage);
router.get('/documents/:key', uploadController.handleGetFile);



module.exports = router;





// const express = require ("express");
// const router = express.Router();
// const uploadController = require ("../Controllers/upload.controller")


// router.post ("/uploads", uploadController.uploadFiles)
// router.post("/images", uploadController.uploadFiles);


// module.exports = router;





// const express = require ("express");
// const router = express.Router();
// const uploadController = require ("../Controllers/upload.controller")


// router.post ("/uploads", uploadController.uploadFiles)
// router.post("/images", uploadController.uploadFiles);


// module.exports = router;


// const express = require("express");
// const multer = require ('multer');
// const router = express.Router();
// const { handleUpload, handleGetImage } = require("../Controllers/upload.controller");
// const upload = multer ({dest: 'uploads/'}) 

// // Ensure these routes match what you are using in the frontend
// // router.post("/uploads", uploadController.uploadFiles);
// router.post("/images", upload.single('image'), handleUpload);
// router.post('images/:key', handleGetImage)

// module.exports = router;





// const express = require ("express");
// const router = express.Router();
// const uploadController = require ("../Controllers/upload.controller")


// router.post ("/uploads", uploadController.uploadFiles)
// router.post("/images", uploadController.uploadFiles);


// module.exports = router;




// const express = require ("express");
// const router = express.Router();
// const uploadController = require ("../Controllers/upload.controller")


// router.post ("/uploads", uploadController.uploadFiles)
// router.post("/images", uploadController.uploadFiles);


// module.exports = router;