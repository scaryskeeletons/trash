import React, { useState, useContext, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { ApiContext } from '../App';
import { Card, CardContent } from './card';

const TokenHeader = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const { fetchFromApi, setSelectedToken } = useContext(ApiContext);
  const searchContainerRef = useRef(null);
  const cachedResultsRef = useRef(null);

  const truncateAddress = (address) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatMarketCap = (marketCap) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(2)}`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const searchTokens = async () => {
      if (!searchQuery) {
        setSearchResults([]);
        cachedResultsRef.current = null;
        return;
      }
      try {
        const data = await fetchFromApi(`/search?query=${searchQuery}&limit=5`);
        const results = data.data || [];
        setSearchResults(results);
        cachedResultsRef.current = results;
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        cachedResultsRef.current = null;
      }
    };

    const debounceTimer = setTimeout(searchTokens, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, fetchFromApi]);

  const handleTokenSelect = async (token) => {
    try {
      const tokenData = await fetchFromApi(`/tokens/${token.mint}`);
      setSelectedToken(tokenData);
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
      cachedResultsRef.current = null;
    } catch (error) {
      console.error('Token fetch error:', error);
    }
  };

  const handleInputFocus = () => {
    if (cachedResultsRef.current) {
      setSearchResults(cachedResultsRef.current);
      setShowResults(true);
    }
  };

  return (
    <div className="relative z-50" ref={searchContainerRef}>
      <Card>
        <CardContent>
          <div className="relative">
            <div className="flex items-center border border-white/20 dark:border-gray-800/30 rounded-lg p-2 bg-white/5 dark:bg-black/5">
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search for a token..."
                className="flex-1 outline-none bg-transparent text-gray-900 dark:text-white
                         placeholder:text-gray-500 dark:placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleInputFocus}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute w-full mt-1 z-50">
          <Card className="w-full">
            <CardContent className="p-0">
              {searchResults.map((result) => (
                <div
                  key={result.mint}
                  className="p-3 hover:bg-white/5 dark:hover:bg-black/5 cursor-pointer flex items-center justify-between
                           border-b border-white/20 dark:border-gray-800/30 last:border-b-0 transition-colors"
                  onClick={() => handleTokenSelect(result)}
                >
                  <div className="flex items-center flex-1">
                    {result.image && (
                      <img 
                        src={result.image} 
                        alt={result.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">{result.name}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">({result.symbol})</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {truncateAddress(result.mint)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatMarketCap(result.marketCapUsd)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TokenHeader;