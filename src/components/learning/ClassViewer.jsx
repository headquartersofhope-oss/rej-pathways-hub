import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, ExternalLink, ArrowLeft, PlayCircle, BookOpen, Star, Link } from 'lucide-react';

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/);
  return match ? match[1] : null;
}

function CompletionAnimation({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center animate-bounce">
        <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-500/50">
          <CheckCircle2 className="w-14 h-14 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Class Complete!</h2>
        <p className="text-amber-300 text-lg">Great job! Keep going!</p>
        <div className="flex justify-center gap-1 mt-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="w-8 h-8 text-amber-400 fill-amber-400"
              style={{ animationDelay: `${i * 0.1}s`, animation: 'bounce 0.6s infinite' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClassViewer({ cls, enrollment, trackName, resident, allEnrollments, allClasses, onBack, onCompleted }) {
  const queryClient = useQueryClient();
  const [completing, setCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completed, setCompleted] = useState(enrollment?.status === 'completed');

  // Check both youtube_url and video_url fields
  const primaryVideoUrl = cls.video_url || cls.youtube_url;
  const youtubeId = extractYouTubeId(primaryVideoUrl);

  const isCompleted = completed || enrollment?.status === 'completed';

  const handleMarkComplete = async () => {
    if (!enrollment || isCompleted) return;
    setCompleting(true);

    const today = new Date().toISOString().split('T')[0];
    await base44.entities.ClassEnrollment.update(enrollment.id, {
      status: 'completed',
      completion_date: today,
    });

    // Try to unlock next class in track (if using LearningAssignment model)
    if (cls.track_id && allClasses && allEnrollments) {
      const trackClasses = [...allClasses]
        .filter(c => c.track_id === cls.track_id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const currentIndex = trackClasses.findIndex(c => c.id === cls.id);
      const nextClass = trackClasses[currentIndex + 1];

      if (nextClass) {
        // Find if there's a locked assignment for the next class
        try {
          const nextAssignments = await base44.entities.LearningAssignment.filter({
            class_id: nextClass.id,
            resident_id: resident?.id,
          });
          const lockedNext = nextAssignments.find(a => a.status === 'locked' || a.status === 'assigned');
          if (lockedNext && lockedNext.status === 'locked') {
            await base44.entities.LearningAssignment.update(lockedNext.id, { status: 'assigned' });
          }
        } catch (_) {
          // LearningAssignment may not exist for this resident, ignore
        }
      }
    }

    setCompleting(false);
    setCompleted(true);
    setShowCelebration(true);

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['my-enrollments', resident?.id] });
    queryClient.invalidateQueries({ queryKey: ['resident-enrollments', resident?.id] });
    queryClient.invalidateQueries({ queryKey: ['learning-assignments', resident?.id] });
  };

  const handleCelebrationDone = () => {
    setShowCelebration(false);
    if (onCompleted) onCompleted();
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0D1117' }}>
      {showCelebration && <CompletionAnimation onDone={handleCelebrationDone} />}

      {/* Header */}
      <div style={{ backgroundColor: '#161B22', borderBottom: '1px solid #30363D' }} className="sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <div className="flex-1 min-w-0">
            {trackName && (
              <p className="text-xs text-amber-400 font-medium mb-0.5">{trackName}</p>
            )}
            <h1 className="font-heading font-bold text-white text-lg leading-tight truncate">{cls.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {cls.estimated_minutes && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {cls.estimated_minutes < 60 ? `${cls.estimated_minutes}m` : `${Math.round(cls.estimated_minutes / 60)}h`}
              </span>
            )}
            {isCompleted && (
              <Badge className="text-[10px] border-0 bg-emerald-900/50 text-emerald-400">
                ✓ Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Video embed */}
        {youtubeId ? (
          <div>
            <div
              style={{
                backgroundColor: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #30363D',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                style={{ width: '100%', height: '480px', display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={cls.title}
              />
            </div>
          </div>
        ) : primaryVideoUrl ? (
          <div
            style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D' }}
            className="p-5"
          >
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white">
              <PlayCircle className="w-4 h-4 text-amber-400" /> Video Resource
            </h4>
            <a
              href={primaryVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Watch Video
            </a>
          </div>
        ) : null}

        {/* Description */}
        {cls.description && (
          <div style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D' }} className="p-5">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#E6EDF3' }}>
              <BookOpen className="w-4 h-4 text-amber-400" /> About This Class
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: '#8B949E' }}>{cls.description}</p>
          </div>
        )}

        {/* Learning objectives */}
        {cls.learning_objectives?.length > 0 && (
          <div style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D' }} className="p-5">
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#E6EDF3' }}>What You'll Learn</h4>
            <ul className="space-y-2">
              {cls.learning_objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#CDD9E5' }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rich text content */}
        {cls.content_html && (
          <div style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D' }} className="p-5">
            <div
              className="prose prose-invert prose-sm max-w-none"
              style={{ color: '#CDD9E5' }}
              dangerouslySetInnerHTML={{ __html: cls.content_html }}
            />
          </div>
        )}

        {/* External resource */}
        {cls.external_resource_url && (
          <div style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D' }} className="p-5">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#E6EDF3' }}>
              <Link className="w-4 h-4 text-amber-400" /> Additional Resource
            </h4>
            <a
              href={cls.external_resource_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
            >
              <ExternalLink className="w-4 h-4" />
              {cls.external_resource_url}
            </a>
          </div>
        )}

        {/* Additional videos */}
        {cls.additional_videos?.filter(v => v.url).length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Additional Videos</h4>
            {cls.additional_videos.filter(v => v.url).map((vid, i) => {
              const vidId = extractYouTubeId(vid.url);
              return (
                <div key={i} style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D', overflow: 'hidden' }}>
                  {vid.title && (
                    <p className="text-xs font-medium px-4 pt-3 pb-1" style={{ color: '#8B949E' }}>{vid.title}</p>
                  )}
                  {vidId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${vidId}`}
                      style={{ width: '100%', height: '320px', display: 'block' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={vid.title || `Video ${i + 1}`}
                    />
                  ) : (
                    <a href={vid.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 px-4 py-3">
                      <ExternalLink className="w-4 h-4" /> {vid.title || vid.url}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mark Complete CTA */}
        {enrollment && (
          <div style={{ backgroundColor: '#161B22', borderRadius: '12px', border: '1px solid #30363D' }} className="p-5">
            {isCompleted ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">Class Completed!</p>
                  {enrollment.completion_date && (
                    <p className="text-xs" style={{ color: '#8B949E' }}>Completed on {enrollment.completion_date}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm mb-4" style={{ color: '#8B949E' }}>
                  Ready? Mark this class as complete when you're done watching.
                </p>
                <Button
                  onClick={handleMarkComplete}
                  disabled={completing}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 py-3 text-base rounded-xl gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {completing ? 'Saving...' : 'Mark Complete'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}