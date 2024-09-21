// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Add other fields as necessary
  linkedOrdinookis: { type: [String], default: [] }, // Array of ordinookiIds
});

module.exports = mongoose.model('User', UserSchema);