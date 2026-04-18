import React, { useState } from 'react';
import { PREVIEWABLE_ROLES, ROLE_VISIBILITY, canUsePreview } from '@/lib/rolePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, X, Check } from 'lucide-react';

export default function RolePreviewPanel({ currentUser, onPreviewChange }) {
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [previewRole, setPreviewRole] = useState('case_manager');

  if (!canUsePreview(currentUser?.role)) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Preview Access Denied</p>
            <p className="text-sm text-destructive/80">Only admins and managers can use role preview mode.</p>
          </div>
        </div>
      </div>
    );
  }

  const visibility = previewEnabled ? ROLE_VISIBILITY[previewRole] : null;

  const handlePreviewChange = (newRole) => {
    setPreviewRole(newRole);
    onPreviewChange?.(newRole);
  };

  const handleTogglePreview = (enabled) => {
    setPreviewEnabled(enabled);
    if (!enabled) {
      onPreviewChange?.(null);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-600" />
              Role Preview Mode
            </CardTitle>
            <CardDescription>
              Simulate views and permissions for different roles
            </CardDescription>
          </div>
          {previewEnabled && (
            <Badge className="bg-amber-600 text-white flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              PREVIEW ACTIVE
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current User Info */}
        <div className="bg-white rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Your Real Role</p>
          <p className="font-semibold">{currentUser?.full_name}</p>
          <Badge className="mt-2 bg-blue-100 text-blue-900">
            {currentUser?.role?.toUpperCase()}
          </Badge>
        </div>

        {/* Preview Toggle */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Preview Mode</p>
          <div className="flex gap-2">
            <Button
              variant={previewEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTogglePreview(true)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Enable Preview
            </Button>
            <Button
              variant={!previewEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTogglePreview(false)}
              className="gap-2"
            >
              <EyeOff className="w-4 h-4" />
              Exit Preview
            </Button>
          </div>
        </div>

        {/* Preview Role Selector */}
        {previewEnabled && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Select Role to Preview</p>
            <Select value={previewRole} onValueChange={handlePreviewChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREVIEWABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_VISIBILITY[role]?.label || role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Preview Information */}
        {previewEnabled && visibility && (
          <div className="space-y-3 bg-white rounded-lg p-3 border">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Previewing</p>
              <p className="font-semibold text-lg">{visibility.label}</p>
            </div>

            {/* Data Access Level */}
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Data Access</p>
              <Badge variant="outline" className="bg-blue-50">
                {visibility.dataAccess.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Visible Pages */}
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Visible Pages</p>
              <div className="grid grid-cols-2 gap-1">
                {visibility.pages.map((page) => (
                  <div key={page.path} className="flex items-center gap-2 text-xs p-2 bg-green-50 rounded border border-green-200">
                    <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span>{page.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Actions */}
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Available Actions</p>
              <div className="flex flex-wrap gap-1">
                {visibility.actions.map((action) => (
                  <Badge key={action} variant="secondary" className="text-xs">
                    {action.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Hidden Elements */}
            {visibility.hiddenElements.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Hidden Elements</p>
                <div className="space-y-1">
                  {visibility.hiddenElements.map((element) => (
                    <div key={element} className="flex items-center gap-2 text-xs p-2 bg-red-50 rounded border border-red-200">
                      <X className="w-3 h-3 text-red-600 flex-shrink-0" />
                      <span>{element.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exit Preview Notice */}
        {!previewEnabled && (
          <div className="text-xs text-muted-foreground p-2 bg-slate-50 rounded border">
            Role preview mode is <strong>OFF</strong>. You're seeing the app as your actual role: <strong>{currentUser?.role}</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}