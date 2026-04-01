import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export default function QuickAction({ icon: Icon, label, description, to, colorClass }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border border-border bg-card',
        'hover:shadow-md hover:border-primary/20 transition-all duration-200 group'
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', colorClass || 'bg-primary/10')}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}