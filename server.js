// Load dependencies
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = 3000;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Import models
const Donor = require('./models/donor');
const Request = require('./models/request');
const User = require('./models/user');
const Message = require('./models/message');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Register
app.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).send('All fields required');

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).send('User already exists');

    const newUser = new User({ email, password, role });
    await newUser.save();

    res.status(201).send('Registered successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ message: 'Missing fields' });

  try {
    if (role === 'admin') {
      if (email === 'admin@gmail.com' && password === 'admin123') {
        return res.json({ success: true, redirect: '/admin.html' });
      } else {
        return res.status(401).json({ message: 'Invalid admin login' });
      }
    }

    const user = await User.findOne({ email, password, role });
    if (user) {
      const redirectPath = role === 'donor' ? '/donate.html' : '/request.html';
      return res.json({ success: true, redirect: redirectPath });
    } else {
      return res.status(401).json({ message: 'Invalid login' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Donor form
app.post('/donate', async (req, res) => {
  try {
    const donor = new Donor(req.body);
    await donor.save();

 res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Thank You</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #fff0f0;
        margin: 0;
        padding: 0;
      }
      .navbar {
        background-color: #dc3545;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: white;
      }
      .navbar a {
        color: white;
        text-decoration: none;
        font-weight: bold;
      }
      .container {
        text-align: center;
        padding: 60px 20px;
      }
      h2 {
        color: #dc3545;
      }
      .btn {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        background-color: #dc3545;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="navbar">
      <span>🩸 Blood Bank</span>
      <a href="/index.html">Home</a>
    </div>

    <div class="container">
      <h2>Thank you, ${donor.fullName}! ❤️</h2>
      <p>Your donation details have been saved.</p>
      <a class="btn" href="/donate.html">Register Another Donor</a>
    </div>
  </body>
  </html>
`);





  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving donor");
  }
});

// Request form
app.post('/request', async (req, res) => {
  try {
    const data = { ...req.body, status: 'Pending' };
    const request = new Request(data);
    await request.save();

res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Request Submitted</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #fef4f4;
        margin: 0;
        padding: 0;
      }
      .navbar {
        background-color: #dc3545;
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .navbar a {
        color: white;
        text-decoration: none;
        font-weight: bold;
      }
      .container {
        text-align: center;
        padding: 60px 20px;
      }
      h2 {
        color: #dc3545;
      }
      .btn {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        background-color: #dc3545;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="navbar">
      <span>🩸 Blood Bank</span>
      <a href="/index.html">Home</a>
    </div>

    <div class="container">
      <h2>Request received, ${request.name}! 🩸</h2>
      <p>We will reach out soon based on urgency: <strong>${request.urgency}</strong></p>
      <a class="btn" href="/request.html">Submit Another Request</a>
    </div>
  </body>
  </html>
`);




  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving request");
  }
});

app.get('/api/donors', async (req, res) => {
  try {
    const query = { isAvailable: true };

    if (req.query.bloodGroup) {
      query.bloodGroup = req.query.bloodGroup;
    }

    if (req.query.city) {
      query.city = new RegExp(req.query.city, 'i'); // case-insensitive match
    }

    const donors = await Donor.find(query);
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch donors' });
  }
});


// Get recipients (sorted by urgency)
app.get('/api/requests', async (req, res) => {
  const { bloodGroup, city } = req.query;
  const filter = {};
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (city) filter.city = new RegExp(city, 'i');

  const urgencyOrder = { High: 1, Medium: 2, Low: 3 };

  try {
    const requests = await Request.find(filter);
    const sorted = requests.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    res.json(sorted);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Approve request
app.put('/api/requests/:id/approve', async (req, res) => {
  try {
    const recipient = await Request.findById(req.params.id);
    if (!recipient) return res.status(404).send("Request not found");

    const donor = await Donor.findOne({
      bloodGroup: recipient.bloodGroup,
      city: recipient.city,
      isAvailable: true
    });

    recipient.status = 'Approved';

    if (donor) {
      recipient.matchedDonor = {
        fullName: donor.fullName,
        email: donor.email,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        city: donor.city
      };
      await Donor.findByIdAndUpdate(donor._id, { isAvailable: false });
    }

    await recipient.save();
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error approving request");
  }
});

// Delete donor
app.delete('/api/donors/:id', async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).send("Error deleting donor");
  }
});

// Delete request
app.delete('/api/requests/:id', async (req, res) => {
  try {
    await Request.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).send("Error deleting request");
  }
});

// Request status check
app.get('/api/request-status/:email', async (req, res) => {
  try {
    const requests = await Request.find({ email: req.params.email });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});



// POST route for contact form
app.post('/contact', async (req, res) => {
  try {
    const { fullName, email, content } = req.body;
    if (!fullName || !email || !content) {
      return res.status(400).send("All fields are required.");
    }

    const message = new Message({ fullName, email, content });
    await message.save();

  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Message Sent</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #fff6f6;
        margin: 0;
        padding: 0;
      }
      .navbar {
        background-color: #dc3545;
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .navbar a {
        color: white;
        text-decoration: none;
        font-weight: bold;
      }
      .container {
        text-align: center;
        padding: 60px 20px;
      }
      h2 {
        color: #dc3545;
      }
      .btn {
        display: inline-block;
        margin-top: 20px;
        padding: 10px 20px;
        background-color: #dc3545;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="navbar">
      <span>🩸 Blood Bank</span>
      <a href="/index.html">Home</a>
    </div>

    <div class="container">
      <h2>Thank you for your message! 📩</h2>
      <p>We'll get back to you shortly.</p>
      <a class="btn" href="/contact.html">Send Another Message</a>
    </div>
  </body>
  </html>
`);


  } catch (err) {
    console.error(err);
    res.status(500).send("Server error. Please try again.");
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
