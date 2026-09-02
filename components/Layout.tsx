import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Truck } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';
import { useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pathTitles: Record<string, string> = {
    '/dashboard': 'Executive Mission Control',
    '/admin': 'Logistics Command Center',
    '/driver': 'Driver Mobile Console',
    '/inventory': 'Cargo Inventory Management',
    '/trucks': 'Commercial Fleet Specifications',
    '/optimizer': '3D Truck Load Optimizer',
    '/air-optimizer': 'Air Cargo ULD Optimizer',
    '/sea-optimizer': 'Maritime Container Optimizer',
    '/route': 'Road Logistics Route Planner',
    '/air-route': 'Air Flight Route Planner',
    '/sea-route': 'Maritime Sea-Lane Planner',
    '/performance': 'AI Model Analytics & SHAP',
  };

  const pageTitle = pathTitles[location.pathname] || 'LogiLoad Enterprise';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 p-1.2 rounded-md">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xs tracking-tight">{pageTitle}</span>
            </div>
          </div>
          <DarkModeToggle />
        </header>

        {/* Page Content Canvas */}
        <main className="flex-1 p-3 md:p-5 lg:p-6 max-w-[1920px] w-full mx-auto">
          {children}
        </main>

        {/* Global Enterprise Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-300">LogiLoad India</span>
            <span>— AI Multi-Modal Logistics & 3D Load Optimization Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              FastAPI + PyTorch Active
            </span>
            <span>&copy; {new Date().getFullYear()} LogiLoad Technologies</span>
          </div>
        </footer>
      </div>
    </div>
  );
};