import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Plane,
  Anchor,
  Box,
  Map,
  ShieldCheck,
  TrendingUp,
  Activity,
  Sparkles,
  ArrowRight,
  ChevronRight,
  PackageCheck
} from 'lucide-react';
import { TRUCK_OPTIONS } from '../constants';
import { Delivery, Driver } from '../types';

export const Dashboard: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const savedDeliveries = localStorage.getItem('fleet_deliveries');
    if (savedDeliveries) {
      try {
        setDeliveries(JSON.parse(savedDeliveries));
      } catch (e) {
        console.error(e);
      }
    }

    const savedDrivers = localStorage.getItem('fleet_drivers');
    if (savedDrivers) {
      try {
        setDrivers(JSON.parse(savedDrivers));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const activeCount = deliveries.filter(d => ['in-progress', 'on-the-way', 'picked-up', 'assigned'].includes(d.status)).length;
  const userRole = localStorage.getItem('userRole');

  return (
    <div className="w-full space-y-6 text-slate-900 dark:text-slate-100">
      {/* Hero Command Bar */}
      <div className="bg-gradient-to-r from-brand-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-brand-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              System Ready • 100% Operational
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">LogiLoad Enterprise Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Logistics & Freight Command Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Maximize volumetric payload utilization with 3D physics packaging, live multi-modal route navigation, and AI predictive delay scoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin"
            className="bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-brand-600/25 transition flex items-center gap-2"
          >
            <span>Operations Portal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/optimizer"
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Box className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>3D Packing</span>
          </Link>
        </div>
      </div>

      {/* Level 1: Quick Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>Active Freight Dispatches</span>
            <Activity className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{deliveries.length} Total Registered Trips</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>Fleet Commercial Trucks</span>
            <Truck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{TRUCK_OPTIONS.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tata, Eicher, BharatBenz, Leyland</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>Registered CDL Drivers</span>
            <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{drivers.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active Fleet Roster</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-1">
            <span>AI Intelligence Models</span>
            <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">8 Models</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">GBDT, LSTM, GNN, PPO, DRL</p>
        </div>
      </div>

      {/* Level 2: Multi-Modal Optimization Launchpad */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Multi-Modal 3D Load Optimizers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select transport mode to run interactive container volume packing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Mode 1: Road Freight */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 rounded-2xl p-6 transition flex flex-col justify-between group shadow-sm">
            <div>
              <div className="bg-brand-500/10 text-brand-600 dark:text-brand-400 p-3 rounded-xl w-fit mb-4 border border-brand-500/20">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                3D Land Truck Optimizer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Tata Ace to 40ft Multi-Axle trailer packing with Center of Gravity balance, surface contact support, and step-by-step loading playback.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link to="/inventory" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium">
                Cargo Inventory
              </Link>
              <Link
                to="/optimizer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500"
              >
                Launch 3D Truck <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Mode 2: Air Cargo */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition flex flex-col justify-between group shadow-sm">
            <div>
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl w-fit mb-4 border border-emerald-500/20">
                <Plane className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                Air Cargo ULD Containerization
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Boeing 777-F & Airbus A330-200F Unit Load Devices (PAG / AKE pallets) with flight deck contour fitting and tailwind wind routing.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link to="/air-route" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium">
                Flight Winds Route
              </Link>
              <Link
                to="/air-optimizer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500"
              >
                Launch Air Load <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Mode 3: Maritime Sea Freight */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition flex flex-col justify-between group shadow-sm">
            <div>
              <div className="bg-purple-500/10 text-purple-600 dark:text-purple-400 p-3 rounded-xl w-fit mb-4 border border-purple-500/20">
                <Anchor className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                Maritime Sea Freight Containers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                20ft Standard and 40ft High Cube ISO shipping container optimization paired with Dijkstra marine sea routes across global shipping lanes.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link to="/sea-route" className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium">
                Sea Lanes Route
              </Link>
              <Link
                to="/sea-optimizer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500"
              >
                Launch Sea Load <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Level 3: Platform Routing & Intelligence Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
              <Map className="h-4 w-4" />
              <span>Multi-Stop GNN Route Engine</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Dynamic Indian Transport Router</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Calculate turn-by-turn OSRM road geometry, highway tolls, and PPO sequence optimization across Indian corridors.
            </p>
          </div>
          <Link
            to="/route"
            className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap shadow-sm"
          >
            Plan Road Route
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="h-4 w-4" />
              <span>AI Performance & Benchmarking</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Model Metrics & SHAP Attribution</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Inspect GBDT MAE/R², LSTM demand projections, Isolation Forest anomalies, and multi-truck volume benchmarks.
            </p>
          </div>
          <Link
            to="/performance"
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap shadow-sm"
          >
            View Analytics
          </Link>
        </div>
      </div>
    </div>
  );
};