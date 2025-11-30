import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Truck, Package, Map, Box, Menu, X, Camera, User, Shield } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  const adminNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Truck className="w-5 h-5" /> },
    { name: 'Inventory', path: '/inventory', icon: <Package className="w-5 h-5" /> },
    { name: 'Trucks', path: '/trucks', icon: <Box className="w-5 h-5" /> },
    { name: 'Load 3D', path: '/optimizer', icon: <Box className="w-5 h-5" /> },
    { name: 'Route Planner', path: '/route', icon: <Map className="w-5 h-5" /> },
  ];

  const driverNavItems = [
    { name: 'My Deliveries', path: '/driver', icon: <Package className="w-5 h-5" /> },
    { name: 'Messages', path: '/driver#messages', icon: <Truck className="w-5 h-5" /> },
  ];

  const navItems = userRole === 'admin' ? adminNavItems :
    userRole === 'driver' ? driverNavItems :
      adminNavItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-900 dark:bg-black text-white sticky top-0 z-50 shadow-lg transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-brand-500">
              <Truck className="w-8 h-8" />
              <span>CargoLens <span className="text-white font-light">XR</span></span>
            </Link>
            {userRole === 'admin' && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded">Admin</span>
            )}
            {userRole === 'driver' && (
              <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded">Driver</span>
            )}
            {(userRole === 'admin' || userRole === 'driver') && (
              <Link
                to="/login"
                className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
              >
                Change Role
              </Link>
            )}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-baseline space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </div>
            <DarkModeToggle />
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-700 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 dark:bg-gray-950">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <div className="flex justify-end px-3 pb-2">
              <DarkModeToggle />
            </div>
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 block px-3 py-2 rounded-md text-base font-medium ${isActive(item.path)
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
            {(userRole === 'admin' || userRole === 'driver') && (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-slate-700 hover:text-white"
              >
                <User className="w-5 h-5" />
                Change Role
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};