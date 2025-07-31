const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  content: String,
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
