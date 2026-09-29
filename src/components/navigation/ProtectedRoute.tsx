import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { loading, user, isAuthenticated, isEmailVerified } = useAuth();
    const location = useLocation();
    if (loading) return <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">Checking your account...</div>;
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (!isEmailVerified) return <Navigate to="/verify-otp" replace state={{ email: user.email }} />;
    if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname, email: user.email }} />;
    return <>{children}</>;
}
