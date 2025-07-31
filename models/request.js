const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  name: String,
  email: String,
  bloodGroup: String,
  city: String,
  urgency: String,
  status: { type: String, default: 'Pending' },

  matchedDonor: {
    fullName: String,
    email: String,
    phone: String,
    bloodGroup: String,
    city: String
  }
});

module.exports = mongoose.model('Request', requestSchema);
