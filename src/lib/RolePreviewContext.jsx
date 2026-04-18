import React, { createContext, useState, useContext } from 'react';
import { getDataScopingFilter, getHiddenElements, canPerformAction } from './rolePreview';

const RolePreviewContext = createContext();

export function RolePreviewProvider({ children, user }) {
  const [previewRole, setPreviewRole] = useState(null);
  const [previewResidentId, setPreviewResidentId] = useState(null);

  const isPreviewActive = previewRole !== null;
  const currentRole = isPreviewActive ? previewRole : user?.role;
  const currentUser = isPreviewActive 
    ? { ...user, role: previewRole, preview: true }
    : { ...user, preview: false };

  const getDataFilter = () => {
    if (!isPreviewActive) return null;
    return getDataScopingFilter(previewRole, user?.id, user?.organization_id);
  };

  const isActionVisible = (action) => {
    if (!isPreviewActive) return true;
    return canPerformAction(previewRole, action);
  };

  const getHiddenUIElements = () => {
    if (!isPreviewActive) return [];
    return getHiddenElements(previewRole);
  };

  const exitPreview = () => {
    setPreviewRole(null);
    setPreviewResidentId(null);
  };

  const value = {
    isPreviewActive,
    previewRole,
    setPreviewRole,
    currentRole,
    currentUser,
    getDataFilter,
    isActionVisible,
    getHiddenUIElements,
    exitPreview,
    previewResidentId,
    setPreviewResidentId
  };

  return (
    <RolePreviewContext.Provider value={value}>
      {children}
    </RolePreviewContext.Provider>
  );
}

export function useRolePreview() {
  const context = useContext(RolePreviewContext);
  if (!context) {
    throw new Error('useRolePreview must be used within RolePreviewProvider');
  }
  return context;
}