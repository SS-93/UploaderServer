// Utility to clean up old batch status entries
const cleanupBatchStatus = () => {
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    batchProcessingStatus.forEach((status, batchId) => {
        if (!status.inProgress && Date.now() - status.endTime > MAX_AGE) {
            batchProcessingStatus.delete(batchId);
        }
    });
};

// Run cleanup every hour
setInterval(cleanupBatchStatus, 60 * 60 * 1000); 