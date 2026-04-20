import React from 'react';

/**
 * PremiumPageHeader: Page title with amber vertical bar accent
 */
export default function PremiumPageHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="w-1 rounded-full" style={{ backgroundColor: '#F59E0B', minHeight: '3rem' }} />
      <div>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-8 h-8" style={{ color: '#F59E0B' }} />}
          <h1 className="text-3xl font-bold text-white">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-sm mt-2" style={{ color: '#8B949E' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}