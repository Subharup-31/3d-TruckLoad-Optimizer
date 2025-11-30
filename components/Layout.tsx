import React from 'react';
import { Navbar } from './Navbar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-slate-900 dark:bg-black text-slate-400 dark:text-slate-500 py-6 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} CargoLens XR. Optimized for efficiency.</p>
      </footer>
    </div>
  );
};