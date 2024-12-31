import React from 'react';

export const Alert = ({ children, variant = 'default', className = '' }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'destructive':
        return 'alert-danger';
      case 'warning':
        return 'alert-warning';
      case 'success':
        return 'alert-success';
      default:
        return 'bg-[var(--theme-bg-tertiary)] border-[var(--theme-border)] text-[var(--theme-text-secondary)]';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getVariantClass()} ${className}`}>
      {children}
    </div>
  );
};

export const AlertTitle = ({ children, className = '' }) => (
  <h5 className={`font-medium text-[var(--theme-text-primary)] ${className}`}>
    {children}
  </h5>
);

export const AlertDescription = ({ children, className = '' }) => (
  <div className={`text-sm mt-1 text-[var(--theme-text-secondary)] ${className}`}>
    {children}
  </div>
);

export default {
  Alert,
  AlertTitle,
  AlertDescription
};