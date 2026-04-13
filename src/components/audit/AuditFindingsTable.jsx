import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, ChevronRight } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3.5 h-3.5 text-red-600" /> },
  high:     { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> },
  medium:   { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> },
  low:      { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Info className="w-3.5 h-3.5 text-blue-500" /> },
  info:     { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <CheckCircle className="w-3.5 h-3.5 text-green-500" /> },
};

const STATUS_CONFIG = {
  passed:  { color: 'bg-green-100 text-green-800' },
  warning: { color: 'bg-yellow-100 text-yellow-800' },
  failed:  { color: 'bg-red-100 text-red-800' },
  skipped: { color: 'bg-gray-100 text-gray-600' },
};

function FindingRow({ finding }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
  const st = STATUS_CONFIG[finding.status] || STATUS_CONFIG.skipped;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors"
      >
        {sev.icon}
        <span className="flex-1 text-sm font-medium truncate">{finding.check_name}</span>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${sev.color}`}>{finding.severity}</Badge>
        <Badge className={`text-[10px] shrink-0 border-0 ${st.color}`}>{finding.status}</Badge>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t bg-muted/10 space-y-2">
          <p className="text-sm">{finding.issue_summary}</p>
          {finding.technical_details && (
            <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 break-all">{finding.technical_details}</p>
          )}
          {finding.recommended_fix && (
            <div className="text-xs bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 text-blue-800">
              <span className="font-medium">Fix: </span>{finding.recommended_fix}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditFindingsTable({ run, findings }) {
  const [showPassed, setShowPassed] = useState(false);

  if (!run) return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <XCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">No audit run selected. Go to Run Audit to start a scan.</p>
    </div>
  );

  const issues = findings.filter(f => f.status !== 'passed');
  const passed = findings.filter(f => f.status === 'passed');
  const critical = issues.filter(f => f.severity === 'critical');
  const high = issues.filter(f => f.severity === 'high');
  const medium = issues.filter(f => f.severity === 'medium');
  const low = issues.filter(f => f.severity === 'low' || f.severity === 'info');

  // Group by module
  const modules = [...new Set(issues.map(f => f.module_name))];

  const overallColor = run.overall_status === 'passed' ? 'border-green-300 bg-green-50'
    : run.overall_status === 'warning' ? 'border-yellow-300 bg-yellow-50'
    : 'border-red-300 bg-red-50';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Run Summary */}
      <Card className={`border-2 ${overallColor}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-sm">Audit: {run.audit_type?.replace(/_/g, ' ').toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{run.summary}</p>
              <p className="text-xs text-muted-foreground">Run by {run.run_by} · {run.completed_at ? new Date(run.completed_at).toLocaleString() : 'In progress'}</p>
            </div>
            <div className="flex gap-3 text-sm font-semibold">
              <span className="text-green-700">{run.passed_checks} passed</span>
              <span className="text-yellow-700">{run.warning_checks} warnings</span>
              <span className="text-red-700">{run.failed_checks} failed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical / High Summary */}
      {(critical.length > 0 || high.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {critical.length > 0 && (
            <Card className="border-red-300">
              <CardContent className="p-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-red-700">{critical.length} Critical Issue{critical.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                </div>
              </CardContent>
            </Card>
          )}
          {high.length > 0 && (
            <Card className="border-orange-300">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-orange-700">{high.length} High Priority Issue{high.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Address before publish</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {issues.length === 0 && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold text-green-700">All checks passed!</p>
            <p className="text-xs text-muted-foreground mt-1">{passed.length} checks completed with no issues.</p>
          </CardContent>
        </Card>
      )}

      {/* Issues by Module */}
      {modules.map(mod => {
        const modIssues = issues.filter(f => f.module_name === mod);
        return (
          <div key={mod}>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              {mod}
              <Badge variant="outline" className="text-[10px]">{modIssues.length} issue{modIssues.length !== 1 ? 's' : ''}</Badge>
            </h3>
            <div className="space-y-2">
              {modIssues.map((f, i) => <FindingRow key={i} finding={f} />)}
            </div>
          </div>
        );
      })}

      {/* Passed checks toggle */}
      {passed.length > 0 && (
        <div>
          <button onClick={() => setShowPassed(s => !s)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            {showPassed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {showPassed ? 'Hide' : 'Show'} {passed.length} passed checks
          </button>
          {showPassed && (
            <div className="mt-2 space-y-1">
              {passed.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="font-medium">{f.module_name}</span>
                  <span>·</span>
                  <span>{f.check_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}