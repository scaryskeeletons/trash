import React, { useState, createContext, useCallback, useEffect } from 'react';
import TokenHeader from './components/tokenHeader';
import TokenMetrics from './components/tokenMetrics';
import PriceChart from './components/priceChart';
import RiskAnalysis from './components/riskAnalysis';
import TokenStats from './components/tokenStats';
import TrendingTokens from './components/trendingTokens';
import { Alert, AlertDescription } from './components/alert';

export const ApiContext = createContext();

const SOL_API_KEY = process.env.REACT_APP_SOL_API_KEY;
const SOL_API_BASE_URL = process.env.REACT_APP_SOL_API_BASE_URL;

// Create a stable headers object that won't change between renders
const API_HEADERS = {
  'x-api-key': SOL_API_KEY
};

const App = () => {
  const [selectedToken, setSelectedToken] = useState(null);
  const [error, setError] = useState(null);
  const [showTrending, setShowTrending] = useState(true);
  
  useEffect(() => {
    setShowTrending(!selectedToken);
  }, [selectedToken]);
  
  const fetchFromApi = useCallback(async (endpoint, options = {}) => {
    try {
      const fetchOptions = {
        ...options,
        headers: {
          ...API_HEADERS,
          ...(options.headers || {})
        }
      };

      const response = await fetch(`${SOL_API_BASE_URL}${endpoint}`, fetchOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const handleClearError = () => setError(null);

  const contextValue = {
    apiKey: SOL_API_KEY,
    baseUrl: SOL_API_BASE_URL,
    fetchFromApi,
    selectedToken,
    setSelectedToken
  };

  return (
    <ApiContext.Provider value={contextValue}>
      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full">
            <div className="absolute inset-0 border-slate-200 dark:border-slate-800" 
                 style={{
                   background: `
                     linear-gradient(90deg, 
                       transparent 0%, 
                       transparent calc(100% - 1px), 
                       rgba(148, 163, 184, 0.1) calc(100% - 1px)
                     )`,
                   backgroundSize: '4rem 100%'
                 }}>
            </div>
            <div className="absolute inset-0 border-slate-200 dark:border-slate-800" 
                 style={{
                   background: `
                     linear-gradient(0deg, 
                       transparent 0%, 
                       transparent calc(100% - 1px), 
                       rgba(148, 163, 184, 0.1) calc(100% - 1px)
                     )`,
                   backgroundSize: '100% 4rem'
                 }}>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {error && (
              <Alert 
                variant="destructive" 
                className="mb-4 cursor-pointer"
                onClick={handleClearError}
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <TokenHeader />
            
            {selectedToken ? (
              <div className="space-y-6 animate-fadeIn">
                <TokenMetrics 
                  selectedToken={selectedToken} 
                  fetchFromApi={fetchFromApi}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PriceChart />
                  <RiskAnalysis />
                </div>
                <TokenStats />
              </div>
            ) : showTrending && (
              <div key="trending" className="animate-fadeIn">
                <TrendingTokens />
              </div>
            )}
          </div>
        </div>
      </div>
    </ApiContext.Provider>
  );
};

export default App;