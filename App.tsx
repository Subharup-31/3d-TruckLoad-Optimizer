import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Trucks } from './pages/Trucks';
import { Optimizer } from './pages/Optimizer';
import { RoutePlanner } from './pages/RoutePlanner';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { AdminDashboard } from './pages/AdminDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

// Simple error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">We're sorry, but an unexpected error occurred.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { DarkModeProvider } from './contexts/DarkModeContext';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <DarkModeProvider>
      <HashRouter>
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute><Layout><Outlet /></Layout></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverDashboard /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute requiredRole="admin"><Inventory /></ProtectedRoute>} />
            <Route path="/trucks" element={<ProtectedRoute requiredRole="admin"><Trucks /></ProtectedRoute>} />
            <Route path="/optimizer" element={<ProtectedRoute><Optimizer /></ProtectedRoute>} />
            <Route path="/route" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />
          </Route>
        </Routes>
      </HashRouter>
      </DarkModeProvider>
    </ErrorBoundary>
  );
};

export default App;