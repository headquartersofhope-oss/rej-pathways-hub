import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, RefreshCw, Calendar, CalendarDays, AlertTriangle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIOpsSummary() {
  const [daily, setDaily] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [context, setContext] = useState(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const fetchContext = async () => {
    setLoadingCtx(true);
    const [residents, onboarding, userAccounts, assignments, servicePlans, referrals] = await Promise.all([
      base44.entities.Resident.list('-created_date', 200).catch(() => []),
      base44.entities.OnboardingRequest.filter({ status: 'pending' }).catch(() => []),
      base44.entities.UserAccount.list('-created_date', 100).catch(() => []),
      base44.entities.LearningAssignment.list('-created_date', 200).catch(() => []),
      base44.entities.ServicePlan.list('-created_date', 100).catch(() => []),
      base44.entities.HousingReferral.list('-created_date', 50).catch(() => []),
    ]);

    const today = new Date();
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stalled = residents.filter(r => {
      if (!r.updated_date) return false;
      return new Date(r.updated_date) < weekAgo && r.status === 'active';
    });

    const overdueTasks = assignments.filter(a => {
      return a.due_date && new Date(a.due_date) < today && a.status === 'assigned';
    });

    const pendingActivations = userAccounts.filter(a => a.status === 'invited');
    const moreInfoReferrals = referrals.filter(r => r.status === 'more_information_requested');
    const stalledReferrals = referrals.filter(r => r.status === 'submitted' && new Date(r.referral_date) < weekAgo);

    const ctx = {
      totalResidents: residents.length,
      activeResidents: residents.filter(r => r.status === 'active').length,
      pendingOnboarding: onboarding.length,
      pendingActivations: pendingActivations.length,
      stalledResidents: stalled.length,
      overdueAssignments: overdueTasks.length,
      moreInfoReferrals: moreInfoReferrals.length,
      stalledReferrals: stalledReferrals.length,
      activeServicePlans: servicePlans.filter(s => s.status === 'active').length,
      today: today.toLocaleDateString(),
    };
    setContext(ctx);
    setLoadingCtx(false);
    return ctx;
  };

  useEffect(() => { fetchContext(); }, []);

  const generateDaily = async () => {
    if (!context) return;
    setLoadingDaily(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an operations assistant for a nonprofit workforce development and reentry program called REJ Pathways Hub.
      
Today is ${context.today}. Based on this operational snapshot, generate a focused DAILY priorities list:

Data:
- Active residents: ${context.activeResidents}
- Pending onboarding approvals: ${context.pendingOnboarding}
- Pending activations (invites not yet accepted): ${context.pendingActivations}
- Residents with no progress in 7+ days: ${context.stalledResidents}
- Overdue class assignments: ${context.overdueAssignments}
- Housing referrals needing more info: ${context.moreInfoReferrals}
- Housing referrals submitted 7+ days ago with no update: ${context.stalledReferrals}
- Active service plans: ${context.activeServicePlans}

Generate 5-8 concise daily action items. Format as a markdown list. Be direct and operational.
Focus on: approvals needed, activation follow-ups, stalled residents, overdue items.`,
    });
    setDaily(res);
    setLoadingDaily(false);
  };

  const generateWeekly = async () => {
    if (!context) return;
    setLoadingWeekly(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an operations assistant for a nonprofit workforce development and reentry program called REJ Pathways Hub.
      
Today is ${context.today}. Based on this operational snapshot, generate a WEEKLY review checklist:

Data:
- Total residents: ${context.totalResidents} (${context.activeResidents} active)
- Pending onboarding approvals: ${context.pendingOnboarding}
- Pending activations: ${context.pendingActivations}
- Residents stalled (no progress 7+ days): ${context.stalledResidents}
- Overdue class assignments: ${context.overdueAssignments}
- Housing referrals needing info: ${context.moreInfoReferrals}
- Stalled housing referrals (7+ days): ${context.stalledReferrals}
- Active service plans: ${context.activeServicePlans}

Generate a structured weekly review checklist with 3 sections:
1. People & Caseload Review
2. Referral & Housing Review  
3. System & Data Hygiene

Format as markdown with headers and bullet lists. Keep it practical for a program director.`,
    });
    setWeekly(res);
    setLoadingWeekly(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base">AI Operations Summary</h2>
        <Button variant="outline" size="sm" onClick={fetchContext} disabled={loadingCtx}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingCtx ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Context Snapshot */}
      {!loadingCtx && context && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Live Data Snapshot — {context.today}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Active Residents', value: context.activeResidents, alert: false },
                { label: 'Pending Approvals', value: context.pendingOnboarding, alert: context.pendingOnboarding > 0 },
                { label: 'Pending Activations', value: context.pendingActivations, alert: context.pendingActivations > 0 },
                { label: 'Stalled Residents', value: context.stalledResidents, alert: context.stalledResidents > 0 },
                { label: 'Overdue Assignments', value: context.overdueAssignments, alert: context.overdueAssignments > 0 },
                { label: 'Referrals Needing Info', value: context.moreInfoReferrals, alert: context.moreInfoReferrals > 0 },
                { label: 'Stalled Referrals', value: context.stalledReferrals, alert: context.stalledReferrals > 0 },
                { label: 'Active Service Plans', value: context.activeServicePlans, alert: false },
              ].map(({ label, value, alert }) => (
                <div key={label} className={`rounded-lg px-2 py-1.5 flex items-center gap-2 ${alert && value > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-card border'}`}>
                  {alert && value > 0 ? <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" /> : <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                  <div>
                    <p className="font-bold">{value}</p>
                    <p className="text-muted-foreground leading-tight">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Daily Priorities</CardTitle>
            <Button size="sm" onClick={generateDaily} disabled={loadingDaily || loadingCtx} className="h-7 text-xs">
              {loadingDaily ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</> : <><Zap className="w-3.5 h-3.5 mr-1.5" />Generate</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {daily ? (
            <div className="prose prose-sm max-w-none text-foreground [&>ul]:space-y-1 [&>ul>li]:text-sm">
              <ReactMarkdown>{typeof daily === 'string' ? daily : JSON.stringify(daily)}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Click Generate to get today's AI-assisted priority list.</p>
          )}
        </CardContent>
      </Card>

      {/* Weekly */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-500" /> Weekly Review Checklist</CardTitle>
            <Button size="sm" variant="outline" onClick={generateWeekly} disabled={loadingWeekly || loadingCtx} className="h-7 text-xs">
              {loadingWeekly ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</> : <><Zap className="w-3.5 h-3.5 mr-1.5" />Generate</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {weekly ? (
            <div className="prose prose-sm max-w-none text-foreground [&>h2]:text-sm [&>h3]:text-sm [&>ul]:space-y-1 [&>ul>li]:text-sm">
              <ReactMarkdown>{typeof weekly === 'string' ? weekly : JSON.stringify(weekly)}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Click Generate to get this week's AI-assisted review checklist.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}