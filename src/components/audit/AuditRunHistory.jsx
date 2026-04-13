import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';

const STATUS_ICON = {
  passed:  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
  failed:  <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  running: <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin shrink-0" />,
  error:   <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
};

const STATUS_COLOR = {
  passed: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  running: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
};

export default function AuditRunHistory({ onSelectRun }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    setLoading(true);
    const data = await base44.entities.AuditRun.list('-created_date', 50).catch(() => []);
    setRuns(data);
    setLoading(false);
  };

  useEffect(() => { fetchRuns(); }, []);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base">Audit Run History</h2>
        <Button variant="outline" size="sm" onClick={fetchRuns} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No audit runs yet. Go to Run Audit to start your first scan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs.map(run => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run)}
              className="w-full text-left"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 flex items-center gap-3">
                  {STATUS_ICON[run.overall_status] || STATUS_ICON.running}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{run.audit_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <Badge className={`text-[10px] border-0 ${STATUS_COLOR[run.overall_status] || 'bg-gray-100 text-gray-700'}`}>
                        {run.overall_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{run.summary}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span>{run.run_by}</span>
                      <span>{run.completed_at ? new Date(run.completed_at).toLocaleString() : 'In progress'}</span>
                      {run.total_checks > 0 && (
                        <span>{run.passed_checks}/{run.total_checks} passed</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}