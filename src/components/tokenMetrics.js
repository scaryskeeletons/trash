import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Activity,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
  Globe,
  Twitter,
  MessageCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './card';

const REFRESH_INTERVAL = 60000; // 60 seconds

const TokenMetrics = ({ selectedToken, fetchFromApi }) => {
  const [metricsData, setMetricsData] = useState({
    price: null,
    marketCap: null,
    volume: null,
    stats: null,
    isLoading: true,
    error: null
  });
  
  const [copied, setCopied] = useState(false);

  const fetchMetricsData = useCallback(async () => {
    if (!selectedToken?.token?.mint) return;
    
    try {
      setMetricsData(prev => ({ ...prev, isLoading: true, error: null }));
      
      const [priceData, statsData] = await Promise.all([
        fetchFromApi(`/price?token=${selectedToken.token.mint}`),
        fetchFromApi(`/stats/${selectedToken.token.mint}`)
      ]);
      
      setMetricsData({
        price: priceData.price,
        marketCap: priceData.marketCap,
        volume: priceData.volume,
        stats: statsData,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Metrics fetch error:', error);
      setMetricsData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch metrics data'
      }));
    }
  }, [selectedToken?.token?.mint, fetchFromApi]);

  useEffect(() => {
    if (!selectedToken?.token?.mint) return;
    
    fetchMetricsData();
    const interval = setInterval(fetchMetricsData, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchMetricsData]);

  const formatLargeNumber = useCallback((num) => {
    if (!num || isNaN(num)) return '$0';
    const absNum = Math.abs(num);
    if (absNum >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (absNum >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (absNum >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  }, []);

  const formatPrice = useCallback((price, decimals = 6) => {
    if (!price || isNaN(price)) return '$0';
    return `$${Number(price).toFixed(decimals)}`;
  }, []);

  const getPriceChanges = useCallback((stats) => {
    if (!stats) return [];
    
    const intervals = ['5m', '1h', '24h'];
    return intervals
      .filter(interval => stats[interval]?.priceChangePercentage !== undefined)
      .map(interval => ({
        label: interval,
        change: stats[interval].priceChangePercentage?.toFixed(2)
      }));
  }, []);

  const metrics = useMemo(() => {
    if (!selectedToken?.token) return [];
    
    const { price, marketCap, volume, stats } = metricsData;
    const priceChanges = getPriceChanges(stats);
    
    return [
      {
        title: 'Price',
        value: formatPrice(price),
        icon: DollarSign,
        isLoading: metricsData.isLoading,
        intervals: priceChanges
      },
      {
        title: 'Market Cap',
        value: formatLargeNumber(marketCap),
        icon: TrendingUp,
        isLoading: metricsData.isLoading
      },
      {
        title: '24h Volume',
        value: formatLargeNumber(stats?.['24h']?.volume?.total),
        icon: Activity,
        isLoading: metricsData.isLoading
      }
    ];
  }, [
    metricsData,
    selectedToken?.token,
    formatPrice,
    formatLargeNumber,
    getPriceChanges
  ]);

  const handleCopyAddress = useCallback(async () => {
    if (!selectedToken?.token?.mint) return;
    try {
      await navigator.clipboard.writeText(selectedToken.token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [selectedToken?.token?.mint]);

  const renderPriceChanges = useCallback((intervals) => {
    if (!intervals || intervals.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-3">
        {intervals.map(({ label, change }) => {
          if (change === null) return null;
          const isPositive = parseFloat(change) >= 0;
          
          return (
            <div 
              key={label}
              className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1"
            >
              <span className="text-slate-600 dark:text-slate-400 text-xs">
                {label}
              </span>
              <div className={`flex items-center text-sm ${
                isPositive ? 'text-green-500' : 'text-red-500'
              }`}>
                {isPositive ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {Math.abs(change)}%
              </div>
            </div>
          );
        })}
      </div>
    );
  }, []);

  if (!selectedToken?.token || !fetchFromApi) {
    console.warn('TokenMetrics: Missing required props');
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img
              src={selectedToken.token.image}
              alt={selectedToken.token.name}
              className="w-12 h-12 rounded-full bg-slate-100"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder.png';
              }}
            />
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {selectedToken.token.name}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {truncateAddress(selectedToken.token.mint)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-slate-600 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                >
                  {copied ? (
                    <span className="text-xs text-green-500">Copied!</span>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <a
            href="/"
            className="p-1 hover:bg-red-100 rounded-full text-red-500 hover:text-red-600 transition-colors"
            title="Return to main page"
          >
            <X className="h-5 w-5" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {metricsData.error ? (
          <div className="text-red-500 text-center py-4">
            Error loading metrics: {metricsData.error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric) => (
              <div key={metric.title}>
                <div className="flex items-center gap-2 mb-2">
                  <metric.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {metric.title}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className={`text-2xl font-bold ${
                    metric.isLoading ? 'animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-8 w-32' : ''
                  }`}>
                    {!metric.isLoading && metric.value}
                  </div>
                  {!metric.isLoading && metric.intervals && renderPriceChanges(metric.intervals)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default React.memo(TokenMetrics);