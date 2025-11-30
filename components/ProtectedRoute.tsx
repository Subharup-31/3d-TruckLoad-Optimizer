import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'driver';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole
}) => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');

    // If not logged in, redirect to login page
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    // If a specific role is required and doesn't match, redirect to login
    if (requiredRole && userRole !== requiredRole) {
        // Redirect to appropriate dashboard
        if (userRole === 'admin') {
            return <Navigate to="/admin" replace />;
        } else if (userRole === 'driver') {
            return <Navigate to="/driver" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};