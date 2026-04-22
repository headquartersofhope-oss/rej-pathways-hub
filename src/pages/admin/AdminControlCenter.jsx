import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, LayoutDashboard, Inbox, FileText, Zap, Wrench, Calendar, BarChart2, Eye, Zap as ZapAuto, Users, Radio, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import SystemOverview from '@/components/admin/SystemOverview';
import QueueCenter from '@/components/admin/QueueCenter';
import NotesOversight from '@/components/admin/NotesOversight';
import AIOpsSummary from '@/components/admin/AIOpsSummary';
import DiagnosticsPanel from '@/components/admin/DiagnosticsPanel';
import ModuleQuickAccess from '@/components/admin/ModuleQuickAccess';
import RolePreviewPanel from '@/components/admin/RolePreviewPanel';
import AutoAssignmentControl from '@/components/admin/AutoAssignmentControl';
import TeamManagement from '@/components/admin/TeamManagement';
import { useNavigate } from 'react-router-dom';

export default function AdminControlCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [govTestStatus, setGovTestStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [govTestMessage, setGovTestMessage] = useState('');

  const handleGovernanceTest = async () => {
    setGovTestStatus('loading');
    setGovTestMessage('');
    try {
      const res = await base44.functions.invoke('sendGovernanceWebhook', {
        event_type: 'connection_test',
        event_data: { tested_by: user?.email, timestamp: new Date().toISOString() },
      });
      if (res.data?.success) {
        setGovTestStatus('success');
        setGovTestMessage(`Connected — Governance OS responded ${res.data.status}`);
      } else {
        setGovTestStatus('error');
        setGovTestMessage(res.data?.response?.raw || res.data?.error || 'Unexpected response');
      }
    } catch (err) {
      setGovTestStatus('error');
      setGovTestMessage(err.message || 'Request failed');
    }
  };

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  const activeTeamCount = teamMembers.filter(m => m.data?.status === 'active').length;

  useEffect(() => {
    if (user && !['admin', 'user', 'super_admin', 'org_admin'].includes(user.role)) {
      navigate('/');
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">Admin Control Center</h1>
              <p className="text-xs text-muted-foreground">Full operational visibility · Admin only</p>
            </div>
          </div>
          {/* Governance OS Connection Test */}
          <div className="flex items-center gap-3">
            {govTestStatus === 'success' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> {govTestMessage}
              </span>
            )}
            {govTestStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4" /> {govTestMessage}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleGovernanceTest}
              disabled={govTestStatus === 'loading'}
              className="gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              {govTestStatus === 'loading'
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Radio className="w-3.5 h-3.5" />
              }
              Send Test to Governance OS
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
       <div className="flex-1 overflow-hidden">
         <Tabs defaultValue="overview" className="flex flex-col h-full">
           <div className="border-b px-6" style={{ backgroundColor: '#1C2128' }}>
            <TabsList className="h-10 bg-transparent gap-1 p-0">
              {[
                { value: 'overview', label: 'Overview', icon: LayoutDashboard },
                { value: 'team', label: 'Team Management', icon: Users, badge: activeTeamCount },
                { value: 'queues', label: 'Queues', icon: Inbox },
                { value: 'notes', label: 'Notes', icon: FileText },
                { value: 'ai-ops', label: 'AI Ops', icon: Zap },
                { value: 'modules', label: 'Modules', icon: BarChart2 },
                { value: 'auto-assign', label: 'Auto-Assign', icon: ZapAuto },
                { value: 'role-preview', label: 'Role Preview', icon: Eye },
                { value: 'diagnostics', label: 'Diagnostics', icon: Wrench },
              ].map(({ value, label, icon: Icon, badge }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3 flex items-center gap-2"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                  {badge !== undefined && (
                    <Badge className="ml-1 bg-amber-500/20 text-amber-300 h-5 px-1.5 text-xs font-semibold">
                      {badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="m-0 p-6">
              <SystemOverview />
            </TabsContent>
            <TabsContent value="team" className="m-0 p-6">
              <TeamManagement />
            </TabsContent>
            <TabsContent value="queues" className="m-0 p-6">
              <QueueCenter />
            </TabsContent>
            <TabsContent value="notes" className="m-0 p-6">
              <NotesOversight />
            </TabsContent>
            <TabsContent value="ai-ops" className="m-0 p-6">
              <AIOpsSummary />
            </TabsContent>
            <TabsContent value="modules" className="m-0 p-6">
              <ModuleQuickAccess />
            </TabsContent>
            <TabsContent value="auto-assign" className="m-0 p-6">
              <div className="space-y-6">
                <AutoAssignmentControl organizationId={user?.organization_id} />
              </div>
            </TabsContent>
            <TabsContent value="role-preview" className="m-0 p-6">
              <div className="space-y-6">
                <RolePreviewPanel currentUser={user} onPreviewChange={() => {}} />
              </div>
            </TabsContent>
            <TabsContent value="diagnostics" className="m-0 p-6">
              <DiagnosticsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}