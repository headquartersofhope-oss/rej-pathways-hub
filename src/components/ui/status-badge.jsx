import * as React from "react"
import { cn } from "@/lib/utils"

const statusColorMap = {
  active: { bg: '#34D39914', text: '#34D399' },
  housing_pending: { bg: '#FBBF2414', text: '#FBBF24' },
  housing_eligible: { bg: '#60A5FA14', text: '#60A5FA' },
  employed: { bg: '#A78BFA14', text: '#A78BFA' },
  exited: { bg: '#F8717114', text: '#F87171' },
  graduated: { bg: '#2DD4BF14', text: '#2DD4BF' },
  pre_intake: { bg: '#94A3B814', text: '#94A3B8' },
  pending: { bg: '#FBBF2414', text: '#FBBF24' },
  approved: { bg: '#34D39914', text: '#34D399' },
  rejected: { bg: '#F8717114', text: '#F87171' },
  draft: { bg: '#94A3B814', text: '#94A3B8' },
  in_progress: { bg: '#60A5FA14', text: '#60A5FA' },
  completed: { bg: '#34D39914', text: '#34D399' },
};

function StatusBadge({ status, className, ...props }) {
  const colors = statusColorMap[status] || { bg: '#30363D', text: '#8B949E' };
  
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border border-transparent",
        className
      )}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      {...props}
    />
  );
}

export { StatusBadge, statusColorMap }