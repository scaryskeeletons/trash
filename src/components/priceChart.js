import React, { useContext, useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ApiContext } from '../App';

const INTERVALS = {
  '1H': '1m',
  '24H': '15m',
  '7D': '1h',
  '30D': '4h'
};

const formatTime = (timestamp, interval) => {
  try {
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) return '';

    switch (interval) {
      case '1H':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case '24H':
        return date.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
      case '7D':
      case '30D':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const formatValue = (value, decimals = 6, isMarketCap = false) => {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  
  const absValue = Math.abs(value);
  if (isMarketCap) {
    if (absValue >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (absValue >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (absValue >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  }
  
  return value.toFixed(Math.min(decimals, 8));
};

const calculateDomain = (data, key, padding = 0.05) => {
  if (!data || data.length === 0) return ['auto', 'auto'];
  
  const values = data.map(item => item[key]).filter(val => val != null && !isNaN(val));
  if (values.length === 0) return ['auto', 'auto'];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range < max * 0.001) {
    const midPoint = (max + min) / 2;
    return [
      midPoint * 0.9995,
      midPoint * 1.0005
    ];
  }
  
  return [
    min - (range * padding),
    max + (range * padding)
  ];
};

const PriceChart = () => {
  const { selectedToken, fetchFromApi } = useContext(ApiContext);
  const [rawChartData, setRawChartData] = useState([]);
  const [selectedInterval, setSelectedInterval] = useState('24H');
  const [isMarketCap, setIsMarketCap] = useState(false);
  const decimals = selectedToken?.token?.decimals || 6;
  
  // Get total supply from the API response
  const totalSupply = useMemo(() => 
    selectedToken?.pools?.[0]?.tokenSupply || 0,
    [selectedToken]
  );

  useEffect(() => {
    const fetchChartData = async () => {
      if (!selectedToken) return;

      try {
        const data = await fetchFromApi(
          `/chart/${selectedToken.token.mint}?type=${INTERVALS[selectedInterval]}`
        );
        
        if (data?.oclhv) {
          setRawChartData(data.oclhv);
        }
      } catch (error) {
        console.error('Chart data fetch error:', error);
      }
    };

    fetchChartData();
  }, [selectedToken, selectedInterval, fetchFromApi]);

  // First memo: Process raw data and calculate base values
  const processedChartData = useMemo(() => {
    return rawChartData
      .map(point => {
        const price = parseFloat(point.close);
        if (!price || price <= 0 || isNaN(price)) return null;
        
        // Calculate market cap using total supply from API
        const marketCap = price * totalSupply;
        // Include volume from the OCLHV data
        const volume = parseFloat(point.volume) || 0;
        return {
          time: point.time,
          price,
          marketCap,
          volume,
          displayValue: price
        };
      })
      .filter(Boolean);
  }, [rawChartData, totalSupply]);
  
  // Second memo: Handle display value switching without recreating entire dataset
  const displayData = useMemo(() => {
    return processedChartData.map(point => ({
      ...point,
      displayValue: isMarketCap ? point.marketCap : point.price
    }));
  }, [processedChartData, isMarketCap]);

  const yDomain = useMemo(() => 
    calculateDomain(displayData, 'displayValue'),
    [displayData]
  );

  if (!selectedToken) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const { price, marketCap, volume } = payload[0].payload;
      return (
        <div className="bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] p-3 rounded-lg">
          <p className="text-sm text-[var(--theme-text-secondary)] mb-1">
            {formatTime(label, selectedInterval)}
          </p>
          <p className="text-sm font-bold text-[var(--theme-text-primary)] mt-1">
            Price: ${formatValue(price, decimals)}
          </p>
          <p className="text-sm font-bold text-[var(--theme-text-primary)] mt-1">
            MCap: ${formatValue(marketCap, 2, true)}
          </p>
          <p className="text-sm font-bold text-[var(--theme-text-primary)] mt-1">
            Vol: ${formatValue(volume, 2, true)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <CardTitle>
              Price History
            </CardTitle>
            <button
              onClick={() => setIsMarketCap(!isMarketCap)}
              className="px-3 py-1.5 text-sm font-medium rounded-md
                bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]
                hover:text-[var(--theme-text-primary)] transition-colors"
            >
              Show in {isMarketCap ? 'Price' : 'Market Cap'}
            </button>
          </div>
          <div className="flex gap-2">
            {Object.keys(INTERVALS).map((interval) => (
              <button
                key={interval}
                onClick={() => setSelectedInterval(interval)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedInterval === interval
                    ? 'bg-[var(--theme-accent)] text-white'
                    : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                }`}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer>
            <LineChart
              data={displayData}
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="var(--theme-border)"
                opacity={0.1}
              />
              <XAxis 
                dataKey="time"
                tickFormatter={(timestamp) => formatTime(timestamp, selectedInterval)}
                interval="preserveEnd"
                minTickGap={50}
                padding={{ left: 10, right: 10 }}
                tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--theme-border)' }}
              />
              <YAxis 
                domain={yDomain}
                tickFormatter={(value) => `$${formatValue(value, decimals, isMarketCap)}`}
                scale="linear"
                width={80}
                padding={{ top: 20, bottom: 20 }}
                tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--theme-border)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="displayValue"
                stroke="var(--theme-accent)"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;