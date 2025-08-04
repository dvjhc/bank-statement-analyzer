import React, { useState, useEffect, useMemo } from 'react';
import { Upload, ArrowUpCircle, ArrowDownCircle, AlertCircle, Loader2, TrendingUp, TrendingDown, Scale, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- UI Components ---

const StatCard = ({ title, value, icon, colorClass, change }) => (
  <div className="bg-white p-6 rounded-xl shadow-md">
    <div className="flex justify-between items-start">
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{typeof value === 'number' ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
            {icon}
        </div>
    </div>
    {change !== undefined && (
        <p className={`text-xs mt-2 flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1"/> : <TrendingDown className="w-4 h-4 mr-1"/>}
            {change.toFixed(2)}% from last month
        </p>
    )}
  </div>
);

const UploadArea = ({ onUpload, isLoading, error }) => (
  <div className="w-full max-w-lg mx-auto text-center bg-white p-8 rounded-xl shadow-md">
    <div
      className={`border-2 border-dashed border-gray-300 rounded-xl p-12 transition-all duration-300 ${isLoading ? 'cursor-wait' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50'}`}
      onClick={() => !isLoading && document.getElementById('file-upload').click()}
    >
      <div className="flex flex-col items-center">
        {isLoading ? (
            <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">AI is Analyzing...</h2>
                <p className="text-gray-500 mt-2">This may take a moment.</p>
            </>
        ) : (
            <>
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Upload a new statement</h2>
                <p className="text-gray-500 mt-2">Drag & drop or click to select a PDF.</p>
                <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={onUpload} disabled={isLoading} />
            </>
        )}
      </div>
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

const HistoryTable = ({ data }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis History</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Flow</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.analysis_data.summary.endDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.file_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${item.analysis_data.income.total.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">${item.analysis_data.expenses.total.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">${item.analysis_data.summary.netFlow.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Main App Component ---

export default function App() {
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start true for initial history fetch
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setError(null);
    setIsLoading(true);
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setHistoricalData(data);
    } catch (err) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('statement', file);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      
      // Refresh history to include the new analysis
      await fetchHistory(); 

    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    return historicalData
        .map(item => ({
            month: new Date(item.analysis_data.summary.endDate).toLocaleString('default', { month: 'short', year: '2-digit' }),
            Income: item.analysis_data.income.total,
            Expenses: item.analysis_data.expenses.total,
            'Net Flow': item.analysis_data.summary.netFlow,
        }))
        .reverse(); // Reverse to show oldest to newest
  }, [historicalData]);

  const latestAnalysis = historicalData[0]?.analysis_data;
  const previousAnalysis = historicalData[1]?.analysis_data;

  const calculateChange = (current, previous) => {
      if(!current || !previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
  }

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Financial Dashboard</h1>
          <p className="text-lg text-gray-600 mt-2">Your financial overview across all statements.</p>
        </header>

        {latestAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Latest Income" value={latestAnalysis.income.total} icon={<ArrowUpCircle/>} colorClass="bg-green-100 text-green-700" change={calculateChange(latestAnalysis.income.total, previousAnalysis?.income.total)}/>
                <StatCard title="Latest Expenses" value={latestAnalysis.expenses.total} icon={<ArrowDownCircle/>} colorClass="bg-red-100 text-red-700" change={calculateChange(latestAnalysis.expenses.total, previousAnalysis?.expenses.total)}/>
                <StatCard title="Latest Net Flow" value={latestAnalysis.summary.netFlow} icon={<Scale/>} colorClass="bg-blue-100 text-blue-700" change={calculateChange(latestAnalysis.summary.netFlow, previousAnalysis?.summary.netFlow)}/>
                <StatCard title="Statement Period" value={new Date(latestAnalysis.summary.endDate).toLocaleDateString()} icon={<Calendar/>} colorClass="bg-purple-100 text-purple-700" />
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Legend />
                        <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="Net Flow" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="lg:col-span-1">
                <UploadArea onUpload={handleFileChange} isLoading={isAnalyzing} error={error} />
            </div>
        </div>
        
        {historicalData.length > 0 && (
            <div className="mt-8">
                <HistoryTable data={historicalData} />
            </div>
        )}
      </div>
    </div>
  );
}
