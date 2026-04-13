import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, Calendar, CalendarDays, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AuditAISummary({ run, findings }) {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  const failedSummary = findings
    .filter(f => f.status !== 'passed')
    .map(f => `[${f.severity?.toUpperCase()}] ${f.module_name} / ${f.check_name}: ${f.issue_summary}${f.recommended_fix ? ` FIX: ${f.recommended_fix}` : ''}`)
    .join('\n');

  const generateDaily = async () => {
    setLoadingDaily(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an operations auditor for REJ Pathways Hub, a nonprofit workforce and reentry case management app.

Today's audit found these issues:
${failedSummary || 'No issues found.'}

Generate a DAILY admin to-do list based on these findings. Be specific and actionable.
Format as a markdown numbered list. Include estimated severity/urgency for each item.
Focus on: what needs fixing TODAY to unblock users, protect data, and ensure system stability.`,
    });
    setDaily(typeof res === 'string' ? res : JSON.stringify(res));
    setLoadingDaily(false);
  };

  const generateWeekly = async () => {
    setLoadingWeekly(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an operations auditor for REJ Pathways Hub, a nonprofit workforce and reentry case management app.

Audit findings:
${failedSummary || 'No issues found.'}

Generate a WEEKLY review and cleanup checklist based on these findings and general best practices.
Format with 3 sections in markdown:
1. Data & Record Cleanup
2. User & Access Management
3. Module & Workflow Health

Be concise, practical, and focused on what a program director/admin would actually need to do this week.`,
    });
    setWeekly(typeof res === 'string' ? res : JSON.stringify(res));
    setLoadingWeekly(false);
  };

  if (!run) return (
    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
      <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">Run an audit first to generate AI summaries.</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="font-heading font-semibold text-base">AI-Assisted Audit Summary</h2>

      {/* AI summary from the run itself */}
      {run.ai_summary && (
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" /> Automated Audit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="prose prose-sm max-w-none text-foreground [&>p]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>h3]:uppercase [&>h3]:tracking-wide [&>h3]:text-muted-foreground [&>ul]:space-y-1 [&>ol]:space-y-1">
              <ReactMarkdown>{run.ai_summary}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues count */}
      {findings.filter(f => f.status !== 'passed').length === 0 ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center text-sm text-green-700 font-medium">
            All checks passed. No issues to summarize.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{findings.filter(f => f.status !== 'passed').length} issues found in this audit run — see Findings tab for details and fix guidance.</span>
          </CardContent>
        </Card>
      )}

      {/* Daily */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Daily Action List</CardTitle>
            <Button size="sm" onClick={generateDaily} disabled={loadingDaily} className="h-7 text-xs">
              {loadingDaily ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</> : <><Zap className="w-3.5 h-3.5 mr-1.5" />Generate</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {daily ? (
            <div className="prose prose-sm max-w-none text-foreground [&>ol]:space-y-2 [&>ol>li]:text-sm">
              <ReactMarkdown>{daily}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Click Generate to create a daily action list based on current audit findings.</p>
          )}
        </CardContent>
      </Card>

      {/* Weekly */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-500" /> Weekly Cleanup Checklist</CardTitle>
            <Button size="sm" variant="outline" onClick={generateWeekly} disabled={loadingWeekly} className="h-7 text-xs">
              {loadingWeekly ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</> : <><Zap className="w-3.5 h-3.5 mr-1.5" />Generate</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {weekly ? (
            <div className="prose prose-sm max-w-none text-foreground [&>h2]:text-sm [&>h3]:text-xs [&>ul]:space-y-1 [&>ul>li]:text-sm">
              <ReactMarkdown>{weekly}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Click Generate to create a weekly cleanup checklist based on audit findings.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}