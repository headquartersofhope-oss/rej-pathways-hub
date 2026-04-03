import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  present: { label: 'Present', icon: Check, color: 'bg-green-100 text-green-700' },
  absent: { label: 'Absent', icon: X, color: 'bg-red-100 text-red-700' },
  late: { label: 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
  excused: { label: 'Excused', icon: X, color: 'bg-blue-100 text-blue-700' },
};

export default function AttendanceMarker({
  residentId,
  residentName,
  classSessionId,
  sessionDate,
  classId,
  onStatusChange,
  disabled = false,
  currentStatus = null,
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleMark = async (newStatus) => {
    if (loading) return;
    setLoading(true);

    try {
      const record = await base44.entities.AttendanceRecord.create({
        global_resident_id: residentId,
        resident_id: residentId,
        class_session_id: classSessionId,
        class_id: classId,
        session_date: sessionDate,
        status: newStatus,
        marked_by: 'staff',
        marked_date: new Date().toISOString(),
      });

      setStatus(newStatus);
      if (onStatusChange) onStatusChange(residentId, newStatus);
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{residentName}</span>

      {status ? (
        <Badge className={STATUS_CONFIG[status].color}>
          {STATUS_CONFIG[status].label}
        </Badge>
      ) : (
        <div className="flex gap-1">
          {['present', 'late', 'absent', 'excused'].map(s => {
            const config = STATUS_CONFIG[s];
            const Icon = config.icon;
            return (
              <Button
                key={s}
                size="sm"
                variant="outline"
                className="p-1 h-auto w-8"
                onClick={() => handleMark(s)}
                disabled={disabled || loading}
                title={config.label}
              >
                <Icon className="w-4 h-4" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}