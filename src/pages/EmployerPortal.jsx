import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, Users, Target } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import JobListingDialog from '@/components/jobmatching/JobListingDialog';
import EmployerProfileEditor from '@/components/employers/EmployerProfileEditor';
import CandidateMatchPanel from '@/components/employers/CandidateMatchPanel';
import CandidateDetailView from '@/components/employers/CandidateDetailView';

export default function EmployerPortal() {
  const [user, setUser] = useState(null);
  const [employer, setEmployer] = useState(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Get current user
  useEffect(() => {
    const fetch = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (err) {
        console.error('Auth error:', err);
      }
    };
    fetch();
  }, []);

  // Fetch employer profile linked to current user
  const { data: employers = [] } = useQuery({
    queryKey: ['employer-by-user', user?.id],
    queryFn: async () => {
      const all = await base44.entities.Employer.list();
      return all.filter(e => e.user_id === user?.id);
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (employers.length > 0) {
      setEmployer(employers[0]);
    }
  }, [employers]);

  // Fetch job listings for this employer
  const { data: listings = [], refetch: refetchListings } = useQuery({
    queryKey: ['employer-listings', employer?.id],
    queryFn: async () => {
      const all = await base44.entities.JobListing.list('-created_date');
      return all.filter(j => j.employer_id === employer?.id || j.employer_name === employer?.company_name);
    },
    enabled: !!employer?.id,
  });

  // Fetch all job matches to filter for this employer's jobs
  const { data: allMatches = [] } = useQuery({
    queryKey: ['employer-all-matches', employer?.id],
    queryFn: async () => {
      const all = await base44.entities.JobMatch.list();
      const listingIds = new Set(listings.map(l => l.id));
      return all.filter(m => listingIds.has(m.job_listing_id));
    },
    enabled: !!employer?.id && listings.length > 0,
  });

  // Fetch resident data for candidates
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-for-candidates'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Fetch learning assignments to show completed classes
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['all-learning-assignments'],
    queryFn: () => base44.entities.LearningAssignment.list(),
  });

  if (!employer) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading employer profile...</p>
      </div>
    );
  }

  // Calculate dashboard stats
  const activeListings = listings.filter(l => l.status === 'active').length;
  const totalMatches = allMatches.length;
  const totalHired = allMatches.filter(m => m.status === 'hired').length;

  // Get candidates for selected job
  const selectedJobMatches = selectedJob
    ? allMatches.filter(m => m.job_listing_id === selectedJob.id)
    : [];

  // Enrich matches with resident data
  const enrichedMatches = selectedJobMatches.map(match => {
    const resident = residents.find(r => r.id === match.resident_id);
    const assignments = allAssignments.filter(a => a.resident_id === match.resident_id && (a.status === 'completed' || a.status === 'passed'));
    return {
      ...match,
      resident,
      completedClasses: assignments.length,
    };
  });

  // Group candidates by status
  const candidatesByStatus = {
    recommended: enrichedMatches.filter(m => m.status === 'recommended'),
    applied: enrichedMatches.filter(m => m.status === 'applied'),
    interview_requested: enrichedMatches.filter(m => m.status === 'interview_requested'),
    interview_scheduled: enrichedMatches.filter(m => m.status === 'interview_scheduled'),
    hired: enrichedMatches.filter(m => m.status === 'hired'),
    not_selected: enrichedMatches.filter(m => m.status === 'not_selected'),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Employer Portal" description={`Welcome, ${employer.company_name}`} />

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="jobs">Job Listings</TabsTrigger>
          <TabsTrigger value="profile">Company Profile</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="Total Jobs Posted"
              value={listings.length}
              icon={Briefcase}
            />
            <StatCard
              title="Active Jobs"
              value={activeListings}
              icon={Target}
            />
            <StatCard
              title="Candidates Matched"
              value={totalMatches}
              icon={Users}
            />
            <StatCard
              title="Hires"
              value={totalHired}
              icon={Users}
            />
          </div>

          {/* Job Selection */}
          {listings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select a Job to View Candidates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {listings.map(job => (
                    <button
                      key={job.id}
                      onClick={() => {
                        setSelectedJob(job);
                        setSelectedCandidate(null);
                      }}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        selectedJob?.id === job.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-border hover:bg-muted'
                      }`}
                    >
                      <h3 className="font-medium">{job.title}</h3>
                      <p className="text-xs text-muted-foreground">{job.location}</p>
                      <Badge className="mt-2" variant={job.status === 'active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                      <p className="text-xs mt-2 text-muted-foreground">
                        {allMatches.filter(m => m.job_listing_id === job.id).length} candidates
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Candidate Pipeline for Selected Job */}
          {selectedJob && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Candidates for {selectedJob.title}</h3>
                <Button onClick={() => setSelectedCandidate(null)} variant="outline" size="sm">
                  Close
                </Button>
              </div>

              {/* Pipeline View */}
              <div className="grid grid-cols-3 gap-4">
                <CandidateMatchPanel
                  title="Recommended"
                  candidates={candidatesByStatus.recommended}
                  onSelectCandidate={setSelectedCandidate}
                  selectedCandidateId={selectedCandidate?.id}
                />
                <CandidateMatchPanel
                  title="Interviews"
                  candidates={[
                    ...candidatesByStatus.applied,
                    ...candidatesByStatus.interview_requested,
                    ...candidatesByStatus.interview_scheduled,
                  ]}
                  onSelectCandidate={setSelectedCandidate}
                  selectedCandidateId={selectedCandidate?.id}
                />
                <CandidateMatchPanel
                  title="Outcomes"
                  candidates={[
                    ...candidatesByStatus.hired,
                    ...candidatesByStatus.not_selected,
                  ]}
                  onSelectCandidate={setSelectedCandidate}
                  selectedCandidateId={selectedCandidate?.id}
                />
              </div>

              {/* Candidate Details */}
              {selectedCandidate && (
                <CandidateDetailView
                  candidate={selectedCandidate}
                  onStatusChange={refetchListings}
                  onClose={() => setSelectedCandidate(null)}
                />
              )}
            </div>
          )}

          {listings.length === 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-12 text-center text-muted-foreground">
                <p>No jobs posted yet.</p>
                <p className="text-sm mt-1">Go to Job Listings to create your first job.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Job Listings Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Your Job Listings</h3>
            <Button onClick={() => setJobDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </div>

          <div className="space-y-3">
            {listings.length === 0 ? (
              <Card className="bg-muted/30">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No jobs posted yet.
                </CardContent>
              </Card>
            ) : (
              listings.map(job => {
                const matchCount = allMatches.filter(m => m.job_listing_id === job.id).length;
                return (
                  <Card key={job.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{job.title}</h4>
                          <p className="text-xs text-muted-foreground">{job.location}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {matchCount} candidates matched
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            document.querySelector('[value="dashboard"]').click();
                          }}
                        >
                          View Candidates
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Job Dialog */}
          <JobListingDialog
            open={jobDialogOpen}
            onClose={() => setJobDialogOpen(false)}
            onSaved={() => {
              setJobDialogOpen(false);
              refetchListings();
            }}
            user={user}
            defaultEmployerId={employer.id}
            defaultEmployerName={employer.company_name}
          />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          {showProfileEditor ? (
            <EmployerProfileEditor
              employer={employer}
              onSaved={() => {
                setShowProfileEditor(false);
              }}
            />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Company Profile</CardTitle>
                <Button onClick={() => setShowProfileEditor(true)} variant="outline" size="sm">
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Company Name</p>
                    <p className="text-sm font-medium">{employer.company_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="text-sm font-medium">{employer.industry || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Name</p>
                    <p className="text-sm font-medium">{employer.contact_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{employer.contact_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{employer.contact_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">
                      {employer.city && employer.state ? `${employer.city}, ${employer.state}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}