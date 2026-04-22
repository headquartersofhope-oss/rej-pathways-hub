import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, Users, Home, Clock, Briefcase, TrendingUp,
  BookOpen, Car, CheckCircle, ArrowRight, Download, Mail,
  RefreshCw, Calendar, ChevronDown, Target, Award, AlertCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { jsPDF } from 'jspdf';

const PRESETS = [
  { label: 'Last 30 Days', getValue: () => ({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last Quarter', getValue: () => ({ start: format(startOfQuarter(subDays(new Date(), 90)), 'yyyy-MM-dd'), end: format(endOfQuarter(subDays(new Date(), 90)), 'yyyy-MM-dd') }) },
  { label: 'Last Year', getValue: () => ({ start: format(startOfYear(subDays(new Date(), 365)), 'yyyy-MM-dd'), end: format(endOfYear(subDays(new Date(), 365)), 'yyyy-MM-dd') }) },
  { label: 'This Year', getValue: () => ({ start: format(startOfYear(new Date()), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
];

function StatCard({ icon: Icon, label, value, description, color, badge, trend }) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400', glow: 'shadow-blue-500/10' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', glow: 'shadow-amber-500/10' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: 'text-purple-400', glow: 'shadow-purple-500/10' },
    teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', icon: 'text-teal-400', glow: 'shadow-teal-500/10' },
    gold: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: 'text-yellow-400', glow: 'shadow-yellow-500/10' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`relative rounded-xl border ${c.border} ${c.bg} p-6 shadow-lg ${c.glow} hover:shadow-xl transition-all duration-300 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${c.bg} border ${c.border}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {badge && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.bg} ${c.icon} border ${c.border}`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-sm font-semibold text-slate-300 mt-1">{label}</div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <TrendingUp className="w-3 h-3" />
          <span>{trend}</span>
        </div>
      )}
      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-700/50 pt-3 mt-auto">{description}</p>
    </div>
  );
}

function generateNarrative(metrics, periodStart, periodEnd) {
  if (!metrics) return '';
  const {
    total_clients_served, clients_housed, average_days_intake_to_housing,
    employment_placements, employment_90_day_retention, life_skills_classes_completed,
    transport_rides_completed, exits_successful, referrals_submitted, referrals_approved,
    active_residents_end_of_period
  } = metrics;

  const housedRate = total_clients_served > 0 ? Math.round((clients_housed / total_clients_served) * 100) : 0;
  const retentionRate = employment_placements > 0 ? Math.round((employment_90_day_retention / employment_placements) * 100) : 0;
  const referralRate = referrals_submitted > 0 ? Math.round((referrals_approved / referrals_submitted) * 100) : 0;
  const startLabel = format(new Date(periodStart), 'MMMM d, yyyy');
  const endLabel = format(new Date(periodEnd), 'MMMM d, yyyy');

  return `During the reporting period from ${startLabel} to ${endLabel}, Headquarters of Hope served ${total_clients_served} individuals experiencing housing instability and barriers to self-sufficiency. Of those served, ${clients_housed} individuals (${housedRate}%) achieved stable housing placement, with an average of ${average_days_intake_to_housing} days from intake to housing — a key indicator of program efficiency and responsiveness.

${employment_placements} residents secured employment during this period, with ${employment_90_day_retention} (${retentionRate}%) demonstrating 90-day workforce retention, reflecting sustained economic attachment rather than temporary placement. This metric is a critical indicator for workforce development funders and VA employment contracts.

Program participants completed ${life_skills_classes_completed} life skills training sessions, building foundational competencies in financial literacy, digital skills, and employment readiness. Transportation support was provided across ${transport_rides_completed} completed rides, directly reducing a primary barrier to employment and service access.

Of ${referrals_submitted} housing referrals submitted on behalf of residents, ${referrals_approved} were approved (${referralRate}% approval rate), demonstrating strong community partnership alignment. At the close of this reporting period, ${active_residents_end_of_period} residents remained actively enrolled in programming, with ${exits_successful} achieving successful program graduation.

These outcomes demonstrate Headquarters of Hope's effectiveness as a comprehensive reentry and stabilization provider, delivering measurable impact across housing, employment, and self-sufficiency domains.`;
}

export default function OutcomesEngine() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [reportGenerated, setReportGenerated] = useState(false);

  const handlePreset = (preset) => {
    const { start, end } = preset.getValue();
    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset.label);
    setMetrics(null);
    setReportGenerated(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateOutcomesReport', {
        period_start: startDate,
        period_end: endDate
      });
      setMetrics(res.data.metrics);
      setReportGenerated(true);
    } catch (e) {
      setError(e.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const housedRate = metrics && metrics.total_clients_served > 0
    ? Math.round((metrics.clients_housed / metrics.total_clients_served) * 100)
    : 0;
  const retentionRate = metrics && metrics.employment_placements > 0
    ? Math.round((metrics.employment_90_day_retention / metrics.employment_placements) * 100)
    : 0;
  const referralRate = metrics && metrics.referrals_submitted > 0
    ? Math.round((metrics.referrals_approved / metrics.referrals_submitted) * 100)
    : 0;

  const narrative = metrics ? generateNarrative(metrics, startDate, endDate) : '';

  const handleExportPDF = () => {
    if (!metrics) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(245, 158, 11);
    doc.text('Program Outcomes & Impact Report', 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${format(new Date(startDate), 'MMM d, yyyy')} — ${format(new Date(endDate), 'MMM d, yyyy')}`, 20, 30);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 20, 37);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const rows = [
      ['Clients Served', metrics.total_clients_served],
      ['Residents Housed', `${metrics.clients_housed} (${housedRate}%)`],
      ['Avg Days to Housing', metrics.average_days_intake_to_housing],
      ['Employment Placements', metrics.employment_placements],
      ['90-Day Retention', `${metrics.employment_90_day_retention} (${retentionRate}%)`],
      ['Life Skills Completions', metrics.life_skills_classes_completed],
      ['Life Skills Completion Rate', `${metrics.average_life_skills_completion_rate}%`],
      ['Transport Rides Completed', metrics.transport_rides_completed],
      ['Referrals Submitted', metrics.referrals_submitted],
      ['Referrals Approved', `${metrics.referrals_approved} (${referralRate}%)`],
      ['Active Residents (EOP)', metrics.active_residents_end_of_period],
      ['Successful Program Exits', metrics.exits_successful],
    ];

    let y = 50;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('Key Metrics Summary', 20, y);
    y += 8;
    doc.setFontSize(10);
    for (const [label, val] of rows) {
      doc.text(`${label}: ${val}`, 25, y);
      y += 7;
    }

    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text('Program Effectiveness Summary', 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(narrative, 170);
    doc.text(lines, 20, y);

    doc.save(`outcomes-report-${startDate}-to-${endDate}.pdf`);
  };

  const handleEmailDraft = () => {
    if (!metrics) return;
    const subject = encodeURIComponent(`Program Outcomes Report: ${format(new Date(startDate), 'MMM d')} – ${format(new Date(endDate), 'MMM d, yyyy')}`);
    const body = encodeURIComponent(
      `Hi Rodney,\n\nPlease find below the outcomes summary for the period ${format(new Date(startDate), 'MMMM d, yyyy')} to ${format(new Date(endDate), 'MMMM d, yyyy')}.\n\n` +
      narrative +
      `\n\nKey Metrics:\n` +
      `• Clients Served: ${metrics.total_clients_served}\n` +
      `• Residents Housed: ${metrics.clients_housed} (${housedRate}%)\n` +
      `• Avg Days to Housing: ${metrics.average_days_intake_to_housing}\n` +
      `• Employment Placements: ${metrics.employment_placements}\n` +
      `• 90-Day Retention: ${retentionRate}%\n` +
      `• Life Skills Completions: ${metrics.life_skills_classes_completed}\n` +
      `• Transport Rides: ${metrics.transport_rides_completed}\n` +
      `• Referral Approval Rate: ${referralRate}%\n` +
      `• Successful Exits: ${metrics.exits_successful}\n\n` +
      `This report was generated from live Pathways Hub data.\n\nBest regards`
    );
    window.open(`mailto:rodney@rejglobal.com?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-[#0D1117] text-white">
      {/* Hero */}
      <div className="border-b border-[#30363D] bg-gradient-to-b from-[#161B22] to-[#0D1117]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-start gap-4 mb-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <BarChart3 className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Program Outcomes & Impact
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Evidence-based results for funders, grant applications, and government partners
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Date Controls */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Quick Presets</label>
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activePreset === p.label
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'border-[#30363D] text-slate-400 hover:border-amber-500/30 hover:text-amber-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setActivePreset('Custom Range'); setMetrics(null); }}
                  className="bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setActivePreset('Custom Range'); setMetrics(null); }}
                  className="bg-[#21262D] border border-[#30363D] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-6 flex items-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>

        {/* Results */}
        {metrics && (
          <>
            {/* Period badge */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300 font-medium">
                  {format(new Date(startDate), 'MMM d, yyyy')} — {format(new Date(endDate), 'MMM d, yyyy')}
                </span>
                <Badge className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400 text-xs">Live Data</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="flex items-center gap-2 text-xs border-[#30363D] text-slate-300 hover:border-amber-500/40 hover:text-amber-400">
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleEmailDraft} className="flex items-center gap-2 text-xs border-[#30363D] text-slate-300 hover:border-amber-500/40 hover:text-amber-400">
                  <Mail className="w-3.5 h-3.5" /> Email Draft
                </Button>
              </div>
            </div>

            {/* 3x3 Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <StatCard
                icon={Users}
                color="blue"
                label="Clients Served"
                value={metrics.total_clients_served}
                description="Total unique individuals who entered the program during this period. Core enrollment metric for grant reporting."
                badge="Core Metric"
              />
              <StatCard
                icon={Home}
                color="green"
                label="Residents Housed"
                value={metrics.clients_housed}
                badge={`${housedRate}% housed rate`}
                description="Individuals who achieved stable housing placement. Primary outcome measure for housing funders and HUD reporting."
                trend="Key outcome for VA & HUD contracts"
              />
              <StatCard
                icon={Clock}
                color="amber"
                label="Avg. Days to Housing"
                value={metrics.average_days_intake_to_housing > 0 ? `${metrics.average_days_intake_to_housing}d` : 'N/A'}
                description="Average calendar days from intake to housing placement. Lower values indicate faster stabilization — critical for government efficiency metrics."
                trend="Lower is better"
              />
              <StatCard
                icon={Briefcase}
                color="purple"
                label="Employment Placements"
                value={metrics.employment_placements}
                description="Residents who secured employment during this period. Core workforce development outcome for WIOA and DOL grant requirements."
                trend="Workforce development KPI"
              />
              <StatCard
                icon={TrendingUp}
                color="teal"
                label="90-Day Retention Rate"
                value={`${retentionRate}%`}
                badge={`${metrics.employment_90_day_retention} retained`}
                description="Percentage of placed residents still employed after 90 days. Demonstrates sustained economic attachment, not just job placement."
                trend="Key VA & WIOA metric"
              />
              <StatCard
                icon={BookOpen}
                color="gold"
                label="Life Skills Completions"
                value={metrics.life_skills_classes_completed}
                badge={`${metrics.average_life_skills_completion_rate}% avg rate`}
                description="Total life skills and training class completions. Demonstrates investment in resident self-sufficiency and long-term stability."
                trend="Education & training KPI"
              />
              <StatCard
                icon={Car}
                color="blue"
                label="Transport Rides Completed"
                value={metrics.transport_rides_completed}
                description="Completed transportation rides provided to residents. Demonstrates barrier removal services critical for employment access reporting."
                trend="Barrier removal metric"
              />
              <StatCard
                icon={Award}
                color="green"
                label="Successful Program Exits"
                value={metrics.exits_successful}
                description="Residents who completed the program and graduated. Represents the highest-level outcome — full program completion with stable exit."
                trend="Graduation rate KPI"
              />
              <StatCard
                icon={Target}
                color="amber"
                label="Referral Approval Rate"
                value={`${referralRate}%`}
                badge={`${metrics.referrals_approved}/${metrics.referrals_submitted}`}
                description="Percentage of housing referrals approved by partner providers. Reflects quality of referral packets and partner relationships."
                trend="Partner effectiveness metric"
              />
            </div>

            {/* Supplemental metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Residents (End of Period)', value: metrics.active_residents_end_of_period, color: 'text-blue-400' },
                { label: 'Avg. Days Referral to Decision', value: metrics.average_days_referral_to_placement > 0 ? `${metrics.average_days_referral_to_placement}d` : 'N/A', color: 'text-amber-400' },
                { label: 'Transport Barrier Flags', value: metrics.transport_barrier_flags, color: 'text-purple-400' },
                { label: 'Unsuccessful Exits', value: metrics.exits_unsuccessful, color: 'text-red-400' },
              ].map(m => (
                <div key={m.label} className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Recidivism note */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-amber-300 mb-1">Recidivism Tracking Note</div>
                <p className="text-xs text-slate-400">{metrics.recidivism_unknown}</p>
              </div>
            </div>

            {/* Program Effectiveness Narrative */}
            <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#30363D] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Program Effectiveness Summary</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Auto-generated narrative suitable for grant applications and funder reports</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(narrative)} className="text-xs border-[#30363D] text-slate-400 hover:text-amber-400">
                    Copy Text
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEmailDraft} className="text-xs border-[#30363D] text-slate-400 hover:text-amber-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="prose prose-invert max-w-none">
                  {narrative.split('\n\n').map((para, i) => (
                    <p key={i} className="text-sm text-slate-300 leading-relaxed mb-4 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!metrics && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
              <BarChart3 className="w-10 h-10 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to Generate</h3>
            <p className="text-slate-500 text-sm max-w-md">Select a date range and click Generate Report to calculate live outcomes metrics from your program data.</p>
          </div>
        )}
      </div>
    </div>
  );
}