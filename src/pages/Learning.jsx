import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GraduationCap } from 'lucide-react';
import PremiumPageHeader from '@/components/premium/PremiumPageHeader';
import { isStaff } from '@/lib/roles';
import ClassCatalog from '@/components/learning/ClassCatalog';
import ClassSchedule from '@/components/learning/ClassSchedule';
import EnrollmentManager from '@/components/learning/EnrollmentManager';
import MyCourses from '@/components/learning/MyCourses';
import AttendanceSheet from '@/components/learning/AttendanceSheet';
import StaffRecommendationsDashboard from '@/components/learning/StaffRecommendationsDashboard';
import LearningPathways from '@/components/learning/LearningPathways';
import StaffPathwaysDashboard from '@/components/learning/StaffPathwaysDashboard';

export default function Learning() {
  const { user } = useOutletContext();
  const staffView = !user?.role || user?.role !== 'resident';
  const [defaultTab, setDefaultTab] = useState('catalog');
  const [preselectedSession, setPreselectedSession] = useState(null);

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-list'],
    queryFn: () => base44.entities.Resident.list('-created_date', 300),
    enabled: staffView,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
    enabled: staffView,
  });

  const handleTakeAttendance = (session) => {
    setPreselectedSession(session);
    setDefaultTab('attendance');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <PremiumPageHeader
        title="Learning Center"
        subtitle={staffView ? "Manage classes, enrollments, and certifications" : "Your classes and progress"}
        icon={GraduationCap}
      />

      {staffView ? (
        <Tabs value={defaultTab} onValueChange={setDefaultTab}>
          <TabsList className="mb-5 flex-wrap h-auto gap-1">
            <TabsTrigger value="catalog">Class Catalog</TabsTrigger>
            <TabsTrigger value="pathways">Pathways</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog">
            <ClassCatalog user={user} />
          </TabsContent>
          <TabsContent value="pathways">
            <StaffPathwaysDashboard user={user} classes={classes} />
          </TabsContent>
          <TabsContent value="recommendations">
            <StaffRecommendationsDashboard user={user} />
          </TabsContent>
          <TabsContent value="schedule">
            <ClassSchedule user={user} onTakeAttendance={handleTakeAttendance} />
          </TabsContent>
          <TabsContent value="enrollments">
            <EnrollmentManager user={user} />
          </TabsContent>
          <TabsContent value="attendance">
            <AttendanceSheet
              user={user}
              classes={classes}
              residents={residents}
              preselectedSession={preselectedSession}
              onPreselectedConsumed={() => setPreselectedSession(null)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <MyCourses user={user} />
      )}
    </div>
  );
}