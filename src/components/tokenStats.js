import React, { useContext, useEffect, useState } from 'react';
import { Users, Activity, PieChart, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ApiContext } from '../App';

const getRPCHolderData = async (mintAddress) => {
  try {
    console.log('Fetching RPC data for mint:', mintAddress);
    
    const response = await fetch(process.env.REACT_APP_RPC_URL, {      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'holder-data',
        method: 'getProgramAccounts',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          {
            commitment: "confirmed",
            filters: [
              {
                dataSize: 165
              },
              {
                memcmp: {
                  offset: 0,
                  bytes: mintAddress
                }
              }
            ],
            encoding: "jsonParsed"
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('RPC HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Try to get the raw text first
    const rawText = await response.text();
    console.log('Raw response:', rawText);

    // Then parse it
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Failed to parse response:', rawText);
      throw parseError;
    }
    
    if (data.error) {
      console.error('RPC Error:', data.error);
      return {
        accounts: [],
        totalHolders: 0,
        totalSupply: 0,
        status: 'error',
        errorDetails: data.error
      };
    }

    if (!data.result || !Array.isArray(data.result)) {
      console.warn('Unexpected response structure:', data);
      return {
        accounts: [],
        totalHolders: 0,
        totalSupply: 0,
        status: 'no_data'
      };
    }

    const accounts = data.result.reduce((acc, account) => {
      try {
        const info = account.account.data.parsed.info;
        if (info && info.tokenAmount && info.tokenAmount.uiAmount > 0) {
          acc.push({
            wallet: info.owner,
            amount: info.tokenAmount.uiAmount,
            decimals: info.tokenAmount.decimals
          });
        }
        return acc;
      } catch (e) {
        console.warn('Error processing account:', e, account);
        return acc;
      }
    }, []);

    const sortedAccounts = accounts.sort((a, b) => b.amount - a.amount);
    const totalSupply = sortedAccounts.reduce((sum, acc) => sum + acc.amount, 0);

    const accountsWithPercentage = sortedAccounts.map(acc => ({
      ...acc,
      percentage: totalSupply > 0 ? (acc.amount / totalSupply) * 100 : 0
    }));

    return {
      accounts: accountsWithPercentage,
      totalHolders: accountsWithPercentage.length,
      totalSupply,
      status: 'success'
    };
  } catch (error) {
    console.error('RPC Error:', error);
    return {
      accounts: [],
      totalHolders: 0,
      totalSupply: 0,
      status: 'error',
      errorDetails: error.message
    };
  }
};

const TokenStats = () => {
  const { selectedToken, fetchFromApi } = useContext(ApiContext);
  const [holderStats, setHolderStats] = useState(null);
  const [tradingStats, setTradingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedToken) return;

      setLoading(true);
      try {
        // Fetch trading stats
        const statsData = await fetchFromApi(`/stats/${selectedToken.token.mint}`);
        setTradingStats(statsData);

        // Fetch RPC data
        const rpcData = await getRPCHolderData(selectedToken.token.mint);

        if (rpcData.status === 'success') {
          const holderMetrics = {
            totalHolders: rpcData.totalHolders,
            totalSupply: rpcData.totalSupply,
            topHolder: rpcData.accounts[0]?.percentage || 0,
            top10Holders: rpcData.accounts
              .slice(0, 10)
              .reduce((sum, holder) => sum + holder.percentage, 0),
            top20Holders: rpcData.accounts
              .slice(0, 20)
              .reduce((sum, holder) => sum + holder.percentage, 0),
            top50Holders: rpcData.accounts
              .slice(0, 50)
              .reduce((sum, holder) => sum + holder.percentage, 0),
            brackets: {
              whales: rpcData.accounts.filter(h => h.percentage >= 1).length,
              large: rpcData.accounts.filter(h => h.percentage >= 0.1 && h.percentage < 1).length,
              medium: rpcData.accounts.filter(h => h.percentage >= 0.01 && h.percentage < 0.1).length,
              small: rpcData.accounts.filter(h => h.percentage < 0.01).length
            },
            averageHolding: rpcData.totalSupply / rpcData.totalHolders,
            medianHolding: rpcData.accounts[Math.floor(rpcData.accounts.length / 2)]?.amount || 0
          };
          setHolderStats(holderMetrics);
        }
      } catch (error) {
        console.error('Stats fetch error:', error);
        setHolderStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedToken, fetchFromApi]);

  const stats24h = tradingStats?.['24h'] || {};

  const renderPercentage = (value) => {
    if (loading) return <span className="font-medium">Calculating...</span>;
    if (value === undefined || value === null) return <span className="font-medium">-</span>;
    
    return (
      <span className={value > 50 ? 'text-orange-500 font-medium' : 'font-medium'}>
        {value.toFixed(2)}%
      </span>
    );
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (!selectedToken) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Holder Distribution</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Total Holders</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : formatNumber(holderStats?.totalHolders || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Total Supply</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : formatNumber(holderStats?.totalSupply || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Largest Holder</span>
              {renderPercentage(holderStats?.topHolder)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Top 10 Holders</span>
              {renderPercentage(holderStats?.top10Holders)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Top 20 Holders</span>
              {renderPercentage(holderStats?.top20Holders)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            <CardTitle>Holder Categories</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Whales (≥1%)</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : (holderStats?.brackets?.whales || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Large (0.1% - 1%)</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : (holderStats?.brackets?.large || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Medium (0.01% - 0.1%)</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : (holderStats?.brackets?.medium || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Small (&lt;0.01%)</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : (holderStats?.brackets?.small || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <CardTitle>Holding Stats</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Average Token Amount</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : formatNumber(holderStats?.averageHolding || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Median Token Amount</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {loading ? "Calculating..." : formatNumber(holderStats?.medianHolding || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Top 50 Holders</span>
              {renderPercentage(holderStats?.top50Holders)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle>24h Trading Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Total Transactions</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                {stats24h?.transactions?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Buy Orders</span>
              <span className="font-medium text-green-500">
                {stats24h?.buys?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Sell Orders</span>
              <span className="font-medium text-red-500">
                {stats24h?.sells?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--theme-text-secondary)]">Volume</span>
              <span className="font-medium text-[var(--theme-text-primary)]">
                ${stats24h?.volume?.total?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenStats;