import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Home, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HousingEligibilityPanel({ resident, onStatusChange }) {
  const [isMarking, setIsMarking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const canSendToHousing = resident.status === 'active' && resident.barriers?.length === 0;

  const handleMarkEligible = async () => {
    setIsMarking(true);
    console.log('[HOUSING] Starting mark eligible for resident:', resident.id);
    try {
      const result = await base44.entities.Resident.update(resident.id, {
        status: 'housing_eligible'
      });
      console.log('[HOUSING] Mark eligible succeeded:', result);
      toast.success('Resident marked as housing eligible');
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error('[HOUSING] Mark eligible failed:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to mark as eligible');
    } finally {
      setIsMarking(false);
    }
  };

  const handleSendToHousing = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for housing referral');
      return;
    }
    setIsSubmitting(true);
    console.log('[HOUSING] Sending to housing queue:', resident.id);
    try {
      const result = await base44.functions.invoke('submitToHousingQueue', {
        resident_id: resident.id,
        reason: reason.trim()
      });
      console.log('[HOUSING] Response:', result?.data);
      if (result?.data?.success) {
        toast.success('Resident submitted to housing queue');
        setReason('');
        if (onStatusChange) onStatusChange();
      } else {
        throw new Error(result?.data?.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[HOUSING] Error:', err);
      toast.error(err.message || 'Failed to submit to housing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border-blue-200 bg-blue-50">
      <div className="flex items-start gap-3 mb-4">
        <Home className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-foreground">Housing Placement</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {resident.status === 'housing_pending' ? 'Pending housing assignment' :
             resident.status === 'housing_eligible' ? 'Ready to submit to housing' :
             'Review intake before housing eligibility'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={resident.status === 'active' ? 'default' : 'outline'}>
            {resident.status || 'active'}
          </Badge>
          {resident.barriers?.length === 0 && resident.status === 'active' && (
            <Badge className="bg-green-100 text-green-800">No active barriers</Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {resident.status === 'active' && resident.barriers?.length === 0 && (
            <Button
              onClick={handleMarkEligible}
              disabled={isMarking}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isMarking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Housing Eligible
                </>
              )}
            </Button>
          )}

          {resident.status === 'housing_eligible' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground block mb-2">
                  Reason for housing referral
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for housing submission..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button
                onClick={handleSendToHousing}
                disabled={isSubmitting || !reason.trim()}
                className="w-full bg-accent hover:bg-accent/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send to Housing
                  </>
                )}
              </Button>
            </>
          )}

          {resident.status === 'housing_pending' && (
            <div className="p-3 bg-blue-100 rounded-md border border-blue-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                This resident is pending housing assignment. Housing staff will review and assign placement.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}