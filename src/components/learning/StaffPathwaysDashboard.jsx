import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, Award, ChevronRight } from 'lucide-react';
import { LEARNING_PATHWAYS, getPathwayProgress } from '@/lib/learningPathways';
import AssignPathwayDialog from './AssignPathwayDialog';

export default function StaffPathwaysDashboard({ user, classes = [] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPathway, setFilterPathway] = useState('all');
  const [assignTarget, setAssignTarget] = useState(null); // { resident, pathway }

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-list'],
    queryFn: () => base44.entities.Resident.list('-created_date', 300),
  });

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ['all-enrollments'],
    queryFn: () => base44.entities.ClassEnrollment.list('-created_date', 1000),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['all-certificates'],
    queryFn: () => base44.entities.Certificate.list('-created_date', 500),
  });

  const activeResidents = residents.filter(r => r.status === 'active' || r.status === 'employed');

  const filtered = activeResidents.filter(r => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  // For each resident, get their enrollments and certificates
  function getResidentData(resident) {
    const enrs = allEnrollments.filter(e => e.resident_id === resident.id || e.global_resident_id === resident.global_resident_id);
    const certs = certificates.filter(c => c.resident_id === resident.id || c.global_resident_id === resident.global_resident_id);
    return { enrs, certs };
  }

  const pathwaysToShow = filterPathway === 'all'
    ? LEARNING_PATHWAYS
    : LEARNING_PATHWAYS.filter(p => p.id === filterPathway);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {LEARNING_PATHWAYS.map(p => {
          const totalResidents = activeResidents.length;
          const completed = activeResidents.filter(r => {
            const { enrs } = getResidentData(r);
            const { isComplete } = getPathwayProgress(p, classes, enrs);
            return isComplete;
          }).length;
          return (
            <Card key={p.id} className={`p-3 border ${p.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{p.icon}</span>
                <p className="text-xs font-semibold leading-tight">{p.label}</p>
              </div>
              <p className="text-xl font-bold font-heading">{completed}<span className="text-sm font-normal text-muted-foreground">/{totalResidents}</span></p>
              <p className="text-[10px] text-muted-foreground">residents completed</p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-8 text-sm" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterPathway} onValueChange={setFilterPathway}>
          <SelectTrigger className="w-full sm:w-52 h-8 text-sm"><SelectValue placeholder="All Pathways" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pathways</SelectItem>
            {LEARNING_PATHWAYS.map(p => <SelectItem key={p.id} value={p.id}>{p.icon} {p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Resident rows */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active residents found.</p>
          </Card>
        )}
        {filtered.map(resident => {
          const { enrs, certs } = getResidentData(resident);
          return (
            <Card key={resident.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
                  {resident.first_name?.[0]}{resident.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{resident.first_name} {resident.last_name}</p>
                  <p className="text-xs text-muted-foreground">{resident.global_resident_id}</p>

                  {/* Pathway mini-rows */}
                  <div className="mt-2 space-y-1.5">
                    {pathwaysToShow.map(pathway => {
                      const { completedCount, totalCount, pct, isComplete, nextClass } = getPathwayProgress(pathway, classes, enrs);
                      const cert = certs.find(c => c.category === pathway.certificate_category);

                      return (
                        <div key={pathway.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${pathway.color} border`}>
                          <span className="text-base flex-shrink-0">{pathway.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{pathway.label}</span>
                              <span className="text-[10px] font-semibold flex-shrink-0">{pct}%</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1 bg-black/10 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pathway.progressColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">{completedCount}/{totalCount}</span>
                            </div>
                            {nextClass && !isComplete && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Next: {nextClass.title}</p>
                            )}
                          </div>
                          {cert ? (
                            <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Certificate earned" />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 flex-shrink-0 bg-white"
                              onClick={() => setAssignTarget({ resident, pathway })}
                            >
                              Assign
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Assign pathway dialog */}
      {assignTarget && (
        <AssignPathwayDialog
          open={!!assignTarget}
          onOpenChange={(v) => !v && setAssignTarget(null)}
          pathway={assignTarget?.pathway}
          classes={classes}
          enrollments={allEnrollments.filter(e =>
            e.resident_id === assignTarget?.resident?.id ||
            e.global_resident_id === assignTarget?.resident?.global_resident_id
          )}
          resident={assignTarget?.resident}
          user={user}
          onAssigned={() => {
            queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
            setAssignTarget(null);
          }}
        />
      )}
    </div>
  );
}