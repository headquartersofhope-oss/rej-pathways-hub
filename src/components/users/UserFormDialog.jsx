import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/roles';
import { AlertCircle, Copy, Check } from 'lucide-react';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  app_role: 'staff',
};

const AVAILABLE_ROLES = [
  'admin',
  'case_manager',
  'staff',
  'probation_officer',
  'resident',
  'instructor',
  'program_manager',
];

export default function UserFormDialog({ open, onOpenChange, user, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [method, setMethod] = useState('create');
  const [confirmClose, setConfirmClose] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [sendInviteEmail, setSendInviteEmail] = useState(false);
  const [sendSMS, setSendSMS] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isEditing = !!user;

  const isDirty = () => {
    if (!user) {
      return Object.entries(form).some(([k, v]) => {
        if (k === 'app_role') return v !== 'staff';
        return v !== '';
      });
    }
    return Object.keys(EMPTY_FORM).some(k => String(form[k] ?? '') !== String(user[k] ?? ''));
  };

  const handleOpenChange = (open) => {
    if (!open && isDirty()) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(open);
  };

  const handleConfirmDiscard = () => {
    setConfirmClose(false);
    onOpenChange(false);
  };

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        app_role: user.role || 'staff',
      });
      setMethod('edit');
    } else {
      setForm(EMPTY_FORM);
      setMethod('create');
    }
    setErrors({});
    setSubmitError('');
    setSuccessData(null);
    setSendInviteEmail(false);
    setSendSMS(false);
  }, [user, open]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    if (!form.app_role) errs.app_role = 'Role is required.';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    
    // If SMS is requested, phone is required
    if (sendSMS && !form.phone?.trim()) {
      errs.phone = 'Phone is required to send SMS onboarding link.';
    }
    
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setSubmitError('');

    try {
      if (isEditing) {
        // Edit mode: update the user's role only
        await base44.entities.User.update(user.id, {
          role: form.app_role,
        });
        setSaving(false);
        onSaved();
        onOpenChange(false);
      } else {
        // Create or invite mode: use backend function for proper handling
        const result = await base44.functions.invoke('createUserWithOnboarding', {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          app_role: form.app_role,
          send_invite: sendInviteEmail,
          send_sms: sendSMS,
        });

        setSaving(false);
        
        // Show success with onboarding link
        if (result.user_id) {
          setSuccessData(result);
        } else {
          setSubmitError('User was created but without onboarding data.');
          onSaved();
          onOpenChange(false);
        }
      }
    } catch (error) {
      setSaving(false);
      console.error('User save error:', error);
      setSubmitError(error.message || 'Failed to save user');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Success state: show onboarding link
  if (successData && !isEditing) {
    return (
      <Dialog open={open} onOpenChange={() => { setSuccessData(null); onOpenChange(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✓ User Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/50 rounded-md">
              <p className="text-sm text-emerald-900">
                <strong>{successData.full_name}</strong> has been created as a <strong>{successData.app_role}</strong>.
              </p>
            </div>

            {successData.invite_sent && (
              <div className="p-3 bg-blue-50/50 border border-blue-200/50 rounded-md">
                <p className="text-sm text-blue-900">Invitation email sent to <strong>{successData.email}</strong></p>
              </div>
            )}

            {successData.invite_error && (
              <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-md">
                <p className="text-sm text-amber-900">Email could not be sent: {successData.invite_error}</p>
              </div>
            )}

            <div>
              <Label className="text-xs mb-2 block">Onboarding Link</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs break-all">
                <code className="flex-1">{successData.onboarding_url}</code>
                <button
                  onClick={() => copyToClipboard(successData.onboarding_url)}
                  className="flex-shrink-0 p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Share this link with the user or send via SMS.</p>
            </div>

            {successData.sms_ready && successData.phone && (
              <div>
                <Label className="text-xs mb-2 block">SMS Message</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs break-all">
                  <code className="flex-1">{successData.sms_message}</code>
                  <button
                    onClick={() => copyToClipboard(successData.sms_message)}
                    className="flex-shrink-0 p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                    title="Copy SMS"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Copy and paste into SMS to {successData.phone}</p>
              </div>
            )}

            <div className="flex gap-2 border-t pt-4">
              <Button
                onClick={() => {
                  setSuccessData(null);
                  onSaved();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">You have unsaved changes. If you close now, all entered data will be lost.</p>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => setConfirmClose(false)}>Keep Editing</Button>
          <Button variant="destructive" onClick={handleConfirmDiscard}>Discard Changes</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open && !successData} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit User' : 'Create New User'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {submitError && (
            <div className="flex gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{submitError}</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. John Smith"
              className={errors.full_name ? 'border-destructive mt-1' : 'mt-1'}
              disabled={isEditing}
            />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
          </div>

          <div>
            <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="user@example.com"
              className={errors.email ? 'border-destructive mt-1' : 'mt-1'}
              disabled={isEditing}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label className="text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="mt-1"
              disabled={isEditing}
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>

          <div>
            <Label className="text-xs">App Role <span className="text-destructive">*</span></Label>
            <Select value={form.app_role} onValueChange={v => set('app_role', v)}>
              <SelectTrigger className={errors.app_role ? 'border-destructive mt-1' : 'mt-1'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.app_role && <p className="text-xs text-destructive mt-1">{errors.app_role}</p>}
          </div>

          {!isEditing && (
            <>
              <div className="border-t pt-2 mt-2">
                <Label className="text-xs mb-2 block font-medium">Onboarding Options</Label>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendInviteEmail}
                    onChange={e => setSendInviteEmail(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Send invitation email</span>
                </label>
                {form.phone && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendSMS}
                      onChange={e => setSendSMS(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Generate SMS onboarding link</span>
                  </label>
                )}
              </div>
            </>
          )}

          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}