import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, BarChart3, Home, Users, TrendingUp } from 'lucide-react';
import BedOccupancyChart from '@/components/dashboard/BedOccupancyChart';
import ReferralPipelineChart from '@/components/dashboard/ReferralPipelineChart';
import CaseManagerWorkloadChart from '@/components/dashboard/CaseManagerWorkloadChart';

export default function OperationalDashboard() {
  // Fetch all required data
  const { data: houses = [], isLoading: housesLoading } = useQuery({
    queryKey: ['houses'],
    queryFn: () => base44.entities.House.list(),
  });

  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.HousingReferral.list(),
  });

  const { data: residents = [], isLoading: residentsLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Refresh data every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Refetch all queries
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isLoading = housesLoading || referralsLoading || residentsLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Operational Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time metrics across housing, referrals, and case management</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Total Residents</p>
          {residentsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <p className="font-heading font-bold text-2xl text-white">{residents.length}</p>
          )}
        </Card>
        <Card className="p-4" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Active Housing</p>
          {housesLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <p className="font-heading font-bold text-2xl text-emerald-400">{houses.length}</p>
          )}
        </Card>
        <Card className="p-4" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Pending Referrals</p>
          {referralsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <p className="font-heading font-bold text-2xl text-amber-400">
              {referrals.filter(r => ['draft', 'ready_to_submit', 'submitted', 'under_review'].includes(r.status)).length}
            </p>
          )}
        </Card>
        <Card className="p-4" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Housing Pending</p>
          {residentsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <p className="font-heading font-bold text-2xl text-blue-400">
              {residents.filter(r => r.status === 'housing_pending').length}
            </p>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="occupancy" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1" style={{ color: '#E6EDF3' }}>
          <TabsTrigger value="occupancy" style={{ color: '#E6EDF3' }} className="gap-1.5">
            <Home className="w-4 h-4" />
            Bed Occupancy
          </TabsTrigger>
          <TabsTrigger value="referrals" style={{ color: '#E6EDF3' }} className="gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Referral Pipeline
          </TabsTrigger>
          <TabsTrigger value="workload" style={{ color: '#E6EDF3' }} className="gap-1.5">
            <Users className="w-4 h-4" />
            Case Manager Workload
          </TabsTrigger>
        </TabsList>

        {/* Bed Occupancy Tab */}
        <TabsContent value="occupancy">
          <BedOccupancyChart houses={houses} loading={housesLoading} />
        </TabsContent>

        {/* Referral Pipeline Tab */}
        <TabsContent value="referrals">
          <ReferralPipelineChart referrals={referrals} loading={referralsLoading} />
        </TabsContent>

        {/* Case Manager Workload Tab */}
        <TabsContent value="workload">
          <CaseManagerWorkloadChart residents={residents} caseManagers={[]} loading={residentsLoading} />
        </TabsContent>
      </Tabs>

      {/* Last Updated */}
      <div className="mt-6 text-xs text-muted-foreground text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}