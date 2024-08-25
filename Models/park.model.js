const mongoose = require('mongoose');

const ParkSchema = new mongoose.Schema({
    name: { type: String, required: true }, // The name of the park
    location: { type: String, required: true }, // The location of the park, could be an address or coordinates
    description: { type: String }, // A brief description of the park
    createdAt: { type: Date, default: Date.now }, // When the park was added to the database
    updatedAt: { type: Date, default: Date.now }, // Last time the park details were updated
});

ParkSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Park = mongoose.model('Park', ParkSchema);

module.exports = Park;
