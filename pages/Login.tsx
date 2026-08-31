import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, User, Shield, Package, ArrowLeft, MapPin, BarChart3, Briefcase, Building, Sparkles } from 'lucide-react';
import { AuthService } from '../services/auth';

export const Login: React.FC = () => {
  const [userType, setUserType] = useState<'admin' | 'driver' | 'manager' | 'dealer' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Clear any existing session when accessing login page
  useEffect(() => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
  }, []);

  const selectRole = (type: 'admin' | 'driver' | 'manager' | 'dealer') => {
    setUserType(type);
    setError('');
    if (type === 'admin') {
      setUsername('admin');
      setPassword('logiload2024');
    } else if (type === 'manager') {
      setUsername('manager');
      setPassword('manager2024');
    } else if (type === 'dealer') {
      setUsername('dealer');
      setPassword('dealer2024');
    } else if (type === 'driver') {
      setUsername('driver1');
      setPassword('driver1');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (userType === 'admin') {
        const isAdmin = AuthService.loginAdmin(username, password);
        if (isAdmin) {
          localStorage.setItem('userRole', 'admin');
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/admin');
        } else {
          setError('Invalid admin credentials (hint: admin / logiload2024 or admin / admin)');
        }
      } else if (userType === 'manager') {
        const isManager = AuthService.loginManager(username, password);
        if (isManager) {
          localStorage.setItem('userRole', 'manager');
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/admin');
        } else {
          setError('Invalid manager credentials (hint: manager / manager2024 or manager / manager)');
        }
      } else if (userType === 'dealer') {
        const isDealer = AuthService.loginDealer(username, password);
        if (isDealer) {
          localStorage.setItem('userRole', 'dealer');
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/admin');
        } else {
          setError('Invalid dealer credentials (hint: dealer / dealer2024 or dealer / dealer)');
        }
      } else if (userType === 'driver') {
        const driver = AuthService.loginDriver(username, password);
        if (driver) {
          localStorage.setItem('userRole', 'driver');
          localStorage.setItem('driverId', driver.id);
          localStorage.setItem('driverName', driver.name);
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/driver');
        } else {
          setError('Invalid driver credentials (hint: driver1 / driver1 or driver1 / driver123)');
        }
      } else {
        setError('Please select a user type');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 bg-slate-900 p-8 lg:p-12 relative">
          <button
            onClick={() => navigate('/')}
            className="absolute left-6 top-6 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="mt-8">
            {!userType ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-slate-400">Select your role to continue</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => selectRole('admin')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Shield className="w-6 h-6" />
                    Admin Login
                  </button>

                  <button
                    onClick={() => selectRole('manager')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Briefcase className="w-6 h-6" />
                    Manager Login
                  </button>

                  <button
                    onClick={() => selectRole('dealer')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Building className="w-6 h-6" />
                    Dealer Login
                  </button>

                  <button
                    onClick={() => selectRole('driver')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <User className="w-6 h-6" />
                    Driver Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-bold text-white">
                    Welcome Back
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setUserType(null);
                      setUsername('');
                      setPassword('');
                      setError('');
                    }}
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Change Role
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-slate-400">
                    Login to your <span className="text-white font-semibold capitalize">{userType}</span> account
                  </p>
                  <button
                    type="button"
                    onClick={() => selectRole(userType)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-fill Demo
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                      placeholder={
                        userType === 'admin' ? 'admin' :
                        userType === 'manager' ? 'manager' :
                        userType === 'dealer' ? 'dealer' :
                        'driver1'
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3.5 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} LogiLoad India. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 p-12 flex-col justify-center items-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 text-center">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center border border-white/20 shadow-xl">
              <Truck className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">LogiLoad India</h3>
            <p className="text-white/80 max-w-sm text-sm">
              AI-Powered 3D Truck Load Planning & Multi-Modal Freight Optimization Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
