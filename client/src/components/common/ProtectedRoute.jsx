import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants';

/**
 * ProtectedRoute — guards private pages.
 * Shows a spinner while the session is being restored.
 * Redirects to login if not authenticated.
 * Optionally enforces role-based access.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Still restoring session from HTTP-Only cookie
  if (loading) {
    return <FullPageSpinner message="Verifying session…" />;
  }

  // Not authenticated — redirect to login, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Role guard
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={ROUTES.NOT_FOUND} replace />;
  }

  return children;
};

export default ProtectedRoute;
