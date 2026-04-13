import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity, Shield, Zap, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, Users, BookOpen, Briefcase, Home, BarChart2, FileText, ChevronDown,
  ChevronRight, Loader2, Calendar, CalendarDays, Info, Play, Database,
  Server, Lock, GitBranch, Mail, TrendingUp, Eye, EyeOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_ACTIONS = [
  { type: 'full_system', label: 'Full Diagnostic', desc: 'All checks · All modules', icon: Zap, color: 'from-red-600 to-orange-600', featured: true, time: '~60s' },
  { type: 'quick_health', label: 'Quick Health', desc: 'Entity reachability · Queue status', icon: Activity, color: 'from-blue-600 to-cyan-600', time: '~10s' },
  { type: 'role_permission', label: 'Security & Roles', desc: 'Permission checks · Role validity', icon: Shield, color: 'from-purple-600 to-violet-600', time: '~15s' },
  { type: 'onboarding_activation', label: 'Onboarding / Activation', desc: 'Tokens · Invite state · Flows', icon: Mail, color: 'from-amber-500 to-yellow-500', time: '~15s' },
  { type: 'module_communication', label: 'Module Communication', desc: 'Cross-module record links', icon: GitBranch, color: 'from-teal-600 to-emerald-600', time: '~20s' },
  { type: 'data_integrity', label: 'Data Integrity', desc: 'Orphaned records · Broken IDs', icon: Database, color: 'from-slate-600 to-slate-500', time: '~20s' },
  { type: 'learning_pathway', label: 'Learning & Pathways', desc: 'Classes · Certs · Completions', icon: BookOpen, color: 'from-green-600 to-emerald-500', time: '~15s' },
  { type: 'housing_employer', label: 'Housing & Employer', desc: 'Referrals · Jobs · Providers', icon: Home, color: 'from-indigo-600 to-blue-500', time: '~15s' },
  { type: 'reporting_consistency', label: 'Reporting', desc: 'Count consistency · Audit logs', icon: BarChart2, color: 'from-pink-600 to-rose-500', time: '~10s' },
];

const MODULE_HEALTH = [
  { name: 'Authentication / Login', icon: Lock, key: 'auth' },
  { name: 'Onboarding / Activation', icon: Mail, key: 'onboarding' },
  { name: 'Users & Roles', icon: Users, key: 'users' },
  { name: 'Residents', icon: FileText, key: 'residents' },
  { name: 'Case Management', icon: Briefcase, key: 'case' },
  { name: 'Learning Center', icon: BookOpen, key: 'learning' },
  { name: 'Job Readiness', icon: TrendingUp, key: 'jobreadiness' },
  { name: 'Employers', icon: Briefcase, key: 'employers' },
  { name: 'Housing Referrals', icon: Home, key: 'housing' },
  { name: 'Reporting', icon: BarChart2, key: 'reporting' },
  { name: 'Security / Permissions', icon: Shield, key: 'security' },
  { name: 'Audit Logs', icon: Activity, key: 'auditlogs' },
];

const SEV_CONFIG = {
  critical: { label: 'Critical', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, iconColor: 'text-red-500', order: 0 },
  high:     { label: 'High',     dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-500', order: 1 },
  medium:   { label: 'Medium',   dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-500', order: 2 },
  low:      { label: 'Low',      dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-800 border-blue-200',     icon: Info,          iconColor: 'text-blue-400',   order: 3 },
  info:     { label: 'Info',     dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-700 border-slate-200',  icon: Info,          iconColor: 'text-slate-400',  order: 4 },
};

const STATUS_CONFIG = {
  passed:  { badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', icon: CheckCircle, iconColor: 'text-emerald-500' },
  warning: { badge: 'bg-yellow-100 text-yellow-800',   dot: 'bg-yellow-400',  icon: AlertTriangle, iconColor: 'text-yellow-500' },
  failed:  { badge: 'bg-red-100 text-red-800',         dot: 'bg-red-500',     icon: XCircle, iconColor: 'text-red-500' },
  skipped: { badge: 'bg-slate-100 text-slate-600',     dot: 'bg-slate-400',   icon: Info,    iconColor: 'text-slate-400' },
};

const OVERALL_CONFIG = {
  passed:  { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50 border-emerald-200', label: 'HEALTHY' },
  warning: { bg: 'bg-yellow-400',  text: 'text-yellow-700',  light: 'bg-yellow-50 border-yellow-200',   label: 'WARNINGS' },
  failed:  { bg: 'bg-red-500',     text: 'text-red-700',     light: 'bg-red-50 border-red-200',         label: 'ISSUES FOUND' },
  running: { bg: 'bg-blue-500',    text: 'text-blue-700',    light: 'bg-blue-50 border-blue-200',       label: 'RUNNING' },
  error:   { bg: 'bg-red-500',     text: 'text-red-700',     light: 'bg-red-50 border-red-200',         label: 'ERROR' },
  unknown: { bg: 'bg-slate-400',   text: 'text-slate-600',   light: 'bg-slate-50 border-slate-200',     label: 'NO DATA' },
};

// ─────────────────────────────────────────────────────────────────────────────
// FINDING ROW
// ─────────────────────────────────────────────────────────────────────────────

function FindingRow({ f }) {
  const [open, setOpen] = useState(false);
  const sev = SEV_CONFIG[f.severity] || SEV_CONFIG.info;
  const st = STATUS_CONFIG[f.status] || STATUS_CONFIG.skipped;
  const SevIcon = sev.icon;
  const StIcon = st.icon;

  if (f.status === 'passed') return null; // Only show non-passing findings

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-sm transition-shadow">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
      >
        <SevIcon className={`w-4 h-4 shrink-0 ${sev.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{f.check_name}</span>
            <span className="text-xs text-muted-foreground">· {f.module_name}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{f.issue_summary}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${sev.badge}`}>{sev.label}</Badge>
        <Badge className={`text-[10px] shrink-0 border-0 ${st.badge}`}>{f.status}</Badge>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/10 space-y-3">
          <p className="text-sm leading-relaxed">{f.issue_summary}</p>
          {f.technical_details && (
            <div className="bg-slate-900 text-slate-200 rounded-lg px-3 py-2 text-xs font-mono break-all">{f.technical_details}</div>
          )}
          {f.recommended_fix && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-0.5">Recommended Fix</p>
                <p className="text-xs text-blue-800">{f.recommended_fix}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE HEALTH CARD
// ─────────────────────────────────────────────────────────────────────────────

function ModuleCard({ mod, findings }) {
  const modFindings = findings.filter(f => {
    const mn = f.module_name?.toLowerCase() || '';
    return mn.includes(mod.key) || mod.key === 'auth' && mn.includes('auth') || mod.key === 'case' && mn.includes('case') || mod.key === 'security' && (mn.includes('role') || mn.includes('permission') || mn.includes('security')) || mod.key === 'auditlogs' && mn.includes('audit') || mod.key === 'jobreadiness' && mn.includes('job') || mod.key === 'housing' && mn.includes('housing');
  });
  const issues = modFindings.filter(f => f.status !== 'passed');
  const criticals = issues.filter(f => f.severity === 'critical').length;
  const highs = issues.filter(f => f.severity === 'high').length;
  const status = criticals > 0 ? 'failed' : highs > 0 ? 'warning' : issues.length > 0 ? 'warning' : 'passed';
  const st = STATUS_CONFIG[status];
  const StIcon = st.icon;
  const ModIcon = mod.icon;

  return (
    <div className={`rounded-xl border p-3 bg-card flex items-center gap-3 ${criticals > 0 ? 'border-red-200' : highs > 0 ? 'border-orange-200' : issues.length > 0 ? 'border-yellow-200' : 'border-border'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${criticals > 0 ? 'bg-red-100' : highs > 0 ? 'bg-orange-100' : issues.length > 0 ? 'bg-yellow-100' : 'bg-emerald-100'}`}>
        <ModIcon className={`w-4 h-4 ${criticals > 0 ? 'text-red-600' : highs > 0 ? 'text-orange-500' : issues.length > 0 ? 'text-yellow-500' : 'text-emerald-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{mod.name}</p>
        <p className="text-[10px] text-muted-foreground">{issues.length === 0 ? 'No issues' : `${issues.length} issue${issues.length !== 1 ? 's' : ''}`}</p>
      </div>
      <StIcon className={`w-4 h-4 shrink-0 ${st.iconColor}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN HISTORY ROW
// ─────────────────────────────────────────────────────────────────────────────

function RunRow({ run, active, onClick }) {
  const oc = OVERALL_CONFIG[run.overall_status] || OVERALL_CONFIG.unknown;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all hover:shadow-sm flex items-center gap-3 ${active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/10'}`}
    >
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${oc.bg}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{run.audit_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
          <span className={`text-[10px] font-bold ${oc.text}`}>{oc.label}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span>{run.run_by}</span>
          {run.completed_at && <><span>·</span><span>{new Date(run.completed_at).toLocaleString()}</span></>}
          {run.total_checks > 0 && <><span>·</span><span>{run.passed_checks}/{run.total_checks} passed</span></>}
        </div>
      </div>
      {run.failed_checks > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">{run.failed_checks} failed</span>}
      {run.warning_checks > 0 && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">{run.warning_checks} warn</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI PANEL
// ─────────────────────────────────────────────────────────────────────────────

function AIPanel({ title, icon: Icon, iconClass, prompt, placeholder }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({ prompt }).catch(() => null);
    setContent(typeof res === 'string' ? res : (res ? JSON.stringify(res) : 'Generation failed. Try again.'));
    setLoading(false);
  };

  return (
    <Card className="border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconClass}`} />
            {title}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="h-7 text-xs">
            {loading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Generating...</> : <><Zap className="w-3 h-3 mr-1.5" />Generate</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {content ? (
          <div className="prose prose-sm max-w-none text-foreground [&>*]:text-sm [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>h3]:font-semibold [&>h3]:uppercase [&>h3]:tracking-wide [&>h3]:text-muted-foreground [&>ul]:space-y-1 [&>ol]:space-y-1 [&>p]:leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{placeholder}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditCenter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [running, setRunning] = useState(null);
  const [runError, setRunError] = useState('');
  const [runs, setRuns] = useState([]);
  const [findings, setFindings] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [showPassedChecks, setShowPassedChecks] = useState(false);
  const [section, setSection] = useState('overview');

  // Auth guard
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') navigate('/');
  }, [currentUser, navigate]);

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const data = await base44.entities.AuditRun.list('-created_date', 20).catch(() => []);
    setRuns(data);
    if (data.length > 0 && !activeRun) {
      const latest = data[0];
      setActiveRun(latest);
      const latestFindings = await base44.entities.AuditFinding.filter({ audit_run_id: latest.id }).catch(() => []);
      setFindings(latestFindings);
    }
    setLoadingHistory(false);
  }, [activeRun]);

  useEffect(() => { loadHistory(); }, []);

  const selectRun = async (run) => {
    setActiveRun(run);
    const f = await base44.entities.AuditFinding.filter({ audit_run_id: run.id }).catch(() => []);
    setFindings(f);
    setSection('findings');
  };

  const executeAudit = async (type) => {
    setRunning(type);
    setRunError('');
    const res = await base44.functions.invoke('runSystemAudit', { audit_type: type });
    if (res.data?.error) {
      setRunError(res.data.error);
    } else {
      const runId = res.data?.run_id;
      if (runId) {
        const newRun = await base44.entities.AuditRun.get(runId).catch(() => null);
        const newFindings = await base44.entities.AuditFinding.filter({ audit_run_id: runId }).catch(() => []);
        if (newRun) {
          setActiveRun(newRun);
          setRuns(prev => [newRun, ...prev.filter(r => r.id !== newRun.id)]);
        }
        setFindings(newFindings);
        setSection('findings');
      }
    }
    setRunning(null);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Lock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-white font-semibold">Admin Access Only</p>
          <p className="text-slate-400 text-sm mt-1">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Derived stats from active run
  const latestRun = activeRun;
  const issues = findings.filter(f => f.status !== 'passed');
  const critical = issues.filter(f => f.severity === 'critical');
  const high = issues.filter(f => f.severity === 'high');
  const warnings = issues.filter(f => f.status === 'warning');
  const passed = findings.filter(f => f.status === 'passed');
  const oc = OVERALL_CONFIG[latestRun?.overall_status || 'unknown'];
  const modules = [...new Set(findings.map(f => f.module_name))];

  // Filtered findings
  const filteredFindings = issues.filter(f => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (moduleFilter !== 'all' && f.module_name !== moduleFilter) return false;
    return true;
  }).sort((a, b) => (SEV_CONFIG[a.severity]?.order ?? 9) - (SEV_CONFIG[b.severity]?.order ?? 9));

  const failedSummaryForAI = issues
    .map(f => `[${f.severity?.toUpperCase()}] ${f.module_name} / ${f.check_name}: ${f.issue_summary}`)
    .join('\n') || 'No issues found — all checks passed.';

  const NAV = [
    { key: 'overview', label: 'Overview' },
    { key: 'findings', label: `Findings${issues.length > 0 ? ` (${issues.length})` : ''}` },
    { key: 'history', label: 'Run History' },
    { key: 'modules', label: 'Module Health' },
    { key: 'ai', label: 'AI Summaries' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── HERO HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl text-white tracking-tight">Audit Command Center</h1>
                <p className="text-xs text-slate-400 mt-0.5">System health · Diagnostics · Compliance · Admin only</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {latestRun && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  Last run: {latestRun.completed_at ? new Date(latestRun.completed_at).toLocaleString() : 'In progress'}
                </div>
              )}
              <Button
                onClick={() => executeAudit('full_system')}
                disabled={!!running}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white border-0 shadow-lg h-9 px-5 text-sm font-semibold"
              >
                {running === 'full_system' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />Run Full Diagnostic</>
                )}
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" onClick={loadHistory}>
                <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          {latestRun && (
            <div className={`mt-4 rounded-xl border px-4 py-2.5 flex items-center gap-3 ${oc.light}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${oc.bg} shrink-0`} />
              <span className={`text-xs font-bold ${oc.text}`}>{oc.label}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{latestRun.summary}</span>
              {critical.length > 0 && <><span className="text-xs text-muted-foreground">·</span><span className="text-xs font-semibold text-red-700">{critical.length} critical</span></>}
            </div>
          )}

          {runError && (
            <div className="mt-3 bg-red-900/40 border border-red-700 rounded-xl px-4 py-2.5 text-sm text-red-300">{runError}</div>
          )}
        </div>
      </div>

      {/* ── AUDIT ACTIONS ────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/60 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {AUDIT_ACTIONS.filter(a => !a.featured).map(a => {
              const AIcon = a.icon;
              return (
                <button
                  key={a.type}
                  onClick={() => executeAudit(a.type)}
                  disabled={!!running}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white transition-colors shrink-0 disabled:opacity-50"
                >
                  {running === a.type ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : (
                    <AIcon className="w-3.5 h-3.5 text-slate-300" />
                  )}
                  <span className="text-xs font-medium whitespace-nowrap">{a.label}</span>
                  <span className="text-[10px] text-slate-500">{a.time}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* Sub-nav */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
          {NAV.map(n => (
            <button key={n.key} onClick={() => setSection(n.key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${section === n.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {n.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
        {section === 'overview' && (
          <div className="space-y-6">
            {/* Health Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Overall Status', value: oc.label, sub: latestRun ? latestRun.audit_type?.replace(/_/g, ' ') : 'No runs yet', color: oc.bg, textColor: oc.text },
                { label: 'Critical', value: critical.length, sub: 'Must fix', color: 'bg-red-500', textColor: 'text-red-700' },
                { label: 'High Priority', value: high.length, sub: 'Before publish', color: 'bg-orange-500', textColor: 'text-orange-700' },
                { label: 'Warnings', value: warnings.length, sub: 'Review soon', color: 'bg-yellow-400', textColor: 'text-yellow-700' },
                { label: 'Passed Checks', value: passed.length, sub: `of ${findings.length} total`, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
                { label: 'Audit Runs', value: runs.length, sub: 'Total stored', color: 'bg-blue-500', textColor: 'text-blue-700' },
              ].map((s, i) => (
                <Card key={i} className="border">
                  <CardContent className="p-4">
                    <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
                    <p className={`text-2xl font-bold font-heading ${s.textColor}`}>{s.value}</p>
                    <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!latestRun && (
              <Card className="border-dashed border-2 border-border">
                <CardContent className="p-12 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <h2 className="font-heading font-bold text-lg mb-2">No Audit Data Yet</h2>
                  <p className="text-sm text-muted-foreground mb-6">Press Run Full Diagnostic to execute your first complete system scan.</p>
                  <Button onClick={() => executeAudit('full_system')} disabled={!!running} className="bg-gradient-to-r from-red-600 to-orange-600 border-0 text-white">
                    {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</> : <><Play className="w-4 h-4 mr-2" />Run Full Diagnostic</>}
                  </Button>
                </CardContent>
              </Card>
            )}

            {latestRun && (
              <>
                {/* Top Issues */}
                {issues.length > 0 && (
                  <div>
                    <h2 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Top Issues
                      <span className="text-xs text-muted-foreground font-normal">({issues.length} total · showing critical & high)</span>
                    </h2>
                    <div className="space-y-2">
                      {issues.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 8).map((f, i) => <FindingRow key={i} f={f} />)}
                    </div>
                    {issues.filter(f => f.severity !== 'critical' && f.severity !== 'high').length > 0 && (
                      <button onClick={() => setSection('findings')} className="mt-3 text-xs text-primary underline underline-offset-2">
                        View all {issues.length} findings →
                      </button>
                    )}
                  </div>
                )}

                {/* Latest AI summary */}
                {latestRun.ai_summary && (
                  <Card className="border bg-gradient-to-br from-violet-50 to-purple-50 border-purple-200">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                        <Zap className="w-4 h-4" /> AI Audit Analysis
                        <span className="text-[10px] text-purple-400 font-normal">from latest run</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="prose prose-sm max-w-none [&>*]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>h3]:font-semibold [&>h3]:text-purple-600 [&>p]:leading-relaxed">
                        <ReactMarkdown>{latestRun.ai_summary}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── FINDINGS ───────────────────────────────────────────────────────── */}
        {section === 'findings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-heading font-semibold text-base">
                Audit Findings
                {latestRun && <span className="ml-2 text-xs font-normal text-muted-foreground">{latestRun.audit_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {latestRun.completed_at ? new Date(latestRun.completed_at).toLocaleString() : ''}</span>}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card">
                  <option value="all">All Severities</option>
                  {['critical','high','medium','low','info'].map(s => <option key={s} value={s}>{SEV_CONFIG[s].label}</option>)}
                </select>
                <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card">
                  <option value="all">All Modules</option>
                  {modules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {!latestRun ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-10 text-center">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground mb-4">No audit run selected. Run a diagnostic to see findings.</p>
                  <Button onClick={() => executeAudit('full_system')} disabled={!!running}>
                    {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Run Full Diagnostic
                  </Button>
                </CardContent>
              </Card>
            ) : filteredFindings.length === 0 ? (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-700">No issues found!</p>
                  <p className="text-xs text-muted-foreground mt-1">{passed.length} checks passed for this filter.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredFindings.map((f, i) => <FindingRow key={i} f={f} />)}
              </div>
            )}

            {/* Passed toggle */}
            {passed.length > 0 && (
              <div className="pt-2">
                <button onClick={() => setShowPassedChecks(s => !s)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {showPassedChecks ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassedChecks ? 'Hide' : 'Show'} {passed.length} passed checks
                </button>
                {showPassedChecks && (
                  <div className="mt-2 space-y-1">
                    {passed.filter(f => moduleFilter === 'all' || f.module_name === moduleFilter).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-emerald-100 bg-emerald-50/50 rounded-lg">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="font-medium text-emerald-700">{f.module_name}</span>
                        <span>·</span>
                        <span>{f.check_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ────────────────────────────────────────────────────────── */}
        {section === 'history' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base">Audit Run History</h2>
              <Button variant="outline" size="sm" onClick={loadHistory} className="h-8 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingHistory ? 'animate-spin' : ''}`} />Refresh
              </Button>
            </div>
            {loadingHistory ? (
              <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
            ) : runs.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-10 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground mb-4">No audit runs stored yet.</p>
                  <Button onClick={() => executeAudit('full_system')} disabled={!!running}>
                    {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Run Full Diagnostic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {runs.map(r => <RunRow key={r.id} run={r} active={activeRun?.id === r.id} onClick={() => selectRun(r)} />)}
              </div>
            )}
          </div>
        )}

        {/* ── MODULE HEALTH ───────────────────────────────────────────────────── */}
        {section === 'modules' && (
          <div className="space-y-4">
            <h2 className="font-heading font-semibold text-base">Module Health</h2>
            {!latestRun ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-10 text-center">
                  <Server className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground mb-4">Run a diagnostic to see module health.</p>
                  <Button onClick={() => executeAudit('full_system')} disabled={!!running}>
                    {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Run Full Diagnostic
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {MODULE_HEALTH.map(m => <ModuleCard key={m.key} mod={m} findings={findings} />)}
              </div>
            )}
          </div>
        )}

        {/* ── AI SUMMARIES ───────────────────────────────────────────────────── */}
        {section === 'ai' && (
          <div className="space-y-4 max-w-3xl">
            <h2 className="font-heading font-semibold text-base">AI Operational Summaries</h2>
            <p className="text-xs text-muted-foreground">AI summaries are recommendation-only. No automatic data changes are made.</p>
            {!latestRun && (
              <Card className="border-dashed border-2">
                <CardContent className="p-8 text-center">
                  <Zap className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground mb-4">Run an audit first to generate AI summaries.</p>
                  <Button onClick={() => executeAudit('full_system')} disabled={!!running}>
                    {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Run Full Diagnostic
                  </Button>
                </CardContent>
              </Card>
            )}

            {latestRun && latestRun.ai_summary && (
              <Card className="border border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-purple-700 flex items-center gap-2"><Zap className="w-4 h-4" />Automated Audit Analysis</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="prose prose-sm max-w-none [&>*]:text-sm [&>h3]:text-xs [&>h3]:font-bold [&>h3]:text-purple-600">
                    <ReactMarkdown>{latestRun.ai_summary}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {latestRun && (
              <>
                <AIPanel
                  title="Daily Admin To-Do"
                  icon={Calendar}
                  iconClass="text-blue-500"
                  placeholder="Click Generate to create a daily action list from current audit findings."
                  prompt={`You are an operations auditor for REJ Pathways Hub, a nonprofit workforce and reentry case management platform.

Current audit findings (non-passing):
${failedSummaryForAI}

Generate a DAILY admin to-do list. Be direct and specific. Use markdown numbered list.
Include urgency tags: [URGENT], [TODAY], [THIS WEEK].
Focus on unblocking users, fixing activation flows, resolving critical data issues.`}
                />
                <AIPanel
                  title="Weekly Cleanup Checklist"
                  icon={CalendarDays}
                  iconClass="text-purple-500"
                  placeholder="Click Generate to create a weekly cleanup checklist."
                  prompt={`You are an operations auditor for REJ Pathways Hub, a nonprofit workforce and reentry case management platform.

Current audit findings:
${failedSummaryForAI}

Generate a WEEKLY cleanup and maintenance checklist in 3 markdown sections:
## Data & Record Cleanup
## User & Access Management  
## Module & Workflow Health

Be practical. Focus on what matters before this app is published to real users.`}
                />
                <AIPanel
                  title="Top Risks Before Publish"
                  icon={AlertTriangle}
                  iconClass="text-orange-500"
                  placeholder="Click Generate to see the top risks identified before publish."
                  prompt={`You are a senior systems auditor reviewing REJ Pathways Hub for publish readiness.

Audit findings:
${failedSummaryForAI}

List the TOP 5 RISKS that could cause problems in production if not fixed before publishing. 
For each risk: name, severity, why it matters for real users, fix priority.
Use markdown. Be blunt and direct. No fluff.`}
                />
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}