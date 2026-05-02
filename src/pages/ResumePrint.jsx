import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ResumePrint
 * Route: /resume/:residentId
 *
 * Renders the most recent ResumeRecord for a resident in a clean, employer-ready format.
 * Print button uses window.print() with print-friendly CSS — the toolbar disappears,
 * page is letter-sized with proper margins, and the resume looks professional in PDF.
 *
 * Includes a "Regenerate from latest data" button that calls generateResume to
 * pull fresh data from EmployabilityProfile + JobPlacement + Certificate.
 */
export default function ResumePrint() {
  const { residentId } = useParams();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const { data: resume, isLoading, refetch } = useQuery({
    queryKey: ['resume', residentId],
    queryFn: async () => {
      const records = await base44.entities.ResumeRecord.filter({
        resident_id: residentId,
      });
      // Return the most recent
      return records.sort((a, b) =>
        new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
      )[0];
    },
  });

  const handlePrint = () => window.print();

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.functions.invoke('generateResume', { resident_id: residentId });
      if (result?.success) {
        toast.success('Resume regenerated from latest data');
        refetch();
      } else {
        throw new Error(result?.error || 'Failed to regenerate');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/40">
        <div className="text-center max-w-md">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="font-semibold mb-2">No resume found for this resident yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Click below to auto-generate one from their profile, work history, and certifications.
          </p>
          <Button onClick={handleRegenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Resume
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      {/* Toolbar (hidden on print) */}
      <div className="bg-background border-b sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading font-bold text-base">Resume — {resume.full_name}</h1>
            <p className="text-xs text-muted-foreground">{resume.version_label}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRegenerate} disabled={isGenerating} variant="outline" size="sm" className="gap-2">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Regenerate
            </Button>
            <Button onClick={handlePrint} size="sm" className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900">
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Resume content */}
      <div className="max-w-4xl mx-auto p-8 my-8 bg-white shadow-lg print:shadow-none print:my-0 print:p-12 print-resume">
        {/* Header */}
        <div className="border-b-4 border-amber-500 pb-4 mb-6">
          <h1 className="text-4xl font-heading font-bold mb-2 text-slate-900">{resume.full_name || 'Name'}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            {resume.phone && <span>{resume.phone}</span>}
            {resume.email && <span>{resume.email}</span>}
            {resume.address && <span>{resume.address}</span>}
          </div>
        </div>

        {/* Objective */}
        {resume.objective && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-2">Professional Summary</h2>
            <p className="text-sm leading-relaxed text-slate-800">{resume.objective}</p>
          </section>
        )}

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-2">Core Skills</h2>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-slate-800">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Work History */}
        {resume.work_history && resume.work_history.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-3">Work Experience</h2>
            <div className="space-y-4">
              {resume.work_history.map((w, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-slate-900">{w.title}</h3>
                    <span className="text-xs text-slate-600 whitespace-nowrap">{w.start_date || ''} — {w.end_date || 'Present'}</span>
                  </div>
                  <p className="text-sm text-slate-700 italic mb-1">{w.employer}</p>
                  {w.description && <p className="text-sm text-slate-800">{w.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-3">Education</h2>
            <div className="space-y-2">
              {resume.education.map((e, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-sm text-slate-900">{e.credential}</h3>
                    <span className="text-xs text-slate-600">{e.year}</span>
                  </div>
                  <p className="text-sm text-slate-700 italic">{e.institution}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications */}
        {resume.certifications && resume.certifications.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-2">Certifications</h2>
            <ul className="list-disc list-inside text-sm space-y-1 text-slate-800">
              {resume.certifications.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        {/* References */}
        {resume.references && resume.references.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 mb-3">References</h2>
            <div className="grid grid-cols-2 gap-4">
              {resume.references.map((r, i) => (
                <div key={i} className="text-sm text-slate-800">
                  <p className="font-semibold text-slate-900">{r.name}</p>
                  <p className="text-slate-700 italic">{r.relationship}</p>
                  {r.phone && <p>{r.phone}</p>}
                  {r.email && <p>{r.email}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t text-xs text-slate-500 text-center">
          Generated by Pathways Hub · Headquarters of Hope Foundation
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0.5in; size: letter; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:my-0 { margin-top: 0 !important; margin-bottom: 0 !important; }
          .print\\:p-12 { padding: 3rem !important; }
        }
      `}</style>
    </div>
  );
}
