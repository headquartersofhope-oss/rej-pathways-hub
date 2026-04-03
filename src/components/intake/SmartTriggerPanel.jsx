import React, { useMemo, useState } from 'react';
import { evaluateTriggers, SEVERITY_ORDER } from '@/lib/intakeSmartTriggers';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ClipboardList, BookOpen, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'bg-red-50 border-red-200 text-red-800',
  high: 'bg-orange-50 border-orange-200 text-orange-800',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800',
};

const SEVERITY_BADGE = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
};

function Section({ icon: Icon, label, count, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 ${color}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs font-bold bg-white/50 rounded px-1.5 py-0.5">{count}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
      </button>
      {open && <div className="mt-1.5 space-y-1.5 pl-1">{children}</div>}
    </div>
  );
}

export default function SmartTriggerPanel({ formData }) {
  const { alerts, tasks, classes } = useMemo(() => evaluateTriggers(formData), [formData]);

  const sortedAlerts = [...alerts].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  const total = alerts.length + tasks.length + classes.length;

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-center">
        <Zap className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No alerts yet. Recommendations will appear as you fill out the form.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-secondary" />
        <h3 className="font-heading font-semibold text-sm">Live Recommendations</h3>
        {total > 0 && (
          <span className="ml-auto text-xs bg-secondary/10 text-secondary font-bold px-2 py-0.5 rounded-full">
            {total}
          </span>
        )}
      </div>

      {/* Alerts */}
      <Section
        icon={AlertTriangle}
        label="Staff Alerts"
        count={alerts.length}
        color="text-red-700 bg-red-50 border-red-200"
        defaultOpen={true}
      >
        {sortedAlerts.map(alert => (
          <div key={alert.id} className={`rounded-lg border p-2.5 text-xs ${SEVERITY_COLORS[alert.severity]}`}>
            <div className="flex items-start gap-1.5 mb-1">
              <span className="text-sm leading-none mt-0.5">{alert.icon}</span>
              <p className="font-semibold leading-snug flex-1">{alert.title}</p>
              <span className={`shrink-0 text-[10px] font-bold border rounded px-1 py-0.5 ${SEVERITY_BADGE[alert.severity]}`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
            <p className="leading-relaxed text-[11px] opacity-90 pl-5">{alert.message}</p>
          </div>
        ))}
      </Section>

      {/* Tasks */}
      <Section
        icon={ClipboardList}
        label="Recommended Tasks"
        count={tasks.length}
        color="text-blue-700 bg-blue-50 border-blue-200"
        defaultOpen={tasks.length <= 4}
      >
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs text-blue-900">
            <span className="mt-0.5 shrink-0 text-blue-400">•</span>
            <span className="flex-1 leading-snug">{task.title}</span>
            {task.requires_staff_action && (
              <span className="shrink-0 text-[10px] font-semibold bg-blue-100 text-blue-600 border border-blue-200 rounded px-1 py-0.5">STAFF</span>
            )}
            {task.priority === 'urgent' && (
              <span className="shrink-0 text-[10px] font-semibold bg-red-100 text-red-600 border border-red-200 rounded px-1 py-0.5">URGENT</span>
            )}
          </div>
        ))}
      </Section>

      {/* Classes */}
      <Section
        icon={BookOpen}
        label="Recommended Classes"
        count={classes.length}
        color="text-green-700 bg-green-50 border-green-200"
        defaultOpen={true}
      >
        {classes.map(cls => (
          <div key={cls.id} className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50/50 px-3 py-2 text-xs text-green-900">
            <BookOpen className="w-3 h-3 shrink-0 text-green-500" />
            <span className="flex-1 leading-snug">{cls.title}</span>
            <span className="shrink-0 text-[10px] font-medium bg-green-100 text-green-600 border border-green-200 rounded px-1 py-0.5 capitalize">
              {cls.category?.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </Section>
    </div>
  );
}