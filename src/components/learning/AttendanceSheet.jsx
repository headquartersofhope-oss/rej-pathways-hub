import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, MinusCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusIcon = {
  present: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  absent: <XCircle className="w-4 h-4 text-red-500" />,
  late: <Clock className="w-4 h-4 text-amber-500" />,
  excused: <MinusCircle className="w-4 h-4 text-slate-400" />,
};

const statusColors = {
  present: 'bg-emerald-50 text-emerald-700',
  absent: 'bg-red-50 text-red-700',
  late: 'bg-amber-50 text-amber-700',
  excused: 'bg-slate-100 text-slate-600',
};

export default function AttendanceSheet({ user, classes, residents, preselectedSession, onPreselectedConsumed }) {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [saving, setSaving] = useState({});

  // Consume preselected session from parent (e.g. "Take Attendance" button on schedule)
  useEffect(() => {
    if (preselectedSession) {
      setSelectedClassId(preselectedSession.class_id);
      setSelectedSessionId(preselectedSession.id);
      onPreselectedConsumed?.();
    }
  }, [preselectedSession]);

  const { data: sessions = [] } = useQuery({
    queryKey: ['class-sessions'],
    queryFn: () => base44.entities.ClassSession.list('-date', 200),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.ClassEnrollment.list('-created_date', 300),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedSessionId],
    queryFn: () => selectedSessionId
      ? base44.entities.AttendanceRecord.filter({ session_id: selectedSessionId })
      : [],
    enabled: !!selectedSessionId,
  });

  const classSessions = sessions.filter(s => s.class_id === selectedClassId);
  const classEnrollments = enrollments.filter(e => e.class_id === selectedClassId);
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));
  const attendanceMap = Object.fromEntries(attendance.map(a => [a.resident_id, a]));

  const markAttendance = async (resident, status) => {
    setSaving(s => ({ ...s, [resident.id]: true }));
    const existing = attendanceMap[resident.id];
    if (existing) {
      await base44.entities.AttendanceRecord.update(existing.id, { status, recorded_by: user?.id });
    } else {
      await base44.entities.AttendanceRecord.create({
        global_resident_id: resident.global_resident_id || resident.id,
        resident_id: resident.id,
        class_id: selectedClassId,
        session_id: selectedSessionId,
        organization_id: user?.organization_id,
        status,
        recorded_by: user?.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['attendance', selectedSessionId] });
    setSaving(s => ({ ...s, [resident.id]: false }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={selectedClassId} onValueChange={v => { setSelectedClassId(v); setSelectedSessionId(''); }}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.filter(c => c.is_active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedClassId && (
          <div className="flex-1">
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>
                {classSessions.length === 0 ? (
                  <SelectItem value="none" disabled>No sessions found</SelectItem>
                ) : (
                  classSessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.date ? format(parseISO(s.date), 'MMM d, yyyy') : 'Unknown date'} {s.start_time || ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedSessionId && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Attendance Sheet</h3>
            <Badge variant="outline" className="text-xs">{classEnrollments.length} enrolled</Badge>
          </div>
          {classEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No residents enrolled in this class.</p>
          ) : (
            <div className="space-y-2">
              {classEnrollments.map(enr => {
                const resident = residentMap[enr.resident_id];
                const record = attendanceMap[enr.resident_id];
                if (!resident) return null;
                return (
                  <div key={enr.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                      {resident.first_name?.[0]}{resident.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{resident.preferred_name || resident.first_name} {resident.last_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {record && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColors[record.status]}`}>
                          {record.status}
                        </span>
                      )}
                      <div className="flex gap-1 ml-1">
                        {['present', 'absent', 'late', 'excused'].map(s => (
                          <button
                            key={s}
                            onClick={() => markAttendance(resident, s)}
                            disabled={saving[resident.id]}
                            title={s}
                            className={`p-1 rounded hover:bg-muted transition-colors ${record?.status === s ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                          >
                            {statusIcon[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {!selectedClassId && (
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-sm">Select a class and session to take attendance.</p>
        </div>
      )}
    </div>
  );
}