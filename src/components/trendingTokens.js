import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ApiContext } from '../App';
import { Alert, AlertTitle, AlertDescription } from './alert';
import AIScan from './aiScan';

const TIMEFRAMES = {
  '5M': '5m',
  '15M': '15m',
  '30M': '30m',
  '1H': '1h',
  '6H': '6h',
  '12H': '12h',
  '24H': '24h',
};

const TrendingTokens = () => {
  const { fetchFromApi, setSelectedToken } = useContext(ApiContext);
  const [tokens, setTokens] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('5M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'rank',
    direction: 'asc'
  });
  const [aiDirection, setAiDirection] = useState('best');

  useEffect(() => {
    const fetchTrendingTokens = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = `/tokens/trending/${TIMEFRAMES[selectedTimeframe]}`;
        const data = await fetchFromApi(endpoint);
        
        const validTokens = data.filter(token => 
          token?.token?.mint && 
          token?.token?.name && 
          token?.pools?.[0]?.price?.usd !== undefined
        );

        setTokens(validTokens);
      } catch (err) {
        setError('Failed to fetch trending tokens');
        console.error('Error fetching trending tokens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingTokens();
  }, [selectedTimeframe, fetchFromApi]);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token.fullToken);
  };

  const handleAIAnalysis = (rankMap, direction) => {
    setAiDirection(direction);
    // Update tokens with AI ranking
    const updatedTokens = tokens.map(token => ({
      ...token,
      aiRank: rankMap.get(token.token.symbol) || Number.MAX_VALUE
    }));

    setTokens(updatedTokens);
    setSortConfig({ 
      key: 'aiRank', 
      direction: direction === 'best' ? 'asc' : 'desc'
    });
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <span className="ml-1 text-gray-400 opacity-0 group-hover:opacity-100">↕</span>;
    }
    return (
      <span className={`ml-1 ${column === 'aiRank' ? (aiDirection === 'best' ? 'text-green-500' : 'text-red-500') : 'text-[var(--theme-accent)]'}`}>
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '$0.00';
    
    if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
    if (price >= 1e6) return `$${(price / 1e6).toFixed(2)}M`;
    if (price >= 1e3) return `$${(price / 1e3).toFixed(2)}K`;
    
    if (price < 0.00001) {
      const priceStr = price.toFixed(20);
      const matchZeros = priceStr.match(/^0\.0+/);
      if (matchZeros) {
        const leadingZeros = matchZeros[0].length - 2;
        const significantDigits = price.toFixed(leadingZeros + 4).slice(-4);
        return `$0.0(${leadingZeros})..${significantDigits}`;
      }
    }
    
    if (price < 1) return `$${price.toPrecision(4)}`;
    return `$${price.toFixed(2)}`;
  };

  const formatPercentage = (value) => {
    if (!value || isNaN(value)) return <span className="text-gray-400">0.00%</span>;
    const formatted = parseFloat(value).toFixed(2);
    const isPositive = value > 0;
    return (
      <span className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '+' : ''}{formatted}%
      </span>
    );
  };

  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      let compareA, compareB;

      if (key === 'aiRank') {
        compareA = a.aiRank || Number.MAX_VALUE;
        compareB = b.aiRank || Number.MAX_VALUE;
      } else {
        compareA = a[key];
        compareB = b[key];
      }

      if (key === 'rank') {
        return direction === 'asc' ? compareA - compareB : compareB - compareA;
      }

      if (key === 'name') {
        compareA = a.name.toLowerCase();
        compareB = b.name.toLowerCase();
        return direction === 'asc' 
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA);
      }

      if (typeof compareA === 'number' && typeof compareB === 'number') {
        return direction === 'asc' ? compareA - compareB : compareB - compareA;
      }

      return 0;
    });
  };

  const processedTokens = useMemo(() => {
    const processed = tokens.map((token, index) => {
      const priceChange = token.events?.[TIMEFRAMES[selectedTimeframe]]?.priceChangePercentage || 0;
      const price = token.pools?.[0]?.price?.usd || 0;
      const marketCap = token.pools?.[0]?.marketCap?.usd || 0;
      
      return {
        rank: index + 1,
        mint: token.token.mint,
        name: token.token.name,
        symbol: token.token.symbol,
        image: token.token.image || '/placeholder.png',
        price,
        marketCap,
        priceChange,
        aiRank: token.aiRank,
        fullToken: token
      };
    });

    return sortData(processed, sortConfig.key, sortConfig.direction);
  }, [tokens, selectedTimeframe, sortConfig]);

  const getAIRankDisplay = (rank) => {
    if (!rank || rank === Number.MAX_VALUE) return '-';
    return (
      <span className={`font-medium ${
        aiDirection === 'best' 
          ? rank <= processedTokens.length / 3 ? 'text-green-500' 
            : rank <= (2 * processedTokens.length) / 3 ? 'text-yellow-500' 
            : 'text-red-500'
          : rank <= processedTokens.length / 3 ? 'text-red-500'
            : rank <= (2 * processedTokens.length) / 3 ? 'text-yellow-500'
            : 'text-green-500'
      }`}>
        {rank}
      </span>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <AIScan 
  tokens={processedTokens} 
  onAnalysisComplete={handleAIAnalysis}
  onTokenSelect={handleTokenSelect}
/>
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Trending Tokens ({processedTokens.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TIMEFRAMES).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                    ${selectedTimeframe === timeframe
                      ? 'bg-[var(--theme-accent)] text-white'
                      : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                    }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-accent)]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--theme-border)]">
                    <th 
                      className="group text-left py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      # <SortIcon column="rank" />
                    </th>
                    <th 
                      className="group text-left py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                      onClick={() => handleSort('name')}
                    >
                      Token <SortIcon column="name" />
                    </th>
                    <th 
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                      onClick={() => handleSort('price')}
                    >
                      Price <SortIcon column="price" />
                    </th>
                    <th 
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                      onClick={() => handleSort('marketCap')}
                    >
                      Market Cap <SortIcon column="marketCap" />
                    </th>
                    <th 
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                      onClick={() => handleSort('priceChange')}
                    >
                      {selectedTimeframe} Change <SortIcon column="priceChange" />
                    </th>
                    <th 
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                      onClick={() => handleSort('aiRank')}
                    >
                      AI Rank <SortIcon column="aiRank" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {processedTokens.map((token, index) => (
                    <tr
                      key={`${token.mint}-${TIMEFRAMES[selectedTimeframe]}-${index}`}
                      onClick={() => setSelectedToken(token.fullToken)}
                      className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-bg-secondary)] cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4 text-sm text-[var(--theme-text-secondary)]">
                        {token.rank}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={token.image}
                            alt={token.name}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.png';
                            }}
                          />
                          <div>
                            <div className="font-medium text-[var(--theme-text-primary)]">
                              {token.name}
                            </div>
                            <div className="text-sm text-[var(--theme-text-secondary)]">
                              {token.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-[var(--theme-text-primary)]">
                        {formatPrice(token.price)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm text-[var(--theme-text-primary)]">
                        {formatPrice(token.marketCap)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm">
                        {formatPercentage(token.priceChange)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm">
                        {getAIRankDisplay(token.aiRank)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TrendingTokens;