import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import { Clock, CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import OnboardingRequestDetail from '@/components/admin/OnboardingRequestDetail';

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
  approved: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Approved' },
  rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
  needs_info: { icon: HelpCircle, color: 'bg-blue-100 text-blue-800', label: 'Needs Info' },
};

export default function OnboardingQueue() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['onboarding-requests'],
    queryFn: () => base44.entities.OnboardingRequest.list('-submitted_date', 100),
    initialData: [],
  });

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  if (selectedRequest) {
    return (
      <OnboardingRequestDetail
        request={selectedRequest}
        onClose={() => {
          setSelectedRequest(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding Queue"
        subtitle="Review and approve pending access requests"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({requests.filter((r) => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="needs_info" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Needs Info ({requests.filter((r) => r.status === 'needs_info').length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Approved ({requests.filter((r) => r.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({requests.filter((r) => r.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No {activeTab} requests</p>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {request.first_name} {request.last_name}
                      </h3>
                      {request.ai_analysis_complete && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          AI Analyzed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{request.email}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {request.request_type.replace('_', ' ')}
                      </Badge>
                      {request.ai_recommended_role && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Suggested: {request.ai_recommended_role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.submitted_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}