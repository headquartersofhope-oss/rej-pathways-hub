import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, CheckCircle, Clock, AlertCircle, Home, Users, TrendingUp
} from 'lucide-react';

/**
 * HousingAlerts: Real-time housing workflow status alerts
 * Shows case managers and admins key housing milestones and blockers
 */
export default function HousingAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const referrals = await base44.entities.HousingReferral.list('-referral_date', 100);
        const residents = await base44.entities.Resident.list();
        const residentsMap = new Map(residents.map(r => [r.id, r]));

        const newAlerts = [];

        // Alert: Approved placements needing move-in coordination
        const approvedReferrals = referrals.filter(r => r.status === 'approved');
        if (approvedReferrals.length > 0) {
          newAlerts.push({
            id: 'approved_placements',
            type: 'success',
            severity: 'info',
            icon: CheckCircle,
            title: `${approvedReferrals.length} Housing Placement(s) Approved`,
            message: 'Ready for move-in coordination and onboarding',
            action: 'Review placements',
            count: approvedReferrals.length,
          });
        }

        // Alert: Submitted referrals under review
        const underReview = referrals.filter(r => r.status === 'under_review');
        if (underReview.length > 0) {
          newAlerts.push({
            id: 'under_review',
            type: 'info',
            severity: 'medium',
            icon: Clock,
            title: `${underReview.length} Referral(s) Under Review`,
            message: 'Awaiting housing provider decision',
            action: 'Check status',
            count: underReview.length,
          });
        }

        // Alert: Denied or waitlisted (blockers)
        const deniedReferrals = referrals.filter(r => r.status === 'denied');
        const waitlistedReferrals = referrals.filter(r => r.status === 'waitlisted');
        if (deniedReferrals.length > 0 || waitlistedReferrals.length > 0) {
          newAlerts.push({
            id: 'denied_waitlisted',
            type: 'warning',
            severity: 'high',
            icon: AlertTriangle,
            title: `${deniedReferrals.length + waitlistedReferrals.length} Placement(s) Blocked`,
            message: `${deniedReferrals.length} denied, ${waitlistedReferrals.length} waitlisted`,
            action: 'Review alternatives',
            count: deniedReferrals.length + waitlistedReferrals.length,
          });
        }

        // Alert: More information requested (action needed)
        const moreInfoNeeded = referrals.filter(r => r.status === 'more_information_requested');
        if (moreInfoNeeded.length > 0) {
          newAlerts.push({
            id: 'more_info',
            type: 'warning',
            severity: 'high',
            icon: AlertCircle,
            title: `${moreInfoNeeded.length} Referral(s) Waiting for Documents`,
            message: 'Housing providers have requested additional information',
            action: 'Provide documents',
            count: moreInfoNeeded.length,
          });
        }

        // Alert: Stalled referrals (30+ days in review)
        const stalledReferrals = referrals.filter(r => {
          if (r.status !== 'under_review') return false;
          const days = Math.floor((new Date() - new Date(r.referral_date)) / (1000 * 60 * 60 * 24));
          return days > 30;
        });
        if (stalledReferrals.length > 0) {
          newAlerts.push({
            id: 'stalled',
            type: 'error',
            severity: 'high',
            icon: AlertTriangle,
            title: `${stalledReferrals.length} Referral(s) Stalled (30+ days)`,
            message: 'No response from housing provider—may need follow-up',
            action: 'Follow up',
            count: stalledReferrals.length,
          });
        }

        // Alert: No housing provider configured
        const providers = await base44.entities.HousingProvider.list();
        if (providers.length === 0) {
          newAlerts.push({
            id: 'no_providers',
            type: 'error',
            severity: 'critical',
            icon: Home,
            title: 'No Housing Providers Configured',
            message: 'Housing referrals cannot be submitted. Add providers first.',
            action: 'Configure providers',
            count: 0,
          });
        }

        // Alert: Active residents without any referral
        const activeResidents = residents.filter(r => r.status === 'active');
        const residentIdsWithReferral = new Set(referrals.map(r => r.resident_id));
        const noHousingReferral = activeResidents.filter(r => !residentIdsWithReferral.has(r.id));
        if (noHousingReferral.length > 0) {
          newAlerts.push({
            id: 'no_housing_referral',
            type: 'info',
            severity: 'medium',
            icon: Users,
            title: `${noHousingReferral.length} Active Resident(s) Without Housing Referral`,
            message: 'May need housing assessment or referral submission',
            action: 'Review',
            count: noHousingReferral.length,
          });
        }

        // Alert: Housing provider availability trend
        const providersActive = providers.filter(p => p.is_active);
        const totalBeds = providersActive.reduce((sum, p) => sum + (p.available_beds || 0), 0);
        if (providersActive.length > 0 && totalBeds < 5) {
          newAlerts.push({
            id: 'low_availability',
            type: 'warning',
            severity: 'medium',
            icon: TrendingUp,
            title: `Low Bed Availability: ${totalBeds} beds across ${providersActive.length} providers`,
            message: 'May need additional provider partnerships',
            action: 'View availability',
            count: totalBeds,
          });
        }

        setAlerts(newAlerts);
      } catch (err) {
        console.error('Failed to fetch housing alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-4 text-sm text-muted-foreground">Loading housing alerts...</div>;
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          ✓ All housing workflows healthy—no alerts.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const Icon = alert.icon;
        const bgClass = {
          success: 'bg-emerald-50 border-emerald-200',
          info: 'bg-blue-50 border-blue-200',
          warning: 'bg-amber-50 border-amber-200',
          error: 'bg-red-50 border-red-200',
        }[alert.type];
        
        const textClass = {
          success: 'text-emerald-800',
          info: 'text-blue-800',
          warning: 'text-amber-800',
          error: 'text-red-800',
        }[alert.type];

        const iconClass = {
          success: 'text-emerald-600',
          info: 'text-blue-600',
          warning: 'text-amber-600',
          error: 'text-red-600',
        }[alert.type];

        return (
          <Card key={alert.id} className={`border ${bgClass}`}>
            <CardContent className="p-3 flex items-start gap-3">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${textClass}`}>{alert.title}</p>
                  {alert.count > 0 && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {alert.count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 h-fit">
                {alert.action}
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}