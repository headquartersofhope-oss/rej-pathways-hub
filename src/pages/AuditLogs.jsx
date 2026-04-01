import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { format } from 'date-fns';

const severityColors = {
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

export default function AuditLogs() {
  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Audit Logs"
        subtitle="Activity and security monitoring"
        icon={Shield}
      />

      {logs.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No audit logs yet</p>
          <p className="text-sm text-muted-foreground mt-1">Activity will appear here as users interact with the platform</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{log.user_email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{log.entity_type || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${severityColors[log.severity] || severityColors.info}`}>
                        {log.severity || 'info'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy h:mm a') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}