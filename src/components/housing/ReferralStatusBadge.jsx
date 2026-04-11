import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  draft:                     { label: 'Draft',                   className: 'bg-gray-100 text-gray-700 border-gray-200' },
  ready_to_submit:           { label: 'Ready to Submit',         className: 'bg-blue-100 text-blue-700 border-blue-200' },
  submitted:                 { label: 'Submitted',               className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  received:                  { label: 'Received',                className: 'bg-purple-100 text-purple-700 border-purple-200' },
  under_review:              { label: 'Under Review',            className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  more_information_requested:{ label: 'More Info Requested',     className: 'bg-orange-100 text-orange-700 border-orange-200' },
  approved:                  { label: 'Approved',                className: 'bg-green-100 text-green-700 border-green-200' },
  denied:                    { label: 'Denied',                  className: 'bg-red-100 text-red-700 border-red-200' },
  waitlisted:                { label: 'Waitlisted',              className: 'bg-teal-100 text-teal-700 border-teal-200' },
  withdrawn:                 { label: 'Withdrawn',               className: 'bg-gray-100 text-gray-500 border-gray-200' },
  closed:                    { label: 'Closed',                  className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export default function ReferralStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}