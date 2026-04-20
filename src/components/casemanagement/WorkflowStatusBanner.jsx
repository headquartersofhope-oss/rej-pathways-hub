import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Home,
  Briefcase,
  Car,
} from 'lucide-react';

const STATUS_CONFIG = {
  'pre_intake': { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Pre-Intake' },
  'active': { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Active' },
  'housing_eligible': { icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Housing Eligible' },
  'housing_pending': { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Housing Pending' },
  'employed': { icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Employed' },
  'graduated': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Graduated' },
  'exited': { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Exited' },
};

export default function WorkflowStatusBanner({ resident, placement }) {
  const config = STATUS_CONFIG[resident.status] || STATUS_CONFIG['active'];
  const Icon = config.icon;

  return (
    <Card className="p-4 border" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
      <div className="flex items-center gap-3">
         <Icon className={`w-5 h-5 ${config.color} flex-shrink-0`} />
         <div className="flex-1 min-w-0">
           <p className="text-sm font-medium text-white">
             {config.label}
             {placement && (
               <span className="text-xs ml-2" style={{ color: '#8B949E' }}>
                 • Placed in {placement.house_name}
               </span>
             )}
           </p>
           {resident.assigned_case_manager && (
             <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
               Assigned to {resident.assigned_case_manager}
             </p>
           )}
         </div>
         <Badge variant="outline" className="flex-shrink-0" style={{ color: '#CDD9E5', borderColor: '#30363D', backgroundColor: 'transparent' }}>
           {resident.global_resident_id}
         </Badge>
       </div>
     </Card>
   );
}