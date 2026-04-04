import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { LEARNING_PATHWAYS } from '@/lib/learningPathways';

/**
 * Resolves which LearningClass records correspond to each pathway's class titles.
 * Matches case-insensitively by title.
 */
function resolvePathwayClasses(pathway, classes) {
  return pathway.classTitles.map(title => {
    const found = classes.find(c => c.title?.toLowerCase().trim() === title.toLowerCase().trim());
    return { title, class: found || null };
  });
}

function PathwayCard({ pathway, classes, enrollments, certificates }) {
  const [expanded, setExpanded] = useState(false);

  const resolved = resolvePathwayClasses(pathway, classes);
  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));
  const completedClassIds = new Set(
    enrollments.filter(e => e.status === 'completed').map(e => e.class_id)
  );

  // Count how many of the pathway's classes exist in the db and are completed
  const knownClasses = resolved.filter(r => r.class !== null);
  const completedCount = knownClasses.filter(r => completedClassIds.has(r.class.id)).length;
  const totalCount = resolved.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = completedCount >= totalCount && totalCount > 0;

  // Check if certificate has been earned for this pathway category
  const cert = certificates.find(c => c.category === pathway.certificate_category);

  return (
    <Card className={`overflow-hidden border ${pathway.color}`}>
      {/* Header — always visible */}
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
            {isComplete && !cert && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">All Done ✓</Badge>
            )}
            {cert && (
              <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-0">🏆 Certificate Earned</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{pathway.description}</p>
          {/* Progress bar */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{completedCount} of {totalCount} classes completed</span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pathway.progressColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded class list */}
      {expanded && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-black/5 pt-3">
          {resolved.map((r, i) => {
            const cls = r.class;
            const isDone = cls && completedClassIds.has(cls.id);
            const isEnrolled = cls && enrolledClassIds.has(cls.id) && !isDone;
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 p-2 rounded-lg text-xs ${
                  isDone ? 'bg-emerald-50' : isEnrolled ? 'bg-blue-50/50' : 'bg-white/50'
                }`}
              >
                <span className="text-xs font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}.</span>
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  : <Circle className={`w-4 h-4 flex-shrink-0 ${isEnrolled ? 'text-blue-400' : 'text-muted-foreground/40'}`} />
                }
                <span className={`flex-1 ${isDone ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {r.title}
                </span>
                {!cls && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Coming Soon</Badge>
                )}
                {isEnrolled && (
                  <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0">Enrolled</Badge>
                )}
                {isDone && (
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Done ✓</Badge>
                )}
              </div>
            );
          })}

          {/* Certificate section */}
          <div className="mt-3 pt-3 border-t border-black/5 flex items-center gap-2">
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
                  : `Complete all ${totalCount} classes to earn the ${pathway.label} certificate.`}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function LearningPathways({ classes = [], enrollments = [], certificates = [] }) {
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
          />
        ))}
      </div>
    </div>
  );
}