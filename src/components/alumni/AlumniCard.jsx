import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Mail, Phone, Briefcase, Star, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  inactive: 'bg-slate-100 text-slate-500',
};

export default function AlumniCard({ alumni, showContact, isStaff, onEdit, onStatusChange }) {
  return (
    <Card className="p-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
            {alumni.full_name?.[0] || '?'}
          </div>
          <div>
            <p className="font-heading font-bold text-sm leading-tight">
              {alumni.preferred_name || alumni.full_name}
            </p>
            {alumni.graduation_date && (
              <p className="text-[10px] text-muted-foreground">
                Graduated {new Date(alumni.graduation_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        {onEdit && (
          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Work info */}
      {(alumni.industry || alumni.job_title) && (
        <div className="flex items-center gap-1.5 text-sm">
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground truncate">
            {[alumni.job_title, alumni.industry].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {/* Mentor badge */}
      {alumni.willing_to_mentor && (
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">Available to Mentor</span>
        </div>
      )}

      {/* Mentor topics */}
      {alumni.mentor_topics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alumni.mentor_topics.map(t => (
            <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
          ))}
        </div>
      )}

      {/* Short story */}
      {alumni.short_story && (
        <p className="text-xs text-muted-foreground italic line-clamp-3">"{alumni.short_story}"</p>
      )}

      {/* Contact — only shown if opted in */}
      {showContact && alumni.opt_in_contact_sharing && (
        <div className="space-y-1 pt-1 border-t">
          {alumni.email && (
            <a href={`mailto:${alumni.email}`} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Mail className="w-3 h-3" /> {alumni.email}
            </a>
          )}
          {alumni.phone && (
            <a href={`tel:${alumni.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Phone className="w-3 h-3" /> {alumni.phone}
            </a>
          )}
        </div>
      )}

      {/* Opt-in indicator if contact hidden */}
      {showContact && !alumni.opt_in_contact_sharing && (
        <p className="text-[10px] text-muted-foreground border-t pt-2">Contact not shared — awaiting opt-in</p>
      )}

      {/* Staff controls */}
      {isStaff && (
        <div className="flex items-center justify-between pt-1 border-t gap-2">
          <Badge className={`text-[10px] ${STATUS_COLORS[alumni.status] || ''}`}>
            {alumni.status?.replace(/_/g, ' ')}
          </Badge>
          {onStatusChange && (
            <Select value={alumni.status} onValueChange={onStatusChange}>
              <SelectTrigger className="h-6 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </Card>
  );
}