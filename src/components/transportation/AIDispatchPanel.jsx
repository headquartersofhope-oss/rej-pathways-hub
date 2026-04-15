import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, AlertTriangle, Navigation2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIDispatchPanel({ requests, drivers, vehicles, recurringRides }) {
  const [loading, setLoading] = useState(null);
  const [results, setResults] = useState({});

  const today = new Date().toISOString().split('T')[0];
  const todayRides = requests.filter(r => r.requested_date === today);
  const unassigned = todayRides.filter(r => !r.assigned_driver);
  const pending = requests.filter(r => r.status === 'pending');
  const noShows = requests.filter(r => r.status === 'no_show');

  const generate = async (key, prompt) => {
    setLoading(key);
    const res = await base44.integrations.Core.InvokeLLM({ prompt }).catch(() => null);
    setResults(prev => ({ ...prev, [key]: typeof res === 'string' ? res : JSON.stringify(res) }));
    setLoading(null);
  };

  const PANELS = [
    {
      key: 'dispatch',
      icon: Navigation2,
      color: 'text-blue-600',
      title: 'Today\'s Dispatch Recommendations',
      description: 'AI route grouping and driver assignment suggestions',
      prompt: `You are a transportation dispatcher for a nonprofit reentry program. 

Today's date: ${today}
Active drivers: ${drivers.filter(d=>d.status==='active').map(d=>`${d.full_name} (shift: ${d.shift_start}-${d.shift_end}, vehicle: ${d.assigned_vehicle_name||'none'})`).join(', ') || 'None'}
Available vehicles: ${vehicles.filter(v=>v.status==='active'||v.status==='in_use').map(v=>`${v.name} (${v.capacity} seats)`).join(', ') || 'None'}
Today's unassigned rides (${unassigned.length}):
${unassigned.map(r=>`- ${r.resident_name}: pickup at ${r.requested_time||'TBD'} → ${r.destination_address||'TBD'} (${r.request_type})`).join('\n') || 'None'}
All today's rides (${todayRides.length}):
${todayRides.map(r=>`- ${r.resident_name}: ${r.requested_time||'TBD'} → ${r.destination_address||'TBD'} | Driver: ${r.assigned_driver||'UNASSIGNED'}`).join('\n') || 'None'}

Recommend:
1. Which driver should handle which rides today (grouped by geographic proximity/timing)
2. Suggested pickup order for each driver
3. Any scheduling conflicts or capacity issues
4. Any rides that may need rescheduling

Be specific and practical. Use markdown.`
    },
    {
      key: 'noshow',
      icon: AlertTriangle,
      color: 'text-orange-600',
      title: 'No-Show Pattern Analysis',
      description: 'Identify participants with recurring no-shows',
      prompt: `You are a transportation operations analyst for a nonprofit reentry program.

No-show records (${noShows.length} total):
${noShows.map(r=>`- ${r.resident_name}: ${r.requested_date} (${r.request_type}) | Reason: ${r.no_show_reason||'none recorded'}`).join('\n') || 'No no-shows recorded'}

Recurring ride plans (${recurringRides.length}):
${recurringRides.map(r=>`- ${r.resident_name}: ${r.recurrence_days?.join(',')} @ ${r.pickup_time} → ${r.destination_address}`).join('\n') || 'None'}

Analyze:
1. Participants with 2+ no-shows (call out names)
2. Whether recurring rides are at risk
3. Recommended interventions (call reminders, schedule changes, case manager alerts)
4. Trips that should be deprioritized based on reliability

Use markdown. Be direct.`
    },
    {
      key: 'scale',
      icon: Zap,
      color: 'text-purple-600',
      title: 'Scaling Readiness Report',
      description: 'Can the fleet handle 50-80 recurring riders?',
      prompt: `You are a transportation operations consultant reviewing a nonprofit reentry program's fleet.

Current state:
- Active drivers: ${drivers.filter(d=>d.status==='active').length}
- Active vehicles: ${vehicles.filter(v=>v.status==='active'||v.status==='in_use').length}
- Total vehicle capacity: ${vehicles.reduce((s,v)=>s+(v.capacity||0),0)} seats
- Active recurring ride plans: ${recurringRides.filter(r=>r.status==='active').length}
- Total ride requests all time: ${requests.length}
- Pending requests right now: ${pending.length}
- Drivers with shifts configured: ${drivers.filter(d=>d.shift_start).length}

Target: Scale to 50-80 recurring riders.

Analyze:
1. Current capacity vs. target (can current fleet handle the load?)
2. Minimum additional drivers and vehicles needed
3. Route optimization opportunities (shared rides, clustering by neighborhood)
4. Operational risks to address before scaling
5. Concrete next steps in priority order

Be specific. Use markdown tables where helpful.`
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-semibold text-base">AI Dispatch Intelligence</h3>
        <p className="text-xs text-muted-foreground mt-0.5">AI recommendations are advisory only. Always verify before dispatching.</p>
      </div>
      {PANELS.map(({ key, icon: Icon, color, title, description, prompt }) => (
        <Card key={key} className="border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                {title}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => generate(key, prompt)} disabled={!!loading} className="h-7 text-xs">
                {loading === key ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Analyzing...</> : <><Zap className="w-3 h-3 mr-1.5" />Run</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {results[key] ? (
              <div className="prose prose-sm max-w-none text-foreground [&>*]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>h3]:font-semibold [&>p]:leading-relaxed">
                <ReactMarkdown>{results[key]}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Click Run to generate analysis.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}