import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, LayoutDashboard, Inbox, FileText, Zap, Wrench, Calendar, BarChart2 } from 'lucide-react';
import SystemOverview from '@/components/admin/SystemOverview';
import QueueCenter from '@/components/admin/QueueCenter';
import NotesOversight from '@/components/admin/NotesOversight';
import AIOpsSummary from '@/components/admin/AIOpsSummary';
import DiagnosticsPanel from '@/components/admin/DiagnosticsPanel';
import ModuleQuickAccess from '@/components/admin/ModuleQuickAccess';
import { useNavigate } from 'react-router-dom';

export default function AdminControlCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl">Admin Control Center</h1>
            <p className="text-xs text-muted-foreground">Full operational visibility · Admin only</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="flex flex-col h-full">
          <div className="border-b bg-card px-6">
            <TabsList className="h-10 bg-transparent gap-1 p-0">
              {[
                { value: 'overview', label: 'Overview', icon: LayoutDashboard },
                { value: 'queues', label: 'Queues', icon: Inbox },
                { value: 'notes', label: 'Notes', icon: FileText },
                { value: 'ai-ops', label: 'AI Ops', icon: Zap },
                { value: 'modules', label: 'Modules', icon: BarChart2 },
                { value: 'diagnostics', label: 'Diagnostics', icon: Wrench },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3"
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="m-0 p-6">
              <SystemOverview />
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
            <TabsContent value="diagnostics" className="m-0 p-6">
              <DiagnosticsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}