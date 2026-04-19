import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Users, BedDouble,
  Car, Wrench, ArrowRight, Clock, Loader2, Activity, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

const REFRESH_INTERVAL = 60_000;

function StatusBanner({ status, checkedAt, onRefresh, loading }) {
  const cfg = {
    healthy: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: CheckCircle2, iconColor: 'text-emerald-600', label: 'All systems healthy' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500', label: 'Warnings detected' },
    critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: XCircle, iconColor: 'text-red-600', label: 'Critical issues require attention' },
  }[status] || { bg: 'bg-muted border-border', text: 'text-foreground', icon: Activity, iconColor: 'text-muted-foreground', label: 'Checking...' };

  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-center justify-between p-4 rounded-xl border', cfg.bg)}>
      <div className="flex items-center gap-3">
        <Icon className={cn('w-6 h-6', cfg.iconColor)} />
        <div>
          <p className={cn('font-semibold text-base', cfg.text)}>{cfg.label}</p>
          {checkedAt && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last checked: {new Date(checkedAt).toLocaleTimeString()} · Auto-refreshes every 60s
            </p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        Refresh
      </Button>
    </div>
  );
}

function StatRow({ label, value, alert, children }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-semibold', alert ? 'text-red-600' : 'text-foreground')}>{value}</span>
        {children}
      </div>
    </div>
  );
}

function FixButton({ label, onClick, loading, to }) {
  if (to) {
    return (
      <Link to={to}>
        <Button size="sm" variant="destructive" className="h-6 text-xs px-2 gap-1">
          Fix <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    );
  }
  return (
    <Button size="sm" variant="destructive" className="h-6 text-xs px-2 gap-1" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fix'}
    </Button>
  );
}

