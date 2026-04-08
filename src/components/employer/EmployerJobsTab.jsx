import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase, Plus, Pencil, MapPin, DollarSign, Clock,
  Users, CheckCircle2, XCircle
} from 'lucide-react';
import JobListingDialog from '@/components/jobmatching/JobListingDialog';
import EmployerCandidatesPanel from '@/components/employer/EmployerCandidatesPanel';

export default function EmployerJobsTab({ employer, user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const { data: jobsData, refetch } = useQuery({
    queryKey: ['ep-job-listings', employer.id],
    queryFn: () => base44.functions.invoke('getEmployerJobs', {}),
    enabled: !!employer?.id,
    staleTime: 0,
  });

  const listings = jobsData?.data?.listings || [];
  // match counts are embedded in each listing as _match_count / _hired_count

  const handleSaved = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['job-listings'] });
    queryClient.invalidateQueries({ queryKey: ['ep-listings'] });
  };

  const handleArchive = async (job) => {
    await base44.entities.JobListing.update(job.id, { status: 'inactive' });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['job-listings'] });
  };

  const handleReopen = async (job) => {
    await base44.entities.JobListing.update(job.id, { status: 'active' });
    refetch();
    queryClient.invalidateQueries({ queryKey: ['job-listings'] });
  };

  if (selectedJob) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
            ← Back to Jobs
          </Button>
          <h3 className="font-heading font-semibold">{selectedJob.title}</h3>
          <Badge className={`text-xs border-0 ${selectedJob.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {selectedJob.status}
          </Badge>
        </div>
        <EmployerCandidatesPanel job={selectedJob} employer={employer} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditJob(null); setShowDialog(true); }}>
          <Plus className="w-3.5 h-3.5" /> Post New Job
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card className="p-10 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="font-semibold mb-1">No job listings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Post your first job to start receiving matched candidates.</p>
          <Button size="sm" onClick={() => { setEditJob(null); setShowDialog(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Post a Job
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map(job => {
            const matchCount = job._match_count || 0;
            const hiredCount = job._hired_count || 0;
            const wageStr = job.wage_min
              ? job.wage_max
                ? `$${job.wage_min.toLocaleString()}–$${job.wage_max.toLocaleString()}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
                : `$${job.wage_min.toLocaleString()}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
              : null;

            return (
              <Card key={job.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{job.title}</h4>
                      <Badge className={`text-[10px] border-0 ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {job.status}
                      </Badge>
                      {job.second_chance_friendly && (
                        <Badge className="text-[10px] bg-blue-50 text-blue-700 border-0">2nd Chance</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      {(job.city || job.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {[job.city, job.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {wageStr && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> {wageStr}
                        </span>
                      )}
                      {job.schedule_type && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {job.schedule_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      {matchCount > 0 && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-0 gap-1">
                          <Users className="w-2.5 h-2.5" /> {matchCount} matched
                        </Badge>
                      )}
                      {hiredCount > 0 && (
                        <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0 gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {hiredCount} hired
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSelectedJob(job)}
                    >
                      <Users className="w-3 h-3" /> Candidates
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => { setEditJob(job); setShowDialog(true); }}
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    {job.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => handleArchive(job)}
                      >
                        <XCircle className="w-3 h-3" /> Close
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-emerald-600"
                        onClick={() => handleReopen(job)}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <JobListingDialog
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditJob(null); }}
        onSaved={handleSaved}
        editJob={editJob}
        user={user}
        defaultEmployerId={employer.id}
        defaultEmployerName={employer.company_name}
      />
    </div>
  );
}