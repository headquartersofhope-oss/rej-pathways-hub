import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Home,
  Send,
  Briefcase,
  Car,
  AlertCircle,
  Loader2,
  ChevronRight,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';

const WORKFLOW_STEPS = [
  { id: 'intake', label: 'Intake Complete', icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'eligible', label: 'Housing Eligible', icon: Home, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 'pending', label: 'Housing Pending', icon: Send, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 'placed', label: 'Housed', icon: Home, color: 'text-green-600', bgColor: 'bg-green-50' },
  { id: 'employed', label: 'Employed/Readiness', icon: Briefcase, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'transport', label: 'Transportation', icon: Car, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
];

export default function UnifiedWorkflowPanel({ resident, onStatusChange, user }) {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(null);
  const [showHousingModal, setShowHousingModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch housing placement
  const { data: placement } = useQuery({
    queryKey: ['placement', resident.id],
    queryFn: async () => {
      const placements = await base44.entities.HousingPlacement.filter({
        resident_id: resident.id,
        placement_status: 'placed'
      });
      return placements[0] || null;
    },
  });

  // Determine current workflow position
  const getWorkflowStatus = () => {
    if (placement) return 'placed';
    if (resident.status === 'housing_pending') return 'pending';
    if (resident.status === 'housing_eligible') return 'eligible';
    return 'intake';
  };

  const currentStatus = getWorkflowStatus();

  const handleMarkEligible = async () => {
    setIsProcessing(true);
    try {
      await base44.entities.Resident.update(resident.id, {
        status: 'housing_eligible'
      });
      queryClient.invalidateQueries({ queryKey: ['resident', resident.id] });
      toast.success('Marked housing eligible');
      if (onStatusChange) onStatusChange();
    } catch (err) {
      toast.error(err.message || 'Failed to mark eligible');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToHousing = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await base44.functions.invoke('submitToHousingQueue', {
        resident_id: resident.id,
        reason: reason.trim()
      });
      if (result?.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['resident', resident.id] });
        queryClient.invalidateQueries({ queryKey: ['housing-pending-residents'] });
        toast.success('Sent to housing queue');
        setReason('');
        setShowHousingModal(false);
        if (onStatusChange) onStatusChange();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send to housing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenJobModal = async () => {
    // Connect resident to job readiness
    setShowJobModal(true);
  };

  const handleOpenTransportModal = async () => {
    // Open transport request modal
    setShowTransportModal(true);
  };

  return (
    <Card className="p-6 border" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
      <h3 className="font-heading font-bold text-lg mb-4 text-white">Resident Workflow</h3>

       {/* Workflow steps visual */}
       <div className="mb-6 space-y-3">
         {/* Step indicators */}
         <div className="overflow-x-auto pb-2">
           <div className="flex gap-2 min-w-max">
             {WORKFLOW_STEPS.map((step, idx) => {
               const isActive = step.id === currentStatus;
               const isPassed = WORKFLOW_STEPS.findIndex(s => s.id === currentStatus) >= idx;
               const Icon = step.icon;

               return (
                 <div key={step.id} className="flex items-center gap-2">
                   <div className={`p-2 rounded-lg ${isActive ? 'bg-amber-500/20' : isPassed ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                     <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : isPassed ? 'text-emerald-500' : 'text-slate-500'}`} />
                   </div>
                   <p className={`text-xs font-medium whitespace-nowrap ${isActive ? 'text-amber-400' : isPassed ? 'text-emerald-400' : 'text-slate-500'}`} style={{ color: isActive ? '#F59E0B' : isPassed ? '#34D399' : '#8B949E' }}>
                     {step.label}
                   </p>
                   {idx < WORKFLOW_STEPS.length - 1 && (
                     <ChevronRight className={`w-3 h-3 ${isPassed ? 'text-emerald-500' : 'text-slate-600'}`} />
                   )}
                 </div>
               );
             })}
           </div>
         </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {currentStatus === 'intake' && (
            <Button
              onClick={handleMarkEligible}
              disabled={isProcessing}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Eligible
                </>
              )}
            </Button>
          )}

          {currentStatus === 'eligible' && (
            <Button
              onClick={() => setShowHousingModal(true)}
              disabled={isProcessing}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send
            </Button>
          )}

          {['pending', 'placed'].includes(currentStatus) && (
            <Button
              onClick={() => setShowHousingModal(true)}
              disabled={isProcessing}
              size="sm"
              variant="outline"
              className="border-blue-300"
            >
              <Home className="w-3.5 h-3.5 mr-1.5" />
              Housing
            </Button>
          )}

          <Button
            onClick={handleOpenJobModal}
            size="sm"
            variant="outline"
            className="border-purple-300"
          >
            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
            Job
          </Button>

          <Button
            onClick={handleOpenTransportModal}
            size="sm"
            variant="outline"
            className="border-indigo-300"
          >
            <Car className="w-3.5 h-3.5 mr-1.5" />
            Transport
          </Button>

          {['housed', 'employed'].includes(currentStatus) && (
            <Button
              onClick={() => setActiveStep('archive')}
              size="sm"
              variant="outline"
              className="border-slate-300"
            >
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Archive
            </Button>
          )}
        </div>

        {/* Current status info */}
         <div className="pt-2 border-t" style={{ borderColor: '#30363D' }}>
           <p className="text-xs" style={{ color: '#8B949E' }}>
             Current Status: <span className="font-medium text-white capitalize">{resident.status?.replace(/_/g, ' ')}</span>
           </p>
           {placement && (
             <p className="text-xs mt-1" style={{ color: '#34D399' }}>
               ✓ Placed in {placement.house_name}, {placement.bed_label}
             </p>
           )}
         </div>
      </div>

      {/* Housing Modal */}
      <Dialog open={showHousingModal} onOpenChange={setShowHousingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {currentStatus === 'eligible' ? 'Send to Housing Queue' : 'Housing Status'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentStatus === 'eligible' && (
              <>
                <div>
                  <label className="text-sm font-medium block mb-2">Reason for referral</label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <Button
                  onClick={handleSendToHousing}
                  disabled={isProcessing || !reason.trim()}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Send to Housing
                </Button>
              </>
            )}

            {['pending', 'placed'].includes(currentStatus) && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {currentStatus === 'pending' ? 'Resident is pending housing assignment.' : 'Resident is currently housed.'}
                </p>
                {placement && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-900">{placement.house_name}</p>
                    <p className="text-xs text-emerald-700">Bed: {placement.bed_label}</p>
                    <p className="text-xs text-emerald-600 mt-1">Move-in: {new Date(placement.move_in_date).toLocaleDateString()}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">To reassign, go to Housing Operations.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Job/Readiness Modal */}
      <Dialog open={showJobModal} onOpenChange={setShowJobModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to Job Readiness</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Link this resident to the job readiness workflow for employment support.
            </p>
            <Button
              onClick={() => {
                setShowJobModal(false);
                toast.info('Go to Job Readiness tab to connect');
              }}
              className="w-full"
            >
              Open Job Readiness
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transport Modal */}
      <Dialog open={showTransportModal} onOpenChange={setShowTransportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Transportation Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Request transportation assistance for this resident.
            </p>
            <Button
              onClick={() => {
                setShowTransportModal(false);
                toast.info('Go to Transportation Hub to create request');
              }}
              className="w-full"
            >
              Open Transportation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}