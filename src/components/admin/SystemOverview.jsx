import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, Briefcase, BookOpen, Home, AlertTriangle, CheckSquare, UserCheck, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function SystemOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [residents, users, onboarding, servicePlans, enrollments, auditLogs, housingReferrals, casenotes] = await Promise.all([
      base44.entities.Resident.list('-created_date', 500),
      base44.entities.User.list('-created_date', 200),
      base44.entities.OnboardingRequest.filter({ status: 'pending' }),
      base44.entities.ServicePlan.list('-created_date', 200).catch(() => []),
      base44.entities.LearningAssignment.filter({ status: 'assigned' }).catch(() => []),
      base44.entities.AuditLog.list('-created_date', 20).catch(() => []),
      base44.entities.HousingReferral.filter({ status: 'submitted' }).catch(() => []),
      base44.entities.CaseNote.list('-created_date', 5).catch(() => []),
    ]);

    const activeResidents = residents.filter(r => r.status === 'active' || r.status === 'employed');
    const caseManagers = users.filter(u => u.role === 'case_manager');
    const staff = users.filter(u => u.role === 'staff');
    const probOfficers = users.filter(u => u.role === 'probation_officer');
    const employers = users.filter(u => u.role === 'employer');

    setData({
      totalResidents: residents.length,
      activeResidents: activeResidents.length,
      pendingOnboarding: onboarding.length,
      caseManagers: caseManagers.length,
      staff: staff.length,
      probOfficers: probOfficers.length,
      employers: employers.length,
      openServicePlans: servicePlans.filter(s => s.status === 'active').length,
      pendingEnrollments: enrollments.length,
      pendingReferrals: housingReferrals.length,
      recentActivity: auditLogs,
      recentNotes: casenotes,
    });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const stats = data ? [
    { label: 'Active Residents', value: data.activeResidents, total: data.totalResidents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/residents' },
    { label: 'Pending Onboarding', value: data.pendingOnboarding, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/onboarding', alert: data.pendingOnboarding > 0 },
    { label: 'Case Managers', value: data.caseManagers, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50', link: '/users' },
    { label: 'Active Staff', value: data.staff, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', link: '/users' },
    { label: 'Probation Officers', value: data.probOfficers, icon: UserCheck, color: 'text-slate-600', bg: 'bg-slate-50', link: '/users' },
    { label: 'Employers', value: data.employers, icon: Briefcase, color: 'text-teal-600', bg: 'bg-teal-50', link: '/employers' },
    { label: 'Open Service Plans', value: data.openServicePlans, icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '/case-management' },
    { label: 'Pending Class Assignments', value: data.pendingEnrollments, icon: BookOpen, color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/learning' },
    { label: 'Pending Housing Referrals', value: data.pendingReferrals, icon: Home, color: 'text-rose-600', bg: 'bg-rose-50', link: '/housing-referrals', alert: data.pendingReferrals > 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base">System Overview</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(9)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, total, icon: Icon, color, bg, link, alert }) => (
            <Link key={label} to={link}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${alert ? 'border-orange-300' : ''}`}>
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    {alert ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <Icon className={`w-4 h-4 ${color}`} />}
                  </div>
                  <p className="text-2xl font-bold font-heading">{value ?? '—'}</p>
                  {total !== undefined && <p className="text-[10px] text-muted-foreground">{total} total</p>}
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      {data?.recentActivity?.length > 0 && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Audit Activity</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {data.recentActivity.slice(0, 8).map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-xs border-b last:border-0 pb-2 last:pb-0">
                <span className="text-muted-foreground shrink-0">{new Date(log.created_date).toLocaleString()}</span>
                <span className="font-medium">{log.action || log.event_type}</span>
                <span className="text-muted-foreground truncate">{log.details || log.performed_by}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}