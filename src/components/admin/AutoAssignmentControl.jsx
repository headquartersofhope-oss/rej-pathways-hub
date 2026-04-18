import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AutoAssignmentControl({ organizationId }) {
  const [caseloadThreshold, setCaseloadThreshold] = useState(25);
  const [lastResult, setLastResult] = useState(null);

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('bulkAutoAssignResidents', {
        organization_id: organizationId,
        caseload_threshold: caseloadThreshold
      });
      return response.data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (data.success) {
        toast.success(`Auto-assigned ${data.assigned} residents (${data.failed} failed)`);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error('Auto-assignment failed: ' + error.message);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Smart Auto-Assignment
        </CardTitle>
        <CardDescription>
          Automatically assign unassigned residents to least-loaded case managers
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Caseload Threshold */}
        <div>
          <label className="text-sm font-semibold">Caseload Threshold (max per CM)</label>
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              min="5"
              max="100"
              value={caseloadThreshold}
              onChange={(e) => setCaseloadThreshold(parseInt(e.target.value) || 25)}
              className="px-3 py-2 border rounded-lg w-24 text-sm"
            />
            <span className="text-sm text-muted-foreground py-2">
              Case managers above this limit will not receive new assignments
            </span>
          </div>
        </div>

        {/* Trigger Button */}
        <Button
          onClick={() => bulkAssignMutation.mutate()}
          disabled={bulkAssignMutation.isPending}
          className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
        >
          <Zap className="w-4 h-4" />
          {bulkAssignMutation.isPending ? 'Auto-Assigning...' : 'Auto-Assign All Unassigned'}
        </Button>

        {/* Last Result */}
        {lastResult && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-3 border">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <p className="font-semibold">
                {lastResult.success ? 'Auto-Assignment Complete' : 'Auto-Assignment Partial'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded p-2">
                <p className="text-xs text-muted-foreground">Assigned</p>
                <p className="text-lg font-bold text-green-600">{lastResult.assigned}</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-xs text-muted-foreground">Failed</p>
                <p className="text-lg font-bold text-red-600">{lastResult.failed}</p>
              </div>
              <div className="bg-white rounded p-2">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{lastResult.total}</p>
              </div>
            </div>

            {lastResult.details && lastResult.details.length > 0 && (
              <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                <p className="font-semibold text-muted-foreground">Details:</p>
                {lastResult.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded flex items-start gap-2 ${
                      detail.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {detail.success ? (
                      <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span>
                      <strong>{detail.resident_name}</strong>
                      {detail.assigned_to && ` → ${detail.assigned_to}`}
                      {detail.reason && ` (${detail.reason})`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-blue-900 mb-1">How it works:</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Finds all unassigned residents in your organization</li>
            <li>Calculates current caseload for each case manager</li>
            <li>Skips case managers at/over the threshold</li>
            <li>Assigns to least-loaded eligible case manager</li>
            <li>Creates audit log for each assignment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}