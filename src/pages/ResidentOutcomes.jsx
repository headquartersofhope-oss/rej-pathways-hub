import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { getResidentOutcomes, exportResidentOutcomesToCSV } from '@/lib/reportingMetrics';
import PageHeader from '@/components/shared/PageHeader';
import { Download, Search } from 'lucide-react';

export default function ResidentOutcomes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);

  // Fetch all residents
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-for-outcomes'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Filter residents by search
  const filteredResidents = residents.filter(r =>
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.global_resident_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch outcome details if resident selected
  const { data: outcomeDetails } = useQuery({
    queryKey: ['resident-outcome-details', selectedResident?.id],
    queryFn: () => getResidentOutcomes(selectedResident.id),
    enabled: !!selectedResident?.id,
  });

  const handleExportResident = () => {
    if (outcomeDetails) {
      exportResidentOutcomesToCSV([outcomeDetails], `${outcomeDetails.name}-outcomes.csv`);
    }
  };

  const handleExportAll = async () => {
    const outcomes = [];
    for (const resident of residents) {
      try {
        const outcome = await getResidentOutcomes(resident.id);
        if (outcome) outcomes.push(outcome);
      } catch (err) {
        console.error(`Error fetching outcome for ${resident.id}:`, err);
      }
    }
    exportResidentOutcomesToCSV(outcomes, 'all-resident-outcomes.csv');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Resident Outcomes" description="Track individual resident progress and outcomes" />

      <div className="grid grid-cols-3 gap-6">
        {/* Resident List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredResidents.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No residents found</p>
            ) : (
              filteredResidents.map(resident => (
                <button
                  key={resident.id}
                  onClick={() => setSelectedResident(resident)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedResident?.id === resident.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  <div className="text-sm font-medium">{resident.first_name} {resident.last_name}</div>
                  <div className="text-xs text-muted-foreground">{resident.global_resident_id}</div>
                  <Badge variant="outline" className="mt-1 text-xs">{resident.status}</Badge>
                </button>
              ))
            )}
          </div>

          <Button onClick={handleExportAll} variant="outline" size="sm" className="w-full gap-2">
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>

        {/* Outcome Details */}
        <div className="col-span-2">
          {!selectedResident ? (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Select a resident to view outcomes
              </CardContent>
            </Card>
          ) : !outcomeDetails ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header with export */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{outcomeDetails.name}</h2>
                  <p className="text-sm text-muted-foreground">{outcomeDetails.globalId}</p>
                </div>
                <Button onClick={handleExportResident} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>

              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="learning">Learning</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Intake Date</p>
                        <p className="text-sm font-medium">{outcomeDetails.intakeDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current Status</p>
                        <p className="text-sm font-medium">{outcomeDetails.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Job Readiness Score</p>
                        <p className="text-sm font-medium">{outcomeDetails.jobReadinessScore || 'N/A'}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Learning */}
                <TabsContent value="learning" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Learning Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Classes Assigned</p>
                          <p className="text-2xl font-bold">{outcomeDetails.learning.classesAssigned}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Classes Completed</p>
                          <p className="text-2xl font-bold">{outcomeDetails.learning.classesCompleted}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Certificates</p>
                          <p className="text-2xl font-bold">{outcomeDetails.learning.certificates}</p>
                        </div>
                      </div>

                      {outcomeDetails.learning.details.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-2 uppercase">Completed Classes</p>
                          <div className="space-y-1">
                            {outcomeDetails.learning.details.map((detail, idx) => (
                              <div key={idx} className="text-xs p-2 bg-muted rounded">
                                <p className="font-medium">{detail.classId}</p>
                                <p className="text-muted-foreground">
                                  Completed: {detail.completedDate} | Score: {detail.score || 'N/A'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Employment */}
                <TabsContent value="employment" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Employment Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Job Matches</p>
                        <p className="text-2xl font-bold">{outcomeDetails.employment.jobMatches}</p>
                      </div>

                      {outcomeDetails.employment.hired ? (
                        <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-xs font-medium mb-2">HIRED</p>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Job:</span> {outcomeDetails.employment.hired.job_title}</p>
                            <p><span className="text-muted-foreground">Employer:</span> {outcomeDetails.employment.hired.employer_name}</p>
                            <p><span className="text-muted-foreground">Hired Date:</span> {outcomeDetails.employment.hired.hired_date}</p>
                          </div>
                        </div>
                      ) : outcomeDetails.employment.mostRecentMatch ? (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium mb-2">Most Recent Match</p>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Job:</span> {outcomeDetails.employment.mostRecentMatch.job_title}</p>
                            <p><span className="text-muted-foreground">Status:</span> {outcomeDetails.employment.mostRecentMatch.status}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No job matches yet</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Milestones */}
                <TabsContent value="milestones" className="space-y-4">
                  {outcomeDetails.milestones.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No outcome milestones recorded
                      </CardContent>
                    </Card>
                  ) : (
                    outcomeDetails.milestones.map((milestone, idx) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-base">{milestone.milestone}</CardTitle>
                          <p className="text-xs text-muted-foreground">{milestone.date}</p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Employment Status</p>
                            <p className="text-sm font-medium">{milestone.employmentStatus}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Housing</p>
                            <p className="text-sm font-medium">{milestone.housing}</p>
                          </div>
                          {milestone.notes && (
                            <div>
                              <p className="text-xs text-muted-foreground">Notes</p>
                              <p className="text-sm">{milestone.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}