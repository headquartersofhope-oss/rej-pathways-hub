import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Building2, BedDouble, Users, Wrench, Info, Activity
} from 'lucide-react';

const SEVERITY_CONFIG = {
  error:   { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50',     badge: 'bg-red-100 text-red-800' },
  warning: { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-800' },
  info:    { icon: Info,          color: 'text-blue-600',   bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-800' },
};

export default function HousingSystemHealth() {
  const [diagResult, setDiagResult] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagResult(null);
    const res = await base44.functions.invoke('runHousingDiagnostics', {});
    setDiagResult(res.data);
    setDiagLoading(false);
  };

  const runSync = async (repair = true) => {
    setSyncLoading(true);
    setSyncResult(null);
    const res = await base44.functions.invoke('syncFullHousingInventory', { repair });
    setSyncResult(res.data);
    setSyncLoading(false);
  };

  const health = diagResult;
  const healthColor =
    !health ? 'text-slate-400' :
    health.status === 'healthy' ? 'text-emerald-600' :
    health.status === 'warning' ? 'text-amber-600' : 'text-red-600';

  const healthBg =
    !health ? 'bg-slate-50' :
    health.status === 'healthy' ? 'bg-emerald-50' :
    health.status === 'warning' ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className="space-y-5">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={runDiagnostics} disabled={diagLoading} variant="outline">
          <Activity className={`w-4 h-4 mr-2 ${diagLoading ? 'animate-spin' : ''}`} />
          {diagLoading ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>
        <Button onClick={() => runSync(true)} disabled={syncLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
          {syncLoading ? 'Syncing...' : 'Run Full Sync + Repair'}
        </Button>
        <Button onClick={() => runSync(false)} disabled={syncLoading} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Dry Run (no changes)
        </Button>
      </div>

      {/* Diagnostics Result */}
      {health && (
        <div className="space-y-4">
          {/* Health score */}
          <Card className={healthBg}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className={`font-heading text-3xl font-bold ${healthColor}`}>
                    {health.health_percentage}%
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    System health — {health.status} · {health.passed_checks}/{health.total_checks} checks passed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sync mode: <span className="font-medium">{health.sync_mode === 'internal_only' ? 'Internal (Pathway manages housing)' : 'External API connected'}</span>
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  {[
                    { label: 'Houses', value: health.inventory?.houses ?? '—', icon: Building2, color: 'text-blue-600' },
                    { label: 'Beds', value: health.inventory?.beds ?? '—', icon: BedDouble, color: 'text-indigo-600' },
                    { label: 'Occupied', value: health.inventory?.beds_occupied ?? '—', icon: Users, color: 'text-emerald-600' },
                    { label: 'Available', value: health.inventory?.beds_available ?? '—', icon: CheckCircle, color: 'text-teal-600' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/70 rounded-xl p-3 min-w-[64px]">
                      <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                      <p className={`font-bold text-lg ${s.color}`}>{s.value}</p>
                      <p className="text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {health.inventory?.unplaced_active_residents > 0 && (
                <p className="text-xs text-amber-700 mt-3 bg-amber-100 px-3 py-1.5 rounded-lg inline-block">
                  {health.inventory.unplaced_active_residents} active resident(s) have no housing placement record
                </p>
              )}
            </CardContent>
          </Card>

          {/* Findings */}
          {health.findings?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Findings ({health.findings.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {health.findings.map((f, i) => {
                  const cfg = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className={`flex gap-3 p-3 rounded-lg ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{f.issue}</p>
                          <Badge className={cfg.badge} variant="outline">{f.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{f.recommendation}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {health.recommendations?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-1.5">
                {health.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <Card className={syncResult.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              {syncResult.success
                ? <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                : <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              }
              <div className="flex-1">
                <p className="font-medium text-sm">{syncResult.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mode: {syncResult.repair_mode ? 'Repair' : 'Dry run'} · Sync: {syncResult.sync_mode}
                </p>

                {/* Inventory totals */}
                {syncResult.summary?.totals && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    {[
                      { label: 'Houses', value: syncResult.summary.totals.houses },
                      { label: 'Total Beds', value: syncResult.summary.totals.beds_total },
                      { label: 'Occupied', value: syncResult.summary.totals.beds_occupied },
                      { label: 'Available', value: syncResult.summary.totals.beds_available },
                      { label: 'Reserved', value: syncResult.summary.totals.beds_reserved },
                      { label: 'Active Placements', value: syncResult.summary.totals.placements_active },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/60 rounded-lg p-2">
                        <p className="font-bold text-base">{s.value}</p>
                        <p className="text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Repairs made */}
                {syncResult.repairs_made?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Repairs Made ({syncResult.repairs_made.length})</p>
                    <ul className="space-y-0.5">
                      {syncResult.repairs_made.map((r, i) => (
                        <li key={i} className="text-xs text-emerald-700 flex gap-1.5">
                          <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {syncResult.warnings?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Warnings ({syncResult.warnings.length})</p>
                    <ul className="space-y-0.5">
                      {syncResult.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Unplaced residents */}
                {syncResult.unplaced_residents?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">
                      Active Residents Without Placement ({syncResult.unplaced_residents.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {syncResult.unplaced_residents.map((r, i) => (
                        <span key={i} className="text-xs bg-white/70 px-2 py-0.5 rounded-full">
                          {r.name} · {r.global_resident_id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!health && !syncResult && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Run diagnostics to check system health, or run a full sync to reconcile housing inventory.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}