function BedBar({ counts, total }) {
  if (!total) return <p className="text-xs text-muted-foreground">No beds</p>;
  const segments = [
    { key: 'available', color: 'bg-emerald-500', label: 'Available' },
    { key: 'occupied', color: 'bg-primary', label: 'Occupied' },
    { key: 'needs_cleaning', color: 'bg-amber-400', label: 'Cleaning' },
    { key: 'reserved', color: 'bg-blue-400', label: 'Reserved' },
    { key: 'maintenance', color: 'bg-slate-400', label: 'Maint.' },
  ];
  return (
    <div className="space-y-1.5 mt-1">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {segments.map(s => {
          const pct = ((counts[s.key] || 0) / total) * 100;
          if (pct === 0) return null;
          return <div key={s.key} className={cn(s.color, 'transition-all')} style={{ width: `${pct}%` }} title={`${s.label}: ${counts[s.key]}`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.map(s => (
          <span key={s.key} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className={cn('w-2 h-2 rounded-full inline-block', s.color)} />
            {counts[s.key] ?? 0} {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fixLoading, setFixLoading] = useState({});
  const [fixMessage, setFixMessage] = useState({});
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getSystemHealth', {});
      setData(res.data);
    } catch (e) {
      console.error('SystemHealth fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchHealth]);

  const runFix = async (key, fnName, payload = {}) => {
    setFixLoading(p => ({ ...p, [key]: true }));
    setFixMessage(p => ({ ...p, [key]: null }));
    try {
      const res = await base44.functions.invoke(fnName, payload);
      setFixMessage(p => ({ ...p, [key]: res.data?.message || 'Fixed successfully' }));
      await fetchHealth();
    } catch (e) {
      setFixMessage(p => ({ ...p, [key]: `Error: ${e.message}` }));
    } finally {
      setFixLoading(p => ({ ...p, [key]: false }));
    }
  };

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">Running system health checks…</p>
        </div>
      </div>
    );
  }

  const p = data?.pathways || {};
  const h = data?.housing || {};
  const m = data?.mrt || {};
  const s = data?.sync || {};
  const g = data?.ghosts || {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground">System Health</h1>
          <p className="text-xs text-muted-foreground">Real-time diagnostic across Pathways, Housing, and MRT</p>
        </div>
      </div>

      {/* Status Banner */}
      <StatusBanner
        status={data?.overall_status}
        checkedAt={data?.checked_at}
        onRefresh={fetchHealth}
        loading={loading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── PATHWAYS ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Pathways Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <StatRow label="Active residents" value={p.total_active_residents ?? '—'} />
            <StatRow
              label="Residents without case manager"
              value={p.residents_no_case_manager ?? '—'}
              alert={p.residents_no_case_manager > 0}
            >
              {p.residents_no_case_manager > 0 && (
                <FixButton to="/residents" />
              )}
            </StatRow>
            <StatRow
              label="Stuck in exiting >48h"
              value={p.stuck_exiting_over_48h ?? '—'}
              alert={p.stuck_exiting_over_48h > 0}
            >
              {p.stuck_exiting_over_48h > 0 && <FixButton to="/residents" />}
            </StatRow>
            <StatRow
              label="Open tasks >30 days old"
              value={p.open_tasks_older_30d ?? '—'}
              alert={p.open_tasks_older_30d > 0}
            >
              {p.open_tasks_older_30d > 0 && <FixButton to="/case-management" />}
            </StatRow>
            <StatRow
              label="Service plans inactive >30 days"
              value={p.service_plans_inactive_30d ?? '—'}
              alert={p.service_plans_inactive_30d > 0}
            >
              {p.service_plans_inactive_30d > 0 && <FixButton to="/case-management" />}
            </StatRow>
          </CardContent>
        </Card>

        {/* ── HOUSING ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-primary" />
              Housing Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="pb-3 border-b mb-1">
              <p className="text-xs text-muted-foreground mb-1">Bed inventory ({h.total_beds ?? 0} total)</p>
              <BedBar counts={h.bed_counts || {}} total={h.total_beds || 0} />
            </div>
            <StatRow
              label="Occupancy mismatches"
              value={h.occupancy_mismatch_fix?.mismatch_count ?? '—'}
              alert={(h.occupancy_mismatch_fix?.mismatch_count ?? 0) > 0}
            >
              {(h.occupancy_mismatch_fix?.mismatch_count ?? 0) > 0 && (
                <FixButton
                  key="fixOccupancy"
                  loading={fixLoading['fixOccupancy']}
                  onClick={() => runFix('fixOccupancy', 'fixOccupancyMismatch', {})}
                />
              )}
            </StatRow>
            {fixMessage['fixOccupancy'] && (
              <p className="text-xs text-emerald-700 pb-1">{fixMessage['fixOccupancy']}</p>
            )}
            <StatRow
              label="Expired reservations not swept"
              value={h.expired_reservations_not_swept ?? '—'}
              alert={h.expired_reservations_not_swept > 0}
            >
              {h.expired_reservations_not_swept > 0 && (
                <FixButton
                  key="cleanReservations"
                  loading={fixLoading['cleanReservations']}
                  onClick={() => runFix('cleanReservations', 'cleanExpiredReservations', {})}
                />
              )}
            </StatRow>
            {fixMessage['cleanReservations'] && (
              <p className="text-xs text-emerald-700 pb-1">{fixMessage['cleanReservations']}</p>
            )}
            <StatRow label="Last bed inventory update" value={h.last_bed_inventory_update ? new Date(h.last_bed_inventory_update).toLocaleString() : '—'} />
          </CardContent>
        </Card>

        {/* ── MRT ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              MRT Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <StatRow label="Total open rides" value={m.open_rides_total ?? '—'} />
            <StatRow
              label="Open rides — no driver assigned"
              value={m.open_rides_no_driver ?? '—'}
              alert={m.open_rides_no_driver > 0}
            >
              {m.open_rides_no_driver > 0 && <FixButton to="/transportation" />}
            </StatRow>
            <StatRow label="Rides in next 24 hours" value={m.rides_next_24h ?? '—'} />
            <StatRow
              label="Rides with updated pickup address"
              value={m.rides_pickup_address_updated_last_24h ?? '—'}
              alert={false}
            >
              {m.rides_pickup_address_updated_last_24h > 0 && (
                <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 h-5">
                  Confirm
                </Badge>
              )}
              {m.rides_pickup_address_updated_last_24h > 0 && (
                <Link to="/transportation">
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2">Review</Button>
                </Link>
              )}
            </StatRow>
            <StatRow
              label="Open rides for exited residents"
              value={m.open_rides_for_exited_residents ?? '—'}
              alert={m.open_rides_for_exited_residents > 0}
            >
              {m.open_rides_for_exited_residents > 0 && <FixButton to="/transportation" />}
            </StatRow>
          </CardContent>
        </Card>

        {/* ── SYNC + GHOSTS ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Sync & Ghost Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <StatRow
              label="Placement–bed mismatches"
              value={s.housing_placement_bed_mismatches ?? '—'}
              alert={s.housing_placement_bed_mismatches > 0}
            >
              {s.housing_placement_bed_mismatches > 0 && (
                <FixButton
                  key="fixPlacementSync"
                  loading={fixLoading['fixPlacementSync']}
                  onClick={() => runFix('fixPlacementSync', 'fixOccupancyMismatch', {})}
                />
              )}
            </StatRow>
            {fixMessage['fixPlacementSync'] && (
              <p className="text-xs text-emerald-700 pb-1">{fixMessage['fixPlacementSync']}</p>
            )}
            <StatRow
              label="Open rides for exited residents"
              value={s.open_rides_for_exited_residents ?? '—'}
              alert={s.open_rides_for_exited_residents > 0}
            >
              {s.open_rides_for_exited_residents > 0 && <FixButton to="/transportation" />}
            </StatRow>
            <StatRow
              label="Last MRT address sync"
              value={s.last_mrt_sync ? new Date(s.last_mrt_sync.timestamp).toLocaleString() : 'Never'}
              alert={s.last_mrt_sync && !s.last_mrt_sync.success}
            >
              {s.last_mrt_sync && !s.last_mrt_sync.success && (
                <Badge className="text-[10px] bg-red-100 text-red-800 border-red-200 h-5">Failed</Badge>
              )}
            </StatRow>
            <StatRow
              label="Unreviewed duplicate flags >48h"
              value={g.unreviewed_duplicate_flags_over_48h ?? '—'}
              alert={g.unreviewed_duplicate_flags_over_48h > 0}
            >
              {g.unreviewed_duplicate_flags_over_48h > 0 && <FixButton to="/residents" />}
            </StatRow>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}