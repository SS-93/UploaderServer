// utils/matchingLogic.js (Backend)
const natural = require('natural');
const { parse, format } = require('date-fns');
const _ = require('lodash');
const Claim = require('../Models/claims.model'); // Adjust path as needed

const { JaroWinklerDistance } = natural;

// Scoring weights configuration
const SCORE_WEIGHTS = {
    CLAIM_NUMBER: 30,
    NAME: 30,
    EMPLOYER_NAME: 15,
    INJURY_DESCRIPTION: 10,
    PHYSICIAN_NAME: 10,
    DATE_OF_INJURY: 5
};

// Utility functions
const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const normalizeDate = (dateStr) => {
    try {
        const parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
        return format(parsedDate, 'MMddyyyy');
    } catch (error) {
        console.error('Date normalization error:', error);
        return dateStr;
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

// Helper function for cosine similarity calculation
const calculateCosineSimilarity = (tfidf, doc1Index, doc2Index) => {
    const terms = new Set();
    [doc1Index, doc2Index].forEach(docIndex => {
        tfidf.listTerms(docIndex).forEach(item => terms.add(item.term));
    });

    const vector1 = Array.from(terms).map(term => tfidf.tfidf(term, doc1Index));
    const vector2 = Array.from(terms).map(term => tfidf.tfidf(term, doc2Index));

    return natural.CosineSimilarity(vector1, vector2);
};

// Main scoring function
const calculateMatchScore = (documentEntities, claim) => {
    let totalScore = 0;
    const matchedFields = [];
    const matchDetails = {};

    // Log initial comparison
    console.log('Calculating match score:', {
        documentEntities,
        claimNumber: claim.claimnumber,
        claimName: claim.name
    });

    // Claim Number Match (30 points)
    const claimNumberMatch = documentEntities.potentialClaimNumbers?.some(num => 
        num.toLowerCase() === claim.claimnumber.toLowerCase());
    if (claimNumberMatch) {
        totalScore += SCORE_WEIGHTS.CLAIM_NUMBER;
        matchedFields.push('Claim Number');
        matchDetails.claimNumber = { matched: true, score: SCORE_WEIGHTS.CLAIM_NUMBER };
    }

    // Name Match (30 points)
    const nameMatch = documentEntities.potentialClaimantNames?.some(name => 
        name.toLowerCase().includes(claim.name.toLowerCase()));
    if (nameMatch) {
        totalScore += SCORE_WEIGHTS.NAME;
        matchedFields.push('Claimant Name');
        matchDetails.claimantName = { matched: true, score: SCORE_WEIGHTS.NAME };
    }

    // Employer Match (15 points)
    const employerMatch = documentEntities.potentialEmployerNames?.some(employer => 
        employer.toLowerCase().includes(claim.employerName?.toLowerCase()));
    if (employerMatch) {
        totalScore += SCORE_WEIGHTS.EMPLOYER_NAME;
        matchedFields.push('Employer Name');
        matchDetails.employerName = { matched: true, score: SCORE_WEIGHTS.EMPLOYER_NAME };
    }

    // Log match details
    console.log('Match calculation results:', {
        claimNumber: claim.claimnumber,
        totalScore,
        matchedFields,
        matchDetails
    });

    return {
        score: totalScore,
        matchedFields,
        matchDetails,
        isRecommended: totalScore >= 40
    };
};

// Main function to find matching claims
const findMatchingClaims = async (documentEntities) => {
    try {
        const allClaims = await Claim.find();
        console.log(`Processing ${allClaims.length} claims for matching`);

        const matchResults = allClaims.map(claim => {
            const matchScore = calculateMatchScore(documentEntities, claim);
            return {
                score: matchScore.score,
                matches: {
                    matchedFields: matchScore.matchedFields,
                    details: matchScore.matchDetails
                },
                isRecommended: matchScore.isRecommended,
                claim: {
                    id: claim._id,
                    claimNumber: claim.claimnumber,
                    name: claim.name,
                    employerName: claim.employerName,
                    dateOfInjury: claim.dateOfInjury,
                    physicianName: claim.physicianName
                }
            };
        })
        .filter(result => result.isRecommended)
        .sort((a, b) => b.score - a.score);

        console.log(`Found ${matchResults.length} recommended matches`);
        return matchResults;
    } catch (error) {
        console.error('Error in findMatchingClaims:', error);
        throw error;
    }
};

module.exports = { findMatchingClaims };
