// routes/ai.js
const express = require('express');
const router = express.Router();
const aiController = require('../Controllers/ai.controller');

// Existing routes
router.post('/ner', aiController.performNER);
router.post('/save-entities', aiController.saveUpdatedEntities);

// Update the route to match the frontend request
router.post('/process-matches', aiController.findMatches);

// Add the new suggested-claims route
router.get('/suggested-claims/:OcrId', aiController.getSuggestedClaimsById);
router.post('/match-claims', aiController.findMatches);

// Add new batch processing route
router.post('/auto-sort-batch', aiController.autoSortBatch);
router.get('/batch-status/:batchId', aiController.getBatchStatus); // For checking batch progress



module.exports = router;
