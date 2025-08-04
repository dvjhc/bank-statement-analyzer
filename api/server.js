console.log("--- SERVER FILE IS RUNNING ---"); // Add this line

const express = require('express');
const cors = require('cors');
// ... rest of the file

// api/server.js

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');

// --- App & Middleware Setup ---
const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// --- Supabase Connection ---
// Initialize the Supabase client with the environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Mock Data (we still use this as the analysis result for now) ---
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
app.post('/api/analyze', upload.single('statement'), async (req, res) => {
    console.log('Received file upload request...');
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        const data = await pdf(req.file.buffer);
        console.log('Successfully parsed PDF.');

        // In a real app, the AI would generate this from data.text
        const analysisResult = mockAnalysisData; 

        // --- Save to Supabase Database ---
        console.log('Saving analysis to Supabase...');

        const { error } = await supabase
            .from('analyses')
            .insert([
                { 
                    file_name: req.file.originalname,
                    analysis_data: analysisResult // Storing the whole JSON object
                }
            ]);

        if (error) {
            throw error; // Let the catch block handle Supabase errors
        }

        console.log('Successfully saved analysis to Supabase.');

        // Send the analysis back to the frontend
        res.json(analysisResult);

    } catch (error) {
        console.error('Error during analysis or database operation:', error);
        res.status(500).send('Error processing the file or saving data.');
    }
});

// Export the app handler for Vercel
module.exports = app;
