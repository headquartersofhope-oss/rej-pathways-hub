import {
  ClipboardList, Users, BookOpen, Target,
  Briefcase, Building2, Shield, BarChart3
} from 'lucide-react';

export const MODULES = [
  {
    slug: 'intake_barriers',
    name: 'Intake & Barriers',
    description: 'Intake assessments, barrier identification, and needs evaluation',
    icon: ClipboardList,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    slug: 'case_management',
    name: 'Case Management',
    description: 'Service plans, appointments, notes, and task tracking',
    icon: Users,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    slug: 'learning',
    name: 'Learning',
    description: 'Classes, curricula, attendance, and certifications',
    icon: BookOpen,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    slug: 'job_readiness',
    name: 'Job Readiness',
    description: 'Skills assessments, resume building, and interview prep',
    icon: Target,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    slug: 'job_matching',
    name: 'Job Matching',
    description: 'Job board, matching algorithms, and placement tracking',
    icon: Briefcase,
    color: 'text-indigo-600 bg-indigo-50',
  },
  {
    slug: 'employer_portal',
    name: 'Employer Portal',
    description: 'Employer dashboard, candidate review, and communication',
    icon: Building2,
    color: 'text-rose-600 bg-rose-50',
  },
  {
    slug: 'compliance_gps',
    name: 'Compliance / GPS',
    description: 'Probation check-ins, GPS monitoring, and compliance tracking',
    icon: Shield,
    color: 'text-slate-600 bg-slate-100',
  },
  {
    slug: 'outcomes_reporting',
    name: 'Outcomes & Reporting',
    description: 'Outcome metrics, grant reporting, and data exports',
    icon: BarChart3,
    color: 'text-teal-600 bg-teal-50',
  },
];

export function getModule(slug) {
  return MODULES.find(m => m.slug === slug);
}