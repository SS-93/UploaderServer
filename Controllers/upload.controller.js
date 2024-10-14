const multer = require('multer');
const { ParkedUpload, Upload } = require('../Models/upload.model');
const { uploadFile, getFileStream, getSignedUrl } = require('../S3');
const mongoose = require('mongoose');
const Claim = require('../Models/claims.model');
const Park = require('../Models/park.model');
const ParkingSession = require('../Models/parkingsession.model');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const generateUniqueOcrId = async () => {
  let isUnique = false;
  let OcrId;
  
  while (!isUnique) {
    OcrId = Math.floor(1000 + Math.random() * 9000);
    const existingDocument = await ParkedUpload.findOne({ OcrId });
    if (!existingDocument) {
      isUnique = true;
    }
  }
  
  return OcrId;
};

exports.uploadSingleFile = async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'File is missing' });
  }

  try {
    const uploadedFiles = [];
    const files = [file];

    for (const file of files) {
      const result = await uploadFile(file);
      const signedUrl = await getSignedUrl(result.Key);
      const OcrId = await generateUniqueOcrId();

      const newUpload = new Upload({
        OcrId,
        filename: result.Key,
        originalName: file.originalname,
        fileUrl: signedUrl,
        mimetype: file.mimetype,
        claimId: req.body.claimId,
      });

      await newUpload.save();
      uploadedFiles.push(newUpload);
    }

    res.status(200).json({ message: 'File uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Error saving file to database:', error);
    res.status(500).json({ error: 'Failed to save file information' });
  }
};

exports.bulkUploadFilesWithoutClaim = async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files were uploaded' });
  }

  try {
    const uploadedFiles = [];
    const { parkId } = req.body;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const existingFile = await ParkedUpload.findOne({ originalName: file.originalname, parkId });
      if (existingFile) {
        console.log(`File ${file.originalname} already exists, skipping upload.`);
        continue;
      }
      const result = await uploadFile(file);
      const signedUrl = await getSignedUrl(result.Key);
      const OcrId = await generateUniqueOcrId();
      const category = req.body[`category${i}`] || 'Uncategorized';

      const newUpload = new ParkedUpload({
        OcrId,
        fileName: req.body[`fileName${i}`] || file.originalname,
        originalName: file.originalname,
        fileUrl: signedUrl,
        mimetype: file.mimetype,
        parkId: parkId,
        category: Array.isArray(category) ? category[0] : category || 'Uncategorized',
      });

      await newUpload.save();
      uploadedFiles.push(newUpload);
    }

    res.status(200).json({
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Error during bulk upload:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};


exports.getParkedUploads = async (req, res) => {
  try {
    const { parkId } = req.params;
    const parkedUploads = await ParkedUpload.find({ parkId }).sort({ uploadDate: -1 });
    res.status(200).json({ files: parkedUploads });
  } catch (error) {
    console.error('Error fetching parked uploads:', error);
    res.status(500).json({ error: 'Failed to fetch parked uploads' });
  }
};

exports.updateDocumentTextContent = async (req, res) => {
  const { OcrId } = req.params;
  const { ocrTextContent } = req.body;  // Changed from textContent to match client-side

  try {
    const document = await ParkedUpload.findOneAndUpdate({ OcrId }, { textContent: ocrTextContent }, { new: true });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });  // Changed to error
    }

    res.status(200).json({ message: 'Document text content updated successfully', document });
  } catch (err) {
    console.error('Error updating document text content:', err);
    res.status(500).json({ error: 'Failed to update document text content' });
  }
};

