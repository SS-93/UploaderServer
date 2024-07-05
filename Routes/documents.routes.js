const express = require('express');
const router = express.Router();
const Document = require('../models/document.model'); // Adjust the path as needed

// Fetch all documents
router.get('/all', async (req, res) => {
  try {
    const documents = await Document.find();
    res.status(200).json({ documents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

module.exports = router;
