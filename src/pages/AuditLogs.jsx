import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

const severityColors = {
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

const ACTION_LABELS = {
  resident_discharged: 'Discharge',
  resident_reentry: 'Re-Entry',
  duplicate_override: 'Duplicate Override',
  housing_assigned: 'Housing Assigned',
  resident_status_changed: 'Status Changed',
  incident_created: 'Incident Created',
  task_created: 'Task Created',
  task_closed: 'Task Closed',
};

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: logs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
  });

  const filtered = logs.filter(log => {
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesSearch = !search || [log.action, log.user_email, log.entity_type, log.details]
      .some(f => (f || '').toLowerCase().includes(search.toLowerCase()));
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Audit Logs"
        subtitle={`${logs.length} total entries — immutable system activity trail`}
        icon={Shield}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, user, entity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No audit logs found</p>
          <p className="text-sm text-muted-foreground mt-1">Activity will appear here as the platform is used</p>
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {ACTION_LABELS[log.action] || log.action?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">{log.user_email || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <span className="font-mono text-xs">{log.entity_type || '—'}</span>
                      {log.entity_id && <span className="ml-1 text-xs text-muted-foreground/60">· {log.entity_id.slice(-6)}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${severityColors[log.severity] || severityColors.info}`}>
                        {log.severity || 'info'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell whitespace-nowrap">
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