exports.deleteDocument = async (req, res) => {
  const { OcrId } = req.params;

  if (!OcrId) {
    return res.status(400).json({ error: 'OcrId is required' });
  }

  try {
    // Try to delete from ParkedUpload first
    let document = await ParkedUpload.findOneAndDelete({ OcrId: parseInt(OcrId) });

    if (!document) {
      // If not found in ParkedUpload, try to delete from Upload
      document = await Upload.findOneAndDelete({ OcrId: parseInt(OcrId) });
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document', details: err.message });
  }
};

exports.updateMultipleDocuments = async (req, res) => {
  try {
    const updates = req.body;

    const updatePromises = updates.map(update => {
      return ParkedUpload.findOneAndUpdate(
        { OcrId: update.OcrId },
        { filename: update.fileName, category: update.category },
        { new: true }
      );
    });

    const updatedDocuments = await Promise.all(updatePromises);

    return res.status(200).json({ message: 'Documents updated successfully', updatedDocuments });
  } catch (error) {
    console.error('Error updating documents:', error);
    return res.status(500).json({ message: 'Failed to update documents', error });
  }
};

exports.sortDocumentToClaim = async (req, res) => {
  const { OcrId, claimId } = req.params;

  try {
    const parkedDocument = await ParkedUpload.findOne({ OcrId });

    if (!parkedDocument) {
      return res.status(404).json({ message: 'Document not found in parked uploads' });
    }

    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const newDocument = {
      OcrId: parkedDocument.OcrId,
      fileName: parkedDocument.filename,
      fileUrl: parkedDocument.fileUrl,
      uploadDate: parkedDocument.uploadDate,
      textContent: parkedDocument.textContent,
      category: parkedDocument.category
    };

    claim.documents.push(newDocument);
    await claim.save();

    await ParkedUpload.findOneAndDelete({ OcrId });

    res.status(200).json({ message: 'Document sorted to claim successfully', document: newDocument });
  } catch (error) {
    console.error('Error sorting document to claim:', error);
    res.status(500).json({ error: 'Failed to sort document to claim' });
  }
};

exports.saveOcrText = async (req, res) => {
  const { OcrId } = req.params;
  const { ocrTextContent } = req.body;

  try {
    const document = await ParkedUpload.findOneAndUpdate(
      { OcrId },
      { textContent: ocrTextContent },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ message: 'OCR text content saved successfully', document });
  } catch (err) {
    console.error('Error saving OCR text content:', err);
    res.status(500).json({ error: 'Failed to save OCR text content' });
  }
};

exports.getDocumentByOcrId = async (req, res) => {
  const { OcrId } = req.params;

  try {
    const document = await ParkedUpload.findOne({ OcrId });
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json({ document });
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

exports.updateDocumentDetails = async (req, res) => {
  try {
    const { OcrId } = req.params;
    const { textContent, fileName, category } = req.body;

    const document = await ParkedUpload.findOneAndUpdate(
      { OcrId },
      { textContent, filename: fileName, category },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ message: 'Document updated successfully', document });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};


// Add this new function to your existing controller
exports.getOcrText = async (req, res) => {
  const { OcrId } = req.params;
  try {
    const document = await ParkedUpload.findOne({ OcrId });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json({ textContent: document.textContent || '' });
  } catch (err) {
    console.error('Error fetching OCR text:', err);
    res.status(500).json({ error: 'Failed to fetch OCR text' });
  }
};

// Update the existing saveOcrText function if it doesn't match this implementation
exports.saveOcrText = async (req, res) => {
  const { OcrId } = req.params;
  const { ocrTextContent } = req.body;

  try {
    const document = await ParkedUpload.findOneAndUpdate(
      { OcrId },
      { textContent: ocrTextContent },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ message: 'OCR text content saved successfully', document });
  } catch (err) {
    console.error('Error saving OCR text content:', err);
    res.status(500).json({ error: 'Failed to save OCR text content' });
  }
};

exports.handleGetImage = (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
};

exports.handleGetFile = (req, res) => {
  const key = req.params.key;
  try {
    const readStream = getFileStream(key);
    res.setHeader('Content-Disposition', `attachment; filename="${key}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    readStream.pipe(res);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
};

exports.getSignedUrl = async (req, res) => {
  const key = req.params.key;
  try {
    const url = await getSignedUrl(key);
    res.status(200).json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get signed URL' });
  }
};



exports.uploadMiddleware = upload.array('documents', 10);

