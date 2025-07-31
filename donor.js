
const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  city: String,
  bloodGroup: String,
  date: { type: Date, default: Date.now },
  isAvailable: { type: Boolean, default: true } ,// ✅ Added this line
});

module.exports = mongoose.model('Donor', donorSchema);

