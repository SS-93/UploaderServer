const OpenAI = require('openai');
const natural = require('natural');
const { ParkedUpload, Upload } = require('../Models/upload.model');
const ClaimModel = require('../Models/claims.model');
const { JaroWinklerDistance } = natural;
const MatchingLogic = require('../Utils/MatchingLogic'); // Ensure proper import
const matchHistoryController = require('../Controllers/matchHistory.controller');
const ModelTracker = require('../utils/modelTracker');


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Scoring weights configuration
const SCORE_WEIGHTS = {
    CLAIM_NUMBER: 30,
    NAME: 30,
    DATE_OF_INJURY: 20,
    EMPLOYER_NAME: 30,
    INJURY_DESCRIPTION: 20,
    PHYSICIAN_NAME: 20
};

// Utility functions
const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// Simplified date handling
const normalizeDate = (input) => {
    // Handle empty or null input
    if (!input) return '';
    
    // Convert input to string if it's not already
    let dateStr = input;
    if (input instanceof Date) {
        dateStr = input.toISOString();
    } else if (typeof input !== 'string') {
        dateStr = String(input);
    }
    
    try {
        // Remove any non-numeric characters and get an array of numbers
        const numbers = dateStr.replace(/[^\d]/g, ' ').trim().split(/\s+/);
        
        // If we have at least 3 numbers (month, day, year), try to format
        if (numbers.length >= 3) {
            const month = numbers[0].padStart(2, '0');
            const day = numbers[1].padStart(2, '0');
            const year = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
            return `${month}${day}${year}`;
        }
        
        // If date parsing fails, return the original string normalized
        return dateStr.toLowerCase().replace(/[^a-z0-9]/g, '');
    } catch (error) {
        console.warn('Error normalizing date:', error, 'Input:', input);
        return '';
    }
};


exports.performNER = async (req, res) => {
    const { text, OcrId, modelName = 'gpt-3.5-turbo' } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        const startTime = Date.now();
        
        const models = {
            // 'gpt-4': {
            //     model: "gpt-4",
            //     temperature: 0.3
            // },
            'gpt-3.5-turbo': {
                model: "gpt-3.5-turbo",
                temperature: 0.3,
                max_tokens: 2000, // Add token limit
            }
        }
        //     'gpt-3.5-turbo-instruct': {
        //         model: "gpt-3.5-turbo-instruct",
        //         temperature: 0.3
        //     }
        // };

        const modelConfig = models[modelName] || models['gpt-3.5-turbo'];
        
        const prompt = `
            Analyze the following text and extract these entities:
            1. potentialClaimNumbers: Any sequence of numbers and letters that could represent a claim number.
            2. potentialClaimantNames: Names that appear to be the primary subject of the claim.
            3. potentialEmployerNames: Names of companies or organizations that could be employers.
            4. potentialInsurerNames: Names of insurance companies.
            5. potentialMedicalProviderNames: Names of hospitals, clinics, or medical facilities.
            6. potentialPhysicianNames: Names of doctors or medical professionals.
            7. potentialDatesOfBirth: Any date that could represent a birth date.
            8. potentialDatesOfInjury: Any date that could represent when an injury occurred.
            9. potentialInjuryDescriptions: Any text that could describe an injury or medical condition.

            Format the output as JSON with these categories. If a category has no matches, return an empty array. Here's the text:

            ${text}
        `;

        const response = await openai.chat.completions.create({
            ...modelConfig,
            messages: [{ role: "user", content: prompt }],
        });

        const entities = JSON.parse(response.choices[0].message.content);
        
        const endTime = Date.now();
        
        // Track performance
        const performanceMetrics = await ModelTracker.trackModelPerformance(
            modelName,
            startTime,
            endTime,
            text.length,
            entities
        );

        // If OcrId is provided, save entities
        if (OcrId) {
            const transformedEntities = {
                potentialClaimNumbers: entities.potentialClaimNumbers || [],
                potentialClaimantNames: entities.potentialClaimantNames || [],
                potentialEmployerNames: entities.potentialEmployerNames || [],
                potentialInsurerNames: entities.potentialInsurerNames || [],
                potentialMedicalProviderNames: entities.potentialMedicalProviderNames || [],
                potentialPhysicianNames: entities.potentialPhysicianNames || [],
                potentialDatesOfBirth: entities.potentialDatesOfBirth || [],
                potentialDatesOfInjury: entities.potentialDatesOfInjury || [],
                potentialInjuryDescriptions: entities.potentialInjuryDescriptions || []
            };

            // Save entities to document
            let document = await ParkedUpload.findOneAndUpdate(
                { OcrId },
                { $set: { entities: transformedEntities } },
                { new: true }
            );

            if (!document) {
                document = await Upload.findOneAndUpdate(
                    { OcrId },
                    { $set: { entities: transformedEntities } },
                    { new: true }
                );
            }

            // Find matching claims
            const claims = await ClaimModel.find({});
            const matchResults = claims
                .map(claim => calculateMatchScore(transformedEntities, claim))
                .filter(result => result.isRecommended)
                .sort((a, b) => b.score - a.score);

            return res.json({
                entities: transformedEntities,
                document,
                matchResults,
                performanceMetrics
            });
        }

        res.json(entities);
    } catch (error) {
        console.error('Error performing NER:', error);
        res.status(500).json({ error: 'Failed to perform NER' });
    }
};

