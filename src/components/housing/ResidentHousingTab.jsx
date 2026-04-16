import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, MapPin, Calendar, AlertCircle, CheckCircle, Clock, FileText, Plus, Building, Bed } from 'lucide-react';
import HousingAssignmentPanel from './HousingAssignmentPanel';

/**
 * ResidentHousingTab: Resident profile housing integration
 * Shows current housing status, referrals, and placement tracking
 * Integrated into ResidentProfile and case management views
 */
export default function ResidentHousingTab({ resident, onNewReferral, currentUser, isEditable = false }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [housing, setHousing] = useState(null);
  const [activePlacement, setActivePlacement] = useState(null);
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [refs, placements] = await Promise.all([
          base44.entities.HousingReferral.filter({ global_resident_id: resident.global_resident_id }),
          base44.entities.HousingPlacement.filter({ global_resident_id: resident.global_resident_id }, '-synced_at', 1).catch(() => [])
        ]);
        setReferrals(refs);

        // Check for an active HousingPlacement (turnkey internal or synced)
        const placed = placements.find(p => p.placement_status === 'placed');
        if (placed) {
          setActivePlacement(placed);
          setHousing({
            type: placed.housing_model === 'turnkey_house' ? 'turnkey_placed' : 'placed',
            status: 'placed',
            provider: placed.house_name,
            houseName: placed.house_name,
            houseType: placed.house_type,
            roomName: placed.room_name,
            bedLabel: placed.bed_label,
            moveInDate: placed.move_in_date,
            expectedExitDate: placed.expected_move_out_date,
            housingModel: placed.housing_model,
          });
          return;
        }

        // Fall back to referral-derived status
        const activeRef = refs.find(r => ['submitted', 'received', 'under_review', 'approved'].includes(r.status));
        if (activeRef) {
          setHousing({
            type: 'referral_in_progress',
            status: activeRef.status,
            provider: activeRef.target_provider_name,
            referralId: activeRef.id,
            priority: activeRef.priority_level,
          });
        } else {
          const approvedRef = refs.find(r => r.status === 'approved');
          if (approvedRef) {
            setHousing({
              type: 'placement_ready',
              status: 'approved',
              provider: approvedRef.target_provider_name,
              referralId: approvedRef.id,
              moveInDate: approvedRef.move_in_date,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch housing data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (resident?.global_resident_id) {
      fetchData();
    }
  }, [resident?.global_resident_id]);

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under_review':
      case 'submitted':
      case 'received':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'waitlisted':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const statusLabel = (status) => {
    const labels = {
      submitted: 'Submitted',
      received: 'Received',
      under_review: 'Under Review',
      approved: 'Approved',
      denied: 'Denied',
      waitlisted: 'Waitlisted',
      draft: 'Draft',
      ready_to_submit: 'Ready to Submit',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading housing status...</div>;
  }

  if (showAssignmentPanel) {
    return (
      <div className="space-y-3">
        <button onClick={() => setShowAssignmentPanel(false)} className="text-xs text-primary hover:underline">
          ← Back to housing summary
        </button>
        <HousingAssignmentPanel
          resident={resident}
          currentUser={currentUser}
          onComplete={() => {
            setShowAssignmentPanel(false);
            // Refresh housing data
            setLoading(true);
            setHousing(null);
            setActivePlacement(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Housing Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Home className="w-4 h-4" />
              Housing Status
            </CardTitle>
            {isEditable && (
              <Button size="sm" variant="outline" onClick={() => setShowAssignmentPanel(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Place Client
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {housing ? (
            <>
              {/* Turnkey Internal Placement — rich detail display */}
              {(housing.type === 'turnkey_placed' || housing.type === 'placed') ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{housing.houseName}</p>
                      <p className="text-xs text-muted-foreground">{housing.houseType?.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge className={statusBadgeClass('approved')}>
                      Placed
                    </Badge>
                  </div>

                  {housing.housingModel === 'turnkey_house' && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Turnkey House — Internal Placement
                    </Badge>
                  )}

                  {(housing.roomName || housing.bedLabel) && (
                    <div className="grid grid-cols-2 gap-2">
                      {housing.roomName && (
                        <div className="p-2 bg-slate-50 border rounded text-xs">
                          <p className="text-muted-foreground">Room</p>
                          <p className="font-medium">{housing.roomName}</p>
                        </div>
                      )}
                      {housing.bedLabel && (
                        <div className="p-2 bg-slate-50 border rounded text-xs">
                          <p className="text-muted-foreground">Bed</p>
                          <p className="font-medium">{housing.bedLabel}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {housing.moveInDate && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Move-in: {new Date(housing.moveInDate).toLocaleDateString()}
                    </div>
                  )}
                  {housing.expectedExitDate && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expected Exit: {new Date(housing.expectedExitDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {housing.type === 'placement_ready' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {housing.type === 'placement_ready' ? 'Approved for Housing' : 'Referral In Progress'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {housing.provider || 'Provider pending'}
                      </p>
                    </div>
                    <Badge className={statusBadgeClass(housing.status)}>
                      {statusLabel(housing.status)}
                    </Badge>
                  </div>

                  {housing.priority && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {housing.priority.toUpperCase()} priority
                    </div>
                  )}

                  {housing.moveInDate && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Move-in: {new Date(housing.moveInDate).toLocaleDateString()}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Home className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p>No housing placement on file.</p>
                {isEditable && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignmentPanel(true)} className="mt-2 h-7">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Begin Placement
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Referral History ({referrals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {referrals.map(ref => (
                <div key={ref.id} className="flex items-start gap-2 p-2 rounded border hover:bg-muted/50 transition-colors text-xs">
                  <div className="flex-1">
                    <p className="font-medium">{ref.target_provider_name || 'Provider pending'}</p>
                    <p className="text-muted-foreground">
                      {new Date(ref.referral_date).toLocaleDateString()} · {statusLabel(ref.status)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`${statusBadgeClass(ref.status)} shrink-0 text-[10px]`}>
                    {statusLabel(ref.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Housing Readiness Checklist */}
      {resident && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Housing Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {[
              { label: 'Housing Placement Active', check: housing?.type === 'turnkey_placed' || housing?.type === 'placed' || housing?.type === 'referral_in_progress' || housing?.type === 'placement_ready' },
              { label: 'Referral or Internal Assignment', check: referrals.some(r => ['submitted', 'received', 'under_review', 'approved', 'denied', 'waitlisted'].includes(r.status)) || !!activePlacement },
              { label: 'Contact Info on File', check: resident.phone && resident.email },
              { label: 'Case Manager Assigned', check: resident.assigned_case_manager_id },
              { label: 'Assessment Completed', check: resident.intake_date },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.check ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span className={item.check ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}