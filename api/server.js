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

// --- Mock Data (used as the analysis result for now) ---
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
    console.log('--- ANALYSIS REQUEST RECEIVED ---');

    try {
        if (!req.file) {
            console.log('No file was uploaded.');
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        // --- Supabase Connection ---
        console.log('Checking for Supabase environment variables...');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase environment variables are not set.');
            // This error will be sent to the frontend.
            throw new Error('Database configuration is missing on the server.');
        }
        
        console.log('Supabase variables found. Initializing client.');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // --- PDF Parsing ---
        console.log('Parsing PDF...');
        const data = await pdf(req.file.buffer);
        console.log('Successfully parsed PDF.');
        
        // In a real app, the AI would generate this from data.text
        const analysisResult = mockAnalysisData; 

        // --- Save to Supabase Database ---
        console.log('Saving analysis to Supabase...');
        const { error: dbError } = await supabase
            .from('analyses')
            .insert([
                { 
                    file_name: req.file.originalname,
                    analysis_data: analysisResult // Storing the whole JSON object
                }
            ]);

        if (dbError) {
            // If there's a database error, throw it to be caught by the catch block
            console.error('Supabase DB Error:', dbError.message);
            throw new Error(`Database error: ${dbError.message}`);
        }

        console.log('Successfully saved analysis to Supabase.');

        // Send the successful analysis back to the frontend
        res.status(200).json(analysisResult);

    } catch (error) {
        // This block catches any error from the try block
        console.error('--- A SERVER-SIDE ERROR OCCURRED ---');
        console.error(error.message);
        // Send a structured error message back to the frontend
        res.status(500).json({ error: error.message || 'An unknown server error occurred.' });
    }
});

// Export the app handler for Vercel
module.exports = app;
