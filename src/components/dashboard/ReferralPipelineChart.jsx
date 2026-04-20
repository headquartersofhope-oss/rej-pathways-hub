import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ReferralPipelineChart({ referrals = [], loading = false }) {
  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center h-96" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </Card>
    );
  }

  // Count referrals by status
  const statusCounts = {
    draft: 0,
    ready_to_submit: 0,
    submitted: 0,
    received: 0,
    under_review: 0,
    more_information_requested: 0,
    approved: 0,
    denied: 0,
    waitlisted: 0,
    closed: 0,
  };

  referrals.forEach(ref => {
    const status = ref.status || 'draft';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  });

  // Pipeline stages
  const pipelineStages = [
    { name: 'Draft', value: statusCounts.draft, color: '#94A3B8' },
    { name: 'Ready', value: statusCounts.ready_to_submit, color: '#60A5FA' },
    { name: 'Submitted', value: statusCounts.submitted, color: '#FBBF24' },
    { name: 'In Review', value: statusCounts.under_review, color: '#A78BFA' },
    { name: 'Approved', value: statusCounts.approved, color: '#34D399' },
    { name: 'Denied', value: statusCounts.denied, color: '#F87171' },
  ];

  // Outcome counts
  const outcomeData = [
    { name: 'Approved', count: statusCounts.approved, color: '#34D399' },
    { name: 'Denied', count: statusCounts.denied, color: '#F87171' },
    { name: 'Waitlisted', count: statusCounts.waitlisted, color: '#FBBF24' },
    { name: 'In Progress', count: statusCounts.under_review + statusCounts.submitted + statusCounts.ready_to_submit, color: '#60A5FA' },
  ];

  const totalReferrals = referrals.length;
  const approvalRate = totalReferrals > 0 ? Math.round((statusCounts.approved / totalReferrals) * 100) : 0;
  const conversionRate = totalReferrals > 0 ? Math.round(((statusCounts.approved + statusCounts.denied) / totalReferrals) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Pipeline Status */}
      <Card className="p-6" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Referral Pipeline Status</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pipelineStages}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B949E' }} />
            <YAxis tick={{ fontSize: 12, fill: '#8B949E' }} />
            <Tooltip contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }} />
            <Bar dataKey="value" fill="#F59E0B" name="Referrals" radius={[4, 4, 0, 0]}>
              {pipelineStages.map((entry, idx) => (
                <Bar key={`bar-${idx}`} dataKey="value" fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Outcome Distribution */}
      <Card className="p-6" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Referral Outcomes</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={outcomeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B949E' }} />
            <YAxis tick={{ fontSize: 12, fill: '#8B949E' }} />
            <Tooltip contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }} />
            <Bar dataKey="count" fill="#F59E0B" name="Count" radius={[4, 4, 0, 0]}>
              {outcomeData.map((entry, idx) => (
                <Bar key={`outcome-${idx}`} dataKey="count" fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Referrals</p>
          <p className="font-heading font-bold text-2xl text-white mt-1">{totalReferrals}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Approval Rate</p>
          <p className="font-heading font-bold text-2xl text-emerald-400 mt-1">{approvalRate}%</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Conversion Rate</p>
          <p className="font-heading font-bold text-2xl text-blue-400 mt-1">{conversionRate}%</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">In Progress</p>
          <p className="font-heading font-bold text-2xl text-amber-400 mt-1">
            {statusCounts.submitted + statusCounts.under_review + statusCounts.more_information_requested}
          </p>
        </div>
      </div>
    </div>
  );
}