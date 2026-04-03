import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AlumniFormDialog from '@/components/alumni/AlumniFormDialog';
import { GraduationCap, Plus, Star, CheckCircle2, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function AlumniProfileTab({ resident, user, canEdit }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: alumniList = [], isLoading } = useQuery({
    queryKey: ['alumni-profile', resident?.id],
    queryFn: () => base44.entities.AlumniProfile.filter({ resident_id: resident.id }),
    enabled: !!resident?.id,
  });

  const record = alumniList[0] || null;

  const handleEdit = () => { setEditing(record); setDialogOpen(true); };
  const handleAdd = () => {
    setEditing({
      global_resident_id: resident.global_resident_id,
      resident_id: resident.id,
      full_name: `${resident.first_name || ''} ${resident.last_name || ''}`.trim(),
      email: resident.email || '',
      phone: resident.phone || '',
      population: resident.population || '',
    });
    setDialogOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['alumni-profile', resident.id] });
    queryClient.invalidateQueries({ queryKey: ['alumni'] });
    setDialogOpen(false);
  };

  const STATUS_COLORS = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
    inactive: 'bg-slate-100 text-slate-500',
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>;

  if (!record) {
    return (
      <div className="text-center py-16">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-heading font-semibold text-foreground mb-1">No Alumni Record</p>
        <p className="text-sm text-muted-foreground mb-5">
          Create an alumni profile once this resident completes the program.
        </p>
        {canEdit && (
          <Button onClick={handleAdd} className="gap-1.5">
            <Plus className="w-4 h-4" /> Create Alumni Record
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <Card className="p-4 flex items-center gap-3 justify-between flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
            {record.full_name?.[0] || '?'}
          </div>
          <div>
            <p className="font-heading font-bold text-base">{record.preferred_name || record.full_name}</p>
            {record.graduation_date && (
              <p className="text-xs text-muted-foreground">
                Graduated {format(new Date(record.graduation_date), 'MMMM yyyy')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${STATUS_COLORS[record.status] || ''}`}>
            {record.status?.replace(/_/g, ' ')}
          </Badge>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={handleEdit} className="gap-1">
              Edit
            </Button>
          )}
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Work info */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Work</p>
          {record.job_title && <p className="text-sm font-medium">{record.job_title}</p>}
          {record.employer_name && <p className="text-sm text-muted-foreground">{record.employer_name}</p>}
          {record.industry && <Badge variant="outline" className="text-xs">{record.industry}</Badge>}
          {!record.job_title && !record.employer_name && !record.industry && (
            <p className="text-sm text-muted-foreground">Not provided</p>
          )}
        </Card>

        {/* Contact & opt-in */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Contact Sharing</p>
          {record.opt_in_contact_sharing ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Opted in to contact sharing
                {record.opt_in_date && <span className="text-muted-foreground ml-1">({format(new Date(record.opt_in_date), 'MMM d, yyyy')})</span>}
              </div>
              {record.email && <a href={`mailto:${record.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Mail className="w-3 h-3" />{record.email}</a>}
              {record.phone && <a href={`tel:${record.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{record.phone}</a>}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Contact sharing not yet opted in.</p>
          )}
        </Card>
      </div>

      {/* Mentorship */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className={`w-4 h-4 ${record.willing_to_mentor ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium">{record.willing_to_mentor ? 'Available to Mentor' : 'Not mentoring'}</p>
        </div>
        {record.willing_to_mentor && record.mentor_topics?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {record.mentor_topics.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
          </div>
        )}
      </Card>

      {/* Short story */}
      {record.short_story && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Story</p>
          <p className="text-sm italic text-muted-foreground">"{record.short_story}"</p>
        </Card>
      )}

      {/* Staff notes (internal) */}
      {canEdit && record.staff_notes && (
        <Card className="p-4 border-amber-200 bg-amber-50/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Staff Notes (Internal)</p>
          <p className="text-sm text-muted-foreground">{record.staff_notes}</p>
        </Card>
      )}

      <AlumniFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        user={user}
        onSaved={handleSaved}
      />
    </div>
  );
}