import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mail, Phone } from 'lucide-react';
import { canViewField } from '@/lib/fieldVisibility';

/**
 * Reusable resident card component showing:
 * - Name, ID, contact info
 * - Job readiness score & progress
 * - Population, risk level, status
 * - Additional context (intake status, barriers count, etc.)
 * 
 * Props:
 *   resident: Resident object with name, email, phone, etc.
 *   variant: 'summary' (compact) or 'detailed' (full)
 *   showJobReadiness: display job readiness score/progress
 *   showPopulation: display population badge
 *   showRisk: display risk level
 *   showIntakeStatus: display intake status label
 *   intakeStatus: optional intake status (e.g., 'completed', 'in_progress')
 *   intakeDate: optional intake completion date
 *   barrierCount: optional number of barriers
 *   statusColors: optional color mapping for status badges
 *   onClick: optional click handler
 *   className: additional CSS classes
 */
export default function ResidentCard({
  resident,
  variant = 'summary',
  showJobReadiness = true,
  showPopulation = true,
  showRisk = true,
  showIntakeStatus = false,
  intakeStatus = null,
  intakeDate = null,
  barrierCount = null,
  statusColors = {},
  onClick = null,
  className = '',
  userRole = 'admin',
  showContact = true
}) {
  if (!resident) return null;

  const name = resident.preferred_name ? resident.preferred_name : `${resident.first_name} ${resident.last_name}`;
  const initials = `${resident.first_name?.[0] || ''}${resident.last_name?.[0] || ''}`.toUpperCase();
  
  const isCompact = variant === 'summary';

  return (
    <Card 
      onClick={onClick}
      className={`p-4 hover:shadow-md hover:border-amber-500/40 transition-all duration-200 cursor-pointer ${className}`}
      style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}
    >
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
          {initials}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm truncate">{name}</p>
          
          {/* Badges row: ID, Status, Intake Status */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {resident.global_resident_id && (
              <span className="text-[9px] font-mono text-muted-foreground">{resident.global_resident_id}</span>
            )}
            {resident.status && (
              <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[resident.status] || 'bg-slate-100 text-slate-700'}`}>
                {resident.status.replace(/_/g, ' ')}
              </Badge>
            )}
            {showIntakeStatus && intakeStatus && (
              <Badge variant="outline" className="text-[10px]">
                {intakeStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Contact Info - Show only if showContact=true and user has permission */}
      {showContact && (resident.email || resident.phone) && (
        <div className={`border-t border-border/40 space-y-1 mb-2 ${isCompact ? '' : 'py-2'}`}>
          {canViewField(userRole, 'email', 'contact') && resident.email && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{resident.email}</span>
            </div>
          )}
          {canViewField(userRole, 'phone', 'contact') && resident.phone && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground truncate">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{resident.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Job Readiness Score */}
      {showJobReadiness && resident.job_readiness_score !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Job Readiness</span>
            <span className="text-xs font-semibold">{resident.job_readiness_score}%</span>
          </div>
          <Progress value={resident.job_readiness_score} className="h-1.5" />
        </div>
      )}

      {/* Barriers Count */}
      {barrierCount !== null && (
        <div className="text-xs text-muted-foreground mb-2">
          {barrierCount} active barrier{barrierCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Population & Risk */}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
        {showPopulation && resident.population && (
          <span className="capitalize">{resident.population.replace(/_/g, ' ')}</span>
        )}
        {showRisk && resident.risk_level && (
          <span className="capitalize px-1.5 py-0.5 rounded bg-muted text-xs">
            {resident.risk_level} risk
          </span>
        )}
      </div>
    </Card>
  );
}
