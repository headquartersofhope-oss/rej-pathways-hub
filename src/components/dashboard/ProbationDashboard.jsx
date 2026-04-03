import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import StatCard from '@/components/shared/StatCard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResidentCard from '@/components/shared/ResidentCard';
import { format, isToday, parseISO } from 'date-fns';
import {
  Users, AlertTriangle, Calendar, CheckCircle2, Clock, Eye
} from 'lucide-react';
import { filterResidentsByAccess } from '@/lib/rbac';

export default function ProbationDashboard({ user }) {
  const { data: allResidents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 50),
  });

  const { data: recentProbationNotes = [] } = useQuery({
    queryKey: ['probation-notes'],
    queryFn: () => base44.entities.ProbationNote.list('-note_date', 20),
  });

  // Probation officers see only their assigned residents (read-only)
  const residents = filterResidentsByAccess(allResidents, user);
  const activeResidents = residents.filter(r => r.status === 'active');

  // Appointments for assigned residents
  const caseloadResidentIds = new Set(residents.map(r => r.id));
  const myAppointments = allAppointments.filter(a => caseloadResidentIds.has(a.resident_id));
  const todayApts = myAppointments.filter(a => a.date && isToday(parseISO(a.date)));

  // Recent notes (read-only view)
  const myNotes = recentProbationNotes.filter(n => caseloadResidentIds.has(n.resident_id)).slice(0, 10);

  const residentName = (residentId) => {
    const r = residents.find(r => r.id === residentId);
    return r ? `${r.preferred_name || r.first_name} ${r.last_name}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-blue-50/50 border border-blue-200/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <p className="text-xs font-medium text-blue-700">Read-Only Access</p>
        </div>
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.full_name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          You have read-only access to assigned residents. You can add compliance notes and view progress summaries.
        </p>
      </div>

      {/* Assigned Residents Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Assigned" value={activeResidents.length} icon={Users} />
        <StatCard title="Today's Schedule" value={todayApts.length} icon={Calendar} subtitle="Appointments" />
        <StatCard title="Compliance Notes" value={myNotes.length} icon={CheckCircle2} subtitle="Recent" />
        <StatCard title="High Risk" value={residents.filter(r => r.risk_level === 'high').length} icon={AlertTriangle} />
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Assigned Residents */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm">Assigned Residents</h3>
            <Badge variant="outline" className="text-xs">{activeResidents.length}</Badge>
          </div>
          <div className="space-y-2">
            {activeResidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No assigned residents</p>
            ) : (
              activeResidents.slice(0, 8).map((r) => (
                <Link key={r.id} to={`/residents/${r.id}`}>
                  <div className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <ResidentCard
                      resident={r}
                      variant="summary"
                      showJobReadiness={false}
                      showPopulation={false}
                      showRisk={true}
                      className="p-2"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Today's Schedule */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Today's Appointments
            </h3>
            <Badge variant="secondary" className="text-xs">{todayApts.length}</Badge>
          </div>
          <div className="space-y-2">
            {todayApts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointments today</p>
            ) : (
              todayApts.map((apt) => (
                <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">{residentName(apt.resident_id)} · {apt.time || ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Compliance Notes */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recent Compliance Notes
            </h3>
            <Badge variant="outline" className="text-xs">{myNotes.length}</Badge>
          </div>
          <div className="space-y-3">
            {myNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No notes yet</p>
            ) : (
              myNotes.map((note) => (
                <div key={note.id} className="border-l-2 border-emerald-200 pl-3 py-2">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium">{residentName(note.resident_id)}</p>
                    <Badge 
                      variant="outline"
                      className={`text-[10px] ${
                        note.compliance_status === 'compliant' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                        note.compliance_status === 'non_compliant' ? 'border-red-200 bg-red-50 text-red-700' :
                        'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {note.compliance_status === 'compliant' ? 'Compliant' :
                       note.compliance_status === 'non_compliant' ? 'Non-Compliant' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {note.contact_type?.replace(/_/g, ' ')} · {note.note_date ? format(parseISO(note.note_date), 'MMM d, yyyy') : ''}
                  </p>
                  <p className="text-sm text-foreground line-clamp-2">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="p-4 bg-blue-50/50 border-blue-200/30">
        <p className="text-xs text-blue-700">
          <strong>Note:</strong> You have read-only access to resident profiles and data. You can add compliance notes via the resident profile view. You cannot edit resident data, case plans, or other internal records.
        </p>
      </Card>
    </div>
  );
}