import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-blue-100 text-blue-700',
};

export default function AttendanceHistory({ residentId, classId = null }) {
  const [viewType, setViewType] = useState('resident');

  const { data: records = [] } = useQuery({
    queryKey: ['attendance-history', residentId, classId],
    queryFn: async () => {
      const attendance = await base44.entities.AttendanceRecord.list();
      let filtered = attendance;

      if (residentId) {
        filtered = filtered.filter(a => a.resident_id === residentId);
      }
      if (classId) {
        filtered = filtered.filter(a => a.class_id === classId);
      }

      return filtered.sort((a, b) => 
        new Date(b.session_date) - new Date(a.session_date)
      );
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list(),
  });

  if (records.length === 0) {
    return (
      <Card className="p-4 text-center text-muted-foreground text-xs">
        No attendance records yet.
      </Card>
    );
  }

  // Calculate stats
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2 text-center">
          <p className="text-xl font-bold">{attendanceRate}%</p>
          <p className="text-xs text-muted-foreground">Attendance</p>
        </Card>
        <Card className="p-2 text-center bg-green-50">
          <p className="text-lg font-bold text-green-700">{present}</p>
          <p className="text-xs text-green-600">Present</p>
        </Card>
        <Card className="p-2 text-center bg-yellow-50">
          <p className="text-lg font-bold text-yellow-700">{late}</p>
          <p className="text-xs text-yellow-600">Late</p>
        </Card>
        <Card className="p-2 text-center bg-red-50">
          <p className="text-lg font-bold text-red-700">{absent}</p>
          <p className="text-xs text-red-600">Absent</p>
        </Card>
      </div>

      {/* History Table */}
      <Card className="p-3">
        <div className="space-y-1 text-xs max-h-64 overflow-y-auto">
          {records.map(record => {
            const cls = classes.find(c => c.id === record.class_id);
            return (
              <div
                key={record.id}
                className="flex items-center justify-between p-2 rounded border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-muted-foreground">{cls?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.session_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[record.status]}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}