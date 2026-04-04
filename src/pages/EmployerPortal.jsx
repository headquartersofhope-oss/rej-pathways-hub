import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Briefcase, Target, Users, Mail, Phone, MapPin, Eye, Pencil } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';

export default function EmployerPortal() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Mock data
  const employer = {
    id: '1',
    company_name: 'Tech Solutions Inc',
    industry: 'Technology',
    contact_name: 'John Smith',
    contact_title: 'HR Manager',
    contact_email: 'john@techsolutions.com',
    contact_phone: '555-0123',
    city: 'San Francisco',
    state: 'CA',
    website: 'www.techsolutions.com'
  };

  const listings = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      status: 'active',
      wage_min: 120000,
      wage_max: 180000,
      wage_type: 'salary',
      schedule_type: 'full_time'
    },
    {
      id: '2',
      title: 'Product Manager',
      location: 'San Francisco, CA',
      status: 'active',
      wage_min: 130000,
      wage_max: 190000,
      wage_type: 'salary',
      schedule_type: 'full_time'
    }
  ];

  const candidates = [
    { id: '1', job_id: '1', name: 'Alice Johnson', status: 'recommended', match_score: 92 },
    { id: '2', job_id: '1', name: 'Bob Williams', status: 'interview_scheduled', match_score: 85 },
    { id: '3', job_id: '1', name: 'Carol Davis', status: 'hired', match_score: 88 },
  ];

  const activeListings = listings.filter(l => l.status === 'active').length;
  const selectedJobMatches = selectedJob ? candidates.filter(c => c.job_id === selectedJob.id) : [];
  
  const candidatesByStatus = {
    recommended: selectedJobMatches.filter(m => m.status === 'recommended'),
    interview_requested: selectedJobMatches.filter(m => m.status === 'interview_requested'),
    interview_scheduled: selectedJobMatches.filter(m => m.status === 'interview_scheduled'),
    hired: selectedJobMatches.filter(m => m.status === 'hired'),
    not_selected: selectedJobMatches.filter(m => m.status === 'not_selected'),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Employer Portal" description={`Welcome, ${employer.company_name}`} />

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="jobs">Job Listings</TabsTrigger>
          <TabsTrigger value="profile">Company Profile</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <StatCard title="Total Jobs Posted" value={listings.length} icon={Briefcase} />
            <StatCard title="Active Jobs" value={activeListings} icon={Target} />
            <StatCard title="Candidates Matched" value={candidates.length} icon={Users} />
            <StatCard title="Hires" value={candidates.filter(c => c.status === 'hired').length} icon={Users} />
          </div>

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
                      onClick={() => setSelectedJob(job.id)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        selectedJob === job.id
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
                        {candidates.filter(c => c.job_id === job.id).length} candidates
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {selectedJob && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Candidate Pipeline</h3>
                <Button onClick={() => setSelectedJob(null)} variant="outline" size="sm">
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recommended ({candidatesByStatus.recommended.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidatesByStatus.recommended.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No candidates</p>
                    ) : (
                      <div className="space-y-2">
                        {candidatesByStatus.recommended.map(m => (
                          <div key={m.id} className="p-2 bg-emerald-50 rounded text-xs font-medium">
                            <p className="truncate">{m.name}</p>
                            <p className="text-emerald-700">Score: {m.match_score}%</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">In Interview ({candidatesByStatus.interview_scheduled.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidatesByStatus.interview_scheduled.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No candidates</p>
                    ) : (
                      <div className="space-y-2">
                        {candidatesByStatus.interview_scheduled.map(m => (
                          <div key={m.id} className="p-2 bg-blue-50 rounded text-xs font-medium">
                            <p className="truncate">{m.name}</p>
                            <p className="text-blue-700">Scheduled</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Hired ({candidatesByStatus.hired.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidatesByStatus.hired.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No candidates</p>
                    ) : (
                      <div className="space-y-2">
                        {candidatesByStatus.hired.map(m => (
                          <div key={m.id} className="p-2 bg-green-50 rounded text-xs font-medium">
                            <p className="truncate">{m.name}</p>
                            <p className="text-green-700">✓ Hired</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Job Listings Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Your Job Listings</h3>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Job
            </Button>
          </div>

          <div className="space-y-3">
            {listings.map(job => {
              const matchCount = candidates.filter(c => c.job_id === job.id).length;
              return (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-xs text-muted-foreground">{job.location}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${job.wage_min?.toLocaleString()} - ${job.wage_max?.toLocaleString()} {job.wage_type}
                        </p>
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
                        onClick={() => setSelectedJob(job.id)}
                        className="gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          {showProfileEditor ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit Company Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Profile editing would be implemented here.</p>
                <Button onClick={() => setShowProfileEditor(false)} variant="outline">
                  Cancel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Company Profile</CardTitle>
                <Button onClick={() => setShowProfileEditor(true)} variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Company Name</p>
                    <p className="font-medium">{employer.company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Industry</p>
                    <p className="font-medium">{employer.industry}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                    <p className="font-medium">{employer.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Title</p>
                    <p className="font-medium">{employer.contact_title}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{employer.contact_email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{employer.contact_phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{employer.city}, {employer.state}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Website</p>
                  <a href={`https://${employer.website}`} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-medium hover:underline">
                    {employer.website}
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}