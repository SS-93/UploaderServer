// utils/matchingLogic.js (Backend)
const natural = require('natural');
const { parse, format } = require('date-fns');
const _ = require('lodash');
const Claim = require('../Models/claims.model'); // Adjust path as needed

const { JaroWinklerDistance } = natural;

// Scoring weights configuration
const SCORE_WEIGHTS = {
    PRIMARY: {
        CLAIM_NUMBER: 30,
        NAME: 25,
        DATE_OF_INJURY: 20
    },
    SECONDARY: {
        EMPLOYER_NAME: 15,
        PHYSICIAN_NAME: 10
    }
};

// Utility functions
const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

//keep this do not delete
// const normalizeDate = (dateStr) => {
//     // Correct common typos in the year
//     const correctedDateStr = dateStr.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4,5})/, (match, m, d, y) => {
//         const correctedYear = y.length === 5 ? `2${y.slice(1)}` : y;
//         return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${correctedYear}`;
//     });

//     try {
//         const parsedDate = parse(correctedDateStr, 'MM/dd/yyyy', new Date());
//         return format(parsedDate, 'MMddyyyy');
//     } catch (error) {
//         console.error('Date normalization error:', error, 'Original:', dateStr);
//         return null; // Return null to indicate invalid date
//     }
// };


const testMatchScoring = (documentEntities, claim) => {
    console.log('\n=== TEST MATCH SCORING ===');
    
    // Test each field individually
    const scores = {
        claimNumber: 0,
        name: 0,
        employer: 0,
        date: 0,
        physician: 0
    };

    // Test claim number
    const normalizedClaimNumber = claim.claimnumber.replace(/[^a-z0-9]/gi, '').toLowerCase();
    documentEntities.potentialClaimNumbers.forEach(docNum => {
        const normalizedDocNum = docNum.replace(/[^a-z0-9]/gi, '').toLowerCase();
        if (normalizedDocNum === normalizedClaimNumber) {
            scores.claimNumber = SCORE_WEIGHTS.CLAIM_NUMBER;
            console.log(`Claim number match: ${docNum} = ${claim.claimnumber}`);
        }
    });

    // Continue with other fields...
    
    console.log('Individual Scores:', scores);
    console.log('Total Score:', Object.values(scores).reduce((a, b) => a + b, 0));
    
    return scores;
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

const calculateTFIDF = (documents) => {
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();

    documents.forEach(doc => {
        if (doc) tfidf.addDocument(normalizeString(doc));
    });

    return tfidf;
};

// Cosine Similarity Implementation
const calculateCosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * (vecB[idx] || 0), 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
};

// Helper function for cosine similarity calculation using TFIDF
const computeCosineSimilarity = (tfidf, doc1Index, doc2Index) => {
    const terms = new Set();
    [doc1Index, doc2Index].forEach(docIndex => {
        tfidf.listTerms(docIndex).forEach(item => terms.add(item.term));
    });

    const vector1 = Array.from(terms).map(term => tfidf.tfidf(term, doc1Index));
    const vector2 = Array.from(terms).map(term => tfidf.tfidf(term, doc2Index));

    return calculateCosineSimilarity(vector1, vector2);
};

