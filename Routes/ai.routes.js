// routes/ai.js
const express = require('express');
const router = express.Router();
const aiController = require('../Controllers/ai.controller');

// Existing routes
router.post('/ner', aiController.performNER);
router.post('/save-entities', aiController.saveUpdatedEntities);

// Add the new match-claims route
router.post('/match-claims', aiController.findMatches);

// Add the new suggested-claims route
router.get('/suggested-claims/:OcrId', aiController.getSuggestedClaimsById);

module.exports = router;
