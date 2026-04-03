import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS } from '@/lib/roles';
import { AlertCircle } from 'lucide-react';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  role: 'staff',
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
  const [method, setMethod] = useState('invite');
  const [confirmClose, setConfirmClose] = useState(false);

  const isEditing = !!user;

  const isDirty = () => {
    if (!user) {
      return Object.entries(form).some(([k, v]) => {
        if (k === 'status') return v !== 'active';
        if (k === 'role') return v !== 'staff';
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
        role: user.role || 'staff',
      });
      setMethod('edit');
    } else {
      setForm(EMPTY_FORM);
      setMethod('invite');
    }
    setErrors({});
    setSubmitError('');
  }, [user, open]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    if (!form.role) errs.role = 'Role is required.';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.email && !emailRegex.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
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
          role: form.role,
        });
      } else if (method === 'invite') {
        // Invite mode: use inviteUser
        await base44.users.inviteUser(form.email, form.role);
      } else {
        // Create mode: create user directly via entity
        await base44.entities.User.create({
          full_name: form.full_name,
          email: form.email,
          role: form.role,
        });
      }

      setSaving(false);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      setSaving(false);
      console.error('User save error:', error);
      setSubmitError(error.message || 'Failed to save user');
    }
  };

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

    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {submitError && (
            <div className="flex gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{submitError}</p>
            </div>
          )}

          {!isEditing && (
            <div>
              <Label className="text-xs mb-2 block">Add Method</Label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 flex-1 p-2 border rounded cursor-pointer hover:bg-muted transition-colors" style={{ borderColor: method === 'invite' ? 'var(--primary)' : 'var(--border)' }}>
                  <input type="radio" checked={method === 'invite'} onChange={() => setMethod('invite')} className="w-4 h-4" />
                  <span className="text-sm">Invite via Email</span>
                </label>
                <label className="flex items-center gap-2 flex-1 p-2 border rounded cursor-pointer hover:bg-muted transition-colors" style={{ borderColor: method === 'create' ? 'var(--primary)' : 'var(--border)' }}>
                  <input type="radio" checked={method === 'create'} onChange={() => setMethod('create')} className="w-4 h-4" />
                  <span className="text-sm">Create Directly</span>
                </label>
              </div>
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
            <Label className="text-xs">Role <span className="text-destructive">*</span></Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger className={errors.role ? 'border-destructive mt-1' : 'mt-1'}>
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
            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : method === 'invite' ? 'Send Invite' : 'Create User'}
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}