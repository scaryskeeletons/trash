import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-xl ${className}`}>
    {/* Base card with solid subtle background for better text rendering */}
    <div className="absolute inset-0 bg-white/30 dark:bg-gray-900/80" />
    
    {/* Glassy overlay with blur effect */}
    <div className="absolute inset-0 bg-white/10 dark:bg-black/10 
      backdrop-blur-md md:backdrop-blur-xl" />
    
    {/* Glass reflection effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/30 dark:from-white/10 to-transparent" />
    
    {/* Border as a separate layer */}
    <div className="absolute inset-0 border border-white/20 dark:border-gray-800/30 rounded-xl" />
    
    {/* Content container with proper spacing */}
    <div className="relative z-10 p-6">
      {children}
    </div>
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`pb-4 mb-4 border-b border-white/20 dark:border-gray-800/30 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold text-gray-900 dark:text-white leading-tight
    [text-rendering:optimizeLegibility] ${className}`}>
    {children}
  </h2>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`text-gray-600 dark:text-gray-300 
    [text-rendering:optimizeLegibility] ${className}`}>
    {children}
  </div>
);