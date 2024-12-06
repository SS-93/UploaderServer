const ModelTracker = {
    metrics: {},

    async trackModelPerformance(modelName, startTime, endTime, textLength, entities) {
        const duration = endTime - startTime;
        const estimatedTokens = Math.ceil(textLength / 4);
        
        console.log('\n=== Model Performance Metrics ===');
        console.log(`Model: ${modelName}`);
        console.log(`Processing Time: ${duration}ms`);
        console.log(`Text Length: ${textLength} characters`);
        console.log(`Estimated Tokens: ${estimatedTokens}`);
        console.log(`Entities Found: ${Object.values(entities).reduce((sum, arr) => sum + arr.length, 0)}`);
        
        const costs = {
            'gpt-4': 0.03,
            'gpt-3.5-turbo': 0.002,
            'gpt-3.5-turbo-instruct': 0.0015
        };
        const estimatedCost = (estimatedTokens / 1000) * (costs[modelName] || 0);
        console.log(`Estimated Cost: $${estimatedCost.toFixed(4)}`);

        if (!this.metrics[modelName]) {
            this.metrics[modelName] = {
                totalCalls: 0,
                avgProcessingTime: 0,
                totalCost: 0,
                avgEntityCount: 0,
                history: []
            };
        }

        const metric = this.metrics[modelName];
        metric.totalCalls += 1;
        metric.avgProcessingTime = (metric.avgProcessingTime * (metric.totalCalls - 1) + duration) / metric.totalCalls;
        metric.totalCost += estimatedCost;
        metric.avgEntityCount = (metric.avgEntityCount * (metric.totalCalls - 1) + Object.values(entities).reduce((sum, arr) => sum + arr.length, 0)) / metric.totalCalls;
        
        metric.history.push({
            timestamp: new Date(),
            duration,
            estimatedCost,
            entityCount: Object.values(entities).reduce((sum, arr) => sum + arr.length, 0),
            textLength
        });

        console.log('\n=== Cumulative Stats ===');
        console.log(JSON.stringify(this.metrics[modelName], null, 2));
        console.log('========================\n');

        return {
            modelName,
            duration,
            estimatedCost,
            entityCount: Object.values(entities).reduce((sum, arr) => sum + arr.length, 0),
            textLength
        };
    },

    getMetrics() {
        return this.metrics;
    },

    getModelComparison() {
        return Object.entries(this.metrics).map(([model, data]) => ({
            model,
            avgProcessingTime: data.avgProcessingTime.toFixed(2) + 'ms',
            totalCost: '$' + data.totalCost.toFixed(4),
            avgEntityCount: data.avgEntityCount.toFixed(1),
            totalCalls: data.totalCalls
        }));
    }
};

module.exports = ModelTracker; 