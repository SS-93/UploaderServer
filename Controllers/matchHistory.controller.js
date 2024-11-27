const { Upload, ParkedUpload } = require('../Models/upload.model');

exports.saveMatchHistory = async (req, res) => {
    try {
        const { OcrId, matchResults } = req.body;
        
        if (!OcrId || !matchResults) {
            return res.status(400).json({ 
                message: 'Missing required fields' 
            });
        }

        // Find the upload document by OcrId
        const upload = await Upload.findOne({ OcrId }) || await ParkedUpload.findOne({ OcrId });
        
        if (!upload) {
            return res.status(404).json({
                message: 'Document not found'
            });
        }

        // Create new match history entry
        const newMatchEntry = {
            score: matchResults.topScore || 0,
            matchedAt: new Date(),
            matchedFields: matchResults.recommendedMatches?.[0]?.matchedFields || [],
            confidence: {
                claimNumber: matchResults.recommendedMatches?.[0]?.confidence?.claimNumber || 0,
                name: matchResults.recommendedMatches?.[0]?.confidence?.name || 0,
                employerName: matchResults.recommendedMatches?.[0]?.confidence?.employerName || 0,
                dateOfInjury: matchResults.recommendedMatches?.[0]?.confidence?.dateOfInjury || 0,
                physicianName: matchResults.recommendedMatches?.[0]?.confidence?.physicianName || 0
            },
            matchDetails: matchResults.recommendedMatches?.[0]?.matchDetails || {},
            isRecommended: matchResults.recommendedMatches?.[0]?.isRecommended || false,
            claimId: matchResults.recommendedMatches?.[0]?.claimId || null
        };

        // Add to match history array
        upload.matchHistory.push(newMatchEntry);

        // Update best match if this is a better score
        if (!upload.bestMatch || newMatchEntry.score > upload.bestMatch.score) {
            upload.bestMatch = {
                score: newMatchEntry.score,
                claimId: newMatchEntry.claimId,
                matchedAt: newMatchEntry.matchedAt
            };
        }

        await upload.save();

        res.status(201).json({ 
            message: 'Match history saved successfully',
            matchHistory: newMatchEntry
        });
    } catch (error) {
        console.error('Error saving match history:', error);
        res.status(500).json({ 
            message: 'Failed to save match history',
            error: error.message 
        });
    }
};

exports.getMatchHistory = async (req, res) => {
    try {
        const { OcrId } = req.params;
        
        if (!OcrId) {
            return res.status(400).json({ 
                message: 'OcrId is required' 
            });
        }

        // Find document and get its match history
        const upload = await Upload.findOne({ OcrId }) || await ParkedUpload.findOne({ OcrId });
        
        if (!upload) {
            return res.status(404).json({
                message: 'Document not found',
                matchHistory: []
            });
        }

        // Sort match history by matchedAt date in descending order
        const sortedHistory = upload.matchHistory
            .sort((a, b) => b.matchedAt - a.matchedAt)
            .slice(0, 10); // Get last 10 matches

        res.json({ 
            matchHistory: sortedHistory,
            bestMatch: upload.bestMatch
        });
    } catch (error) {
        console.error('Error fetching match history:', error);
        res.status(500).json({ 
            message: 'Failed to fetch match history',
            error: error.message 
        });
    }
}; 