import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LearningOnboarding from './LearningOnboarding';
import ClassDetailView from './ClassDetailView.jsx';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Award, Calendar, CheckCircle2, Clock, BookOpen, Search, Star, ChevronRight } from 'lucide-react';
import LearningPathways from './LearningPathways';
import ClassViewer from './ClassViewer';
import { format, parseISO, isAfter } from 'date-fns';

const CATEGORIES = [
  { value: 'orientation', label: 'Orientation' },
  { value: 'employment', label: 'Employment' },
  { value: 'housing', label: 'Housing' },
  { value: 'financial_literacy', label: 'Financial Literacy' },
  { value: 'digital_literacy', label: 'Digital Literacy' },
  { value: 'ai_literacy', label: 'AI Literacy' },
  { value: 'life_skills', label: 'Life Skills' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'documentation', label: 'Documentation' },
];

const categoryColors = {
  orientation: 'bg-blue-50 text-blue-700',
  employment: 'bg-emerald-50 text-emerald-700',
  housing: 'bg-purple-50 text-purple-700',
  financial_literacy: 'bg-green-50 text-green-700',
  digital_literacy: 'bg-cyan-50 text-cyan-700',
  ai_literacy: 'bg-indigo-50 text-indigo-700',
  life_skills: 'bg-amber-50 text-amber-700',
  wellness: 'bg-rose-50 text-rose-700',
  documentation: 'bg-orange-50 text-orange-700',
};

const statusConfig = {
  enrolled: { color: 'bg-blue-50 text-blue-700', label: 'Enrolled' },
  in_progress: { color: 'bg-amber-50 text-amber-700', label: 'In Progress' },
  completed: { color: 'bg-emerald-50 text-emerald-700', label: 'Completed ✓' },
  dropped: { color: 'bg-slate-100 text-slate-600', label: 'Dropped' },
  no_show: { color: 'bg-red-50 text-red-700', label: 'No Show' },
};

function AvailableClassCard({ cls, onClick }) {
  const catColor = categoryColors[cls.category] || 'bg-muted text-muted-foreground';
  const catLabel = CATEGORIES.find(c => c.value === cls.category)?.label || cls.category;

  return (
    <Card className="p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight">{cls.title}</h4>
        </div>
        {cls.is_required && (
          <Badge className="text-[10px] bg-red-50 text-red-700 border-0 flex-shrink-0">Required</Badge>
        )}
      </div>
      {cls.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>
      )}
      <div className="flex flex-wrap gap-1 mt-auto">
        <Badge className={`text-[10px] border-0 ${catColor}`}>{catLabel}</Badge>
        {cls.difficulty_level && (
          <Badge variant="outline" className="text-[10px]">{cls.difficulty_level}</Badge>
        )}
        {cls.literacy_level_support === 'low' && (
          <Badge className="text-[10px] bg-purple-50 text-purple-700 border-0">Low Literacy</Badge>
        )}
      </div>
      {cls.estimated_minutes && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {cls.estimated_minutes < 60 ? `${cls.estimated_minutes} min` : `${Math.round(cls.estimated_minutes / 60)} hr`}
        </p>
      )}
    </Card>
  );
}

