import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { FolderOpen, Search, Clock, Calendar, AlertCircle, CheckCircle2, Users, ChevronRight, AlertTriangle } from 'lucide-react';
import ProgressStatusBadge from '@/components/shared/ProgressStatusBadge';
import { filterResidentsByAccess } from '@/lib/rbac';
import { format, isPast, isToday, parseISO } from 'date-fns';

const severityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-red-100 text-red-800',
};

export default function CaseManagement() {
  const outletContext = useOutletContext();
  const user = outletContext?.user;
  const [search, setSearch] = useState('');

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.filter(
      user?.organization_id ? { organization_id: user.organization_id } : {}
    ),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.ServiceTask.list('-created_date', 100),
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: ['all-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 100),
  });

  const { data: allIncidents = [] } = useQuery({
    queryKey: ['all-incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date', 50),
  });

  const { data: allNotes = [] } = useQuery({
    queryKey: ['all-notes'],
    queryFn: () => base44.entities.CaseNote.list('-created_date', 50),
  });

  const residentName = (residentId) => {
    const r = residents.find(r => r.id === residentId);
    return r ? `${r.preferred_name || r.first_name} ${r.last_name}` : 'Unknown';
  };

  // Apply caseload filter based on role (case managers only see their assigned residents)
  const accessibleResidents = filterResidentsByAccess(residents, user);
  const accessibleResidentIds = new Set(accessibleResidents.map(r => r.id));

  // Scope overdue tasks and appointments to accessible residents only
  const overdueTasks = allTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'completed' && accessibleResidentIds.has(t.resident_id));
  const todayApts = allAppointments.filter(a => a.date && isToday(parseISO(a.date)) && accessibleResidentIds.has(a.resident_id));
  const openIncidents = allIncidents.filter(i => i.status === 'open' || i.status === 'under_review' || i.status === 'escalated');

  const filteredResidents = accessibleResidents.filter(r =>
    !search || `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Case Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {accessibleResidents.length} participant{accessibleResidents.length !== 1 ? 's' : ''} in your caseload
          </p>
        </div>
        <Link to="/intake">
          <Button className="gap-2"><Users className="w-4 h-4" />New Intake</Button>
        </Link>
      </div>

      {/* Alerts */}
      {overdueTasks.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <strong>{overdueTasks.length} overdue task(s)</strong> — review the Overdue Tasks tab
          <ChevronRight className="w-4 h-4 ml-auto" />
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="font-heading font-bold text-2xl text-destructive">{overdueTasks.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Overdue Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-heading font-bold text-2xl text-primary">{todayApts.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Today's Appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-heading font-bold text-2xl text-amber-600">{openIncidents.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Open Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-heading font-bold text-2xl text-accent">{allNotes.length}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Case Notes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="residents">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="residents">Participants ({accessibleResidents.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Tasks ({overdueTasks.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({openIncidents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="residents" className="mt-4">
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search participants..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredResidents.map(r => {
              const residentTasks = allTasks.filter(t => t.resident_id === r.id && t.status !== 'completed');
              const residentApts = allAppointments.filter(a => a.resident_id === r.id && ['scheduled', 'confirmed'].includes(a.status));
              return (
                <Link key={r.id} to={`/residents/${r.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {r.first_name?.[0]}{r.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-sm truncate">{r.preferred_name || r.first_name} {r.last_name}</p>
                        {r.global_resident_id && <p className="text-[10px] font-mono text-muted-foreground">{r.global_resident_id}</p>}
                      </div>
                      <ProgressStatusBadge resident={r} tasks={allTasks.filter(t => t.resident_id === r.id)} variant="dot+label" />
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{residentTasks.length} open tasks</span>
                      <span>·</span>
                      <span>{residentApts.length} upcoming apts</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <Card className="p-5">
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No overdue tasks</p>
            ) : (
              <div className="space-y-3">
                {overdueTasks.map(t => (
                  <div key={t.id} className="flex items-start gap-3 p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                    <Clock className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{residentName(t.resident_id)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-destructive font-medium">Due {t.due_date ? format(parseISO(t.due_date), 'MMM d') : ''}</p>
                      <Badge className={`text-[10px] mt-1 ${t.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-amber-50 text-amber-700'}`}>{t.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card className="p-5">
            {allAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No appointments</p>
            ) : (
              <div className="space-y-2">
                {allAppointments.slice(0, 30).map(apt => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="text-right w-20 flex-shrink-0">
                      <p className="text-xs font-medium">{apt.date ? format(parseISO(apt.date), 'MMM d') : ''}</p>
                      <p className="text-[10px] text-muted-foreground">{apt.time || ''}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{apt.title}</p>
                      <p className="text-xs text-muted-foreground">{residentName(apt.resident_id)}</p>
                    </div>
                    <Badge className={`text-[10px] flex-shrink-0 ${
                      apt.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                      apt.status === 'missed' ? 'bg-red-50 text-red-700' :
                      apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>{apt.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="mt-4">
          <Card className="p-5">
            {allIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No incidents reported</p>
            ) : (
              <div className="space-y-3">
                {allIncidents.map(inc => (
                  <div key={inc.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-[10px] ${severityColors[inc.severity] || ''}`}>{inc.severity}</Badge>
                          <span className="text-sm font-medium capitalize">{inc.incident_type?.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className={`text-[10px] ${inc.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : inc.status === 'open' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>{inc.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{inc.resident_name || residentName(inc.resident_id)} · {inc.house_name || ''}</p>
                        <p className="text-sm mt-1">{inc.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{inc.incident_date || (inc.date ? format(parseISO(inc.date), 'MMM d, yyyy') : '')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}