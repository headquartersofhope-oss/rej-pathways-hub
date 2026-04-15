import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DollarSign, Plus, Calendar, AlertTriangle, CheckCircle, TrendingUp, X, Edit, Search, FileText } from 'lucide-react';

const STATUS_COLORS = {
  prospect: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  submitted: 'bg-indigo-100 text-indigo-800',
  awarded: 'bg-emerald-100 text-emerald-800',
  active: 'bg-teal-100 text-teal-800',
  reporting_due: 'bg-orange-100 text-orange-800',
  closed: 'bg-slate-100 text-slate-500',
  denied: 'bg-red-100 text-red-800',
};

function GrantModal({ grant, onClose, onSave }) {
  const [form, setForm] = useState(grant || {
    grant_name: '', funder_name: '', funder_type: 'foundation', grant_type: 'services',
    status: 'prospect', amount_requested: '', amount_awarded: '',
    application_deadline: '', award_date: '', start_date: '', end_date: '',
    report_due_date: '', grant_manager_name: '', participant_target: '',
    outcomes_required: '', notes: ''
  });

  const field = (label, key, type = 'text', opts = null) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {opts ? (
        <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})}>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[60px]"
          value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} />
      ) : (
        <Input type={type} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold">{grant ? 'Edit Grant' : 'Add Grant'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          <div className="col-span-2">{field('Grant Name *', 'grant_name')}</div>
          <div className="col-span-2">{field('Funder / Organization *', 'funder_name')}</div>
          {field('Funder Type', 'funder_type', 'text', [
            {value:'federal',label:'Federal'},{value:'state',label:'State'},{value:'county',label:'County'},
            {value:'city',label:'City'},{value:'foundation',label:'Foundation'},{value:'corporate',label:'Corporate'},{value:'individual',label:'Individual'},{value:'other',label:'Other'}
          ])}
          {field('Grant Type', 'grant_type', 'text', [
            {value:'housing',label:'Housing'},{value:'workforce',label:'Workforce'},{value:'transportation',label:'Transportation'},
            {value:'services',label:'Services'},{value:'operations',label:'Operations'},{value:'capital',label:'Capital'},{value:'other',label:'Other'}
          ])}
          {field('Status', 'status', 'text', Object.keys(STATUS_COLORS).map(k => ({value:k, label:k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())})))}
          {field('Grant Manager', 'grant_manager_name')}
          {field('Amount Requested ($)', 'amount_requested', 'number')}
          {field('Amount Awarded ($)', 'amount_awarded', 'number')}
          {field('Application Deadline', 'application_deadline', 'date')}
          {field('Award Date', 'award_date', 'date')}
          {field('Start Date', 'start_date', 'date')}
          {field('End Date', 'end_date', 'date')}
          {field('Report Due Date', 'report_due_date', 'date')}
          {field('Participant Target', 'participant_target', 'number')}
          <div className="col-span-2">{field('Outcomes Required', 'outcomes_required', 'textarea')}</div>
          <div className="col-span-2">{field('Notes', 'notes', 'textarea')}</div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" onClick={() => onSave(form)}>Save Grant</Button>
        </div>
      </div>
    </div>
  );
}

export default function GrantTracker() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const { data: grants = [] } = useQuery({ queryKey: ['grants'], queryFn: () => base44.entities.Grant.list() });

  const saveGrant = useMutation({
    mutationFn: (data) => data.id ? base44.entities.Grant.update(data.id, data) : base44.entities.Grant.create(data),
    onSuccess: () => { qc.invalidateQueries(['grants']); setModal(null); }
  });

  const today = new Date();
  const in30Days = new Date(); in30Days.setDate(today.getDate() + 30);

  const totalAwarded = grants.filter(g => g.status === 'awarded' || g.status === 'active').reduce((s, g) => s + (g.amount_awarded || 0), 0);
  const totalRequested = grants.filter(g => ['in_progress','submitted'].includes(g.status)).reduce((s, g) => s + (g.amount_requested || 0), 0);
  const deadlinesSoon = grants.filter(g => {
    if (!g.application_deadline && !g.report_due_date) return false;
    const d = new Date(g.application_deadline || g.report_due_date);
    return d >= today && d <= in30Days;
  }).length;
  const reportingDue = grants.filter(g => g.status === 'reporting_due').length;
  const active = grants.filter(g => g.status === 'active').length;

  const filtered = grants.filter(g => {
    const matchSearch = !search || g.grant_name?.toLowerCase().includes(search.toLowerCase()) || g.funder_name?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || g.status === tab || (tab === 'pipeline' && ['prospect','in_progress','submitted'].includes(g.status)) || (tab === 'active' && ['awarded','active'].includes(g.status)) || (tab === 'attention' && ['reporting_due'].includes(g.status));
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      {modal !== null && (
        <GrantModal
          grant={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={(data) => saveGrant.mutate(modal === 'new' ? data : {...data, id: modal.id})}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Grant Tracker</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage the grant pipeline, compliance, and reporting requirements</p>
        </div>
        <Button onClick={() => setModal('new')}><Plus className="w-4 h-4 mr-2" />Add Grant</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Grants', value: grants.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active', value: active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Awarded Funding', value: `$${totalAwarded.toLocaleString()}`, icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'In Pipeline', value: `$${totalRequested.toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Deadlines Soon', value: deadlinesSoon, icon: AlertTriangle, color: deadlinesSoon > 0 ? 'text-orange-600' : 'text-slate-400', bg: deadlinesSoon > 0 ? 'bg-orange-50' : 'bg-slate-50' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="font-heading text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming deadlines alert */}
      {deadlinesSoon > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">{deadlinesSoon} grant deadline(s) in the next 30 days</p>
              <p className="text-xs text-orange-700">Review and prepare submissions or reports.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search grants..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {[['all','All'],['pipeline','Pipeline'],['active','Active'],['attention','Reporting Due']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Grant list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-4">No grants found. Start building your grant pipeline.</p>
            <Button onClick={() => setModal('new')}><Plus className="w-4 h-4 mr-2" />Add Grant</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => {
            const urgentDate = g.application_deadline || g.report_due_date;
            const daysAway = urgentDate ? Math.ceil((new Date(urgentDate) - today) / 86400000) : null;
            const isUrgent = daysAway !== null && daysAway <= 30 && daysAway >= 0;
            return (
              <Card key={g.id} className={`hover:shadow-md transition-shadow ${isUrgent ? 'border-orange-200' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{g.grant_name}</p>
                        <Badge className={STATUS_COLORS[g.status] || 'bg-slate-100 text-slate-600'} variant="outline">
                          {g.status?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{g.grant_type}</Badge>
                        {isUrgent && <Badge className="bg-orange-100 text-orange-800 border-orange-200" variant="outline">{daysAway}d left</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{g.funder_name} · {g.funder_type?.replace(/_/g,' ')}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {g.amount_requested && <span>Requested: <strong>${Number(g.amount_requested).toLocaleString()}</strong></span>}
                        {g.amount_awarded && <span>Awarded: <strong className="text-emerald-700">${Number(g.amount_awarded).toLocaleString()}</strong></span>}
                        {g.application_deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Deadline: {g.application_deadline}</span>}
                        {g.report_due_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Report Due: {g.report_due_date}</span>}
                        {g.grant_manager_name && <span>Manager: {g.grant_manager_name}</span>}
                      </div>
                      {g.outcomes_required && (
                        <p className="text-xs text-muted-foreground mt-1 italic truncate">{g.outcomes_required}</p>
                      )}
                    </div>
                    <button onClick={() => setModal(g)} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}