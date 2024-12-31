import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Alert, AlertDescription } from './alert';

const CLAUDE_API_URL = process.env.REACT_APP_CLAUDE_API_URL;
const CLAUDE_MODEL = process.env.REACT_APP_CLAUDE_MODEL;
const CLAUDE_API_KEY = process.env.REACT_APP_CLAUDE_API_KEY;

const AIScan = ({ tokens, onAnalysisComplete, onTokenSelect }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [aiResponse, setAiResponse] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [rankingOrder, setRankingOrder] = useState([]);
  const typewriterRef = useRef(null);

  useEffect(() => {
    if (aiResponse && displayedResponse.length < aiResponse.length) {
      typewriterRef.current = setTimeout(() => {
        const newLength = displayedResponse.length + 1;
        setDisplayedResponse(aiResponse.slice(0, newLength));
        
        if (newLength === aiResponse.length) {
          // Extract rankings from numbered lines
          const lines = aiResponse.split('\n');
          const rankedSymbols = lines
            .map(line => {
              const match = line.match(/^\d+\.\s+([^(]+)/);
              if (!match) return null;
              const tokenName = match[1].trim();
              const token = tokens.find(t => 
                t.name.toLowerCase() === tokenName.toLowerCase() ||
                t.symbol.toLowerCase() === tokenName.toLowerCase()
              );
              return token ? token.symbol : null;
            })
            .filter(Boolean);
          
          setRankingOrder(rankedSymbols);
          const rankMap = new Map(rankedSymbols.map((symbol, index) => [symbol, index + 1]));
          onAnalysisComplete(rankMap);
        }
      }, 20);
    }
    return () => {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current);
      }
    };
  }, [aiResponse, displayedResponse, onAnalysisComplete, tokens]);

  const TokenButton = ({ token, children }) => (
    <button
      onClick={() => onTokenSelect(token)}
      className="px-2 py-0.5 mx-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-md transition-colors inline-flex items-center gap-1"
    >
      <img
        src={token.image || '/placeholder.png'}
        alt={token.name}
        className="w-4 h-4 rounded-full"
      />
      {children}
    </button>
  );

  const AddressButton = ({ token }) => (
    <button
      onClick={() => window.open(`https://solscan.io/token/${token.mint}`, '_blank')}
      className="font-medium px-2 py-0.5 mx-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 rounded-md transition-colors"
    >
      {token.name} ({token.symbol})
    </button>
  );

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAiResponse('');
    setDisplayedResponse('');
    setRankingOrder([]);
    
    try {
      const tokensData = tokens.map(token => ({
        name: token.name,
        symbol: token.symbol,
        mint: token.mint,
        price: token.price,
        marketCap: token.marketCap,
        priceChange: token.priceChange
      }));

      const messages = [{
        role: "user",
        content: `Analyze these tokens and rank them from most to least promising based on their metrics. 
Consider price action, market cap, recent performance, humor, and uniqueness. 
Format your response as a numbered list where each entry starts with the token name followed by its mint address in parentheses.
Include specific performance metrics and reasoning for each token.
Prefer coins with market caps below 25M or above 50K as this is the range where they could make large % gains if they are high quality.

Example format:
1. Pepe Token (TokenMintAddressHere): two to three sentence analysis here...
2. Doge Token (TokenMintAddressHere): two to three sentence analysis here...

Tokens data: ${JSON.stringify(tokensData)}`
      }];

      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': true
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const data = await response.json();
      setAiResponse(data.content[0].text);

    } catch (err) {
      console.error('AI Analysis Error:', err);
      setError('Failed to get AI analysis of tokens');
    } finally {
      setIsAnalyzing(false);
    }
  };

      const processText = (text) => {
    // Only look for mint addresses
    const tokenMatches = [];
    tokens.forEach(token => {
      const mintRegex = new RegExp(token.mint, 'g');
      let match;
      while ((match = mintRegex.exec(text)) !== null) {
        tokenMatches.push({
          index: match.index,
          length: match[0].length,
          token
        });
      }
    });

    // Sort matches by index to process in order
    tokenMatches.sort((a, b) => a.index - b.index);

    // Second pass: Build response with replacements
    const parts = [];
    let lastIndex = 0;
    let currentIndex = 0;

    tokenMatches.forEach(match => {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${currentIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        );
        currentIndex++;
      }

      // Replace mint address with token buttons
      parts.push(
        <React.Fragment key={`token-${currentIndex}`}>
          <TokenButton token={match.token}>{match.token.name}</TokenButton>
          <span>(</span>
          <AddressButton token={match.token} />
          <span>)</span>
        </React.Fragment>
      );

      lastIndex = match.index + match.length;
      currentIndex++;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const renderResponse = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    const processedLines = lines.map((line, index) => (
      <React.Fragment key={`line-${index}`}>
        {processText(line)}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));

    return (
      <div className="text-lg leading-relaxed">
        {processedLines}
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>AI Top Picks</CardTitle>
          <button
            onClick={analyzeWithAI}
            disabled={isAnalyzing}
            className={`px-4 py-2 rounded-md font-medium transition-colors
              ${isAnalyzing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[var(--theme-accent)] text-white hover:bg-[var(--theme-accent-hover)]'
              }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Analyzing...</span>
              </div>
            ) : (
              'Analyze with AI'
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {displayedResponse && (
          <div className="relative mt-4 text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)] p-6 rounded-lg">
            {renderResponse(displayedResponse)}
            {displayedResponse.length < aiResponse.length && (
              <span className="animate-pulse text-xl">▊</span>
            )}
          </div>
        )}
        {rankingOrder.length > 0 && displayedResponse.length === aiResponse.length && (
          <div className="mt-6 flex flex-wrap gap-2">
            {rankingOrder.slice(0, 5).map((symbol, index) => {
              const token = tokens.find(t => t.symbol === symbol);
              if (!token) return null;
              return (
                <button
                  key={symbol}
                  onClick={() => onTokenSelect(token)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 rounded-lg transition-colors"
                >
                  <img
                    src={token.image || '/placeholder.png'}
                    alt={token.name}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="font-medium">{symbol}</span>
                  <span className="text-sm text-green-700 dark:text-green-300">#{index + 1}</span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIScan;