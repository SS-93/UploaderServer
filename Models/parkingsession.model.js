// models/ParkingSession.js
const mongoose = require('mongoose');

const ParkingSessionSchema = new mongoose.Schema({
    name: { type: String, required: true }, // The name of the parking session
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user initiating the session
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }], // Array of document IDs associated with the session
    createdAt: { type: Date, default: Date.now }, // When the session was created
    updatedAt: { type: Date, default: Date.now }, // Last time the session was updated
    isActive: { type: Boolean, default: true }, // Indicates if the session is active
});

ParkingSessionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const ParkingSession = mongoose.model('ParkingSession', ParkingSessionSchema);

module.exports = ParkingSession;
