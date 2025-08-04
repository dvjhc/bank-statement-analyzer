// api/server.js

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- App & Middleware Setup ---
const app = express();
app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// --- Helper function for Supabase client ---
const getSupabaseClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Database configuration is missing on the server.');
    }
    return createClient(supabaseUrl, supabaseKey);
};

// --- API Endpoint to fetch historical analyses ---
app.get('/api/history', async (req, res) => {
    console.log('--- HISTORY REQUEST RECEIVED ---');
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('analyses')
            .select('id, created_at, file_name, analysis_data')
            .order('created_at', { ascending: false }); // Fetch newest first

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('--- ERROR FETCHING HISTORY ---');
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});


// --- API Endpoint for AI Analysis ---
app.post('/api/analyze', upload.single('statement'), async (req, res) => {
    console.log('--- AI ANALYSIS REQUEST RECEIVED ---');

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        // --- Check for API Keys ---
        console.log('Checking for API keys...');
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            throw new Error('AI API key is missing on the server.');
        }

        // --- PDF Parsing ---
        console.log('Parsing PDF...');
        const pdfData = await pdf(req.file.buffer);
        console.log('Successfully parsed PDF.');

        // --- AI Analysis ---
        console.log('Initializing Google Generative AI...');
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        const prompt = `
            You are a meticulous financial analyst. Analyze the following text extracted from a bank statement.
            Your task is to identify all financial transactions, categorize them, and provide a summary in a specific JSON format.

            Follow these rules:
            1.  Identify the statement period (start and end dates).
            2.  Sum up all incoming transactions into the specified income categories.
            3.  Sum up all outgoing transactions into the specified expenditure categories.
            4.  If a category has no transactions, its amount must be 0.
            5.  Calculate the total for income, the total for expenses, and the net flow (total income - total expenses).
            6.  Do not invent data. If you cannot determine a value from the text, use a reasonable default like "N/A" for strings or 0 for numbers.

            Here is the text to analyze:
            ---
            ${pdfData.text.substring(0, 30000)} 
            ---
        `;

        const generationConfig = {
            response_mime_type: "application/json",
            response_schema: {
                type: "OBJECT",
                properties: {
                    income: {
                        type: "OBJECT",
                        properties: {
                            total: { type: "NUMBER" },
                            categories: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        name: { type: "STRING" },
                                        amount: { type: "NUMBER" }
                                    }
                                }
                            }
                        }
                    },
                    expenses: {
                        type: "OBJECT",
                        properties: {
                            total: { type: "NUMBER" },
                            categories: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        name: { type: "STRING" },
                                        amount: { type: "NUMBER" }
                                    }
                                }
                            }
                        }
                    },
                    summary: {
                        type: "OBJECT",
                        properties: {
                            netFlow: { type: "NUMBER" },
                            startDate: { type: "STRING" },
                            endDate: { type: "STRING" },
                            account: { type: "STRING" }
                        }
                    }
                }
            }
        };

        console.log('Sending data to AI for analysis...');
        const result = await model.generateContent(prompt, generationConfig);
        const response = result.response;
        const analysisResult = JSON.parse(response.text());
        console.log('Successfully received analysis from AI.');

        // --- Save to Supabase Database ---
        console.log('Saving analysis to Supabase...');
        const supabase = getSupabaseClient();
        const { error: dbError } = await supabase
            .from('analyses')
            .insert([{
                file_name: req.file.originalname,
                analysis_data: analysisResult
            }]);

        if (dbError) {
            throw new Error(`Database error: ${dbError.message}`);
        }
        console.log('Successfully saved analysis to Supabase.');

        res.status(200).json(analysisResult);

    } catch (error) {
        console.error('--- A SERVER-SIDE ERROR OCCURRED ---');
        console.error(error.message);
        res.status(500).json({ error: error.message || 'An unknown server error occurred.' });
    }
});

module.exports = app;
