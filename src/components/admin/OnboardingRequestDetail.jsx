import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingRequestDetail({ request, onClose }) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [finalRole, setFinalRole] = useState(request.requested_role || '');
  const [notes, setNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Call backend function first to create user + send email + link records
      const result = await base44.functions.invoke('approveOnboardingRequest', {
        request_id: request.id,
        final_role: finalRole,
      });

      if (!result?.data?.success) {
        throw new Error(result?.data?.error || 'Backend approval failed');
      }

      // Update onboarding request to approved (now we know backend succeeded)
      await base44.entities.OnboardingRequest.update(request.id, {
        status: 'approved',
        final_assigned_role: finalRole,
        notes,
      });

      toast.success('Request approved. Activation email sent.');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to approve request');
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await base44.entities.OnboardingRequest.update(request.id, {
        status: 'rejected',
        rejected_by: (await base44.auth.me()).email,
        rejected_date: new Date().toISOString(),
        rejection_reason: rejectionReason,
      });
      toast.success('Request rejected.');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setIsRejecting(false);
      setShowRejectDialog(false);
    }
  };

  const isResident = request.request_type === 'resident_intake';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-primary hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Queue
        </button>
        <h1 className="text-3xl font-heading font-bold text-foreground">
          {request.first_name} {request.last_name}
        </h1>
        <p className="text-muted-foreground mt-1">{request.email}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Information */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Request Information</h2>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Request Type</p>
                  <p className="font-medium text-foreground">{request.request_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested Role</p>
                  <p className="font-medium text-foreground">{request.requested_role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(request.submitted_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{request.status}</Badge>
                </div>
              </div>
              {request.organization && (
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium text-foreground">{request.organization}</p>
                </div>
              )}
              {request.reason_for_access && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason for Access</p>
                  <p className="text-foreground">{request.reason_for_access}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Resident Data */}
          {isResident && request.resident_data && (
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Resident Information</h2>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Housing Status</p>
                    <p className="font-medium text-foreground">
                      {request.resident_data.housing_status || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employment Status</p>
                    <p className="font-medium text-foreground">
                      {request.resident_data.employment_status || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Literacy Level</p>
                    <p className="font-medium text-foreground">
                      {request.resident_data.literacy_level || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Digital Literacy</p>
                    <p className="font-medium text-foreground">
                      {request.resident_data.digital_literacy || '—'}
                    </p>
                  </div>
                </div>
                {request.resident_data.primary_needs?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Primary Needs</p>
                    <div className="flex flex-wrap gap-2">
                      {request.resident_data.primary_needs.map((need) => (
                        <Badge key={need} variant="outline">
                          {need}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {request.resident_data.emergency_contact_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Emergency Contact</p>
                    <p className="font-medium text-foreground">
                      {request.resident_data.emergency_contact_name}{' '}
                      {request.resident_data.emergency_contact_phone && `(${request.resident_data.emergency_contact_phone})`}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* AI Analysis */}
          {request.ai_analysis_complete && (
            <Card className="p-6 border-green-200 bg-green-50">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                AI Analysis
              </h2>
              <div className="space-y-4">
                {request.ai_summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Summary</p>
                    <p className="text-foreground">{request.ai_summary}</p>
                  </div>
                )}
                {request.ai_recommended_role && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Recommended Role</p>
                    <Badge className="bg-blue-100 text-blue-800">
                      {request.ai_recommended_role}
                    </Badge>
                  </div>
                )}
                {request.ai_recommended_services?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Recommended Services/Classes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {request.ai_recommended_services.map((service) => (
                        <Badge key={service} variant="outline">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar: Approval Actions */}
        <div className="space-y-4">
          {request.status === 'pending' && (
            <>
              <Card className="p-6 border-blue-200 bg-blue-50">
                <h3 className="font-semibold text-foreground mb-4">Assign Role</h3>
                <Select value={finalRole} onValueChange={setFinalRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select final role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="case_manager">Case Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="probation_officer">Probation Officer</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>

                <div className="mt-4">
                  <label className="text-sm text-muted-foreground">Admin Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes about this approval"
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleApprove}
                  disabled={isApproving || !finalRole}
                  className="w-full mt-4 bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Request
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isApproving}
                  variant="outline"
                  className="w-full mt-2"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
              </Card>
            </>
          )}

          {request.status === 'approved' && (
            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-4">
                <CheckCircle2 className="w-5 h-5" />
                Approved
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Final Role</p>
                  <p className="font-medium">{request.final_assigned_role}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approved By</p>
                  <p className="font-medium">{request.approved_by}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(request.approved_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {request.status === 'rejected' && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-4">
                <XCircle className="w-5 h-5" />
                Rejected
              </div>
              <p className="text-sm text-foreground">{request.rejection_reason}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why are you rejecting this request?"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason}
                variant="destructive"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Request'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}