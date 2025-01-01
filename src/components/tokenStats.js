import React, { useContext, useEffect, useState } from 'react';
import { Users, Activity, PieChart, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { ApiContext } from '../App';
import { Connection, PublicKey } from '@solana/web3.js';

const getRPCHolderData = async (mintAddress) => {
  try {
    console.log('Fetching RPC data for mint:', mintAddress);
    
    const response = await fetch(process.env.REACT_APP_RPC_URL, {
      method: 'POST',
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = JSON.parse(await response.text());
    
    if (data.error) {
      console.error('RPC Error:', data.error);
      return {
        accounts: [],
        totalHolders: 0,
        totalSupply: 0,
        circulatingSupply: 0,
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
        circulatingSupply: 0,
        status: 'no_data'
      };
    }

    // Calculate total supply from all accounts first
    const totalSupply = data.result.reduce((sum, account) => {
      try {
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        return sum + (amount || 0);
      } catch (e) {
        console.warn('Error processing account for total supply:', e);
        return sum;
      }
    }, 0);

    console.log('Total Supply:', totalSupply);

    // Filter accounts for holder statistics
    const EXCLUDED_WALLET = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
    const PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

    let accounts = data.result.reduce((acc, account) => {
      try {
        const info = account.account.data.parsed.info;
        if (info && info.tokenAmount && info.tokenAmount.uiAmount > 0 && 
            info.owner !== EXCLUDED_WALLET) {
          acc.push({
            wallet: info.owner,
            amount: info.tokenAmount.uiAmount,
            decimals: info.tokenAmount.decimals
          });
        }
        return acc;
      } catch (e) {
        console.warn('Error processing account:', e);
        return acc;
      }
    }, []);

    // Log all accounts with >1% holdings before program check
    const significantHolders = accounts.filter(acc => 
      (acc.amount / totalSupply) * 100 >= 1
    );

    console.log('Significant holders before program check:');
    significantHolders.forEach(holder => {
      console.log(`Wallet: ${holder.wallet}`);
      console.log(`Amount: ${holder.amount}`);
      console.log(`Percentage: ${(holder.amount / totalSupply * 100).toFixed(2)}%`);
      console.log('---');
    });

    // Check program-owned accounts
    if (accounts.length > 0) {
      const connection = new Connection(process.env.REACT_APP_RPC_URL);
      
      const programOwnedChecks = await Promise.all(
        significantHolders.map(async (acc) => {
          try {
            const accountInfo = await connection.getAccountInfo(new PublicKey(acc.wallet));
            const owner = accountInfo?.owner.toBase58();
            console.log(`Checking wallet ${acc.wallet}:`);
            console.log(`Owner: ${owner}`);
            console.log(`Is program owned: ${owner === PROGRAM_ID}`);
            return owner === PROGRAM_ID;
          } catch (error) {
            console.warn(`Error checking program ownership for ${acc.wallet}:`, error);
            return false;
          }
        })
      );

      const programOwnedWallets = new Set(
        significantHolders
          .filter((_, index) => programOwnedChecks[index])
          .map(acc => acc.wallet)
      );

      console.log('Detected program-owned wallets:', Array.from(programOwnedWallets));

      accounts = accounts.filter(acc => !programOwnedWallets.has(acc.wallet));
    }

    // Log remaining significant holders after filtering
    const remainingSignificantHolders = accounts.filter(acc => 
      (acc.amount / totalSupply) * 100 >= 1
    );

    console.log('Significant holders after program check:');
    remainingSignificantHolders.forEach(holder => {
      console.log(`Wallet: ${holder.wallet}`);
      console.log(`Amount: ${holder.amount}`);
      console.log(`Percentage: ${(holder.amount / totalSupply * 100).toFixed(2)}%`);
      console.log('---');
    });

    // Calculate circulating supply from filtered accounts
    const circulatingSupply = accounts.reduce((sum, acc) => sum + acc.amount, 0);

    // Calculate percentages based on total supply
    const accountsWithPercentage = accounts
      .map(acc => ({
        ...acc,
        percentage: (acc.amount / totalSupply) * 100
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      accounts: accountsWithPercentage,
      totalHolders: accountsWithPercentage.length,
      totalSupply,
      circulatingSupply,
      status: 'success'
    };
  } catch (error) {
    console.error('RPC Error:', error);
    return {
      accounts: [],
      totalHolders: 0,
      totalSupply: 0,
      circulatingSupply: 0,
      status: 'error',
      errorDetails: error.message
    };
  }
};

const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  
  // Check for billions
  if (num >= 0.99e9) {
    const billions = num / 1e9;
    return billions % 1 === 0 ? `${billions.toFixed(0)}B` : `${Math.round(billions * 100) / 100}B`;
  }
  
  // Check for millions
  if (num >= 0.99e6) {
    const millions = num / 1e6;
    return millions % 1 === 0 ? `${millions.toFixed(0)}M` : `${Math.round(millions * 100) / 100}M`;
  }
  
  // Check for thousands
  if (num >= 0.99e3) {
    const thousands = num / 1e3;
    return thousands % 1 === 0 ? `${thousands.toFixed(0)}K` : `${Math.round(thousands * 100) / 100}K`;
  }
  
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
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
        const [statsData, rpcData] = await Promise.all([
          fetchFromApi(`/stats/${selectedToken.token.mint}`),
          getRPCHolderData(selectedToken.token.mint)
        ]);

        setTradingStats(statsData);

        if (rpcData.status === 'success') {
          const holderMetrics = {
            totalHolders: rpcData.totalHolders,
            totalSupply: rpcData.totalSupply,
            circulatingSupply: rpcData.circulatingSupply,
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
            averageHolding: rpcData.circulatingSupply / rpcData.totalHolders,
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

  const renderPercentage = (value) => {
    if (loading) return <span className="font-medium">Calculating...</span>;
    if (value === undefined || value === null) return <span className="font-medium">-</span>;
    
    return (
      <span className={value > 50 ? 'text-orange-500 font-medium' : 'font-medium'}>
        {value.toFixed(2)}%
      </span>
    );
  };

  const stats24h = tradingStats?.['24h'] || {};

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