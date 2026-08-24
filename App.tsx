import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Trucks } from './pages/Trucks';
import { Optimizer } from './pages/Optimizer';
import { RoutePlanner } from './pages/RoutePlanner';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { BookService } from './pages/BookService';
import { Performance } from './pages/Performance';
import { AirOptimizer } from './pages/AirOptimizer';
import { SeaOptimizer } from './pages/SeaOptimizer';
import { AirRoutePlanner } from './pages/AirRoutePlanner';
import { SeaRoutePlanner } from './pages/SeaRoutePlanner';
import { ProtectedRoute } from './components/ProtectedRoute';

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-2">We're sorry, but an unexpected error occurred.</p>
            {this.state.errorMessage && (
              <p className="text-xs text-red-500 font-mono bg-red-50 p-3 rounded mb-4 break-words">
                {this.state.errorMessage}
              </p>
            )}
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/book" element={<BookService />} />

            {/* Protected routes with layout */}
            <Route element={<ProtectedRoute><Layout><Outlet /></Layout></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverDashboard /></ProtectedRoute>} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/trucks" element={<Trucks />} />
              <Route path="/optimizer" element={<ProtectedRoute><Optimizer /></ProtectedRoute>} />
              <Route path="/air-optimizer" element={<ProtectedRoute><AirOptimizer /></ProtectedRoute>} />
              <Route path="/sea-optimizer" element={<ProtectedRoute><SeaOptimizer /></ProtectedRoute>} />
              <Route path="/route" element={<ProtectedRoute><RoutePlanner /></ProtectedRoute>} />
              <Route path="/air-route" element={<ProtectedRoute><AirRoutePlanner /></ProtectedRoute>} />
              <Route path="/sea-route" element={<ProtectedRoute><SeaRoutePlanner /></ProtectedRoute>} />
              <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
            </Route>
          </Routes>
        </HashRouter>
      </DarkModeProvider>
    </ErrorBoundary>
  );
};

export default App;