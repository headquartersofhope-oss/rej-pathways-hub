import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AIGuidance = ({ role }) => {
  const guidance = {
    resident: {
      title: "Welcome, Resident!",
      steps: [
        "Confirm your personal details.",
        "Create a secure password to access your dashboard.",
        "Your next step is to review your classes and supports."
      ]
    },
    case_manager: {
      title: "Welcome, Case Manager!",
      steps: [
        "Confirm your staff details and organization.",
        "Create your password.",
        "You will only see residents assigned to your caseload."
      ]
    },
    staff: {
        title: "Welcome, Staff Member!",
        steps: [
            "Confirm your details.",
            "Create a secure password.",
            "Your access is based on your assigned permissions."
        ]
    },
    probation_officer: {
      title: "Welcome, Officer!",
      steps: [
        "Confirm your agency and details.",
        "Create your password.",
        "You will have read-only access to assigned residents and can add notes."
      ]
    },
    employer: {
      title: "Welcome, Employer!",
      steps: [
        "Confirm your company and contact information.",
        "Create your password.",
        "Your next step is to complete your employer profile and create a job listing."
      ]
    },
    partner: {
        title: "Welcome, Partner!",
        steps: [
            "Confirm your organization and contact details.",
            "Create your password.",
            "You'll be able to collaborate and share resources."
        ]
    },
    admin: {
        title: "Welcome, Admin!",
        steps: [
            "Confirm your account details.",
            "Create a secure password.",
            "You have full access to all administrative features."
        ]
    }
  };

  const roleGuidance = guidance[role] || { title: "Account Activation", steps: ["Create a password to activate your account."]};

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 mb-6">
      <h3 className="font-semibold text-primary mb-2">{roleGuidance.title}</h3>
      <ul className="space-y-1.5 text-sm text-primary/80">
        {roleGuidance.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary/50 flex-shrink-0" />
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};


export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [step, setStep] = useState('loading'); // loading, form, success, error
  const [error, setError] = useState('');
  const [userAccount, setUserAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!token) {
      setError('Activation token is missing. Please check the link.');
      setStep('error');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await base44.functions.invoke('verifyActivationToken', { token });
        if (response.data && response.data.error) {
            setError(response.data.error);
            setStep('error');
        } else if (response.data) {
            setUserAccount(response.data);
            setStep('form');
        } else {
            setError('Invalid response from server.');
            setStep('error');
        }
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'An unexpected error occurred.';
        setError(errorMsg);
        setStep('error');
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
        toast.error('Password must be at least 8 characters long.');
        return;
    }

    setIsSubmitting(true);
    try {
        const response = await base44.functions.invoke('activateUserAccount', {
            token,
            password
        });
        
        if(response.data && response.data.error){
            toast.error(response.data.error);
        } else if (response.data && response.data.success) {
            setStep('success');
            toast.success('Account activated! Redirecting you now...');
            setTimeout(() => navigate('/'), 2000);
        } else {
            toast.error('Failed to activate account.');
        }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to activate account.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Account Activation</CardTitle>
            <CardDescription>
              {step === 'loading' && 'Verifying your activation link...'}
              {step === 'form' && 'Create a password to complete your account setup.'}
              {step === 'success' && 'Your account has been successfully activated.'}
              {step === 'error' && 'There was a problem with your activation link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'loading' && (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {step === 'error' && (
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-medium">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Please contact support or ask for a new activation link.
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Activation Complete!</p>
                <p className="text-xs text-muted-foreground mt-1">You will be redirected shortly.</p>
              </div>
            )}

            {step === 'form' && userAccount && (
              <form onSubmit={handleSubmit}>
                <AIGuidance role={userAccount.app_role} />
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input value={userAccount.email} disabled />
                    </div>
                     <div>
                        <label className="text-sm font-medium">Role</label>
                        <Input value={userAccount.app_role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} disabled />
                    </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="password">Create Password</label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secure password"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="confirm-password">Confirm Password</label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate Account'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}