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
  phone_number: '',
  app_role: 'staff',
  organization_id: '',
  site_id: '',
  status: 'active',
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
  const [successData, setSuccessData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isEditing = !!user;

  const isDirty = () => {
    if (!user) {
      return Object.entries(form).some(([k, v]) => {
        if (k === 'app_role') return v !== 'staff';
        if (k === 'status') return v !== 'active';
        return v !== '';
      });
    }
    return Object.keys(EMPTY_FORM).some(k => String(form[k] ?? '') !== String(user[k] ?? ''));
  };

  const handleOpenChange = (open) => {
    if (!open && isDirty()) {
      if (!confirm('Discard unsaved changes?')) {
        return;
      }
    }
    setSuccessData(null);
    onOpenChange(open);
  };

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        app_role: user.app_role || 'staff',
        organization_id: user.organization_id || '',
        site_id: user.site_id || '',
        status: user.status || 'active',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setSubmitError('');
    setSuccessData(null);
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }

    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      console.log('Validation failed:', errs);
      setErrors(errs);
      return;
    }

    console.log(isEditing ? 'Updating user...' : 'Creating user...');
    setSaving(true);
    setSubmitError('');

    try {
      if (isEditing) {
        // Update existing user
        const result = await base44.functions.invoke('manageUser', {
          action: 'update',
          email: user.email,
          data: {
            phone_number: form.phone_number,
            app_role: form.app_role,
            organization_id: form.organization_id || undefined,
            site_id: form.site_id || undefined,
            status: form.status,
          },
        });

        if (result.success) {
          console.log('User update successful');
          setSaving(false);
          setForm(EMPTY_FORM); // Clear form so isDirty() returns false
          onSaved();
          handleOpenChange(false);
        } else {
          throw new Error(result.error || 'Update failed');
        }
      } else {
        // Create new user
        const result = await base44.functions.invoke('manageUser', {
          action: 'create',
          email: form.email,
          data: {
            full_name: form.full_name,
            phone_number: form.phone_number,
            app_role: form.app_role,
            organization_id: form.organization_id || undefined,
            site_id: form.site_id || undefined,
            status: form.status,
          },
        });

        if (result.success) {
          setSaving(false);
          setForm(EMPTY_FORM); // Clear form so isDirty() returns false
          setSuccessData(result);
        } else {
          throw new Error(result.error || 'Creation failed');
        }
      }
    } catch (error) {
      setSaving(false);
      console.error('User save failed:', {
        message: error.message,
        error: error,
        response: error.response?.data
      });
      setSubmitError(error.message || error?.response?.data?.error || 'Failed to save user');
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
      <Dialog open={open} onOpenChange={() => { setSuccessData(null); handleOpenChange(false); }}>
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

            <div>
              <Label className="text-xs mb-2 block">Onboarding Link</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs break-all">
                <code className="flex-1 font-mono text-[10px]">{successData.onboarding_url}</code>
                <button
                  onClick={() => copyToClipboard(successData.onboarding_url)}
                  className="flex-shrink-0 p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Share this link to onboard the user.</p>
            </div>

            {successData.phone && (
              <div>
                <Label className="text-xs mb-2 block">SMS Message (copy & send)</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs break-all">
                  <code className="flex-1 font-mono text-[10px]">Welcome! Complete your onboarding: {successData.onboarding_url}</code>
                  <button
                    onClick={() => copyToClipboard(`Welcome! Complete your onboarding: ${successData.onboarding_url}`)}
                    className="flex-shrink-0 p-1 hover:bg-muted-foreground/10 rounded transition-colors"
                    title="Copy SMS"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Send to {successData.phone}</p>
              </div>
            )}

            <div className="flex gap-2 border-t pt-4">
              <Button
                onClick={() => {
                  setSuccessData(null);
                  onSaved();
                  handleOpenChange(false);
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
    <Dialog open={open && !successData} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
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
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label className="text-xs">Phone <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              type="tel"
              value={form.phone_number}
              onChange={e => set('phone_number', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="mt-1"
            />
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

          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Organization ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={form.organization_id}
              onChange={e => set('organization_id', e.target.value)}
              placeholder="org-12345"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Site ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              value={form.site_id}
              onChange={e => set('site_id', e.target.value)}
              placeholder="site-12345"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save Changes' : 'Create User'}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}