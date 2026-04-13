import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Activity, History, Zap, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuditRunner from '@/components/audit/AuditRunner';
import AuditRunHistory from '@/components/audit/AuditRunHistory';
import AuditFindingsTable from '@/components/audit/AuditFindingsTable';
import AuditAISummary from '@/components/audit/AuditAISummary';

export default function AuditCenter() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [latestRun, setLatestRun] = useState(null);
  const [latestFindings, setLatestFindings] = useState([]);
  const [tab, setTab] = useState('run');

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') navigate('/');
  }, [currentUser]);

  const handleRunComplete = async (runId) => {
    const findings = await base44.entities.AuditFinding.filter({ audit_run_id: runId }).catch(() => []);
    const run = await base44.entities.AuditRun.get(runId).catch(() => null);
    setLatestRun(run);
    setLatestFindings(findings);
    setTab('findings');
  };

  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl">Audit & Diagnostics Center</h1>
            <p className="text-xs text-muted-foreground">Internal system health · Admin only · Repeatable scans</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
          <div className="border-b bg-card px-6">
            <TabsList className="h-10 bg-transparent gap-1 p-0">
              {[
                { value: 'run', label: 'Run Audit', icon: Zap },
                { value: 'findings', label: 'Findings', icon: FileText },
                { value: 'ai', label: 'AI Summary', icon: Activity },
                { value: 'history', label: 'Audit History', icon: History },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs px-3">
                  <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
                  {value === 'findings' && latestFindings.filter(f => f.status !== 'passed').length > 0 && (
                    <span className="ml-1.5 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      {latestFindings.filter(f => f.status !== 'passed').length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="run" className="m-0 p-6">
              <AuditRunner onComplete={handleRunComplete} />
            </TabsContent>
            <TabsContent value="findings" className="m-0 p-6">
              <AuditFindingsTable run={latestRun} findings={latestFindings} />
            </TabsContent>
            <TabsContent value="ai" className="m-0 p-6">
              <AuditAISummary run={latestRun} findings={latestFindings} />
            </TabsContent>
            <TabsContent value="history" className="m-0 p-6">
              <AuditRunHistory onSelectRun={async (run) => {
                const findings = await base44.entities.AuditFinding.filter({ audit_run_id: run.id }).catch(() => []);
                setLatestRun(run);
                setLatestFindings(findings);
                setTab('findings');
              }} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}