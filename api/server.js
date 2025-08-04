// --- server.js ---
// This is a simple Node.js server using the Express framework.
// It handles PDF uploads, extracts text, and returns a JSON analysis.

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');

// --- Basic Server Setup ---
const app = express();
const port = 3001;

// --- Middleware ---
// Enable CORS (Cross-Origin Resource Sharing) to allow our React frontend
// (running on a different port) to communicate with this server.
app.use(cors());

// Multer is used to handle 'multipart/form-data', which is primarily
// used for uploading files. We'll configure it to store the uploaded file in memory.
const upload = multer({ storage: multer.memoryStorage() });


// --- Mock Data ---
// In a real application, the AI would generate this structure from the extracted PDF text.
// For now, we return this mock data to demonstrate the front-to-back connection.
const mockAnalysisData = {
  income: {
    total: 5500.00,
    categories: [
      { name: 'Salary', amount: 5000.00 },
      { name: 'Freelance', amount: 500.00 },
    ],
  },
  expenses: {
    total: 2850.50,
    categories: [
      { name: 'Rent/Mortgage', amount: 1500.00 },
      { name: 'Groceries', amount: 450.25 },
      { name: 'Transport', amount: 150.75 },
      { name: 'Utilities', amount: 200.00 },
      { name: 'Subscriptions', amount: 49.50 },
      { name: 'Dining Out', amount: 350.00 },
      { name: 'Shopping', amount: 150.00 },
    ],
  },
  summary: {
    netFlow: 2649.50,
    startDate: '2023-07-01',
    endDate: '2023-07-31',
    account: '...XXXX 1234',
  }
};


// --- API Endpoint for Analysis ---
// We define a POST route at '/analyze'. The `upload.single('statement')` part
// tells Multer to expect a single file in a field named 'statement'.
app.post('/analyze', upload.single('statement'), (req, res) => {
  console.log('Received file upload request...');

  // Check if a file was actually uploaded.
  if (!req.file) {
    console.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }

  // The uploaded file is available in memory as a Buffer.
  // We pass this buffer to pdf-parse.
  pdf(req.file.buffer).then(function(data) {
    // --- PDF Text Extraction Successful ---
    console.log('Successfully parsed PDF.');
    
    // `data.text` contains all the text from the PDF.
    // In a real application, this is the text you would send to an AI model.
    console.log('--- Extracted PDF Text (first 500 chars) ---');
    console.log(data.text.substring(0, 500) + '...');
    console.log('--------------------------------------------');

    // --- AI Categorization (Simulated) ---
    // Here, you would make an API call to an AI service like Gemini,
    // sending it the `data.text` and asking it to extract and categorize
    // transactions into a JSON format.
    //
    // For this example, we'll just return the mock data.
    console.log('Returning mock analysis data.');
    res.json(mockAnalysisData);

  }).catch(error => {
    // --- Error Handling ---
    // This will catch errors from the pdf-parse library.
    console.error('Error parsing PDF:', error);
    res.status(500).send('Error processing the PDF file.');
  });
});


// Export the app handler for Vercel
module.exports = app;
