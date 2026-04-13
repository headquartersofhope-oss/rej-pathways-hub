import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const AUDIT_TYPES = [
  { value: 'quick_health', label: 'Quick Health Check', desc: 'Entity reachability, queue status, basic system check', color: 'bg-blue-50 border-blue-200', time: '~10s' },
  { value: 'full_system', label: 'Full System Audit', desc: 'All checks across every module — comprehensive', color: 'bg-red-50 border-red-200', time: '~60s', featured: true },
  { value: 'onboarding_activation', label: 'Onboarding & Activation', desc: 'Tokens, invite flows, account linkage', color: 'bg-orange-50 border-orange-200', time: '~15s' },
  { value: 'data_integrity', label: 'Data Integrity', desc: 'Orphaned records, missing IDs, broken links', color: 'bg-yellow-50 border-yellow-200', time: '~20s' },
  { value: 'module_communication', label: 'Module Communication', desc: 'Cross-module record linkage checks', color: 'bg-purple-50 border-purple-200', time: '~20s' },
  { value: 'role_permission', label: 'Role & Permission', desc: 'Role validity, case manager assignment, org isolation', color: 'bg-slate-50 border-slate-200', time: '~15s' },
  { value: 'learning_pathway', label: 'Learning & Pathway', desc: 'Classes, assignments, certificates, completions', color: 'bg-green-50 border-green-200', time: '~15s' },
  { value: 'housing_employer', label: 'Housing & Employer', desc: 'Referrals, providers, job listings, employer links', color: 'bg-teal-50 border-teal-200', time: '~15s' },
  { value: 'reporting_consistency', label: 'Reporting Consistency', desc: 'Employed counts vs job matches, audit log activity', color: 'bg-indigo-50 border-indigo-200', time: '~10s' },
];

const STATUS_ICON = {
  passed: <CheckCircle className="w-5 h-5 text-green-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  failed: <XCircle className="w-5 h-5 text-red-500" />,
};

export default function AuditRunner({ onComplete }) {
  const [running, setRunning] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState('');

  const handleRun = async (type) => {
    setRunning(type);
    setError('');
    setLastResult(null);
    const res = await base44.functions.invoke('runSystemAudit', { audit_type: type });
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setLastResult(res.data);
      onComplete(res.data.run_id);
    }
    setRunning(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-heading font-semibold text-base mb-1">Run Audit</h2>
        <p className="text-xs text-muted-foreground">Each audit run stores results in Audit History. You can compare runs over time.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {lastResult && (
        <Card className={`border-2 ${lastResult.overall_status === 'passed' ? 'border-green-300 bg-green-50' : lastResult.overall_status === 'warning' ? 'border-yellow-300 bg-yellow-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="p-4 flex items-start gap-3">
            {STATUS_ICON[lastResult.overall_status]}
            <div className="flex-1">
              <p className="font-semibold text-sm">Last Run: {lastResult.overall_status?.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{lastResult.summary}</p>
              {lastResult.findings?.length > 0 && (
                <p className="text-xs mt-1 text-red-700">{lastResult.findings.length} issue(s) found — see Findings tab</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIT_TYPES.map((at) => (
          <Card key={at.value} className={`border ${at.color} ${at.featured ? 'ring-2 ring-red-400' : ''} hover:shadow-md transition-shadow`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{at.label}</p>
                  {at.featured && <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 mt-0.5">Recommended</Badge>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{at.time}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{at.desc}</p>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                variant={at.featured ? 'default' : 'outline'}
                onClick={() => handleRun(at.value)}
                disabled={!!running}
              >
                {running === at.value ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5 mr-1.5" />Run</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}