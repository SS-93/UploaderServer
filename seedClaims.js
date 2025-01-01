require('dotenv').config({ path: '../.env' });  // Adjust path to your .env file
const mongoose = require('mongoose');
const ClaimModel = require('./Models/claims.model');
const { sampleClaims } = require('./Sample Claims/sampleClaims');

const MONGO = process.env.MONGO || 'mongodb://localhost:27017/UploaderServer';

const seedClaims = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(`${MONGO}/UploaderServer`);
        console.log('Connected to MongoDB successfully');

     
        // Insert new claims
        await ClaimModel.insertMany(sampleClaims);
        console.log('Sample claims added successfully!');

    } catch (error) {
        console.error('Error seeding claims:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
};

// Export sampleClaims from sampleClaims.js
module.exports = sampleClaims;

// Run the seeding
seedClaims();