const calculateMatchScore = (entities, claim) => {
    let totalScore = 0;
    const matches = {
        matchedFields: [],
        details: {},
        confidence: {}
    };

    // Claim Number Matching
    if (entities.potentialClaimNumbers?.length > 0) {
        const normalizedClaimNumber = claim.claimnumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        const hasClaimMatch = entities.potentialClaimNumbers.some(
            docNum => docNum.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedClaimNumber
        );
        
        if (hasClaimMatch) {
            totalScore += SCORE_WEIGHTS.CLAIM_NUMBER;
            matches.matchedFields.push('claimNumber');
            matches.confidence.claimNumber = 1;
        }
    }

    // Name Matching
    if (entities.potentialClaimantNames?.length > 0) {
        const bestNameMatch = Math.max(...entities.potentialClaimantNames.map(
            docName => JaroWinklerDistance(docName.toLowerCase(), claim.name.toLowerCase())
        ));

        if (bestNameMatch > 0.9) {
            totalScore += SCORE_WEIGHTS.NAME * bestNameMatch;
            matches.matchedFields.push('name');
            matches.confidence.name = bestNameMatch;
        }
    }

    // Date of Injury Matching
    if (entities.potentialDatesOfInjury?.length > 0) {
        const claimDate = claim.date ? new Date(claim.date) : null;
        if (claimDate) {
            const normalizedClaimDate = claimDate.toISOString().split('T')[0].replace(/-/g, '');
            const hasDateMatch = entities.potentialDatesOfInjury.some(docDate => {
                const normalizedDocDate = normalizeDate(docDate);
                return normalizedDocDate === normalizedClaimDate;
            });
            
            if (hasDateMatch) {
                totalScore += SCORE_WEIGHTS.DATE_OF_INJURY;
                matches.matchedFields.push('dateOfInjury');
                matches.confidence.dateOfInjury = 1;
            }
        }
    }

    // Employer Name Matching
    if (entities.potentialEmployerNames?.length > 0 && claim.employerName) {
        const bestEmployerMatch = Math.max(...entities.potentialEmployerNames.map(
            docEmployer => JaroWinklerDistance(docEmployer.toLowerCase(), claim.employerName.toLowerCase())
        ));

        if (bestEmployerMatch > 0.9) {
            totalScore += SCORE_WEIGHTS.EMPLOYER_NAME * bestEmployerMatch;
            matches.matchedFields.push('employerName');
            matches.confidence.employerName = bestEmployerMatch;
        }
    }

    // Physician Name Matching
    if (entities.potentialPhysicianNames?.length > 0 && claim.physicianName) {
        const bestPhysicianMatch = Math.max(...entities.potentialPhysicianNames.map(
            docPhysician => JaroWinklerDistance(docPhysician.toLowerCase(), claim.physicianName.toLowerCase())
        ));

        if (bestPhysicianMatch > 0.9) {
            totalScore += SCORE_WEIGHTS.PHYSICIAN_NAME * bestPhysicianMatch;
            matches.matchedFields.push('physicianName');
            matches.confidence.physicianName = bestPhysicianMatch;
        }
    }

    // Then add the injury description matching logic after the physician matching
// Injury Description Matching
if (entities.potentialInjuryDescriptions?.length > 0 && claim.injuryDescription) {
    const bestInjuryMatch = Math.max(...entities.potentialInjuryDescriptions.map(
        docInjury => JaroWinklerDistance(
            docInjury.toLowerCase(), 
            claim.injuryDescription.toLowerCase()
        )
    ));

    if (bestInjuryMatch > 0.8) {  // Slightly lower threshold for injury descriptions
        totalScore += SCORE_WEIGHTS.INJURY_DESCRIPTION * bestInjuryMatch;
        matches.matchedFields.push('injuryDescription');
        matches.confidence.injuryDescription = bestInjuryMatch;
        matches.details.injuryMatch = {
            documentDescription: entities.potentialInjuryDescriptions[0],
            claimDescription: claim.injuryDescription,
            similarity: bestInjuryMatch
        };
    }
}

    // Calculate final score
    const TOTAL_POSSIBLE_SCORE = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    const percentageScore = (totalScore / TOTAL_POSSIBLE_SCORE) * 100;

    return {
        score: Math.round(percentageScore * 100) / 100,
        matches,
        isRecommended: percentageScore >= 60,
        claim: {
            id: claim._id,
            claimNumber: claim.claimnumber,
            name: claim.name,
            date: claim.date,
            adjuster: claim.adjuster
        }
    };
};