export default function MyCourses({ user }) {
  const queryClient = useQueryClient();
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCat, setCatalogCat] = useState('all');
  const [openClassId, setOpenClassId] = useState(null); // track by class id only

  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-enrollments', myResident?.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 300),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['my-certificates', myResident?.id],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['class-sessions'],
    queryFn: () => base44.entities.ClassSession.list('-session_date', 100),
  });

  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
  const enrollmentMap = Object.fromEntries(enrollments.map(e => [e.class_id, e]));
  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));

  // Derive openClass from live data so it auto-updates after quiz completion
  const openClass = openClassId
    ? { cls: classMap[openClassId], enrollment: enrollmentMap[openClassId] || null }
    : null;

  const completedCount = enrollments.filter(e => e.status === 'completed').length;
  const inProgressCount = enrollments.filter(e => e.status === 'in_progress' || e.status === 'enrolled').length;
  const progressPct = enrollments.length > 0 ? Math.round((completedCount / enrollments.length) * 100) : 0;

  // Upcoming sessions for enrolled classes
  const today = new Date();
  const upcomingSessions = sessions
    .filter(s => enrolledClassIds.has(s.class_id) && s.status === 'scheduled' && s.session_date && isAfter(parseISO(s.session_date), today))
    .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
    .slice(0, 5);

  // Available classes: active + published, not enrolled
  const activeClasses = classes.filter(c => c.is_active !== false && c.status !== 'draft' && c.status !== 'archived');
  const availableClasses = activeClasses.filter(c => !enrolledClassIds.has(c.id));

  const filteredAvailable = availableClasses.filter(c => {
    const matchSearch = !catalogSearch || c.title?.toLowerCase().includes(catalogSearch.toLowerCase()) || c.description?.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchCat = catalogCat === 'all' || c.category === catalogCat;
    return matchSearch && matchCat;
  });

  // Sort: required first
  filteredAvailable.sort((a, b) => (b.is_required ? 1 : 0) - (a.is_required ? 1 : 0));

  if (!myResident && !loadingClasses) {
    return (
      <div className="space-y-6">
        {/* Show catalog even without resident account */}
        <Card className="p-5 bg-blue-50 border-blue-200">
          <p className="text-sm font-medium text-blue-800">
            Your resident profile isn't linked yet. Contact staff to get enrolled in classes.
          </p>
        </Card>
        <AvailableCatalogSection
          classes={filteredAvailable}
          loading={loadingClasses}
          search={catalogSearch}
          onSearch={setCatalogSearch}
          category={catalogCat}
          onCategory={setCatalogCat}
          totalAvailable={availableClasses.length}
          onClassClick={(cls) => setOpenClassId(cls.id)}
        />
        {openClass?.cls && (
          <ClassDetailView
            open={!!openClass}
            onOpenChange={(v) => !v && setOpenClassId(null)}
            cls={openClass.cls}
            enrollment={null}
            resident={null}
            allEnrollments={[]}
            allClasses={classes}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI-Guided Onboarding */}
      <LearningOnboarding
        residentId={myResident.id}
        residentName={`${myResident.first_name} ${myResident.last_name}`}
        enrollments={enrollments}
      />

      {/* Progress Summary */}
      {enrollments.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading font-semibold text-sm">Your Learning Progress</p>
            <span className="text-sm font-bold text-primary">{completedCount}/{enrollments.length} completed</span>
          </div>
          <Progress value={progressPct} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">
            {completedCount} course{completedCount !== 1 ? 's' : ''} completed · {inProgressCount} active · {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} earned
          </p>
        </Card>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Upcoming Classes
          </h3>
          <div className="space-y-2">
            {upcomingSessions.map(s => {
              const cls = classMap[s.class_id];
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cls?.title || 'Class'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(s.session_date), 'EEE, MMM d')}
                      {s.start_time && ` · ${s.start_time}`}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Learning Pathways */}
      <LearningPathways
        classes={classes}
        enrollments={enrollments}
        certificates={certificates}
        isStaff={false}
        onClassClick={(cls) => setOpenClassId(cls.id)}
      />

      {/* My Enrollments — split into active and completed */}
      <div>
        <h3 className="font-heading font-semibold text-sm mb-3">My Assigned Classes</h3>
        {enrollments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground bg-muted/20">
            <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No classes assigned yet.</p>
            <p className="text-xs mt-1">Browse available classes below or ask staff to enroll you.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Active / In Progress / Not Started */}
            {enrollments.filter(e => e.status !== 'completed' && e.status !== 'dropped').map(enr => {
              const cls = classMap[enr.class_id];
              if (!cls) return null;
              const conf = statusConfig[enr.status] || statusConfig.enrolled;
              const isInProgress = enr.status === 'in_progress';
              return (
                <Card
                  key={enr.id}
                  className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow border-l-4 border-l-primary/40"
                  onClick={() => setOpenClassId(cls.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{cls.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORIES.find(c => c.value === cls.category)?.label || cls.category}
                      {cls.estimated_minutes && ` · ${cls.estimated_minutes < 60 ? cls.estimated_minutes + 'm' : Math.round(cls.estimated_minutes / 60) + 'h'}`}
                    </p>
                    {enr.quiz_score != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">Last score: {enr.quiz_score}%</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] border-0 ${conf.color}`}>{conf.label}</Badge>
                    <Button size="sm" variant={isInProgress ? 'default' : 'outline'} className="h-7 text-xs gap-1 pointer-events-none">
                      {isInProgress ? 'Continue' : 'Start'}
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}

            {/* Completed */}
            {enrollments.filter(e => e.status === 'completed').length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completed</h4>
                {enrollments.filter(e => e.status === 'completed').map(enr => {
                  const cls = classMap[enr.class_id];
                  if (!cls) return null;
                  return (
                    <Card
                      key={enr.id}
                      className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow border-l-4 border-l-emerald-400 mb-2"
                      onClick={() => setOpenClassId(cls.id)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{cls.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {CATEGORIES.find(c => c.value === cls.category)?.label || cls.category}
                          {enr.completion_date && ` · Completed ${enr.completion_date}`}
                          {enr.quiz_score != null && ` · Score: ${enr.quiz_score}%`}
                        </p>
                      </div>
                      <Badge className="text-[10px] border-0 bg-emerald-50 text-emerald-700">Completed ✓</Badge>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-600" /> My Certificates
          </h3>
          <div className="space-y-2">
            {certificates.map(cert => (
              <Card key={cert.id} className="p-4 flex items-center gap-4 border-yellow-200 bg-yellow-50/30">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{cert.certificate_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Issued {cert.issued_date}{cert.issued_by_name && ` by ${cert.issued_by_name}`}</p>
                </div>
                <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">Earned ✓</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Classes Catalog */}
      <AvailableCatalogSection
        classes={filteredAvailable}
        loading={loadingClasses}
        search={catalogSearch}
        onSearch={setCatalogSearch}
        category={catalogCat}
        onCategory={setCatalogCat}
        totalAvailable={availableClasses.length}
        onClassClick={(cls) => setOpenClassId(cls.id)}
      />

      {/* Class Detail Modal — enrollment derived from live query so it auto-refreshes after quiz */}
      {openClass?.cls && (
        <ClassDetailView
          open={!!openClass}
          onOpenChange={(v) => !v && setOpenClassId(null)}
          cls={openClass.cls}
          enrollment={openClass.enrollment}
          resident={myResident}
          allEnrollments={enrollments}
          allClasses={classes}
        />
      )}
    </div>
  );
}

function AvailableCatalogSection({ classes, loading, search, onSearch, category, onCategory, totalAvailable, onClassClick }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Available Classes
          {totalAvailable > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({totalAvailable} total)</span>
          )}
        </h3>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-8 text-sm" placeholder="Search classes..." value={search} onChange={e => onSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={onCategory}>
          <SelectTrigger className="w-full sm:w-44 h-8 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Card key={i} className="p-4 h-32 animate-pulse bg-muted/30" />)}
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {totalAvailable === 0
              ? 'No classes available yet. Check back soon!'
              : 'No classes match your filters.'}
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map(cls => <AvailableClassCard key={cls.id} cls={cls} onClick={() => onClassClick && onClassClick(cls)} />)}
        </div>
      )}
    </div>
  );
}