import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { calculateCoreMetrics, exportMetricsToCSV } from '@/lib/reportingMetrics';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';

const CHART_COLORS = ['#1e3a5f', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Reporting() {
  const [dateRange, setDateRange] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch metrics
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await calculateCoreMetrics(dateRange);
        setMetrics(data);
      } catch (err) {
        console.error('Error calculating metrics:', err);
      }
      setLoading(false);
    };

    fetch();
  }, [dateRange]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading metrics...</div>
      </div>
    );
  }

  const handleExport = () => {
    exportMetricsToCSV(metrics);
  };

  // Prepare barrier chart data
  const barrierChartData = metrics.barriers.mostCommon;

  // Prepare retention chart data
  const retentionData = [
    { name: '30 Days', value: metrics.employment.retention30Days },
    { name: '60 Days', value: metrics.employment.retention60Days },
    { name: '90 Days', value: metrics.employment.retention90Days },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reporting & Outcomes" description="Track resident progress, program success, and outcomes" />

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Date Range:</span>
          <Select value={dateRange || 'all'} onValueChange={(v) => setDateRange(v === 'all' ? null : v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Core Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="barriers">Barriers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="Total Residents"
              value={metrics.residents.totalResidents}
              icon={TrendingUp}
            />
            <StatCard
              title="Active Residents"
              value={metrics.residents.activeResidents}
              icon={TrendingUp}
            />
            <StatCard
              title="Completed Intake"
              value={metrics.residents.completedIntake}
              icon={TrendingUp}
            />
            <StatCard
              title="Avg Job Readiness"
              value={`${metrics.residents.averageJobReadiness}%`}
              icon={TrendingUp}
            />
          </div>

          {/* Program Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Program Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold">{metrics.program.placementRate}%</p>
                  <p className="text-xs text-muted-foreground">Placement Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.program.completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.program.retention30Rate}%</p>
                  <p className="text-xs text-muted-foreground">30-Day Retention</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.program.retention90Rate}%</p>
                  <p className="text-xs text-muted-foreground">90-Day Retention</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employer Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Jobs Posted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.employers.jobsPosted}</p>
                <p className="text-xs text-muted-foreground mt-1">{metrics.employers.activeEmployers} active employers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Placements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.employers.candidatesHired}</p>
                <p className="text-xs text-muted-foreground mt-1">{metrics.employers.matchesCreated} total matches</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              title="Classes Assigned"
              value={metrics.learning.classesAssigned}
              icon={TrendingUp}
            />
            <StatCard
              title="Classes Completed"
              value={metrics.learning.classesCompleted}
              icon={TrendingUp}
            />
            <StatCard
              title="Completion Rate"
              value={`${metrics.learning.completionRate}%`}
              icon={TrendingUp}
            />
            <StatCard
              title="Certificates Issued"
              value={metrics.learning.certificatesIssued}
              icon={TrendingUp}
            />
          </div>

          {/* Completion trends placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Assigned', value: metrics.learning.classesAssigned },
                    { name: 'Completed', value: metrics.learning.classesCompleted },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Residents Placed"
              value={metrics.employment.residentsPlaced}
              icon={TrendingUp}
            />
            <StatCard
              title="Currently Employed"
              value={metrics.employment.activeEmployed}
              icon={TrendingUp}
            />
            {metrics.employment.averageTimeToEmployment && (
              <StatCard
                title="Avg Time to Employment"
                value={`${metrics.employment.averageTimeToEmployment} days`}
                icon={TrendingUp}
              />
            )}
          </div>

          {/* Retention Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Retention Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={retentionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barriers Tab */}
        <TabsContent value="barriers" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Total Barriers"
              value={metrics.barriers.totalBarriers}
              icon={TrendingUp}
            />
            <StatCard
              title="Resolved"
              value={metrics.barriers.resolvedBarriers}
              icon={TrendingUp}
            />
            <StatCard
              title="Resolution Rate"
              value={`${metrics.barriers.resolutionRate}%`}
              icon={TrendingUp}
            />
          </div>

          {/* Most Common Barriers */}
          {barrierChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Common Barriers</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={barrierChartData}
                    layout="vertical"
                    margin={{ left: 200 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={190} />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}