// Add this new endpoint after performNER and before saveUpdatedEntities
exports.getSuggestedClaims = async (req, res) => {
    const { OcrId } = req.params;
    
    if (!OcrId || OcrId === 'undefined') {
        return res.status(400).json({ 
            error: 'Invalid OcrId provided',
            details: 'OcrId must be a valid number'
        });
    }

    try {
        const document = await ParkedUpload.findOne({ OcrId: Number(OcrId) });
        
        if (!document) {
            return res.status(404).json({
                error: 'Document not found',
                details: `No document found with OcrId: ${OcrId}`
            });
        }

        if (!document.entities) {
            return res.status(400).json({ error: 'No entities found for this document. Please process the document with NER first.' });
        }

        // Find matching claims using existing calculateMatchScore function
        const claims = await ClaimModel.find({});
        const matchResults = claims
            .map(claim => calculateMatchScore(document.entities, claim))
            .filter(result => result.isRecommended)
            .sort((a, b) => b.score - a.score);

        // Update match history for top matches
        if (matchResults.length > 0) {
            const topMatch = matchResults[0];
            const claim = await ClaimModel.findById(topMatch.claim.id);
            
            if (claim && claim.matchHistory) {
                claim.matchHistory.push({
                    documentId: OcrId,
                    score: topMatch.score,
                    matchedFields: topMatch.matches.matchedFields,
                    confidence: topMatch.matches.confidence,
                    matchDate: new Date(),
                    isAccepted: false
                });
                await claim.save();
            }
        }

        res.json({ 
            matchResults,
            documentInfo: {
                OcrId: document.OcrId,
                fileName: document.fileName || document.originalName,
                entities: document.entities
            }
        });

    } catch (error) {
        console.error('Error fetching suggested claims:', error);
        res.status(500).json({ error: 'Failed to fetch suggested claims' });
    }
};

// Keep existing saveUpdatedEntities export
exports.saveUpdatedEntities = async (req, res) => {
    try {
        const { OcrId, updatedEntities } = req.body;

        if (!OcrId || !updatedEntities) {
            return res.status(400).json({ message: 'Missing OcrId or entities' });
        }

        // Find document
        let document = await Upload.findOne({ OcrId }) || 
                      await ParkedUpload.findOne({ OcrId });

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Update entities
        document.entities = updatedEntities;

        // Get match results using MatchingLogic
        const matchResults = await MatchingLogic.findMatchingClaims(updatedEntities);

        // Create new match history entry
        const matchHistoryEntry = {
            matchedAt: new Date(),
            score: matchResults.topScore,
            matchedFields: matchResults.matchResults[0]?.matches.matchedFields || [],
            totalMatches: matchResults.totalMatches,
            topScore: matchResults.topScore,
            allMatches: matchResults.matchResults,
            isRecommended: matchResults.matchResults[0]?.isRecommended || false
        };

        // Add to match history array
        document.matchHistory.push(matchHistoryEntry);

        // Update best match if this is the highest score
        if (!document.bestMatch.score || matchResults.topScore > document.bestMatch.score) {
            document.bestMatch = {
                score: matchResults.topScore,
                allMatches: matchResults.matchResults,
                matchedAt: new Date()
            };
        }

        await document.save();

        res.json({
            message: 'Entities and match history updated successfully',
            entities: document.entities,
            matchResults,
            matchHistory: document.matchHistory
        });

    } catch (error) {
        console.error('Error saving entities:', error);
        res.status(500).json({ 
            message: 'Failed to save entities',
            error: error.message 
        });
    }
};

