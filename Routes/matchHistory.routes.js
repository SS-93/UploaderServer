const express = require('express');
const router = express.Router();
const matchHistoryController = require('../Controllers/matchHistory.controller');

router.post('/match-history', matchHistoryController.saveMatchHistory);
router.get('/match-history/:OcrId', matchHistoryController.getMatchHistory);

module.exports = router; 