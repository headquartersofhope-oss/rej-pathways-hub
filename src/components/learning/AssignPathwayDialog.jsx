import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { resolvePathwayClasses } from '@/lib/learningPathways';
import { base44 } from '@/api/base44Client';

/**
 * Shows a dialog to assign all (or remaining) classes in a pathway to a resident.
 * Skips classes already enrolled.
 */
export default function AssignPathwayDialog({
  open,
  onOpenChange,
  pathway,
  classes = [],
  enrollments = [],
  resident,
  user,
  onAssigned,
}) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!pathway) return null;
  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));
  const resolved = resolvePathwayClasses(pathway, classes);
  const toEnroll = resolved.filter(r => r.class && !enrolledClassIds.has(r.class.id));
  const alreadyEnrolled = resolved.filter(r => r.class && enrolledClassIds.has(r.class.id));

  const handleAssign = async () => {
    setSaving(true);
    for (const r of toEnroll) {
      await base44.entities.ClassEnrollment.create({
        global_resident_id: resident.global_resident_id || resident.id,
        resident_id: resident.id,
        class_id: r.class.id,
        organization_id: resident.organization_id,
        enrolled_by: user?.id,
        status: 'enrolled',
        notes: `Assigned via ${pathway.label}`,
      });
    }
    setSaving(false);
    setDone(true);
    onAssigned && onAssigned();
  };

  const handleClose = () => {
    setDone(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{pathway.icon}</span> Assign {pathway.label}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="font-semibold text-sm">Pathway Assigned!</p>
            <p className="text-xs text-muted-foreground">
              {toEnroll.length} class{toEnroll.length !== 1 ? 'es' : ''} enrolled for {resident.first_name}.
            </p>
            <Button size="sm" onClick={handleClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            <p className="text-xs text-muted-foreground">{pathway.description}</p>

            <div className="space-y-1.5">
              {resolved.map((r, i) => {
                const exists = !!r.class;
                const enrolled = exists && enrolledClassIds.has(r.class.id);
                return (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${enrolled ? 'bg-emerald-50' : exists ? 'bg-muted/30' : 'bg-muted/10 opacity-50'}`}>
                    {enrolled
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
                    <span className={`flex-1 ${enrolled ? 'text-muted-foreground line-through' : 'font-medium'}`}>{r.title}</span>
                    {enrolled && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Already enrolled</Badge>}
                    {!exists && <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>}
                  </div>
                );
              })}
            </div>

            {toEnroll.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-2">
                {resident.first_name} is already enrolled in all available classes in this pathway.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                This will enroll {resident.first_name} in <strong>{toEnroll.length}</strong> new class{toEnroll.length !== 1 ? 'es' : ''}.
                {alreadyEnrolled.length > 0 && ` ${alreadyEnrolled.length} already enrolled (skipped).`}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={saving || toEnroll.length === 0}
                className="gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {saving ? 'Assigning…' : `Assign ${toEnroll.length} Class${toEnroll.length !== 1 ? 'es' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}