const { Upload, ParkedUpload } = require('../Models/upload.model');

exports.saveMatchHistory = async (req, res) => {
    try {
        const { OcrId, matchResults } = req.body;
        
        if (!OcrId || !matchResults) {
            return res.status(400).json({ 
                message: 'Missing required fields' 
            });
        }

        let upload = await Upload.findOne({ OcrId }) || await ParkedUpload.findOne({ OcrId });
        
        if (!upload) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Transform match results to match our schema
        const newMatchEntry = {
            matchedAt: new Date(),
            score: matchResults.topScore || 0,
            matchedFields: matchResults.matchResults?.[0]?.matches?.matchedFields || [],
            confidence: matchResults.matchResults?.[0]?.matches?.confidence || {},
            matchDetails: {
                claimNumber: matchResults.matchResults?.[0]?.claim?.claimNumber || upload.entities?.potentialClaimNumbers?.[0],
                claimantName: matchResults.matchResults?.[0]?.claim?.name || upload.entities?.potentialClaimantNames?.[0],
                physicianName: matchResults.matchResults?.[0]?.claim?.physicianName || upload.entities?.potentialPhysicianNames?.[0],
                dateOfInjury: matchResults.matchResults?.[0]?.claim?.dateOfInjury || upload.entities?.potentialDatesOfInjury?.[0],
                employerName: matchResults.matchResults?.[0]?.claim?.employerName || upload.entities?.potentialEmployerNames?.[0]
            },
            isRecommended: matchResults.matchResults?.[0]?.isRecommended || false,
            totalMatches: matchResults.totalMatches || 0,
            topScore: matchResults.topScore || 0,
            allMatches: matchResults.matchResults || []
        };

        console.log('Saving match entry:', newMatchEntry);

        // Add to match history
        upload.matchHistory.push(newMatchEntry);
        await upload.save();

        res.json({ 
            message: 'Match history saved successfully',
            matchEntry: newMatchEntry
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

exports.getBatchMatchHistory = async (req, res) => {
    try {
        const { OcrIds } = req.body;
        
        if (!OcrIds || !Array.isArray(OcrIds)) {
            return res.status(400).json({ 
                message: 'OcrIds array is required' 
            });
        }

        const batchResults = await Promise.all(OcrIds.map(async (OcrId) => {
            const upload = await Upload.findOne({ OcrId }) || await ParkedUpload.findOne({ OcrId });
            
            if (!upload) return {
                OcrId,
                matchHistory: [],
                bestMatch: null
            };

            return {
                OcrId,
                matchHistory: upload.matchHistory.sort((a, b) => b.matchedAt - a.matchedAt),
                bestMatch: upload.bestMatch
            };
        }));

        res.json({ batchResults });
    } catch (error) {
        console.error('Error fetching batch match history:', error);
        res.status(500).json({ 
            message: 'Failed to fetch batch match history',
            error: error.message 
        });
    }
}; 