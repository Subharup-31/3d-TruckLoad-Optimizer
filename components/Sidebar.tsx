import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Truck, Package, Map, Box, Menu, X, User,
  BarChart3, TrendingUp, Anchor, Navigation, Plane,
  Waves, Building, ChevronLeft, ChevronRight, LogOut,
  Shield, Layers, Compass, Sparkles, Activity
} from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Operator');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'admin';
    const user = localStorage.getItem('username') || (role === 'admin' ? 'admin' : role);
    setUserRole(role);
    setUsername(user);
  }, [location]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
    localStorage.removeItem('logiload_jwt_token');
    localStorage.removeItem('username');
    navigate('/login');
  };

  const getNavGroups = () => {
    if (userRole === 'driver') {
      return [
        {
          title: 'Driver Operations',
          items: [
            { name: 'Driver Console', path: '/driver', icon: Compass, badge: 'Live' },
          ]
        }
      ];
    }

    if (userRole === 'dealer') {
      return [
        {
          title: 'Dealership Portal',
          items: [
            { name: 'Dealership Hub', path: '/admin', icon: Building, badge: 'Dealer' },
            { name: 'Stock & Inventory', path: '/inventory', icon: Package, badge: null },
            { name: 'Book Shipment', path: '/book', icon: Box, badge: 'Restock' },
          ]
        }
      ];
    }

    // Default / Admin / Manager: Full Enterprise Suite
    return [
      {
        title: 'Operations',
        items: [
          { name: 'Dashboard', path: '/dashboard', icon: BarChart3, badge: null },
          { name: 'Command Center', path: '/admin', icon: Shield, badge: userRole === 'admin' ? 'Admin' : 'Manager' },
          { name: 'AI Performance', path: '/performance', icon: TrendingUp, badge: 'ML' },
        ]
      },
      {
        title: '3D Packing',
        items: [
          { name: '3D Truck Load', path: '/optimizer', icon: Box, badge: 'Land' },
          { name: 'Air Cargo ULD', path: '/air-optimizer', icon: Plane, badge: 'Air' },
          { name: 'Sea Container', path: '/sea-optimizer', icon: Anchor, badge: 'Sea' },
        ]
      },
      {
        title: 'Multi-Modal Routing',
        items: [
          { name: 'Road Routes (RL)', path: '/route', icon: Map, badge: null },
          { name: 'Air Routes', path: '/air-route', icon: Navigation, badge: null },
          { name: 'Sea Sea-Lanes', path: '/sea-route', icon: Waves, badge: null },
        ]
      },
      {
        title: 'Assets & Fleet',
        items: [
          { name: 'Cargo Inventory', path: '/inventory', icon: Package, badge: null },
          { name: 'Fleet Trucks', path: '/trucks', icon: Truck, badge: null },
        ]
      }
    ];
  };

  const navGroups = getNavGroups();

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    manager: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dealer: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    driver: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  };

  const currentRoleStyle = roleColors[userRole || 'admin'] || roleColors.admin;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 select-none transition-colors">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/90 relative">
        <Link 
          to="/" 
          className={`flex items-center gap-2.5 group ${collapsed && !mobileOpen ? 'w-full justify-center' : ''}`}
          title="LogiLoad Dashboard"
        >
          <div className="bg-gradient-to-tr from-brand-600 to-blue-500 p-2 rounded-xl shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Truck className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Logi<span className="text-brand-500">Load</span>
                <span className="text-[9px] bg-brand-500/10 text-brand-600 dark:text-brand-300 font-bold px-1 rounded border border-brand-500/20">IN</span>
              </span>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider">AI LOGISTICS</span>
            </div>
          )}
        </Link>

        {/* Desktop Floating / Header Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all ${
            collapsed 
              ? 'absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-md rounded-full p-1 z-50 text-slate-600 dark:text-slate-300 hover:scale-110'
              : ''
          }`}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Pill Banner */}
      {(!collapsed || mobileOpen) && (
        <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${currentRoleStyle}`}>
              {userRole || 'admin'}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-[90px]">{username}</span>
          </div>
          <Link
            to="/login"
            className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-semibold uppercase"
          >
            Switch
          </Link>
        </div>
      )}

      {/* Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-3 custom-scrollbar">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-0.5">
            {(!collapsed || mobileOpen) && (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                  } ${collapsed && !mobileOpen ? 'justify-center px-1' : ''}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  {(!collapsed || mobileOpen) && (
                    <span className="flex-1 truncate">{item.name}</span>
                  )}
                  {(!collapsed || mobileOpen) && item.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Controls & Dark Mode */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
        {(!collapsed || mobileOpen) && (
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              Core AI Online
            </span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-mono">v2.1</span>
          </div>
        )}

        <div className={`flex items-center ${collapsed && !mobileOpen ? 'flex-col gap-2' : 'justify-between'} px-1`}>
          <DarkModeToggle />
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            {(!collapsed || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (w-20 when collapsed, w-60 when expanded) */}
      <aside
        className={`hidden md:block flex-shrink-0 h-screen sticky top-0 transition-all duration-200 z-40 ${
          collapsed ? 'w-20' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-xs h-full z-10 animate-slide-in">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
