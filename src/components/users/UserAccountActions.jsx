import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UserAccountActions({ userAccount, onRefresh }) {
  const [isResending, setIsResending] = useState(false);

  const handleResendLink = async () => {
    setIsResending(true);
    try {
      await base44.functions.invoke('resendActivationLink', {
        user_account_id: userAccount.id,
      });
      toast.success('Activation link resent successfully');
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to resend activation link');
    } finally {
      setIsResending(false);
    }
  };

  const showResendButton = ['invited', 'pending', 'first_login_required'].includes(userAccount.status);

  return (
    <div className="flex gap-2">
      {showResendButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleResendLink}
          disabled={isResending}
          className="gap-2"
        >
          {isResending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          Resend Link
        </Button>
      )}
    </div>
  );
}