// exports.findMatches = async (req, res) => {
//     try {
//         const { entities } = req.body;
//         console.log('Processing match request for entities:', entities);

//         if (!entities) {
//             return res.status(400).json({ error: 'No entities provided' });
//         }

//         // Get all claims from database
//         const claims = await ClaimModel.find({});
//         console.log(`Processing ${claims.length} claims for matching`);

//         // Use existing calculateMatchScore function
//         const matchResults = claims
//             .map(claim => calculateMatchScore(entities, claim))
//             .filter(result => result.isRecommended)
//             .sort((a, b) => b.score - a.score);

//         console.log('Match results:', {
//             totalMatches: matchResults.length,
//             topScore: matchResults[0]?.score
//         });

//         res.json({ matchResults });
//     } catch (error) {
//         console.error('Error in findMatches:', error);
//         res.status(500).json({ error: 'Failed to process matches' });
//     }
// };


exports.findMatches = async (req, res) => {
    try {
        const { entities } = req.body;
        console.log('Processing match request for entities:', entities);

        // Get all claims
        const claims = await ClaimModel.find();
        console.log(`Processing ${claims.length} claims for matching`);

        // Calculate match scores for each claim
        const matchResults = claims.map(claim => {
            console.log('Starting match calculation for:', {
                claimNumber: claim.claimnumber,
                entities: JSON.stringify(entities, null, 2)
            });

            const result = calculateMatchScore(entities, claim);
            
            // Log detailed comparison results
            console.log('Match calculation complete:', {
                claimNumber: claim.claimnumber,
                totalScore: result.score,
                matchedFields: result.matchedFields,
                isRecommended: result.score >= 40
            });

            return {
                ...result,
                claim: {
                    id: claim._id,
                    claimNumber: claim.claimnumber,
                    name: claim.name,
                    employerName: claim.employerName,
                    dateOfInjury: claim.date,
                    physicianName: claim.physicianName,
                    injuryDescription: claim.injuryDescription
                }
            };
        })
        .filter(result => result.score >= 40)
        .sort((a, b) => b.score - a.score);

        const response = {
            totalMatches: matchResults.length,
            topScore: matchResults.length > 0 ? matchResults[0].score : 0,
            matchResults
        };

        console.log('Match results:', response);
        res.json(response);

    } catch (error) {
        console.error('Error in findMatches:', error);
        res.status(500).json({ error: 'Failed to process matches' });
    }
};
exports.getSuggestedClaimsById = async (req, res) => {
    try {
        const { OcrId } = req.params;
        console.log('Fetching suggested claims for OcrId:', OcrId);

        // Find the document
        const document = await Upload.findOne({ OcrId: parseInt(OcrId) }) || 
                        await ParkedUpload.findOne({ OcrId: parseInt(OcrId) });
                        
        if (!document) {
            return res.status(404).json({ 
                error: 'Document not found',
                details: `No document found with OcrId: ${OcrId}`
            });
        }

        // Get the document's entities
        const entities = document.entities || {};
        const claims = await ClaimModel.find();
        
        // Calculate match scores
        const matchResults = claims
            .map(claim => {
                const matchScore = calculateMatchScore(entities, claim);
                return {
                    score: matchScore.totalScore,
                    matches: matchScore.matches,
                    isRecommended: matchScore.totalScore >= 70,
                    claim: {
                        id: claim._id,
                        claimNumber: claim.claimnumber,
                        name: claim.name,
                        employerName: claim.employerName,
                        dateOfInjury: claim.date,
                        physicianName: claim.physicianName
                    }
                };
            })
            .filter(result => result.score >= 40)
            .sort((a, b) => b.score - a.score);

        if (matchResults.length > 0) {
            // Find the top scoring match
            const topMatch = matchResults.reduce((prev, current) => (prev.score > current.score) ? prev : current);
            
            // Update the 'bestMatch' field
            document.bestMatch = {
                score: topMatch.score,
                matchedFields: topMatch.matches,
                matchDetails: topMatch.matchDetails,
                isRecommended: topMatch.isRecommended,
                claim: topMatch.claim
            };
            
            // Save the updated document
            await document.save();
        }

        return res.json({
            matchResults,
            totalMatches: matchResults.length,
            topScore: matchResults.length > 0 ? matchResults[0].score : 0
        });

    } catch (error) {
        console.error('Error in getSuggestedClaimsById:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch suggested claims',
            details: error.message
        });
    }
};

