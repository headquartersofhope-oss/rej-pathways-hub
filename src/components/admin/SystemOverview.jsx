import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ClipboardList, Briefcase, BookOpen, Home, AlertTriangle, CheckSquare, UserCheck, Activity, RefreshCw, TrendingUp } from 'lucide-react';
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
    { label: 'Active Residents', value: data.activeResidents, total: data.totalResidents, icon: Users, accentColor: '#3B82F6', borderColor: '#1D4ED8', link: '/residents' },
    { label: 'Pending Onboarding', value: data.pendingOnboarding, icon: ClipboardList, accentColor: '#F97316', borderColor: '#C2410C', link: '/admin/onboarding', alert: data.pendingOnboarding > 0 },
    { label: 'Case Managers', value: data.caseManagers, icon: UserCheck, accentColor: '#10B981', borderColor: '#047857', link: '/users' },
    { label: 'Active Staff', value: data.staff, icon: Users, accentColor: '#A855F7', borderColor: '#7E22CE', link: '/users' },
    { label: 'Probation Officers', value: data.probOfficers, icon: UserCheck, accentColor: '#F43F5E', borderColor: '#BE182D', link: '/users' },
    { label: 'Employers', value: data.employers, icon: Briefcase, accentColor: '#14B8A6', borderColor: '#0D9488', link: '/employers' },
    { label: 'Open Service Plans', value: data.openServicePlans, icon: CheckSquare, accentColor: '#F59E0B', borderColor: '#D97706', link: '/case-management' },
    { label: 'Pending Class Assignments', value: data.pendingEnrollments, icon: BookOpen, accentColor: '#6366F1', borderColor: '#4F46E5', link: '/learning' },
    { label: 'Pending Housing Referrals', value: data.pendingReferrals, icon: Home, accentColor: '#EF4444', borderColor: '#DC2626', link: '/housing-referrals', alert: data.pendingReferrals > 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
           <h2 className="font-heading font-bold text-2xl">System Overview</h2>
           <div className="h-8 w-1 bg-amber-400 rounded-full"></div>
         </div>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
           {stats.map(({ label, value, total, icon: Icon, accentColor, borderColor, link, alert }) => (
             <Link key={label} to={link}>
               <Card 
                 className="cursor-pointer border-t-4 transition-all duration-200 overflow-hidden"
                 style={{
                   borderTopColor: alert ? '#EA580C' : accentColor,
                   background: `linear-gradient(135deg, rgba(${parseInt(accentColor.slice(1,3),16)}, ${parseInt(accentColor.slice(3,5),16)}, ${parseInt(accentColor.slice(5,7),16)}, 0.08) 0%, transparent 100%)`,
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.boxShadow = `0 0 20px ${accentColor}4D, 0 4px 12px rgba(0,0,0,0.15)`;
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.boxShadow = '';
                 }}
               >
                 <CardContent className="p-8">
                   <div className="flex items-start justify-between mb-4">
                     <div className="flex-1">
                       {alert ? (
                         <AlertTriangle className="w-5 h-5 text-orange-500 mb-3" />
                       ) : (
                         <Icon className="w-5 h-5 mb-3" style={{ color: accentColor }} />
                       )}
                     </div>
                     <TrendingUp className="w-4 h-4" style={{ color: accentColor }} />
                   </div>
                   <p className="text-5xl font-heading font-bold text-foreground">{value ?? '—'}</p>
                   <p className="text-sm text-muted-foreground mt-2">{label}</p>
                   {total !== undefined && <p className="text-xs text-muted-foreground mt-1">{total} total</p>}
                 </CardContent>
               </Card>
             </Link>
           ))}
         </div>
      )}

      {/* Recent Activity */}
       {data?.recentActivity && data.recentActivity.length > 0 && (
         <Card>
           <CardHeader className="pb-3 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Audit Activity</CardTitle></CardHeader>
           <CardContent className="px-4 pb-4 space-y-2">
             {(data.recentActivity || []).filter(log => log && typeof log === 'object').slice(0, 8).map((log, i) => {
               const timestamp = log?.created_date || log?.timestamp;
               const dateStr = timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
               const action = log?.action || log?.event_type || '—';
               const detail = log?.details || log?.performed_by || '—';
               return (
                 <div key={`log-${i}`} className="flex items-start gap-3 text-xs border-b last:border-0 pb-2 last:pb-0">
                   <span className="text-muted-foreground shrink-0">{dateStr}</span>
                   <span className="font-medium">{action}</span>
                   <span className="text-muted-foreground truncate">{detail}</span>
                 </div>
               );
             })}
           </CardContent>
         </Card>
       )}
    </div>
  );
}