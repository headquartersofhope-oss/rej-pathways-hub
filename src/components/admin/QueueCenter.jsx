import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Mail, CheckCircle, XCircle, Send, Clock, Home } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  needs_info: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-indigo-100 text-indigo-700',
  more_information_requested: 'bg-orange-100 text-orange-700',
  invited: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
};

export default function QueueCenter() {
  const [data, setData] = useState({ onboarding: [], userAccounts: [], housingReferrals: [] });
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(null);
  const [copyMsg, setCopyMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const [onboarding, userAccounts, housingReferrals] = await Promise.all([
      base44.entities.OnboardingRequest.list('-created_date', 50),
      base44.entities.UserAccount.list('-created_date', 50),
      base44.entities.HousingReferral.filter({ status: 'submitted' }),
    ]);
    setData({ onboarding, userAccounts, housingReferrals });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleResend = async (accountId) => {
    setResending(accountId);
    const res = await base44.functions.invoke('resendActivationLink', { user_account_id: accountId });
    if (res.data?.success) {
      toast.success('Activation link resent!');
    } else {
      toast.error(res.data?.error || 'Failed to resend');
    }
    setResending(null);
    fetchData();
  };

  const handleCopyActivationLink = async (account) => {
    if (!account.temporary_login_code) {
      toast.error('No active token. Use Resend to generate a new one.');
      return;
    }
    const appUrl = window.location.origin;
    const link = `${appUrl}/auth/activate?token=${encodeURIComponent(account.temporary_login_code)}`;
    await navigator.clipboard.writeText(link);
    setCopyMsg(account.id);
    toast.success('Activation link copied to clipboard!');
    setTimeout(() => setCopyMsg(null), 2000);
  };

  const pendingOnboarding = data.onboarding.filter(r => r.status === 'pending');
  const moreInfoNeeded = data.onboarding.filter(r => r.status === 'needs_info');
  const pendingActivations = data.userAccounts.filter(a => a.status === 'invited' || a.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-base">Request & Queue Center</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* Pending Onboarding */}
      <Card className={pendingOnboarding.length > 0 ? 'border-orange-300' : ''}>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            Pending Onboarding Requests
            <Badge className="bg-orange-100 text-orange-700 ml-auto">{pendingOnboarding.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {pendingOnboarding.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-2">
              {pendingOnboarding.map(req => (
                <div key={req.id} className="flex items-center justify-between gap-3 p-2.5 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{req.first_name} {req.last_name}</p>
                    <p className="text-xs text-muted-foreground">{req.email} · {req.request_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{new Date(req.created_date).toLocaleDateString()}</p>
                  </div>
                  <a href="/admin/onboarding" className="text-xs text-primary hover:underline shrink-0">Review →</a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Needs More Info */}
      {moreInfoNeeded.length > 0 && (
        <Card className="border-yellow-300">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-yellow-500" />
              Needs More Information
              <Badge className="bg-yellow-100 text-yellow-700 ml-auto">{moreInfoNeeded.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {moreInfoNeeded.map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 p-2.5 border rounded-lg text-sm">
                <div>
                  <p className="font-medium">{req.first_name} {req.last_name}</p>
                  <p className="text-xs text-muted-foreground">{req.email}</p>
                </div>
                <a href="/admin/onboarding" className="text-xs text-primary hover:underline shrink-0">Review →</a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activation Queue */}
      <Card className={pendingActivations.length > 0 ? 'border-blue-300' : ''}>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Pending Activations (Invited / Not Yet Logged In)
            <Badge className="bg-blue-100 text-blue-700 ml-auto">{pendingActivations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {pendingActivations.length === 0 ? (
            <p className="text-xs text-muted-foreground">All accounts are activated.</p>
          ) : (
            <div className="space-y-2">
              {pendingActivations.map(account => (
                <div key={account.id} className="flex items-center justify-between gap-2 p-2.5 border rounded-lg text-sm flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{account.email}</p>
                    <p className="text-xs text-muted-foreground">{account.app_role?.replace(/_/g, ' ')} · Resent {account.invitation_resent_count || 0}x</p>
                    {account.temporary_code_expires && (
                      <p className="text-xs text-muted-foreground">Expires: {new Date(account.temporary_code_expires).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCopyActivationLink(account)}>
                      {copyMsg === account.id ? '✓ Copied' : 'Copy Link'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleResend(account.id)} disabled={resending === account.id}>
                      <Send className="w-3 h-3 mr-1" />
                      {resending === account.id ? 'Sending...' : 'Resend Email'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Housing Referrals Queue */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Home className="w-4 h-4 text-rose-500" />
            Submitted Housing Referrals
            <Badge className="bg-rose-100 text-rose-700 ml-auto">{data.housingReferrals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {data.housingReferrals.length === 0 ? (
            <p className="text-xs text-muted-foreground">No submitted referrals pending.</p>
          ) : (
            <div className="space-y-2">
              {data.housingReferrals.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-2.5 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{r.participant_name}</p>
                    <p className="text-xs text-muted-foreground">{r.target_provider_name || 'No provider selected'} · {r.priority_level} priority</p>
                    <p className="text-xs text-muted-foreground">{r.referral_date}</p>
                  </div>
                  <a href="/housing-referrals" className="text-xs text-primary hover:underline shrink-0">View →</a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Onboarding History */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm">All Onboarding Requests (Recent 50)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1.5">
          {data.onboarding.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-2 text-xs border-b last:border-0 pb-1.5 last:pb-0">
              <span className="font-medium">{req.first_name} {req.last_name}</span>
              <span className="text-muted-foreground truncate">{req.email}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>{req.status}</span>
              <span className="text-muted-foreground shrink-0">{new Date(req.created_date).toLocaleDateString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}