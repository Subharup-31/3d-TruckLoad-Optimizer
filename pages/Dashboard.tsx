import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Package, Map, ArrowRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');

    if (isLoggedIn) {
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'driver') {
        navigate('/driver');
      }
    }
  }, [navigate]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome to CargoLens XR</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Optimize your logistics, maximize truck space, and plan efficient routes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Trucks */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
          <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Truck Configuration</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Set up your fleet dimensions. Scan truck interiors using your camera.</p>
          <Link to="/trucks" className="text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 hover:underline">
            Manage Trucks <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: Load Optimization */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
          <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">3D Load Optimizer</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Add goods, scan dimensions, and visualize the perfect packing plan.</p>
          <div className="flex gap-4">
            <Link to="/inventory" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Add Items</Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link to="/optimizer" className="text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 hover:underline">
              Visualize 3D <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 3: Routing */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
          <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
            <Map className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Route Planner</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Calculate the fastest delivery routes across cities and local addresses.</p>
          <Link to="/route" className="text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 hover:underline">
            Plan Route <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Ready to load?</h2>
          <p className="text-slate-300 dark:text-gray-400">Start by adding items to your inventory.</p>
        </div>
        <Link to="/inventory" className="mt-4 md:mt-0 bg-brand-500 dark:bg-brand-600 hover:bg-brand-400 dark:hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition">
          Go to Inventory
        </Link>
      </div>
    </div>
  );
};