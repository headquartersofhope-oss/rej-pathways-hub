import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, CheckCircle, AlertCircle, ArrowRight, Loader2, Building, Lock, Clock } from 'lucide-react';

/**
 * TurnkeyBedAssignment
 * Allows Pathway staff to assign their own clients into rooms/beds
 * within turnkey houses controlled by their organization.
 *
 * Scoping: Only shows houses where house.organization_id matches the
 * current user's organization. Submits/updates via Housing integration
 * (Housing App remains source of truth; Pathway creates/updates a
 * HousingPlacement record that gets synced back).
 */
export default function TurnkeyBedAssignment({ resident, currentUser, onAssigned }) {
  const [step, setStep] = useState('select_house'); // select_house | select_bed | confirm | success
  const [houses, setHouses] = useState([]);
  const [beds, setBeds] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [reserving, setReserving] = useState(false);
  const [reservationExpiry, setReservationExpiry] = useState(null); // Date object
  const [secondsLeft, setSecondsLeft] = useState(null);
  const countdownRef = useRef(null);
  const reservedBedIdRef = useRef(null);

  const orgId = currentUser?.data?.organization_id || resident?.organization_id;

  useEffect(() => {
    fetchOrgHouses();
  }, [orgId]);

  const fetchOrgHouses = async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Only load houses belonging to this org (turnkey / org-managed)
      const allHouses = await base44.entities.House.filter({ organization_id: orgId, status: 'active' });
      setHouses(allHouses);
    } catch (err) {
      setError('Failed to load organization houses');
    } finally {
      setLoading(false);
    }
  };

  const fetchBedsForHouse = async (house) => {
    try {
      setLoading(true);
      const allBeds = await base44.entities.Bed.filter({ house_id: house.id });
      setBeds(allBeds);
    } catch (err) {
      setError('Failed to load beds for this house');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHouse = (house) => {
    setSelectedHouse(house);
    setSelectedBed(null);
    fetchBedsForHouse(house);
    setStep('select_bed');
  };

  // ── Countdown timer ────────────────────────────────────────────────────────
  const startCountdown = (expiresAt) => {
    clearInterval(countdownRef.current);
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(countdownRef.current);
        // Reservation expired — bounce back to bed selection
        setSelectedBed(null);
        setReservationExpiry(null);
        setSecondsLeft(null);
        reservedBedIdRef.current = null;
        setStep('select_bed');
        setError('Reservation expired. Please select a bed again.');
      }
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
  };

  const clearReservation = () => {
    clearInterval(countdownRef.current);
    setReservationExpiry(null);
    setSecondsLeft(null);
    reservedBedIdRef.current = null;
  };

  // ── Select bed: call reserveBed first ──────────────────────────────────────
  const handleSelectBed = async (bed) => {
    setReserving(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('reserveBed', {
        bed_id: bed.id,
        resident_id: resident.id,
        case_manager_id: currentUser?.id || 'unknown',
      });
      const data = res.data;
      if (!data?.success) {
        setError(data?.error || 'Could not reserve this bed. It may have just been taken.');
        return;
      }
      reservedBedIdRef.current = bed.id;
      setReservationExpiry(new Date(data.expires_at));
      startCountdown(data.expires_at);
      setSelectedBed(bed);
      setStep('confirm');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not reserve bed');
    } finally {
      setReserving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedHouse || !selectedBed) return;
    setSaving(true);
    setError(null);

    try {
      // Check if a placement already exists for this resident
      const existing = await base44.entities.HousingPlacement.filter({
        global_resident_id: resident.global_resident_id
      }, '-synced_at', 1);

      const placementData = {
        global_resident_id: resident.global_resident_id,
        resident_id: resident.id,
        organization_id: orgId,
        housing_model: 'turnkey_house',
        house_id: selectedHouse.id,
        house_name: selectedHouse.name,
        house_type: selectedHouse.program_type,
        city: selectedHouse.city,
        state: selectedHouse.state,
        room_id: selectedBed.room_number || null,
        room_name: selectedBed.room_number ? `Room ${selectedBed.room_number}` : null,
        bed_id: selectedBed.id,
        bed_label: selectedBed.bed_label,
        placement_status: 'placed',
        occupancy_status: 'occupied',
        move_in_date: new Date().toISOString().split('T')[0],
        placement_source: currentUser?.full_name || currentUser?.email || 'Staff',
        synced_at: new Date().toISOString(),
        sync_source: 'direct_import',
        sync_error: null,
        last_verified: new Date().toISOString(),
        notes: `Internal turnkey assignment by ${currentUser?.email || 'staff'}`
      };

      if (existing.length > 0) {
        await base44.entities.HousingPlacement.update(existing[0].id, placementData);
      } else {
        await base44.entities.HousingPlacement.create(placementData);
      }

      // Mark the bed as occupied
      await base44.entities.Bed.update(selectedBed.id, {
        status: 'occupied',
        resident_id: resident.id,
        resident_name: `${resident.first_name} ${resident.last_name}`,
        move_in_date: placementData.move_in_date
      });

      clearReservation();
      setStep('success');
      onAssigned?.();
    } catch (err) {
      setError(err.message || 'Failed to assign placement');
    } finally {
      setSaving(false);
    }
  };

  // Release reservation and go back to bed selection
  const handleBackFromConfirm = async () => {
    clearReservation();
    // Bed will auto-release via releaseExpiredReservations or we can just
    // let it expire — 60s is short enough. Skip an explicit release call
    // to avoid needing an extra endpoint.
    setSelectedBed(null);
    setStep('select_bed');
  };

  // Treat expired reserved beds as available in the UI (will be swept soon)
  const now = Date.now();
  const availableBeds = beds.filter(b => {
    if (b.status === 'available') return true;
    if (b.status === 'reserved') {
      // Show as available if reservation is expired OR held by this user for this resident
      const exp = b.reservation_expires_at ? new Date(b.reservation_expires_at) : null;
      const isExpired = !exp || now >= exp;
      const isOurs = b.reserved_by === (currentUser?.id) && b.reserved_for === resident?.id;
      return isExpired || isOurs;
    }
    return false;
  });
  const lockedBeds = beds.filter(b => {
    if (b.status !== 'reserved') return false;
    const exp = b.reservation_expires_at ? new Date(b.reservation_expires_at) : null;
    const isExpired = !exp || now >= exp;
    const isOurs = b.reserved_by === (currentUser?.id) && b.reserved_for === resident?.id;
    return !isExpired && !isOurs;
  });
  const occupiedBeds = beds.filter(b => b.status === 'occupied');

  if (loading && step === 'select_house') {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!orgId) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No organization found. Turnkey house assignment requires an organization context.
        </CardContent>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="py-8 text-center space-y-3">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
          <div>
            <p className="font-semibold text-emerald-800">Client Assigned</p>
            <p className="text-sm text-emerald-700 mt-1">
              {resident.first_name} has been placed in {selectedHouse?.name} — {selectedBed?.bed_label}
            </p>
            <Badge className="mt-2 bg-emerald-700 text-white text-xs">
              Turnkey House — Internal Placement
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setStep('select_house');
            setSelectedHouse(null);
            setSelectedBed(null);
          }}>
            Assign Another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Building className="w-4 h-4" />
          Turnkey House — Internal Placement
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Assign {resident.first_name} to a room/bed in your organization's managed house.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* STEP: Select House */}
        {step === 'select_house' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">SELECT HOUSE</p>
            {houses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                No active houses found for your organization.
              </p>
            ) : (
              houses.map(house => (
                <button
                  key={house.id}
                  onClick={() => handleSelectHouse(house)}
                  className="w-full p-3 border rounded-md text-left hover:border-primary/60 hover:bg-primary/5 transition text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{house.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {house.city}{house.state ? `, ${house.state}` : ''} · {house.program_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{house.total_beds - house.occupied_beds} / {house.total_beds} beds avail.</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* STEP: Select Bed */}
        {step === 'select_bed' && selectedHouse && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('select_house')} className="text-xs text-primary hover:underline">
                ← Back
              </button>
              <p className="text-xs font-medium text-muted-foreground">SELECT BED IN {selectedHouse.name.toUpperCase()}</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableBeds.length === 0 && lockedBeds.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                No available beds in this house. {occupiedBeds.length} bed(s) currently occupied.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableBeds.map(bed => (
                  <button
                    key={bed.id}
                    onClick={() => !reserving && handleSelectBed(bed)}
                    disabled={reserving}
                    className="p-3 border rounded-md text-left hover:border-primary/60 hover:bg-primary/5 transition disabled:opacity-60 disabled:cursor-wait"
                  >
                    <div className="flex items-center gap-2">
                      {reserving ? (
                        <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
                      ) : (
                        <Bed className="w-4 h-4 text-primary shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{bed.bed_label || `Bed ${bed.id.slice(-4)}`}</p>
                        {bed.room_number && (
                          <p className="text-xs text-muted-foreground">Room {bed.room_number}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {lockedBeds.map(bed => {
                  const exp = bed.reservation_expires_at ? new Date(bed.reservation_expires_at) : null;
                  const sLeft = exp ? Math.max(0, Math.ceil((exp - Date.now()) / 1000)) : 0;
                  return (
                    <div
                      key={bed.id}
                      className="p-3 border border-amber-200 bg-amber-50 rounded-md opacity-70 cursor-not-allowed"
                      title="This bed is being assigned by another case manager"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">{bed.bed_label || `Bed ${bed.id.slice(-4)}`}</p>
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Being assigned… {sLeft}s
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP: Confirm */}
        {step === 'confirm' && selectedHouse && selectedBed && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={handleBackFromConfirm} className="text-xs text-primary hover:underline">
                ← Back
              </button>
              {secondsLeft !== null && (
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  secondsLeft > 20
                    ? 'bg-emerald-100 text-emerald-700'
                    : secondsLeft > 10
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700 animate-pulse'
                }`}>
                  <Lock className="w-3 h-3" />
                  Bed locked — {secondsLeft}s remaining
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border rounded-md space-y-2">
              <p className="text-xs font-medium text-muted-foreground">PLACEMENT SUMMARY</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Resident</p>
                  <p className="font-medium">{resident.first_name} {resident.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">House</p>
                  <p className="font-medium">{selectedHouse.name}</p>
                </div>
                {selectedBed.room_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Room</p>
                    <p className="font-medium">Room {selectedBed.room_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Bed</p>
                  <p className="font-medium">{selectedBed.bed_label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Move-In</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    Turnkey House
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</>
              ) : (
                <>Confirm Assignment <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}