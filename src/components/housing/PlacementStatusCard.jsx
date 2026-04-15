import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, MapPin, Users, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * PlacementStatusCard: Clean client housing status display
 * Shows where client is placed + movement timeline
 */
export default function PlacementStatusCard({ residentId, globalResidentId, isEditable }) {
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchPlacement();
  }, [residentId, globalResidentId]);

  const fetchPlacement = async () => {
    try {
      setLoading(true);
      const placements = await base44.entities.HousingPlacement.filter({
        global_resident_id: globalResidentId
      }, '-synced_at', 1);
      
      if (placements.length > 0) {
        setPlacement(placements[0]);
      }
    } catch (err) {
      console.error('Error fetching placement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncHousingPlacement', {
        resident_id: residentId,
        global_resident_id: globalResidentId
      });
      await fetchPlacement();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const statusColors = {
    not_placed: 'bg-slate-100 text-slate-800',
    referred: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800',
    move_in_ready: 'bg-purple-100 text-purple-800',
    placed: 'bg-emerald-100 text-emerald-800',
    waitlisted: 'bg-amber-100 text-amber-800',
    denied: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    not_placed: 'Not Placed',
    referred: 'Referred',
    approved: 'Approved',
    move_in_ready: 'Move-In Ready',
    placed: 'Placed',
    waitlisted: 'Waitlisted',
    denied: 'Denied',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Loading housing status...
        </CardContent>
      </Card>
    );
  }

  if (!placement || placement.placement_status === 'not_placed') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="w-4 h-4" />
              Housing Status
            </CardTitle>
            {isEditable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleManualSync}
                disabled={syncing}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Badge className={statusColors.not_placed}>
              {statusLabels.not_placed}
            </Badge>
            <p className="text-sm text-amber-800">
              No active housing placement. {isEditable && 'Submit a referral to begin the placement process.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="w-4 h-4" />
            Housing Status
          </CardTitle>
          {isEditable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleManualSync}
              disabled={syncing}
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div>
          <Badge className={statusColors[placement.placement_status]}>
            {statusLabels[placement.placement_status]}
          </Badge>
        </div>

        {/* Sync Error Alert */}
        {placement.sync_error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-medium">Sync Issue</p>
              <p>{placement.sync_error}</p>
            </div>
          </div>
        )}

        {/* House Assignment */}
        {placement.placement_status !== 'not_placed' && placement.house_name && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">ASSIGNED HOUSE</p>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{placement.house_name}</p>
                <p className="text-xs text-muted-foreground">
                  {placement.city}{placement.state && `, ${placement.state}`}
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {placement.house_type?.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Room/Bed Assignment (Per-Bed Only) */}
        {placement.housing_model === 'per_bed' && placement.room_name && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">ROOM & BED</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 rounded border">
                <p className="text-xs text-muted-foreground">Room</p>
                <p className="font-medium text-sm">{placement.room_name}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded border">
                <p className="text-xs text-muted-foreground">Bed</p>
                <p className="font-medium text-sm">{placement.bed_label || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Move-In/Out Dates */}
        {placement.move_in_date && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm">
                <span className="text-muted-foreground">Move-In: </span>
                <span className="font-medium">{new Date(placement.move_in_date).toLocaleDateString()}</span>
              </div>
            </div>
            {placement.expected_move_out_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Expected Exit: </span>
                  <span className="font-medium">{new Date(placement.expected_move_out_date).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {placement.synced_at && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>Last synced: {new Date(placement.synced_at).toLocaleString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}