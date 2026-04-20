import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CaseManagerWorkloadChart({ residents = [], caseManagers = [], loading = false }) {
  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center h-96" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </Card>
    );
  }

  // Build workload data by case manager
  const workloadMap = {};
  
  residents.forEach(resident => {
    const cmId = resident.assigned_case_manager_id;
    const cmName = resident.assigned_case_manager || 'Unassigned';
    
    if (!workloadMap[cmId]) {
      workloadMap[cmId] = {
        id: cmId,
        name: cmName,
        activeResidents: 0,
        housingPending: 0,
        openTasks: 0,
        averageBarriers: 0,
        riskLevel: { low: 0, medium: 0, high: 0 },
      };
    }

    const cm = workloadMap[cmId];
    
    // Count residents by status
    if (['active', 'pre_intake', 'housing_eligible', 'housing_pending'].includes(resident.status)) {
      cm.activeResidents++;
    }
    
    if (resident.status === 'housing_pending') {
      cm.housingPending++;
    }

    // Risk distribution
    const riskLevel = resident.risk_level || 'low';
    cm.riskLevel[riskLevel]++;
  });

  const workloadData = Object.values(workloadMap).sort((a, b) => b.activeResidents - a.activeResidents);

  // Calculate metrics
  const totalAssignedResidents = workloadData.reduce((sum, cm) => sum + cm.activeResidents, 0);
  const avgCaseload = workloadData.length > 0 ? Math.round(totalAssignedResidents / workloadData.length) : 0;
  const maxCaseload = workloadData.length > 0 ? Math.max(...workloadData.map(cm => cm.activeResidents)) : 0;
  const unassignedCount = residents.filter(r => !r.assigned_case_manager_id).length;

  // Workload distribution for scatter (workload vs risk)
  const scatterData = workloadData.map(cm => ({
    name: cm.name,
    x: cm.activeResidents,
    y: cm.riskLevel.high + cm.riskLevel.medium * 0.5,
    fill: cm.activeResidents > maxCaseload * 0.8 ? '#F87171' : cm.activeResidents > maxCaseload * 0.5 ? '#FBBF24' : '#34D399',
  }));

  return (
    <div className="space-y-6">
      {/* Caseload by Manager */}
      <Card className="p-6" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Active Residents by Case Manager</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={workloadData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B949E' }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12, fill: '#8B949E' }} />
            <Tooltip contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }} />
            <Bar dataKey="activeResidents" fill="#F59E0B" name="Active Residents" radius={[4, 4, 0, 0]}>
              {workloadData.map((cm, idx) => {
                const percentage = maxCaseload > 0 ? cm.activeResidents / maxCaseload : 0;
                const color = percentage > 0.8 ? '#F87171' : percentage > 0.5 ? '#FBBF24' : '#34D399';
                return <Bar key={`cm-${idx}`} dataKey="activeResidents" fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Workload vs Risk Scatter */}
      {workloadData.length > 0 && (
        <Card className="p-6" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          <h3 className="font-heading font-bold text-lg text-foreground mb-4">Workload vs Risk Level</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
              <XAxis 
                dataKey="x" 
                name="Caseload" 
                tick={{ fontSize: 12, fill: '#8B949E' }}
                label={{ value: 'Active Residents', position: 'insideBottomRight', offset: -10, fill: '#8B949E' }}
              />
              <YAxis 
                dataKey="y" 
                name="Risk Score"
                tick={{ fontSize: 12, fill: '#8B949E' }}
                label={{ value: 'High-Risk Residents (weighted)', angle: -90, position: 'insideLeft', fill: '#8B949E' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
                formatter={(value) => value.toFixed(1)}
              />
              <Scatter name="Case Managers" data={scatterData}>
                {scatterData.map((entry, idx) => (
                  <Scatter key={`scatter-${idx}`} name={entry.name} dataKey="y" fill={entry.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Workload Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Active</p>
          <p className="font-heading font-bold text-2xl text-white mt-1">{totalAssignedResidents}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Avg Caseload</p>
          <p className="font-heading font-bold text-2xl text-blue-400 mt-1">{avgCaseload}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Max Caseload</p>
          <p className="font-heading font-bold text-2xl text-amber-400 mt-1">{maxCaseload}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Unassigned</p>
          <p className="font-heading font-bold text-2xl text-red-400 mt-1">{unassignedCount}</p>
        </div>
      </div>

      {/* Case Manager Details Table */}
      {workloadData.length > 0 && (
        <Card className="p-6 overflow-x-auto" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          <h3 className="font-heading font-bold text-lg text-foreground mb-4">Case Manager Details</h3>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #30363D' }}>
                <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Name</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-semibold">Active</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-semibold">Housing Pending</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-semibold">High Risk</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-semibold">Medium Risk</th>
              </tr>
            </thead>
            <tbody>
              {workloadData.map(cm => (
                <tr key={cm.id} style={{ borderBottom: '1px solid #30363D' }}>
                  <td className="py-2 px-3 text-foreground">{cm.name}</td>
                  <td className="text-center py-2 px-3 text-white font-semibold">{cm.activeResidents}</td>
                  <td className="text-center py-2 px-3 text-amber-400">{cm.housingPending}</td>
                  <td className="text-center py-2 px-3 text-red-400">{cm.riskLevel.high}</td>
                  <td className="text-center py-2 px-3 text-yellow-400">{cm.riskLevel.medium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}