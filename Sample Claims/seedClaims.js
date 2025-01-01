const mongoose = require('mongoose');
const ClaimModel = require('../Models/claims.model');

const seedClaims = async () => {
    try {
        await ClaimModel.insertMany(sampleClaims);
        console.log('Sample claims added successfully!');
    } catch (error) {
        console.error('Error seeding claims:', error);
    }
};

// Run the seeding
mongoose.connect(process.env.MONGO_URI)
    .then(() => seedClaims())
    .then(() => mongoose.connection.close());