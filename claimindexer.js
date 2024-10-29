class ClaimIndexer {
    constructor() {
      this.claimIndex = new Map();
    }
  
    indexClaims(claims) {
      claims.forEach(claim => {
        // Using your existing claim model structure
        this.claimIndex.set(claim._id, {
          claimNumber: claim.claimnumber,
          name: claim.name,
          dateOfInjury: claim.date,
          adjuster: claim.adjuster,
          // Add any other fields we want to match against
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
      return Array.from(this.claimIndex.entries())
        .filter(([id, claim]) => {
          // Add your matching logic here
          return true; // Placeholder
        });
    }
  }
  
  export const claimIndexer = new ClaimIndexer();
  export default claimIndexer;