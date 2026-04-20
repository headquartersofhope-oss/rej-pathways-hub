import React from 'react';

/**
 * PremiumCard: Reusable premium stat/metric card with colored accent border,
 * gradient background, and glowing hover effect
 */
export default function PremiumCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = '#F59E0B', // Default amber
  trend,
  trendPositive = true,
  onClick
}) {
  const opacityColor = accentColor + '14'; // 8% opacity
  const glowColor = accentColor + '4D'; // 30% opacity

  return (
    <div
      onClick={onClick}
      className="rounded-lg p-6 border-l-4 transition-all duration-300 cursor-pointer group"
      style={{
        backgroundColor: opacityColor,
        borderLeftColor: accentColor,
        borderTop: '1px solid',
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: '#30363D',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 20px ${glowColor}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8B949E' }}>
            {title}
          </p>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg ml-2" style={{ backgroundColor: opacityColor }}>
            <Icon className="w-5 h-5" style={{ color: accentColor }} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-5xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="text-xs" style={{ color: '#8B949E' }}>
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1" style={{ color: trendPositive ? '#34D399' : '#F87171' }}>
          <span className="text-xs font-semibold">
            {trendPositive ? '↑' : '↓'} {trend}
          </span>
        </div>
      )}
    </div>
  );
}