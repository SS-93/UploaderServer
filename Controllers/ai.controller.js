const OpenAI = require('openai');
const natural = require('natural');
const { ParkedUpload, Upload } = require('../Models/upload.model');
const ClaimModel = require('../Models/claims.model');
const { JaroWinklerDistance } = natural;
const MatchingLogic = require('../Utils/MatchingLogic'); // Ensure proper import
const matchHistoryController = require('../Controllers/matchHistory.controller');


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Scoring weights configuration
const SCORE_WEIGHTS = {
    CLAIM_NUMBER: 30,
    NAME: 30,
    DATE_OF_INJURY: 20,
    EMPLOYER_NAME: 15,
    INJURY_DESCRIPTION: 20,
    PHYSICIAN_NAME: 15
};

exports.performNER = async (req, res) => {
    const { text, OcrId } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    try {
        // Perform NER with existing prompt
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
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
        });

        const entities = JSON.parse(response.choices[0].message.content);

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
                matchResults
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

    // Calculate final score
    const TOTAL_POSSIBLE_SCORE = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    const percentageScore = (totalScore / TOTAL_POSSIBLE_SCORE) * 100;

    return {
        score: Math.round(percentageScore * 100) / 100,
        matches,
        isRecommended: percentageScore >= 75,
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

    try {
        // Fetch document with entities
        let document = await ParkedUpload.findOne({ OcrId });
        if (!document) {
            document = await Upload.findOne({ OcrId });
        }

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
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
    const { OcrId, updatedEntities } = req.body;
    console.log('Received OcrId:', OcrId);
    console.log('Received entities:', updatedEntities);

    if (!OcrId || !updatedEntities) {
        return res.status(400).json({ error: 'OcrId and updatedEntities are required' });
    }

    // No need for transformation, as keys are already in the correct format
    const transformedEntities = {
        potentialClaimNumbers: updatedEntities.potentialClaimNumbers || [],
        potentialClaimantNames: updatedEntities.potentialClaimantNames || [],
        potentialEmployerNames: updatedEntities.potentialEmployerNames || [],
        potentialInsurerNames: updatedEntities.potentialInsurerNames || [],
        potentialMedicalProviderNames: updatedEntities.potentialMedicalProviderNames || [],
        potentialPhysicianNames: updatedEntities.potentialPhysicianNames || [],
        potentialDatesOfBirth: updatedEntities.potentialDatesOfBirth || [],
        potentialDatesOfInjury: updatedEntities.potentialDatesOfInjury || [],
        potentialInjuryDescriptions: updatedEntities.potentialInjuryDescriptions || []
    };

    console.log('Transformed entities:', transformedEntities);

    try {
        // Try to update ParkedUpload first
        let document = await ParkedUpload.findOneAndUpdate(
            { OcrId: OcrId },
            { $set: { entities: transformedEntities } },
            { new: true }
        );

        // If not found in ParkedUpload, try Upload
        if (!document) {
            document = await Upload.findOneAndUpdate(
                { OcrId: OcrId },
                { $set: { entities: transformedEntities } },
                { new: true }
            );
        }

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({ message: 'Entities updated successfully', document });
    } catch (error) {
        console.error('Error saving updated entities:', error);
        res.status(500).json({ error: 'Failed to save updated entities' });
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
                documentEntities: JSON.stringify(entities, null, 2)
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

        // Find the document with this OcrId
        const document = await Upload.findOne({ OcrId: parseInt(OcrId) });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Get the document's entities
        const entities = document.entities || {};
        console.log('Document entities:', entities);

        // Get all claims
        const claims = await ClaimModel.find();
        console.log(`Processing ${claims.length} claims for matching`);

        // Calculate match scores using the existing calculateMatchScore function
        const matchResults = claims
            .map(claim => ({
                ...calculateMatchScore(entities, claim),
                claim: {
                    id: claim._id,
                    claimNumber: claim.claimnumber,
                    name: claim.name,
                    employerName: claim.employerName,
                    dateOfInjury: claim.date
                }
            }))
            .filter(result => result.score >= 40)
            .sort((a, b) => b.score - a.score);

        console.log(`Found ${matchResults.length} potential matches`);
        
        res.json({ matchResults });
    } catch (error) {
        console.error('Error in suggested-claims:', error);
        res.status(500).json({ error: 'Failed to fetch suggested claims' });
    }
};

// Add batch processing endpoint
exports.autoSortBatch = async (req, res) => {
  const { documents, minScore } = req.body;
  
  try {
    const results = {
      success: [],
      failed: []
    };

    // Process in smaller chunks to avoid overwhelming the system
    const chunkSize = 5;
    for (let i = 0; i < documents.length; i += chunkSize) {
      const chunk = documents.slice(i, i + chunkSize);
      
      // Process chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map(OcrId => 
          this.sortDocumentToClaim({
            params: { OcrId },
            body: { autoSort: true, minScore }
          }, { json: () => {}, status: () => ({ json: () => {} }) })
        )
      );

      // Collect results
      chunkResults.forEach((result, index) => {
        const OcrId = chunk[index];
        if (result.status === 'fulfilled') {
          results.success.push(OcrId);
        } else {
          results.failed.push({
            OcrId,
            error: result.reason.message
          });
        }
      });
    }

    res.json({
      message: `Processed ${documents.length} documents`,
      results
    });

  } catch (error) {
    console.error('Batch sort error:', error);
    res.status(500).json({ error: 'Failed to process batch' });
  }
};

