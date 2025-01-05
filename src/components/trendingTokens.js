import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
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
  '24H': '24h'
};

const TokenImage = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={imageRef}
      className="w-8 h-8 rounded-full bg-[var(--theme-bg-tertiary)] flex items-center justify-center"
    >
      {src && !hasError && shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`w-8 h-8 rounded-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          onError={() => setHasError(true)}
          onLoad={() => setIsLoading(false)}
          loading="lazy"
        />
      )}
    </div>
  );
};

const TrendingTokens = () => {
  const { fetchFromApi, setSelectedToken } = useContext(ApiContext);
  const [tokens, setTokens] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('5M');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [aiDirection, setAiDirection] = useState('best');

  const fetchTokens = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
  
    try {
      if (cache.current[selectedTimeframe]) {
        setTokens(cache.current[selectedTimeframe]);
      } else {
        setLoading(true);
      }
  
      const endpoint = `/tokens/trending/${TIMEFRAMES[selectedTimeframe]}`;
      let data;
      try {
        data = await fetchFromApi(endpoint, { 
          signal: controller.signal
        });
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        throw new Error('API request failed');
      }
      
      if (controller.signal.aborted) return;
      
      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        throw new Error('Invalid data format received');
      }
  
      const validTokens = data.filter(token => 
        token?.token?.mint && 
        token?.pools?.length > 0 &&
        token?.pools[0]?.price?.usd !== undefined
      );
  
      cache.current[selectedTimeframe] = validTokens;
      setTokens(validTokens);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        setError(null);
        return;
      }
      setError('Failed to fetch trending tokens');
      console.error('Error fetching trending tokens:', err);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [fetchFromApi, selectedTimeframe]);

  useEffect(() => {
    fetchTokens();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedTimeframe, fetchTokens]);

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
      return <span className="ml-1 text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100">↕</span>;
    }
    return (
      <span className={`ml-1 ${column === 'aiRank' ? 
        (aiDirection === 'best' ? 'text-green-500' : 'text-red-500') : 
        'text-[var(--theme-accent)]'}`}>
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
    if (!value || isNaN(value)) return <span className="text-[var(--theme-text-tertiary)]">0.00%</span>;
    const formatted = parseFloat(value).toFixed(2);
    const isPositive = value > 0;
    return (
      <span className={`font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? '+' : ''}{formatted}%
      </span>
    );
  };

  const getAIRankDisplay = (rank) => {
    if (!rank || rank === Number.MAX_VALUE) return '-';
    return (
      <span className={`font-medium ${
        aiDirection === 'best' 
          ? rank <= tokens.length / 3 ? 'text-green-500' 
            : rank <= (2 * tokens.length) / 3 ? 'text-yellow-500' 
            : 'text-red-500'
          : rank <= tokens.length / 3 ? 'text-red-500'
            : rank <= (2 * tokens.length) / 3 ? 'text-yellow-500'
            : 'text-green-500'
      }`}>
        {rank}
      </span>
    );
  };

  const processedTokens = useMemo(() => {
    return tokens.map((token, index) => ({
      rank: index + 1,
      mint: token.token.mint,
      name: token.token.name,
      symbol: token.token.symbol,
      image: token.token.image,
      price: token.pools[0]?.price?.usd || 0,
      marketCap: token.pools[0]?.marketCap?.usd || 0,
      priceChange: token.events?.[TIMEFRAMES[selectedTimeframe]]?.priceChangePercentage || 0,
      aiRank: token.aiRank,
      fullToken: token
    }));
  }, [tokens, selectedTimeframe]);

  const sortedTokens = useMemo(() => {
    const { key, direction } = sortConfig;
    return [...processedTokens].sort((a, b) => {
      if (key === 'aiRank') {
        const aRank = a.aiRank || Number.MAX_VALUE;
        const bRank = b.aiRank || Number.MAX_VALUE;
        return direction === 'asc' ? aRank - bRank : bRank - aRank;
      }
      if (key === 'rank') return direction === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      if (key === 'name') return direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (key === 'priceChange') {
        const aChange = parseFloat(a.priceChange) || 0;
        const bChange = parseFloat(b.priceChange) || 0;
        return direction === 'asc' ? aChange - bChange : bChange - aChange;
      }
      return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
    });
  }, [processedTokens, sortConfig]);

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
            <CardTitle>
              Trending Tokens ({sortedTokens.length})
              {loading && <span className="ml-2 text-sm text-[var(--theme-text-secondary)]">Refreshing...</span>}
            </CardTitle>
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
          {loading && !tokens.length ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-accent)]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--theme-border)]">
                    <th 
                      onClick={() => handleSort('rank')}
                      className="group text-left py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      # <SortIcon column="rank" />
                    </th>
                    <th 
                      onClick={() => handleSort('name')}
                      className="group text-left py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      Token <SortIcon column="name" />
                    </th>
                    <th 
                      onClick={() => handleSort('price')}
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      Price <SortIcon column="price" />
                    </th>
                    <th 
                      onClick={() => handleSort('marketCap')}
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      Market Cap <SortIcon column="marketCap" />
                    </th>
                    <th 
                      onClick={() => handleSort('priceChange')}
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      {selectedTimeframe} Change <SortIcon column="priceChange" />
                    </th>
                    <th 
                      onClick={() => handleSort('aiRank')}
                      className="group text-right py-4 px-4 text-sm font-medium text-[var(--theme-text-secondary)] cursor-pointer hover:text-[var(--theme-text-primary)]"
                    >
                      AI Rank <SortIcon column="aiRank" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTokens.map((token) => (
                    <tr
                      key={token.mint}
                      onClick={() => handleTokenSelect(token)}
                      className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-bg-secondary)] cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4 text-sm text-[var(--theme-text-secondary)]">
                        {token.rank}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <TokenImage 
                            src={token.image} 
                            alt={token.name}
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