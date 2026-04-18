import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StaffOversightPanel() {
  // Fetch case managers
  const { data: caseManagers = [] } = useQuery({
    queryKey: ['case-managers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'case_manager');
    },
  });

  // Fetch all residents
  const { data: residents = [] } = useQuery({
    queryKey: ['residents-all'],
    queryFn: () => base44.entities.Resident.list(),
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.ServiceTask.list(),
  });

  // Calculate staff stats
  const staffStats = caseManagers.map(cm => {
    const assigned = residents.filter(r => r.assigned_case_manager_id === cm.id).length;
    const housed = residents.filter(r => r.assigned_case_manager_id === cm.id && r.status === 'employed').length;
    const overdue = tasks.filter(t => {
      const cmRes = residents.find(r => r.id === t.resident_id);
      return cmRes?.assigned_case_manager_id === cm.id && new Date(t.due_date) < new Date() && t.status !== 'completed';
    }).length;

    return {
      name: cm.full_name || cm.email,
      assigned,
      housed,
      overdue,
      utilization: assigned > 0 ? Math.round((housed / assigned) * 100) : 0,
    };
  });

  const totalAssigned = staffStats.reduce((sum, s) => sum + s.assigned, 0);
  const avgCaseload = Math.round(totalAssigned / Math.max(staffStats.length, 1));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Staff Oversight & Caseload Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <p className="font-heading font-bold text-lg text-blue-700">{caseManagers.length}</p>
              <p className="text-xs text-blue-600">Case Managers</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
              <p className="font-heading font-bold text-lg text-purple-700">{totalAssigned}</p>
              <p className="text-xs text-purple-600">Total Assigned</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
              <p className="font-heading font-bold text-lg text-emerald-700">{avgCaseload}</p>
              <p className="text-xs text-emerald-600">Avg Caseload</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
              <p className="font-heading font-bold text-lg text-amber-700">
                {staffStats.reduce((sum, s) => sum + s.overdue, 0)}
              </p>
              <p className="text-xs text-amber-600">Overdue Tasks</p>
            </div>
          </div>

          {/* Chart */}
          {staffStats.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Caseload Distribution</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={staffStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" />
                  <Bar dataKey="housed" fill="#10b981" name="Housed/Employed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Staff table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Case Manager</th>
                  <th className="text-center py-2 px-3 font-semibold">Caseload</th>
                  <th className="text-center py-2 px-3 font-semibold">Placed</th>
                  <th className="text-center py-2 px-3 font-semibold">Overdue</th>
                  <th className="text-center py-2 px-3 font-semibold">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map((stat, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{stat.name}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={stat.assigned > 20 ? 'destructive' : 'default'}>
                        {stat.assigned}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-medium">{stat.housed}</td>
                    <td className="py-2 px-3 text-center">
                      {stat.overdue > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {stat.overdue}
                        </Badge>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">{stat.utilization}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {staffStats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No case managers available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}