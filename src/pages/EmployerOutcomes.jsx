import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { getEmployerOutcomes } from '@/lib/reportingMetrics';
import PageHeader from '@/components/shared/PageHeader';
import { Search } from 'lucide-react';

export default function EmployerOutcomes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState(null);

  // Fetch all employers
  const { data: employers = [] } = useQuery({
    queryKey: ['employers-for-outcomes'],
    queryFn: () => base44.entities.Employer.list(),
  });

  // Filter employers
  const filteredEmployers = employers.filter(e =>
    e.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch outcome details if employer selected
  const { data: outcomeDetails } = useQuery({
    queryKey: ['employer-outcome-details', selectedEmployer?.id],
    queryFn: () => getEmployerOutcomes(selectedEmployer.id),
    enabled: !!selectedEmployer?.id,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Employer Outcomes" description="Track employer performance and hiring success" />

      <div className="grid grid-cols-3 gap-6">
        {/* Employer List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search employers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEmployers.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No employers found</p>
            ) : (
              filteredEmployers.map(employer => (
                <button
                  key={employer.id}
                  onClick={() => setSelectedEmployer(employer)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedEmployer?.id === employer.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  <div className="text-sm font-medium">{employer.company_name}</div>
                  <div className="text-xs text-muted-foreground">{employer.industry}</div>
                  <Badge variant="outline" className="mt-1 text-xs">{employer.status}</Badge>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Outcome Details */}
        <div className="col-span-2">
          {!selectedEmployer ? (
            <Card className="bg-muted/30">
              <CardContent className="flex items-center justify-center h-96 text-muted-foreground">
                Select an employer to view outcomes
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
              {/* Header */}
              <div>
                <h2 className="text-xl font-bold">{outcomeDetails.companyName}</h2>
                <p className="text-sm text-muted-foreground">{outcomeDetails.industry}</p>
              </div>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Contact Name</p>
                    <p className="text-sm font-medium">{outcomeDetails.contact || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="text-sm font-medium">{outcomeDetails.industry || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Jobs and Hiring */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Jobs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Posted</p>
                      <p className="text-3xl font-bold">{outcomeDetails.jobsPosted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Currently Active</p>
                      <p className="text-lg font-semibold">{outcomeDetails.activeJobs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jobs with Hires</p>
                      <p className="text-lg font-semibold">{outcomeDetails.jobsWithHires}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hiring Success</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Candidates Matched</p>
                      <p className="text-3xl font-bold">{outcomeDetails.candidatesMatched}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Candidates Hired</p>
                      <p className="text-lg font-semibold">{outcomeDetails.candidatesHired}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hire Rate</p>
                      <p className="text-lg font-semibold">{outcomeDetails.hireRate}%</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Time to Hire */}
              {outcomeDetails.averageTimeToHire && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hiring Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <p className="text-xs text-muted-foreground">Average Time to Hire</p>
                      <p className="text-3xl font-bold">{outcomeDetails.averageTimeToHire} <span className="text-lg font-normal text-muted-foreground">days</span></p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}