// Batch processing tracking
const batchProcessingStatus = new Map();

exports.autoSortBatch = async (req, res) => {
    const { documents, minScore = 75 } = req.body;
    const batchId = Date.now().toString();
    
    try {
        // Initialize batch status
        batchProcessingStatus.set(batchId, {
            total: documents.length,
            processed: 0,
            success: [],
            failed: [],
            inProgress: true,
            startTime: new Date()
        });

        // Process in smaller chunks to avoid overwhelming the system
        const chunkSize = 5;
        for (let i = 0; i < documents.length; i += chunkSize) {
            const chunk = documents.slice(i, i + chunkSize);
            
            // Process chunk in parallel
            const chunkResults = await Promise.allSettled(
                chunk.map(async (OcrId) => {
                    try {
                        // Get document entities
                        const document = await ParkedUpload.findOne({ OcrId });
                        if (!document || !document.entities) {
                            throw new Error('Document or entities not found');
                        }

                        // Find matches
                        const matches = await MatchingLogic.findMatchingClaims(document.entities);
                        
                        // Filter matches based on minScore
                        const validMatches = matches.matchResults.filter(match => match.score >= minScore);

                        // Update batch status
                        const currentStatus = batchProcessingStatus.get(batchId);
                        currentStatus.processed++;
                        
                        if (validMatches.length > 0) {
                            // Save match history
                            await matchHistoryController.saveMatchHistory({
                                OcrId,
                                matches: validMatches,
                                score: matches.topScore,
                                timestamp: new Date()
                            });
                            
                            currentStatus.success.push({
                                OcrId,
                                topScore: matches.topScore,
                                matchCount: validMatches.length
                            });
                        } else {
                            currentStatus.failed.push({
                                OcrId,
                                reason: 'No matches above minimum score'
                            });
                        }
                        
                        batchProcessingStatus.set(batchId, currentStatus);
                        return { OcrId, success: true };
                    } catch (error) {
                        console.error(`Error processing document ${OcrId}:`, error);
                        throw error;
                    }
                })
            );

            // Update batch status with chunk results
            const status = batchProcessingStatus.get(batchId);
            chunkResults.forEach((result, index) => {
                if (result.status === 'rejected') {
                    status.failed.push({
                        OcrId: chunk[index],
                        error: result.reason.message
                    });
                }
            });
            batchProcessingStatus.set(batchId, status);
        }

        // Finalize batch status
        const finalStatus = batchProcessingStatus.get(batchId);
        finalStatus.inProgress = false;
        finalStatus.endTime = new Date();
        batchProcessingStatus.set(batchId, finalStatus);

        // Return results
        res.json({
            batchId,
            message: `Processed ${documents.length} documents`,
            results: {
                success: finalStatus.success,
                failed: finalStatus.failed,
                totalProcessed: finalStatus.processed
            }
        });

    } catch (error) {
        console.error('Batch sort error:', error);
        const status = batchProcessingStatus.get(batchId);
        if (status) {
            status.inProgress = false;
            status.error = error.message;
            batchProcessingStatus.set(batchId, status);
        }
        res.status(500).json({ error: 'Failed to process batch', details: error.message });
    }
};

// Add endpoint to check batch status
exports.getBatchStatus = async (req, res) => {
    const { batchId } = req.params;
    const status = batchProcessingStatus.get(batchId);
    
    if (!status) {
        return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(status);
};

// Add new endpoint to get metrics
exports.getModelMetrics = async (req, res) => {
    try {
        const metrics = ModelTracker.getMetrics();
        const comparison = ModelTracker.getModelComparison();
        
        res.json({
            metrics,
            comparison
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
};

