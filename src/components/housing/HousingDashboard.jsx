import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

/**
 * HousingDashboard: Overview of housing status across all residents
 * Shows placement metrics and quick access to needing placement
 */
export default function HousingDashboard() {
  const [stats, setStats] = useState(null);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [placements, residentsList] = await Promise.all([
        base44.entities.HousingPlacement.list('-synced_at', 1000),
        base44.entities.Resident.filter({ status: 'active' })
      ]);

      // Calculate stats
      const placedCount = placements.filter(p => p.placement_status === 'placed').length;
      const referredCount = placements.filter(p => p.placement_status === 'referred').length;
      const waitlistedCount = placements.filter(p => p.placement_status === 'waitlisted').length;
      const deniedCount = placements.filter(p => p.placement_status === 'denied').length;

      const placedResidents = new Set(placements.map(p => p.resident_id));
      const needingPlacement = residentsList.filter(r => !placedResidents.has(r.id));

      setStats({
        totalResidents: residentsList.length,
        placed: placedCount,
        referred: referredCount,
        waitlisted: waitlistedCount,
        denied: deniedCount,
        needingPlacement: needingPlacement.length
      });

      setResidents(needingPlacement.slice(0, 5)); // Show first 5 needing placement
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnostics = async () => {
    try {
      setRunningDiagnostics(true);
      const result = await base44.functions.invoke('runHousingDiagnostics', {});
      setDiagnosticResult(result.data);
    } catch (err) {
      console.error('Diagnostics failed:', err);
      setDiagnosticResult({ error: err.message });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Residents</p>
            <p className="text-2xl font-bold">{stats.totalResidents}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-700">Placed</p>
            <p className="text-2xl font-bold text-emerald-800">{stats.placed}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-700">Referred</p>
            <p className="text-2xl font-bold text-blue-800">{stats.referred}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-700">Waitlisted</p>
            <p className="text-2xl font-bold text-amber-800">{stats.waitlisted}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-xs text-red-700">Denied</p>
            <p className="text-2xl font-bold text-red-800">{stats.denied}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <p className="text-xs text-orange-700">Needing Placement</p>
            <p className="text-2xl font-bold text-orange-800">{stats.needingPlacement}</p>
          </CardContent>
        </Card>
      </div>

      {/* Residents Needing Placement */}
      {residents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Residents Needing Placement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {residents.map(resident => (
                <div
                  key={resident.id}
                  className="p-2 border rounded-md flex items-center justify-between hover:bg-slate-50"
                >
                  <div className="text-sm">
                    <p className="font-medium">{resident.first_name} {resident.last_name}</p>
                    <p className="text-xs text-muted-foreground">ID: {resident.global_resident_id}</p>
                  </div>
                  <Badge variant="outline">Needs Placement</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">System Health</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={runDiagnostics}
              disabled={runningDiagnostics}
            >
              {runningDiagnostics ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Run Diagnostics
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {diagnosticResult ? (
            <div className="space-y-2">
              {diagnosticResult.error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  {diagnosticResult.error}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Passed Checks</p>
                      <p className="font-bold text-emerald-600">{diagnosticResult.passed_checks || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Failed Checks</p>
                      <p className="font-bold text-red-600">{diagnosticResult.failed_checks || 0}</p>
                    </div>
                  </div>

                  {diagnosticResult.findings && diagnosticResult.findings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {diagnosticResult.findings.map((finding, i) => (
                        <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <p className="font-medium text-amber-800">{finding.issue}</p>
                              <p className="text-amber-700 mt-1">{finding.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click "Run Diagnostics" to check system health</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}