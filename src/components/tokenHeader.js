import React, { useState, useContext, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ApiContext } from '../App';
import { Card, CardContent } from './card';

const TokenHeader = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { fetchFromApi, setSelectedToken } = useContext(ApiContext);

  useEffect(() => {
    const searchTokens = async () => {
      if (!searchQuery) {
        setSearchResults([]);
        return;
      }
      try {
        const data = await fetchFromApi(`/search?query=${searchQuery}&limit=5`);
        setSearchResults(data.data || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
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
    } catch (error) {
      console.error('Token fetch error:', error);
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="relative">
          <div className="flex items-center border border-[var(--theme-border)] rounded-lg p-2 bg-[var(--theme-bg-secondary)]">
            <Search className="w-5 h-5 text-[var(--theme-text-secondary)] mr-2" />
            <input
              type="text"
              placeholder="Search for a token..."
              className="flex-1 outline-none bg-transparent text-[var(--theme-text-primary)]
                       placeholder:text-[var(--theme-text-tertiary)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute w-full mt-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] 
                          rounded-lg shadow-lg z-10">
              {searchResults.map((result) => (
                <div
                  key={result.mint}
                  className="p-3 hover:bg-[var(--theme-bg-tertiary)] cursor-pointer flex items-center
                           border-b border-[var(--theme-border)] last:border-b-0"
                  onClick={() => handleTokenSelect(result)}
                >
                  {result.image && (
                    <img 
                      src={result.image} 
                      alt={result.name}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                  )}
                  <div>
                    <div className="font-medium text-[var(--theme-text-primary)]">{result.name}</div>
                    <div className="text-sm text-[var(--theme-text-secondary)]">{result.symbol}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenHeader;