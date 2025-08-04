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
            .select('id, created_at, file_name, analysis_data, account_name, balance') // Fetch balance
            .order('created_at', { ascending: false }); 

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

// --- API Endpoint to delete an analysis ---
app.delete('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`--- DELETE REQUEST RECEIVED FOR ID: ${id} ---`);
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('analyses')
            .delete()
            .match({ id: id });
        
        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        res.status(200).json({ message: 'Analysis deleted successfully.' });

    } catch (error) {
        console.error(`--- ERROR DELETING ID: ${id} ---`);
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});


// --- API Endpoint for AI Analysis ---
app.post('/api/analyze', upload.single('statement'), async (req, res) => {
    console.log('--- AI ANALYSIS REQUEST RECEIVED ---');

    try {
        const { accountName } = req.body; // Get account name from the form data
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        if (!accountName) {
            return res.status(400).json({ error: 'Account name is required.' });
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
            1.  **CRITICAL RULE:** Transactions listed under columns titled "Withdrawals", "Debits", or "Payments" are EXPENSES. Transactions listed under "Deposits", "Credits", or "Receipts" are INCOME.
            2.  Identify the statement period. Find the start and end dates and format them as "YYYY-MM-DD".
            3.  **NEW RULE:** Specifically find the value for "Total Balance in SGD Equivalent", which is often on page 3, and extract it as a number for the 'balance' field.
            4.  Sum up all incoming transactions into the specified income categories: 'Salary', 'Dividends', 'Investment Income', 'Other Income'.
            5.  Sum up all outgoing transactions into the specified expenditure categories: 'Mortgage', 'Car Loan', 'Insurance Premiums', 'Credit Cards', 'Groceries', 'Utilities', 'Transport', 'Shopping', 'Dining Out'.
            6.  If a transaction doesn't fit a specific category, classify it under 'Other Income' for incoming or create a reasonable new expenditure category.
            7.  If a category has no transactions, its amount must be 0.
            8.  Calculate the total for income, the total for expenses, and the net flow (total income - total expenses).
            9.  Do not invent data. If you cannot determine a value from the text, use a reasonable default like "N/A" for strings or 0 for numbers.
            10. Return ONLY the JSON object, with no other text or markdown formatting.

            Here is the text to analyze:
            ---
            ${pdfData.text.substring(0, 30000)} 
            ---
        `;
        
        console.log('Sending data to AI for analysis...');
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        let responseText = response.text();
        console.log('Raw AI Response:', responseText); 
        
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '');
        const aiResponse = JSON.parse(responseText.trim());

        console.log('Successfully received and parsed analysis from AI.');

        const transformCategories = (summaryObject, totalKey) => {
            if (!summaryObject) return [];
            return Object.entries(summaryObject)
                .filter(([key]) => key !== totalKey)
                .map(([name, amount]) => ({ name, amount }));
        };

        const analysisResult = {
            income: {
                total: aiResponse.income_summary?.['Total Income'] || 0,
                categories: transformCategories(aiResponse.income_summary, 'Total Income')
            },
            expenses: {
                total: aiResponse.expense_summary?.['Total Expenses'] || 0,
                categories: transformCategories(aiResponse.expense_summary, 'Total Expenses')
            },
            summary: {
                netFlow: aiResponse.net_flow || 0,
                startDate: aiResponse.statement_period?.start_date || 'N/A',
                endDate: aiResponse.statement_period?.end_date || 'N/A',
                account: aiResponse.account || 'N/A',
                balance: aiResponse.balance || 0 // Extract balance
            }
        };

        if (!analysisResult.income || !analysisResult.expenses || !analysisResult.summary) {
            console.error('Transformed data is still invalid:', JSON.stringify(analysisResult, null, 2));
            throw new Error('Failed to transform AI response into a valid format.');
        }

        // --- Save to Supabase Database ---
        console.log('Saving analysis to Supabase...');
        const supabase = getSupabaseClient();
        const { error: dbError } = await supabase
            .from('analyses')
            .insert([{
                file_name: req.file.originalname,
                analysis_data: analysisResult,
                account_name: accountName,
                balance: analysisResult.summary.balance // Save the balance
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
