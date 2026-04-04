import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Award, ChevronDown, ChevronUp, ChevronRight, BookOpen } from 'lucide-react';
import { LEARNING_PATHWAYS, getPathwayProgress } from '@/lib/learningPathways';

function PathwayCard({ pathway, classes, enrollments, certificates, onClassClick, onAssignPathway, isStaff }) {
  const [expanded, setExpanded] = useState(false);

  const { resolved, completedCount, totalCount, pct, isComplete, completedClassIds, enrolledClassIds, nextClass } =
    getPathwayProgress(pathway, classes, enrollments);

  const cert = certificates.find(c => c.category === pathway.certificate_category);
  const remainingCount = totalCount - completedCount;

  return (
    <Card className={`overflow-hidden border ${pathway.color}`}>
      {/* Header */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`w-10 h-10 rounded-lg ${pathway.iconBg} flex items-center justify-center flex-shrink-0 text-xl`}>
          {pathway.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-heading font-semibold text-sm">{pathway.label}</h4>
            {cert && <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-0">🏆 Certificate Earned</Badge>}
            {isComplete && !cert && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">All Done ✓</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{pathway.description}</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{completedCount} of {totalCount} completed {remainingCount > 0 && `· ${remainingCount} remaining`}</span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pathway.progressColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-black/5 pt-3">
          {resolved.map((r, i) => {
            const cls = r.class;
            const isDone = cls && completedClassIds.has(cls.id);
            const isEnrolled = cls && enrolledClassIds.has(cls.id) && !isDone;
            const isNext = cls && nextClass?.id === cls.id;

            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                  isDone ? 'bg-emerald-50' : isNext ? 'bg-blue-50 ring-1 ring-blue-200' : isEnrolled ? 'bg-blue-50/40' : 'bg-white/50'
                } ${cls && onClassClick ? 'cursor-pointer hover:opacity-80' : ''}`}
                onClick={() => cls && onClassClick && onClassClick(cls)}
              >
                <span className="text-xs font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}.</span>
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  : <Circle className={`w-4 h-4 flex-shrink-0 ${isEnrolled ? 'text-blue-400' : 'text-muted-foreground/40'}`} />
                }
                <span className={`flex-1 ${isDone ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {r.title}
                </span>
                {!cls && <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming Soon</Badge>}
                {isDone && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Done ✓</Badge>}
                {isNext && !isDone && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0">Next →</Badge>}
                {isEnrolled && !isNext && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0">Enrolled</Badge>}
                {cls && onClassClick && !isDone && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            );
          })}

          {/* Certificate progress */}
          <div className="mt-3 pt-3 border-t border-black/5">
            <div className="flex items-center gap-2">
              <Award className={`w-4 h-4 flex-shrink-0 ${cert ? 'text-yellow-500' : 'text-muted-foreground/40'}`} />
              {cert ? (
                <div>
                  <p className="text-xs font-semibold text-yellow-700">🏆 Certificate Earned</p>
                  <p className="text-[10px] text-muted-foreground">{cert.certificate_name} · Issued {cert.issued_date}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isComplete
                    ? 'Contact staff to receive your certificate.'
                    : `${remainingCount} class${remainingCount !== 1 ? 'es' : ''} remaining to earn the ${pathway.certificateName}.`}
                </p>
              )}
            </div>
          </div>

          {/* Staff: Assign Pathway button */}
          {isStaff && onAssignPathway && (
            <div className="mt-2 pt-2 border-t border-black/5">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onAssignPathway(pathway); }}
              >
                <BookOpen className="w-3 h-3" /> Assign Full Pathway to Resident
              </Button>
            </div>
          )}

          {/* Resident: Start / Continue next class */}
          {!isStaff && nextClass && onClassClick && (
            <div className="mt-2 pt-2 border-t border-black/5">
              <Button
                size="sm"
                className="w-full gap-1.5 h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onClassClick(nextClass); }}
              >
                {enrolledClassIds.has(nextClass.id) ? 'Continue' : 'Start'} Next Class →
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function LearningPathways({
  classes = [],
  enrollments = [],
  certificates = [],
  onClassClick,
  onAssignPathway,
  isStaff = false,
}) {
  return (
    <div>
      <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" /> Learning Pathways
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Complete all classes in a pathway to earn a certificate. Click any pathway to see what's included.
      </p>
      <div className="space-y-3">
        {LEARNING_PATHWAYS.map(pathway => (
          <PathwayCard
            key={pathway.id}
            pathway={pathway}
            classes={classes}
            enrollments={enrollments}
            certificates={certificates}
            onClassClick={onClassClick}
            onAssignPathway={onAssignPathway}
            isStaff={isStaff}
          />
        ))}
      </div>
    </div>
  );
}