import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, ClipboardList, FolderOpen, BookOpen, Star, Briefcase, Zap,
  Home, BarChart2, Handshake, Award, Package, Shield, UserCircle,
  Building2, FileText, CheckSquare, Calendar, MessageSquare, Settings
} from 'lucide-react';

const MODULES = [
  { label: 'Residents', path: '/residents', icon: Users, desc: 'All resident records', color: 'text-blue-600 bg-blue-50' },
  { label: 'Intake & Barriers', path: '/intake', icon: ClipboardList, desc: 'Intake assessments', color: 'text-orange-600 bg-orange-50' },
  { label: 'Case Management', path: '/case-management', icon: FolderOpen, desc: 'Service plans, tasks, notes', color: 'text-purple-600 bg-purple-50' },
  { label: 'Learning Center', path: '/learning', icon: BookOpen, desc: 'Classes, enrollments, certificates', color: 'text-green-600 bg-green-50' },
  { label: 'Job Readiness', path: '/job-readiness', icon: Star, desc: 'Mock interviews, resume, readiness', color: 'text-yellow-600 bg-yellow-50' },
  { label: 'Job Matching', path: '/job-matching', icon: Zap, desc: 'Matches, placements, employer links', color: 'text-teal-600 bg-teal-50' },
  { label: 'Employers', path: '/employers', icon: Briefcase, desc: 'Employer records and portals', color: 'text-slate-600 bg-slate-50' },
  { label: 'Housing Referrals', path: '/housing-referrals', icon: Home, desc: 'Referrals to external providers', color: 'text-rose-600 bg-rose-50' },
  { label: 'Reporting', path: '/reporting', icon: BarChart2, desc: 'Core metrics and outcomes', color: 'text-indigo-600 bg-indigo-50' },
  { label: 'Resident Outcomes', path: '/resident-outcomes', icon: Users, desc: 'Individual outcome tracking', color: 'text-blue-600 bg-blue-50' },
  { label: 'Employer Outcomes', path: '/employer-outcomes', icon: Briefcase, desc: 'Placement and retention data', color: 'text-teal-600 bg-teal-50' },
  { label: 'Alumni', path: '/alumni', icon: Award, desc: 'Alumni records and mentors', color: 'text-amber-600 bg-amber-50' },
  { label: 'Resource Inventory', path: '/resources', icon: Package, desc: 'Resource tracking and distribution', color: 'text-lime-600 bg-lime-50' },
  { label: 'Partner Agencies', path: '/partners', icon: Handshake, desc: 'External partner records', color: 'text-cyan-600 bg-cyan-50' },
  { label: 'Onboarding Queue', path: '/admin/onboarding', icon: ClipboardList, desc: 'Approve/reject onboarding requests', color: 'text-orange-600 bg-orange-50' },
  { label: 'User Management', path: '/users', icon: UserCircle, desc: 'Manage all users and roles', color: 'text-gray-600 bg-gray-50' },
  { label: 'Organizations', path: '/organizations', icon: Building2, desc: 'Multi-org settings', color: 'text-blue-600 bg-blue-50' },
  { label: 'Sites', path: '/sites', icon: Building2, desc: 'Site locations', color: 'text-blue-600 bg-blue-50' },
  { label: 'Module Settings', path: '/modules', icon: Settings, desc: 'Toggle feature modules', color: 'text-gray-600 bg-gray-50' },
  { label: 'Audit Logs', path: '/audit-logs', icon: Shield, desc: 'All system activity logs', color: 'text-red-600 bg-red-50' },
  { label: 'Documents', path: '/documents', icon: FileText, desc: 'Document storage', color: 'text-gray-600 bg-gray-50' },
  { label: 'Messages', path: '/messages', icon: MessageSquare, desc: 'Internal messaging', color: 'text-blue-600 bg-blue-50' },
];

export default function ModuleQuickAccess() {
  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold text-base">Module Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {MODULES.map(({ label, path, icon: Icon, desc, color }) => (
          <Link key={path} to={path}>
            <Card className="hover:shadow-md transition-all cursor-pointer group h-full">
              <CardContent className="p-3 flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}