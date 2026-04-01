import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GraduationCap } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { isStaff } from '@/lib/roles';
import ClassCatalog from '@/components/learning/ClassCatalog';
import ClassSchedule from '@/components/learning/ClassSchedule';
import EnrollmentManager from '@/components/learning/EnrollmentManager';
import MyCourses from '@/components/learning/MyCourses';

export default function Learning() {
  const { user } = useOutletContext();
  const staffView = !user?.role || user?.role !== 'resident';

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Learning Center"
        subtitle={staffView ? "Manage classes, enrollments, and certifications" : "Your classes and progress"}
        icon={GraduationCap}
      />

      {staffView ? (
        <Tabs defaultValue="catalog">
          <TabsList className="mb-5 flex-wrap h-auto gap-1">
            <TabsTrigger value="catalog">Class Catalog</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog">
            <ClassCatalog user={user} />
          </TabsContent>
          <TabsContent value="schedule">
            <ClassSchedule user={user} />
          </TabsContent>
          <TabsContent value="enrollments">
            <EnrollmentManager user={user} />
          </TabsContent>
        </Tabs>
      ) : (
        <MyCourses user={user} />
      )}
    </div>
  );
}