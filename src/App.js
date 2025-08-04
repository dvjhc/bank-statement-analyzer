import React, { useState, useEffect, useMemo } from 'react';
import { Upload, ArrowUpCircle, ArrowDownCircle, AlertCircle, Loader2, TrendingUp, TrendingDown, Scale, Calendar, Trash2, CheckCircle, Banknote } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- UI Components ---

const StatCard = ({ title, value, icon, colorClass, change }) => (
  <div className="bg-white p-6 rounded-xl shadow-md">
    <div className="flex justify-between items-start">
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
                {typeof value === 'number' ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (value || 'N/A')}
            </p>
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
            {icon}
        </div>
    </div>
    {change !== undefined && typeof change === 'number' && (
        <p className={`text-xs mt-2 flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1"/> : <TrendingDown className="w-4 h-4 mr-1"/>}
            {change.toFixed(2)}% from last month
        </p>
    )}
  </div>
);

const UploadArea = ({ onUpload, isLoading, error, success }) => {
  const [accountName, setAccountName] = useState('');

  const handleUploadClick = () => {
    if (isLoading) return;
    if (!accountName.trim()) {
        // Using a simple browser alert for this validation
        window.alert('Please enter an account name before uploading.');
        return;
    }
    document.getElementById('file-upload').click();
  };

  const handleFileSelect = (event) => {
    onUpload(event, accountName);
  };

  return (
    <div className="w-full max-w-lg mx-auto text-center bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
            <input
                type="text"
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., 'Main Checking' or 'Business Visa'"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
            />
        </div>
        <div
            className={`border-2 border-dashed border-gray-300 rounded-xl p-12 transition-all duration-300 ${isLoading ? 'cursor-wait' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50'}`}
            onClick={handleUploadClick}
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
                        <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={handleFileSelect} disabled={isLoading} />
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
        {success && (
            <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md flex">
                <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0"/>
                <p className="text-sm text-left">{success}</p>
            </div>
        )}
    </div>
  );
};

const HistoryTable = ({ data, onDelete, deletingId }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis History</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Flow</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((item) => {
                        const analysis = item.analysis_data || {};
                        const summary = analysis.summary || {};
                        const income = analysis.income || {};
                        const expenses = analysis.expenses || {};

                        return (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.endDate ? new Date(summary.endDate).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{item.account_name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">${(income.total || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">${(expenses.total || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">${(summary.netFlow || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">${(item.balance || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => onDelete(item.id)} disabled={deletingId === item.id} className="text-red-600 hover:text-red-900 disabled:opacity-50">
                                        {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                                    </button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Main App Component ---

export default function App() {
  const [historicalData, setHistoricalData] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('All Accounts');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const fetchHistory = async () => {
    setError(null);
    setIsLoading(true);
    try {
        const response = await fetch('/api/history');
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        const validData = data.filter(item => item.analysis_data && item.analysis_data.summary);
        setHistoricalData(validData);
        const uniqueAccounts = ['All Accounts', ...new Set(validData.map(item => item.account_name).filter(Boolean))];
        setAccounts(uniqueAccounts);
    } catch (err) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = async (event, accountName) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setSuccess('');

    const formData = new FormData();
    formData.append('statement', file);
    formData.append('accountName', accountName);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');
      
      setSuccess(`Successfully analyzed statement for ${accountName}.`);
      setTimeout(() => setSuccess(''), 5000); 
      await fetchHistory(); 

    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError(null);
    setSuccess('');

    try {
        const response = await fetch(`/api/history/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete analysis.');
        
        setSuccess('Analysis deleted successfully!');
        setTimeout(() => setSuccess(''), 5000);
        await fetchHistory();

    } catch (err) {
        setError(err.message);
    } finally {
        setDeletingId(null);
    }
  };

  const filteredData = useMemo(() => {
      if (selectedAccount === 'All Accounts') {
          return historicalData;
      }
      return historicalData.filter(item => item.account_name === selectedAccount);
  }, [historicalData, selectedAccount]);

  const chartData = useMemo(() => {
    return filteredData
        .map(item => {
            const analysis = item.analysis_data || {};
            const summary = analysis.summary || {};
            const income = analysis.income || {};
            const expenses = analysis.expenses || {};
            
            if (!summary.endDate) return null;

            return {
                month: new Date(summary.endDate).toLocaleString('default', { month: 'short', year: '2-digit' }),
                Income: income.total || 0,
                Expenses: expenses.total || 0,
                'Net Flow': summary.netFlow || 0,
                Balance: item.balance || 0,
            }
        })
        .filter(Boolean)
        .reverse();
  }, [filteredData]);

  const latestDataPoint = filteredData[0];
  const previousDataPoint = filteredData[1];

  const calculateChange = (current, previous) => {
      if(typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return undefined;
      return ((current - previous) / previous) * 100;
  }

  if (isLoading && historicalData.length === 0) {
    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Financial Dashboard</h1>
            <p className="text-lg text-gray-600 mt-2">Your financial overview across all statements.</p>
          </div>
          {accounts.length > 1 && (
            <div className="mt-4 sm:mt-0">
              <label htmlFor="accountFilter" className="sr-only">Filter by account</label>
              <select
                id="accountFilter"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {accounts.map(acc => <option key={acc}>{acc}</option>)}
              </select>
            </div>
          )}
        </header>

        {latestDataPoint && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Latest Balance" value={latestDataPoint.balance || 0} icon={<Banknote/>} colorClass="bg-yellow-100 text-yellow-700" change={calculateChange(latestDataPoint.balance, previousDataPoint?.balance)}/>
                <StatCard title="Latest Income" value={latestDataPoint.analysis_data.income?.total || 0} icon={<ArrowUpCircle/>} colorClass="bg-green-100 text-green-700" change={calculateChange(latestDataPoint.analysis_data.income?.total, previousDataPoint?.analysis_data.income?.total)}/>
                <StatCard title="Latest Expenses" value={latestDataPoint.analysis_data.expenses?.total || 0} icon={<ArrowDownCircle/>} colorClass="bg-red-100 text-red-700" change={calculateChange(latestDataPoint.analysis_data.expenses?.total, previousDataPoint?.analysis_data.expenses?.total)}/>
                <StatCard title="Latest Net Flow" value={latestDataPoint.analysis_data.summary?.netFlow || 0} icon={<Scale/>} colorClass="bg-blue-100 text-blue-700" change={calculateChange(latestDataPoint.analysis_data.summary?.netFlow, previousDataPoint?.analysis_data.summary?.netFlow)}/>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Trends for {selectedAccount}</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        <Legend />
                        <Line type="monotone" dataKey="Balance" stroke="#f59e0b" strokeWidth={2} />
                        <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="lg:col-span-1">
                <UploadArea onUpload={handleFileChange} isLoading={isAnalyzing} error={error} success={success} />
            </div>
        </div>
        
        {filteredData.length > 0 && (
            <div className="mt-8">
                <HistoryTable data={filteredData} onDelete={handleDelete} deletingId={deletingId} />
            </div>
        )}
      </div>
    </div>
  );
}
