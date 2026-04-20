// Dark Theme Color Constants for Pathways Hub
export const DARK_THEME = {
  // Backgrounds
  background: '#0D1117',
  cardBg: '#161B22',
  elevatedBg: '#21262D',
  inputBg: '#21262D',
  
  // Borders
  border: '#30363D',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#CDD9E5',
  textMuted: '#8B949E',
  labelText: '#8B949E',
  
  // Status Colors (vibrant on dark)
  statusActive: '#34D399',
  statusHousingPending: '#FBBF24',
  statusHousingEligible: '#60A5FA',
  statusEmployed: '#A78BFA',
  statusExited: '#F87171',
  statusGraduated: '#2DD4BF',
  statusPreIntake: '#94A3B8',
  
  // Accent
  primary: '#F59E0B',
  primaryDark: '#D97706',
};

// Status badge background at 15% opacity
export const getStatusBadgeStyle = (status) => {
  const colors = {
    active: { bg: '#34D39914', text: '#34D399' },
    housing_pending: { bg: '#FBBF2414', text: '#FBBF24' },
    housing_eligible: { bg: '#60A5FA14', text: '#60A5FA' },
    employed: { bg: '#A78BFA14', text: '#A78BFA' },
    exited: { bg: '#F8717114', text: '#F87171' },
    graduated: { bg: '#2DD4BF14', text: '#2DD4BF' },
    pre_intake: { bg: '#94A3B814', text: '#94A3B8' },
    pending: { bg: '#FBBF2414', text: '#FBBF24' },
    approved: { bg: '#34D39914', text: '#34D399' },
    rejected: { bg: '#F8717114', text: '#F87171' },
    draft: { bg: '#94A3B814', text: '#94A3B8' },
    in_progress: { bg: '#60A5FA14', text: '#60A5FA' },
    completed: { bg: '#34D39914', text: '#34D399' },
  };
  
  return colors[status] || { bg: '#30363D', text: '#8B949E' };
};

// Tailwind class combinations for common patterns
export const darkThemeClasses = {
  pageContainer: 'bg-background',
  card: 'bg-card border-border',
  input: 'bg-input border-border text-foreground placeholder-muted-foreground focus:border-amber-500',
  button: 'bg-amber-500 text-slate-900 font-semibold hover:bg-amber-600',
  buttonSecondary: 'border border-border bg-transparent text-foreground hover:bg-slate-900',
  buttonGhost: 'text-foreground hover:bg-slate-800',
  heading: 'text-white font-bold',
  headingLarge: 'text-3xl font-bold text-white',
  headingMedium: 'text-2xl font-bold text-white',
  headingSmall: 'text-lg font-bold text-white',
  subheading: 'text-muted-foreground text-sm',
  body: 'text-secondary',
  muted: 'text-muted-foreground',
  metricNumber: 'text-white font-bold text-5xl',
  metricLabel: 'text-muted-foreground text-sm',
  tableHeader: 'bg-card text-muted-foreground uppercase text-xs',
  tableRow: 'bg-background border-border hover:bg-card',
  tableRowAlt: 'bg-card',
};