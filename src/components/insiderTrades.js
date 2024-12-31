import React, { useContext, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { ApiContext } from '../App';

const InsiderTrades = () => {
  console.log('InsiderTrades component initialized');
  
  const { selectedToken } = useContext(ApiContext);
  console.log('Context received, selectedToken:', selectedToken);
  
  const [tradingData, setTradingData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered, selectedToken:', selectedToken);

    const fetchTradingData = async () => {
      if (!selectedToken?.token?.mint) {
        console.log('No token mint address available, skipping fetch');
        return;
      }

      console.log('Starting fetch for address:', selectedToken.token.mint);
      const url = `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${selectedToken.token.mint}?orderby=realized_profit&direction=desc`;
      console.log('Fetching URL:', url);
      setLoading(true);

      try {
        console.log('Making fetch request...');
        const response = await fetch(url, 
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        console.log('Fetch response received:', response.status);
        const data = await response.json();
        console.log('Data parsed:', data);
        
        setTradingData(data.data);
        console.log('Trading data set to state');
      } catch (error) {
        console.error('Error in fetch:', error);
      } finally {
        setLoading(false);
        console.log('Loading state cleared');
      }
    };

    fetchTradingData();
  }, [selectedToken]);

  const analyzeTrades = (data) => {
    console.log('Analyzing trades with data:', data);
    if (!data) return [];
    
    const analysisResults = [];

    // Find suspicious wallets with high profits
    const suspiciousHighProfits = data.filter(trader => 
      trader.is_suspicious && 
      trader.realized_profit > 100
    );

    if (suspiciousHighProfits.length > 0) {
      analysisResults.push({
        variant: 'destructive',
        title: 'Suspicious High-Profit Activity',
        description: `${suspiciousHighProfits.length} suspicious wallets detected with significant profits`,
        addresses: suspiciousHighProfits.map(t => ({
          address: t.address,
          profit: t.realized_profit,
          volume: t.buy_volume_cur + t.sell_volume_cur
        }))
      });
    }

    // Detect suspicious clustered trading
    const sourceGroups = {};
    data.forEach(trader => {
      if (trader.is_suspicious && trader.native_transfer?.from_address) {
        if (!sourceGroups[trader.native_transfer.from_address]) {
          sourceGroups[trader.native_transfer.from_address] = [];
        }
        sourceGroups[trader.native_transfer.from_address].push(trader);
      }
    });

    const suspiciousClusters = Object.entries(sourceGroups)
      .filter(([_, traders]) => traders.length >= 2);

    if (suspiciousClusters.length > 0) {
      analysisResults.push({
        variant: 'destructive',
        title: 'Suspicious Trading Clusters',
        description: `${suspiciousClusters.length} clusters of suspicious wallets trading from the same source`,
        clusters: suspiciousClusters.map(([source, traders]) => ({
          source,
          count: traders.length,
          totalVolume: traders.reduce((sum, t) => sum + t.buy_volume_cur + t.sell_volume_cur, 0),
          totalProfit: traders.reduce((sum, t) => sum + t.realized_profit, 0)
        }))
      });
    }

    // Look for recently created suspicious wallets
    const currentTime = Math.floor(Date.now() / 1000);
    const recentSuspicious = data.filter(trader => 
      trader.is_suspicious && 
      (currentTime - trader.created_at < 24 * 60 * 60)
    );

    if (recentSuspicious.length > 0) {
      analysisResults.push({
        variant: 'warning',
        title: 'New Suspicious Wallets',
        description: `${recentSuspicious.length} suspicious wallets created in the last 24 hours`,
        wallets: recentSuspicious.map(t => ({
          address: t.address,
          profit: t.realized_profit,
          createdAt: new Date(t.created_at * 1000).toLocaleString()
        }))
      });
    }

    console.log('Analysis results:', analysisResults);
    return analysisResults;
  };

  if (!selectedToken) {
    console.log('No selected token, returning null');
    return null;
  }
  
  console.log('Rendering component with trading data:', tradingData);
  const results = analyzeTrades(tradingData);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--theme-text-secondary)]" />
            <CardTitle>Suspicious Trading Activity</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <Alert>
              <AlertTitle>Loading trading data...</AlertTitle>
            </Alert>
          ) : results.length === 0 ? (
            <Alert>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <AlertTitle>No Suspicious Activity Detected</AlertTitle>
              </div>
              <AlertDescription>
                No flagged trading patterns found in current data
              </AlertDescription>
            </Alert>
          ) : (
            results.map((result, idx) => (
              <Alert 
                key={idx} 
                variant={result.variant}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-1" />
                  <div>
                    <AlertTitle>{result.title}</AlertTitle>
                    <AlertDescription>{result.description}</AlertDescription>
                    
                    {result.addresses && (
                      <div className="mt-2 space-y-1">
                        {result.addresses.slice(0, 3).map((item, i) => (
                          <div key={i} className="text-sm mt-1">
                            <span className="font-mono">{item.address.slice(0, 8)}...</span>
                            <span className="ml-2">
                              Profit: ${item.profit.toFixed(2)} | Volume: ${item.volume.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.clusters && (
                      <div className="mt-2 space-y-1">
                        {result.clusters.slice(0, 3).map((cluster, i) => (
                          <div key={i} className="text-sm mt-1">
                            <span className="font-mono">{cluster.source.slice(0, 8)}...</span>
                            <span className="ml-2">
                              {cluster.count} wallets | Vol: ${cluster.totalVolume.toFixed(2)} | 
                              Profit: ${cluster.totalProfit.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {result.wallets && (
                      <div className="mt-2 space-y-1">
                        {result.wallets.slice(0, 3).map((wallet, i) => (
                          <div key={i} className="text-sm mt-1">
                            <span className="font-mono">{wallet.address.slice(0, 8)}...</span>
                            <span className="ml-2">
                              Created: {wallet.createdAt} | Profit: ${wallet.profit.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InsiderTrades;