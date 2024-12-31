import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg p-6 ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`pb-4 mb-4 border-b border-[var(--theme-border)] ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold text-[var(--theme-text-primary)] leading-tight ${className}`}>
    {children}
  </h2>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`text-[var(--theme-text-secondary)] space-y-4 ${className}`}>
    {children}
  </div>
);

export default {
  Card,
  CardHeader,
  CardTitle,
  CardContent
};