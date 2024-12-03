// utils/matchingLogic.js (Backend)
const natural = require('natural');
const { parse, format } = require('date-fns');
const _ = require('lodash');
const Claim = require('../Models/claims.model'); // Adjust path as needed

const { JaroWinklerDistance } = natural;

// Scoring weights configuration
const SCORE_WEIGHTS = {
    CLAIM_NUMBER: 15,
    NAME: 25,
    EMPLOYER_NAME: 15,
    PHYSICIAN_NAME: 15,
    DATE_OF_INJURY: 15,
    INJURY_DESCRIPTION: 15
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

// Simplified date handling
const normalizeDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Remove any non-numeric characters and get an array of numbers
    const numbers = dateStr.split(/\D+/).filter(n => n);
    
    // If we have at least 3 numbers (month, day, year), try to format
    if (numbers.length >= 3) {
        const month = numbers[0].padStart(2, '0');
        const day = numbers[1].padStart(2, '0');
        const year = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
        return `${month}${day}${year}`;
    }
    
    // If date parsing fails, return the original string normalized
    return dateStr.toLowerCase().replace(/[^a-z0-9]/g, '');
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
    let totalScore = 0;
    const matchedFields = [];
    const matchDetails = {};

    // Parse the documentEntities if it's a string
    const entities = typeof documentEntities === 'string' ? 
        JSON.parse(documentEntities) : documentEntities;

    // Claim Number Matching (30 points)
    if (entities.potentialClaimNumbers?.length > 0) {
        const normalizedClaimNumber = claim.claimnumber.toLowerCase().replace(/[^a-z0-9]/g, '');
        const hasClaimMatch = entities.potentialClaimNumbers.some(docNum => {
            const normalizedDocNum = docNum.toLowerCase().replace(/[^a-z0-9]/g, '');
            return normalizedDocNum === normalizedClaimNumber;
        });
        
        if (hasClaimMatch) {
            totalScore += SCORE_WEIGHTS.CLAIM_NUMBER;
            matchedFields.push('claimNumber');
            matchDetails.claimNumber = { matched: true, score: SCORE_WEIGHTS.CLAIM_NUMBER };
        }
    }

    // Claimant Name Matching (30 points)
    if (entities.potentialClaimantNames?.length > 0 && claim.name) {
        const normalizedClaimName = claim.name.toLowerCase();
        const hasNameMatch = entities.potentialClaimantNames.some(name => 
            JaroWinklerDistance(normalizedClaimName, name.toLowerCase()) > 0.8
        );
        
        if (hasNameMatch) {
            totalScore += SCORE_WEIGHTS.NAME;
            matchedFields.push('name');
            matchDetails.name = { matched: true, score: SCORE_WEIGHTS.NAME };
        }
    }

    // Date of Injury Matching (20 points)
    if (entities.potentialDatesOfInjury?.length > 0 && claim.dateOfInjury) {
        const claimDate = new Date(claim.dateOfInjury).toLocaleDateString();
        const hasDateMatch = entities.potentialDatesOfInjury.some(date => 
            new Date(date).toLocaleDateString() === claimDate
        );
        
        if (hasDateMatch) {
            totalScore += SCORE_WEIGHTS.DATE_OF_INJURY;
            matchedFields.push('dateOfInjury');
            matchDetails.dateOfInjury = { matched: true, score: SCORE_WEIGHTS.DATE_OF_INJURY };
        }
    }

    // Employer Name Matching (15 points)
    if (entities.potentialEmployerNames?.length > 0 && claim.employerName) {
        const hasEmployerMatch = entities.potentialEmployerNames.some(employer =>
            JaroWinklerDistance(claim.employerName.toLowerCase(), employer.toLowerCase()) > 0.8
        );
        
        if (hasEmployerMatch) {
            totalScore += SCORE_WEIGHTS.EMPLOYER_NAME;
            matchedFields.push('employerName');
            matchDetails.employer = { matched: true, score: SCORE_WEIGHTS.EMPLOYER_NAME };
        }
    }

    // Physician Name Matching (15 points)
    if (entities.potentialPhysicianNames?.length > 0 && claim.physicianName) {
        const hasPhysicianMatch = entities.potentialPhysicianNames.some(physician =>
            JaroWinklerDistance(claim.physicianName.toLowerCase(), physician.toLowerCase()) > 0.8
        );
        
        if (hasPhysicianMatch) {
            totalScore += SCORE_WEIGHTS.PHYSICIAN_NAME;
            matchedFields.push('physicianName');
            matchDetails.physician = { matched: true, score: SCORE_WEIGHTS.PHYSICIAN_NAME };
        }
    }

    return {
        score: totalScore,
        matchedFields,
        matchDetails,
        confidence: totalScore / 100,
        details: {
            claimNumber: claim.claimnumber,
            name: claim.name,
            employerName: claim.employerName,
            dateOfInjury: claim.dateOfInjury,
            physicianName: claim.physicianName
        },
        isRecommended: totalScore >= 30 // Reduced from 40 to 30
    };
};

// Main function to find matching claims
const findMatchingClaims = async (documentEntities) => {
    try {
        const allClaims = await Claim.find();
        const matchResults = allClaims.map(claim => {
            const matchScore = calculateMatchScore(documentEntities, claim);
            return {
                score: matchScore.score,
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
        });

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

