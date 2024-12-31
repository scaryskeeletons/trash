import React, { useContext } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { ApiContext } from '../App';

const RiskAnalysis = () => {
  const { selectedToken } = useContext(ApiContext);

  if (!selectedToken || !selectedToken.risk) return null;

  const { risks, score, rugged } = selectedToken.risk;

  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getOverallRiskLevel = (score) => {
    if (score >= 8) return { text: 'High Risk', color: 'text-[var(--theme-danger)]' };
    if (score >= 5) return { text: 'Medium Risk', color: 'text-[var(--theme-warning)]' };
    return { text: 'Low Risk', color: 'text-[var(--theme-success)]' };
  };

  const overallRisk = getOverallRiskLevel(score);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--theme-text-secondary)]" />
            <CardTitle>Risk Analysis</CardTitle>
          </div>
          <div className={`text-lg font-semibold ${overallRisk.color}`}>
            {overallRisk.text} ({score}/10)
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rugged && (
            <Alert className="alert-danger">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning: This token has been marked as rugged</AlertTitle>
              </div>
            </Alert>
          )}
          
          {risks.map((risk, index) => (
            <Alert 
              key={index}
              className={`alert-${risk.level.toLowerCase()}`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-1" />
                <div>
                  <AlertTitle>{risk.name}</AlertTitle>
                  <AlertDescription>{risk.description}</AlertDescription>
                  <div className="text-sm mt-2">
                    Risk Score: {risk.score}
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskAnalysis;