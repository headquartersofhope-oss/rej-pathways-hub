import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, Link as LinkIcon, Send } from 'lucide-react';
import { toast } from 'sonner';

const CheckRow = ({ label, status, detail }) => {
  const icon = status === 'ok' ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
    : status === 'warn' ? <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
    : status === 'error' ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
    : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />;
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      {status && (
        <Badge variant="outline" className={`text-[10px] shrink-0 ${status === 'ok' ? 'border-green-300 text-green-700' : status === 'warn' ? 'border-yellow-300 text-yellow-700' : 'border-red-300 text-red-700'}`}>
          {status}
        </Badge>
      )}
    </div>
  );
};

export default function DiagnosticsPanel() {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingActivation, setTestingActivation] = useState(false);
  const [activationResult, setActivationResult] = useState(null);

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);
    const checks = [];

    // 1. Entity availability checks
    const entityTests = [
      { name: 'Resident', entity: 'Resident' },
      { name: 'OnboardingRequest', entity: 'OnboardingRequest' },
      { name: 'UserAccount', entity: 'UserAccount' },
      { name: 'CaseNote', entity: 'CaseNote' },
      { name: 'ServicePlan', entity: 'ServicePlan' },
      { name: 'LearningAssignment', entity: 'LearningAssignment' },
      { name: 'LearningClass', entity: 'LearningClass' },
      { name: 'BarrierItem', entity: 'BarrierItem' },
      { name: 'HousingReferral', entity: 'HousingReferral' },
      { name: 'HousingProvider', entity: 'HousingProvider' },
      { name: 'AuditLog', entity: 'AuditLog' },
      { name: 'Employer', entity: 'Employer' },
      { name: 'JobListing', entity: 'JobListing' },
    ];

    for (const t of entityTests) {
      try {
        const data = await base44.entities[t.entity].list('-created_date', 1).catch(() => null);
        checks.push({
          label: `Entity: ${t.name}`,
          status: data !== null ? 'ok' : 'error',
          detail: data !== null ? `Readable (${Array.isArray(data) ? data.length + ' records sampled' : 'ok'})` : 'Could not read entity',
        });
      } catch (e) {
        checks.push({ label: `Entity: ${t.name}`, status: 'error', detail: e.message });
      }
      setResults([...checks]);
    }

    // 2. Cross-module linkage checks
    try {
      const residents = await base44.entities.Resident.list('-created_date', 50);
      const withGRI = residents.filter(r => r.global_resident_id);
      checks.push({
        label: 'Resident → global_resident_id linkage',
        status: withGRI.length === residents.length ? 'ok' : 'warn',
        detail: `${withGRI.length}/${residents.length} residents have global_resident_id`,
      });

      const assessments = await base44.entities.IntakeAssessment.list('-created_date', 50).catch(() => []);
      const linkedAssessments = assessments.filter(a => a.resident_id);
      checks.push({
        label: 'IntakeAssessment → Resident linkage',
        status: linkedAssessments.length === assessments.length ? 'ok' : 'warn',
        detail: `${linkedAssessments.length}/${assessments.length} assessments linked to resident`,
      });

      const assignments = await base44.entities.LearningAssignment.list('-created_date', 50).catch(() => []);
      const linkedAssign = assignments.filter(a => a.class_id && a.resident_id);
      checks.push({
        label: 'LearningAssignment → Class + Resident',
        status: assignments.length === 0 || linkedAssign.length === assignments.length ? 'ok' : 'warn',
        detail: assignments.length === 0 ? 'No assignments yet' : `${linkedAssign.length}/${assignments.length} fully linked`,
      });

      const userAccounts = await base44.entities.UserAccount.list('-created_date', 50).catch(() => []);
      const withUserId = userAccounts.filter(a => a.user_id);
      checks.push({
        label: 'UserAccount → Platform User linkage',
        status: withUserId.length === userAccounts.length ? 'ok' : 'warn',
        detail: `${withUserId.length}/${userAccounts.length} accounts have platform user_id`,
      });

      const residentUserAccounts = userAccounts.filter(a => a.app_role === 'resident');
      const withResidentId = residentUserAccounts.filter(a => a.linked_resident_id);
      checks.push({
        label: 'Resident UserAccount → Resident record link',
        status: residentUserAccounts.length === 0 || withResidentId.length === residentUserAccounts.length ? 'ok' : 'warn',
        detail: residentUserAccounts.length === 0 ? 'No resident accounts yet' : `${withResidentId.length}/${residentUserAccounts.length} resident accounts linked`,
      });

      const caseNotes = await base44.entities.CaseNote.list('-created_date', 20).catch(() => []);
      const linkedNotes = caseNotes.filter(n => n.resident_id && n.organization_id);
      checks.push({
        label: 'CaseNote → Resident + Organization linkage',
        status: caseNotes.length === 0 || linkedNotes.length === caseNotes.length ? 'ok' : 'warn',
        detail: caseNotes.length === 0 ? 'No case notes yet' : `${linkedNotes.length}/${caseNotes.length} notes fully linked`,
      });

      const housingReferrals = await base44.entities.HousingReferral.list('-created_date', 20).catch(() => []);
      const validReferrals = housingReferrals.filter(r => r.consent_confirmed !== false || r.status === 'draft');
      checks.push({
        label: 'HousingReferral consent + status integrity',
        status: 'ok',
        detail: `${housingReferrals.length} referrals, ${housingReferrals.filter(r => r.consent_confirmed).length} with consent`,
      });

    } catch (e) {
      checks.push({ label: 'Cross-module linkage scan', status: 'error', detail: e.message });
    }

    // 3. Pending activations check
    try {
      const pending = await base44.entities.UserAccount.filter({ status: 'invited' });
      const expiredTokens = pending.filter(a => a.temporary_code_expires && new Date(a.temporary_code_expires) < new Date());
      checks.push({
        label: 'Activation Token Expiry Check',
        status: expiredTokens.length === 0 ? 'ok' : 'warn',
        detail: expiredTokens.length === 0
          ? `${pending.length} pending activations — all tokens valid`
          : `${expiredTokens.length} expired activation tokens found — use Queue tab to resend`,
      });
    } catch (e) {
      checks.push({ label: 'Activation Token Check', status: 'error', detail: e.message });
    }

    setResults([...checks]);
    setRunning(false);
  };

  const testActivationLink = async () => {
    if (!testEmail) { toast.error('Enter an email to test'); return; }
    setTestingActivation(true);
    setActivationResult(null);
    const accounts = await base44.entities.UserAccount.filter({ email: testEmail }).catch(() => []);
    if (accounts.length === 0) {
      setActivationResult({ ok: false, message: 'No UserAccount found for this email.' });
    } else {
      const account = accounts[0];
      const hasToken = !!account.temporary_login_code;
      const isExpired = account.temporary_code_expires && new Date(account.temporary_code_expires) < new Date();
      const appUrl = window.location.origin;
      const activationLink = hasToken ? `${appUrl}/auth/activate?token=${encodeURIComponent(account.temporary_login_code)}` : null;
      setActivationResult({
        ok: hasToken && !isExpired,
        account,
        hasToken,
        isExpired,
        activationLink,
        message: !hasToken ? 'No activation token. Use Queue → Resend to generate one.'
          : isExpired ? 'Token is expired. Use Queue → Resend to regenerate.'
          : `Token valid. Link ready. Status: ${account.status}`,
      });
    }
    setTestingActivation(false);
  };

  const copyLink = async () => {
    if (activationResult?.activationLink) {
      await navigator.clipboard.writeText(activationResult.activationLink);
      toast.success('Activation link copied!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base">Diagnostics & Admin Tools</h2>
      </div>

      {/* Run Diagnostics */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4" /> Cross-Module Diagnostics</CardTitle>
            <Button size="sm" onClick={runDiagnostics} disabled={running}>
              {running ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running...</> : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Run Diagnostics</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {results.length === 0 && !running && (
            <p className="text-sm text-muted-foreground">Click Run Diagnostics to scan all entities, cross-module links, and activation token integrity.</p>
          )}
          {results.map((r, i) => (
            <CheckRow key={i} label={r.label} status={r.status} detail={r.detail} />
          ))}
        </CardContent>
      </Card>

      {/* Activation Link Tester */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="w-4 h-4 text-blue-500" /> Activation Link Tester</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">Enter a user's email to inspect their activation token status and generate a copy-able link for testing.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 h-8 text-sm border rounded-md px-3 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" onClick={testActivationLink} disabled={testingActivation}>
              {testingActivation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
            </Button>
          </div>

          {activationResult && (
            <div className={`rounded-lg p-3 space-y-2 ${activationResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {activationResult.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className="text-sm font-medium">{activationResult.message}</span>
              </div>
              {activationResult.account && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Email: {activationResult.account.email}</p>
                  <p>Role: {activationResult.account.app_role}</p>
                  <p>Status: {activationResult.account.status}</p>
                  <p>Has Token: {activationResult.hasToken ? 'Yes' : 'No'}</p>
                  {activationResult.account.temporary_code_expires && (
                    <p>Expires: {new Date(activationResult.account.temporary_code_expires).toLocaleString()}</p>
                  )}
                </div>
              )}
              {activationResult.activationLink && !activationResult.isExpired && (
                <div className="space-y-2">
                  <p className="text-xs font-mono bg-white rounded px-2 py-1 border break-all">{activationResult.activationLink}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copyLink}>Copy Link</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(activationResult.activationLink, '_blank')}>Open in Tab</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm">Admin Quick Links</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 flex flex-wrap gap-2">
          {[
            ['/admin/onboarding', 'Onboarding Queue'],
            ['/users', 'User Management'],
            ['/audit-logs', 'Audit Logs'],
            ['/modules', 'Module Settings'],
            ['/organizations', 'Organizations'],
            ['/reporting', 'Reporting'],
          ].map(([path, label]) => (
            <a key={path} href={path} className="text-xs border rounded-md px-3 py-1.5 hover:bg-muted transition-colors">{label}</a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}