// Main scoring function
const calculateMatchScore = (documentEntities, claim) => {
    console.log('Starting match calculation for:', {
        claimNumber: claim.claimnumber,
        documentEntities: JSON.stringify(documentEntities, null, 2)
    });

    let score = {
        total: 0,
        breakdown: {},
        matches: [],
        confidence: {}
    };

    // Claim Number Match (30 points)
    if (documentEntities.potentialClaimNumbers?.length) {
        const hasClaimMatch = documentEntities.potentialClaimNumbers.some(docNum => 
            docNum.replace(/[^a-z0-9]/gi, '').toLowerCase() === 
            claim.claimnumber.replace(/[^a-z0-9]/gi, '').toLowerCase()
        );
        
        if (hasClaimMatch) {
            score.total += SCORE_WEIGHTS.PRIMARY.CLAIM_NUMBER;
            score.breakdown.claimNumber = SCORE_WEIGHTS.PRIMARY.CLAIM_NUMBER;
            score.matches.push('claimNumber');
            score.confidence.claimNumber = 1;
        }
    }

    // Name Match (25 points)
    if (documentEntities.potentialClaimantNames?.length && claim.name) {
        const bestNameMatch = Math.max(
            ...documentEntities.potentialClaimantNames.map(name => 
                JaroWinklerDistance(normalizeString(name), normalizeString(claim.name))
            )
        );
        
        if (bestNameMatch > 0.9) {
            score.total += SCORE_WEIGHTS.PRIMARY.NAME;
            score.breakdown.name = SCORE_WEIGHTS.PRIMARY.NAME;
            score.matches.push('name');
            score.confidence.name = bestNameMatch;
        }

         // Date of Injury Match (20 points)
    if (documentEntities.potentialDatesOfInjury?.length && claim.dateOfInjury) {
        const normalizedClaimDate = normalizeDate(claim.dateOfInjury);
        const hasDateMatch = documentEntities.potentialDatesOfInjury.some(docDate => 
            normalizeDate(docDate) === normalizedClaimDate
        );
        
        if (hasDateMatch) {
            score.total += SCORE_WEIGHTS.PRIMARY.DATE_OF_INJURY;
            score.breakdown.dateOfInjury = SCORE_WEIGHTS.PRIMARY.DATE_OF_INJURY;
            score.matches.push('dateOfInjury');
            score.confidence.dateOfInjury = 1;
        }
    }

    // Employer Name Match (15 points)
    if (documentEntities.potentialEmployerNames?.length && claim.employerName) {
        const bestEmployerMatch = Math.max(
            ...documentEntities.potentialEmployerNames.map(empName => 
                JaroWinklerDistance(normalizeString(empName), normalizeString(claim.employerName))
            )
        );

        if (bestEmployerMatch > 0.85) {
            score.total += SCORE_WEIGHTS.SECONDARY.EMPLOYER_NAME;
            score.breakdown.employerName = SCORE_WEIGHTS.SECONDARY.EMPLOYER_NAME;
            score.matches.push('employerName');
            score.confidence.employerName = bestEmployerMatch;
        }
    }

    // Physician Name Match (10 points)
    if (documentEntities.potentialPhysicianNames?.length && claim.physicianName) {
        const bestPhysicianMatch = Math.max(
            ...documentEntities.potentialPhysicianNames.map(physName => 
                JaroWinklerDistance(normalizeString(physName), normalizeString(claim.physicianName))
            )
        );

        if (bestPhysicianMatch > 0.8) {
            score.total += SCORE_WEIGHTS.SECONDARY.PHYSICIAN_NAME;
            score.breakdown.physicianName = SCORE_WEIGHTS.SECONDARY.PHYSICIAN_NAME;
            score.matches.push('physicianName');
            score.confidence.physicianName = bestPhysicianMatch;
        }
    }
    }

    console.log(`Matched Fields: ${score.matches.join(', ')}`);
    console.log(`Total Score: ${score.total}`);

    return {
        score: score.total,
        confidence: score.confidence,
        details: score.breakdown,
        matchedFields: score.matches,
        isRecommended: score.total >= 70,
        claim: {
            id: claim._id,
            claimNumber: claim.claimnumber,
            name: claim.name,
            employerName: claim.employerName,
            dateOfInjury: claim.date,
            physicianName: claim.physicianName
        }
    };
};

// Main function to find matching claims
const findMatchingClaims = async (documentEntities) => {
    try {
        const allClaims = await Claim.find();
        console.log(`Testing against ${allClaims.length} claims`);

        const matchResults = await Promise.all(allClaims.map(async (claim) => {
            // Run detailed test scoring
            const testResults = await testMatchScoring(documentEntities, claim);
            console.log(`Test results for claim ${claim.claimnumber}:`, testResults);

            // Continue with regular scoring...
            const matchScore = calculateMatchScore(documentEntities, claim);
            
            return {
                score: matchScore.score,
                testScore: testResults.totalScore, // Add test score for comparison
                matches: {
                    matchedFields: matchScore.matchedFields,
                    details: {
                        claimNumber: { matched: matchScore.matchDetails.claimNumber?.matched || false, score: SCORE_WEIGHTS.CLAIM_NUMBER },
                        name: { matched: matchScore.matchDetails.name?.matched || false, score: SCORE_WEIGHTS.NAME },
                        employerName: { matched: matchScore.matchDetails.employer?.matched || false, score: SCORE_WEIGHTS.EMPLOYER_NAME },
                        physicianName: { matched: matchScore.matchDetails.physician?.matched || false, score: SCORE_WEIGHTS.PHYSICIAN_NAME },
                        dateOfInjury: { matched: matchScore.matchDetails.dateOfInjury?.matched || false, score: SCORE_WEIGHTS.DATE_OF_INJURY },
                        injuryDescription: { matched: matchScore.matchDetails.injury?.matched || false, score: SCORE_WEIGHTS.INJURY_DESCRIPTION }
                    }
                },
                isRecommended: matchScore.isRecommended,
                claim: {
                    claimNumber: claim.claimnumber,
                    name: claim.name,
                    employerName: claim.employerName,
                    dateOfInjury: claim.dateOfInjury ? 
                        new Date(claim.dateOfInjury).toLocaleDateString('en-US') : 
                        'Unknown',
                    physicianName: claim.physicianName
                }
            };
        }));

        const filteredResults = matchResults
            .filter(result => result.isRecommended)
            .sort((a, b) => b.score - a.score);

        return {
            totalMatches: filteredResults.length,
            topScore: filteredResults.length > 0 ? filteredResults[0].score : 0,
            matchResults: filteredResults
        };
    } catch (error) {
        console.error('Error in findMatchingClaims:', error);
        return {
            totalMatches: 0,
            topScore: 0,
            matchResults: []
        };
    }


};


module.exports = { findMatchingClaims };

