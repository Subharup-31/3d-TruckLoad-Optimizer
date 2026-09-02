import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Truck, Package, Map, Box, Menu, X, Camera, User, Shield, BarChart3, TrendingUp, Anchor, Navigation, Plane, Waves, Building, Briefcase } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole'));
  }, []);

  const adminNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'Inventory', path: '/inventory', icon: <Package className="w-5 h-5" /> },
    { name: 'Trucks', path: '/trucks', icon: <Truck className="w-5 h-5" /> },
    { name: '3D Load', path: '/optimizer', icon: <Box className="w-5 h-5" /> },
    { name: 'Air Load', path: '/air-optimizer', icon: <Plane className="w-5 h-5" /> },
    { name: 'Sea Load', path: '/sea-optimizer', icon: <Anchor className="w-5 h-5" /> },
    { name: 'Road Routes', path: '/route', icon: <Map className="w-5 h-5" /> },
    { name: 'Air Routes', path: '/air-route', icon: <Navigation className="w-5 h-5" /> },
    { name: 'Sea Routes', path: '/sea-route', icon: <Waves className="w-5 h-5" /> },
    { name: 'Analytics', path: '/performance', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  const driverNavItems = [
    { name: 'My Deliveries', path: '/driver', icon: <Truck className="w-5 h-5" /> },
    { name: 'Messages', path: '/driver#messages', icon: <Package className="w-5 h-5" /> },
  ];

  const dealerNavItems = [
    { name: 'Dealership Portal', path: '/admin', icon: <Building className="w-5 h-5" /> },
  ];

  const navItems = (userRole === 'admin' || userRole === 'manager') ? adminNavItems : 
                  userRole === 'dealer' ? dealerNavItems : 
                  userRole === 'driver' ? driverNavItems : 
                  adminNavItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-900/90 dark:bg-black/90 backdrop-blur-md text-white sticky top-0 z-50 shadow-xl border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <div className="bg-brand-600 p-1.5 rounded-lg">
              <Truck className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
            <span className="font-black text-xl tracking-tight text-white ml-2">
              Logi<span className="text-brand-500">LoadIN</span>
            </span>
          </Link>

          {/* Desktop Navigation & Actions */}
          <div className="hidden md:flex items-center gap-4">
            {/* Roles Display */}
            <div className="flex items-center gap-2 mr-2">
              {userRole === 'admin' && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold uppercase rounded border border-red-500/30">Admin</span>
              )}
              {userRole === 'manager' && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/30">Manager</span>
              )}
              {userRole === 'dealer' && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded border border-purple-500/30">Dealer</span>
              )}
              {userRole === 'driver' && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase rounded border border-green-500/30">Driver</span>
              )}
              {userRole && (
                <Link 
                  to="/login" 
                  className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors"
                >
                  Switch
                </Link>
              )}
            </div>

            {/* Nav Items */}
            <div className="flex items-baseline space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2"></div>
            <DarkModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden items-center gap-3">
            <DarkModeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-700 focus:outline-none transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 dark:bg-gray-950 border-t border-slate-700 shadow-inner">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
            
            <div className="pt-4 mt-4 border-t border-slate-700">
              {userRole && (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:bg-slate-700 hover:text-white"
                >
                  <User className="w-5 h-5" />
                  Switch Role (Current: {userRole})
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};