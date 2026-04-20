import React from 'react';

/**
 * PremiumSectionHeader: Section heading with amber vertical bar
 */
export default function PremiumSectionHeader({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-6 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
      <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8B949E' }}>
        {Icon && <Icon className="w-4 h-4 inline mr-2" style={{ color: '#F59E0B' }} />}
        {title}
      </h2>
    </div>
  );
}