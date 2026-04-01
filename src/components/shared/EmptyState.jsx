import React from 'react';
import { Card } from '@/components/ui/card';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-heading font-semibold text-lg text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
      {action}
    </Card>
  );
}