import React, { useState } from 'react';
import { Upload, BarChart2, ArrowUpCircle, ArrowDownCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';

// --- UI Components ---

const StatCard = ({ title, value, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
    <div className={`p-3 rounded-full ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  </div>
);

const CategoryList = ({ title, categories, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-md">
    <div className="flex items-center mb-4">
      <div className={`p-2 rounded-full ${colorClass} mr-3`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
    <ul className="space-y-3">
      {categories.map((cat, index) => (
        <li key={index} className="flex justify-between items-center text-gray-600">
          <span>{cat.name}</span>
          <span className="font-medium text-gray-700">${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </li>
      ))}
    </ul>
  </div>
);

const BarChart = ({ data, dataKey, color }) => {
    const maxValue = Math.max(...data.map(d => d[dataKey]));

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense Breakdown</h3>
            <div className="flex justify-around items-end h-64 space-x-2">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                            className="w-full rounded-t-md"
                            style={{
                                height: `${(item[dataKey] / maxValue) * 100}%`,
                                backgroundColor: color,
                                transition: 'height 0.5s ease-in-out'
                            }}
                            title={`${item.name}: $${item.amount.toFixed(2)}`}
                        ></div>
                        <p className="text-xs text-gray-500 mt-2 text-center transform -rotate-45 whitespace-nowrap">{item.name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const UploadArea = ({ onUpload, isLoading, error }) => (
  <div className="w-full max-w-lg mx-auto text-center">
    <div
      className={`border-2 border-dashed border-gray-300 rounded-xl p-12 transition-all duration-300 ${isLoading ? 'cursor-wait' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50'}`}
      onClick={() => !isLoading && document.getElementById('file-upload').click()}
    >
      <div className="flex flex-col items-center">
        {isLoading ? (
            <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Analyzing...</h2>
                <p className="text-gray-500 mt-2">Please wait while we process your statement.</p>
            </>
        ) : (
            <>
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Click to upload your bank statement</h2>
                <p className="text-gray-500 mt-2">PDF format only. Your data remains local.</p>
                <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={onUpload} disabled={isLoading} />
            </>
        )}
      </div>
    </div>
    <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md flex">
        <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0"/>
        <p className="text-sm text-left">
            <strong>Local Processing:</strong> Your PDF will be processed on a local server on your machine. No data is sent to the internet. The AI categorization part is currently simulated.
        </p>
    </div>
    {error && (
        <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md flex">
            <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0"/>
            <p className="text-sm text-left">
                <strong>Error:</strong> {error}
            </p>
        </div>
    )}
  </div>
);

// --- Main App Component ---

export default function App() {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null); // Reset previous analysis

    const formData = new FormData();
    formData.append('statement', file);

    try {
      // This fetch request goes to the local backend server or Vercel function
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Throw an error with the status to be caught by the catch block
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Additional check to ensure data has the expected structure
      if (!data.income || !data.expenses || !data.summary) {
        throw new Error('Received malformed analysis data from server.');
      }

      setAnalysis(data);

    } catch (err) {
      console.error("Error uploading or analyzing file:", err);
      setError('Could not connect to the server or process the file. Please ensure the server is running or check the deployment logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setError(null);
  }

  // A more robust check to ensure the analysis object and its properties exist before rendering the results.
  const isAnalysisReady = analysis && analysis.income && analysis.expenses && analysis.summary;

  if (!isAnalysisReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Bank Statement Analyzer</h1>
            <p className="text-lg text-gray-600 mt-2">Get a clear summary of your finances.</p>
        </div>
        <UploadArea onUpload={handleFileChange} isLoading={isLoading} error={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Financial Summary</h1>
          <button
            onClick={reset}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-5 h-5 mr-2" />
            Analyze Another Statement
          </button>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Income"
            value={analysis.income.total}
            icon={<ArrowUpCircle className="w-6 h-6 text-green-800" />}
            colorClass="bg-green-200"
          />
          <StatCard
            title="Total Expenses"
            value={analysis.expenses.total}
            icon={<ArrowDownCircle className="w-6 h-6 text-red-800" />}
            colorClass="bg-red-200"
          />
          <StatCard
            title="Net Flow"
            value={analysis.summary.netFlow}
            icon={<BarChart2 className="w-6 h-6 text-blue-800" />}
            colorClass="bg-blue-200"
          />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Income & Expenses Lists */}
          <div className="lg:col-span-1 space-y-6">
            <CategoryList
              title="Income Sources"
              categories={analysis.income.categories}
              icon={<ArrowUpCircle className="w-5 h-5 text-green-800" />}
              colorClass="bg-green-200"
            />
            <CategoryList
              title="Expense Categories"
              categories={analysis.expenses.categories}
              icon={<ArrowDownCircle className="w-5 h-5 text-red-800" />}
              colorClass="bg-red-200"
            />
          </div>

          {/* Chart */}
          <div className="lg:col-span-2">
            <BarChart data={analysis.expenses.categories} dataKey="amount" color="#ef4444" />
          </div>
        </div>
      </div>
    </div>
  );
}
