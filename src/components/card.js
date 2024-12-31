import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`relative bg-white/10 dark:bg-black/10 
    backdrop-blur-xl border border-white/20 dark:border-gray-800/30
    shadow-lg hover:shadow-xl transition-shadow duration-300
    rounded-xl p-6 ${className}`}>
    {/* Glass reflection effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/30 dark:from-white/10 to-transparent pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`pb-4 mb-4 border-b border-white/20 dark:border-gray-800/30 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold text-gray-900 dark:text-white leading-tight ${className}`}>
    {children}
  </h2>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`text-gray-600 dark:text-gray-300 ${className}`}>
    {children}
  </div>
);