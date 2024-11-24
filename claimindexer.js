class ClaimIndexer {
    constructor() {
      this.claimIndex = new Map();
    }
  
    async initialize() {
        try {
            console.log('Initializing ClaimIndexer...');
            const response = await fetch('http://localhost:4000/new/list');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const claims = data.getAllClaims || [];
            
            // Index the claims
            this.indexClaims(claims);
            console.log(`Successfully indexed ${claims.length} claims`);
            
            return this.claimIndex;
        } catch (error) {
            console.error('Error initializing ClaimIndexer:', error);
            throw error;
        }
    }
  
    indexClaims(claims) {
      claims.forEach(claim => {
        this.claimIndex.set(claim._id, {
          claimNumber: claim.claimnumber,
          name: claim.name,
          dateOfInjury: claim.date,
          adjuster: claim.adjuster,
          employerName: claim.employerName,
          physicianName: claim.physicianName,
          injuryDescription: claim.injuryDescription,
          documents: claim.documents || []
        });
      });
      console.log('Claims indexed:', this.claimIndex.size);
      return this.claimIndex;
    }
  
    getIndexedClaim(claimId) {
      return this.claimIndex.get(claimId);
    }
  
    getAllIndexedClaims() {
      return Array.from(this.claimIndex.values());
    }
  
    searchIndexedClaims(searchCriteria) {
      const results = Array.from(this.claimIndex.entries())
        .filter(([id, claim]) => {
          // Basic text search across all fields
          const searchTerm = searchCriteria.toLowerCase();
          return (
            claim.claimNumber?.toLowerCase().includes(searchTerm) ||
            claim.name?.toLowerCase().includes(searchTerm) ||
            claim.adjuster?.toLowerCase().includes(searchTerm) ||
            claim.employerName?.toLowerCase().includes(searchTerm) ||
            claim.physicianName?.toLowerCase().includes(searchTerm) ||
            claim.injuryDescription?.toLowerCase().includes(searchTerm)
          );
        })
        .map(([id, claim]) => ({
          id,
          ...claim,
          score: this.calculateSearchScore(claim, searchCriteria)
        }))
        .sort((a, b) => b.score - a.score);

      return results;
    }

    calculateSearchScore(claim, searchTerm) {
        let score = 0;
        searchTerm = searchTerm.toLowerCase();

        // Weighted scoring
        if (claim.claimNumber?.toLowerCase().includes(searchTerm)) score += 5;
        if (claim.name?.toLowerCase().includes(searchTerm)) score += 4;
        if (claim.employerName?.toLowerCase().includes(searchTerm)) score += 3;
        if (claim.physicianName?.toLowerCase().includes(searchTerm)) score += 2;
        if (claim.injuryDescription?.toLowerCase().includes(searchTerm)) score += 2;
        if (claim.adjuster?.toLowerCase().includes(searchTerm)) score += 1;

        return score;
    }
  }
  
  export const claimIndexer = new ClaimIndexer();
  export default claimIndexer;