import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Clock } from 'lucide-react';
import AttendanceMarker from './AttendanceMarker';

const STATUS_CONFIG = {
  present: { label: 'Present', icon: Check, color: 'text-green-600' },
  absent: { label: 'Absent', icon: X, color: 'text-red-600' },
  late: { label: 'Late', icon: Clock, color: 'text-yellow-600' },
  excused: { label: 'Excused', icon: X, color: 'text-blue-600' },
};

export default function ClassRoster({ classSessionId, staffView = false }) {
  const [attendanceMap, setAttendanceMap] = useState({});

  const { data: session } = useQuery({
    queryKey: ['class-session', classSessionId],
    queryFn: async () => {
      const sessions = await base44.entities.ClassSession.list();
      return sessions.find(s => s.id === classSessionId);
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['class-enrollments', session?.class_id],
    queryFn: async () => {
      if (!session?.class_id) return [];
      const assignments = await base44.entities.LearningAssignment.list();
      return assignments.filter(a => a.class_id === session.class_id);
    },
    enabled: !!session?.class_id,
  });

  const { data: records = [] } = useQuery({
    queryKey: ['attendance-records', classSessionId],
    queryFn: async () => {
      const attendance = await base44.entities.AttendanceRecord.list();
      return attendance.filter(a => a.class_session_id === classSessionId);
    },
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  useEffect(() => {
    const map = {};
    records.forEach(record => {
      map[record.resident_id] = record.status;
    });
    setAttendanceMap(map);
  }, [records]);

  if (!session) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        Loading session details...
      </Card>
    );
  }

  const presentCount = Object.values(attendanceMap).filter(s => s === 'present').length;
  const lateCount = Object.values(attendanceMap).filter(s => s === 'late').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'absent').length;

  return (
    <div className="space-y-3">
      {/* Session Header */}
      <Card className="p-4 bg-muted">
        <h3 className="font-semibold text-sm">{session.class_title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {session.session_date}
          {session.start_time && ` • ${session.start_time}`}
          {session.location && ` • ${session.location}`}
        </p>
      </Card>

      {/* Attendance Summary */}
      {staffView && (
        <Alert className="bg-blue-50">
          <AlertDescription className="text-xs space-y-1">
            <div className="flex gap-4 text-sm font-medium">
              <span className="text-green-600">✓ {presentCount} Present</span>
              <span className="text-yellow-600">⧗ {lateCount} Late</span>
              <span className="text-red-600">✗ {absentCount} Absent</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Roster */}
      <Card className="p-4 space-y-2">
        {enrollments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No enrollments</p>
        ) : (
          enrollments.map(enrollment => {
            const resident = residents.find(r => r.id === enrollment.resident_id);
            const currentStatus = attendanceMap[enrollment.resident_id];
            const config = currentStatus && STATUS_CONFIG[currentStatus];

            return (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-2 rounded border border-border text-xs"
              >
                {staffView ? (
                  <AttendanceMarker
                    residentId={enrollment.resident_id}
                    residentName={resident?.first_name + ' ' + resident?.last_name}
                    classSessionId={classSessionId}
                    sessionDate={session.session_date}
                    classId={session.class_id}
                    currentStatus={currentStatus}
                    onStatusChange={() => {
                      // Trigger refetch
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span>{resident?.first_name} {resident?.last_name}</span>
                    {config && (
                      <Badge className={`${config.color} bg-opacity-20`}>
                        {config.label}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}