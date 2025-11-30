import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, User, Shield, Package, ArrowLeft, MapPin, BarChart3 } from 'lucide-react';
import { AuthService } from '../services/auth';

export const Login: React.FC = () => {
  const [userType, setUserType] = useState<'admin' | 'driver' | 'customer' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Clear any existing session when accessing login page
  useEffect(() => {
    // Clear all session data when accessing login page
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('driverId');
    localStorage.removeItem('driverName');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (userType === 'admin') {
        const isAdmin = AuthService.loginAdmin(username, password);
        if (isAdmin) {
          // Store admin session
          localStorage.setItem('userRole', 'admin');
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/admin');
        } else {
          setError('Invalid admin credentials');
        }
      } else if (userType === 'driver') {
        const driver = AuthService.loginDriver(username, password);
        if (driver) {
          // Store driver session
          localStorage.setItem('userRole', 'driver');
          localStorage.setItem('driverId', driver.id);
          localStorage.setItem('driverName', driver.name);
          localStorage.setItem('isLoggedIn', 'true');
          navigate('/driver');
        } else {
          setError('Invalid driver credentials');
        }
      } else if (userType === 'customer') {
        // For customer login, we'll redirect to a customer dashboard (placeholder)
        // In a real app, this would authenticate against a customer database
        localStorage.setItem('userRole', 'customer');
        localStorage.setItem('isLoggedIn', 'true');
        // Since there's no customer dashboard yet, we'll redirect to the main dashboard
        navigate('/dashboard');
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-gray-800 rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 bg-gray-900 p-8 lg:p-12 relative">
          <button
            onClick={() => navigate('/')}
            className="absolute left-6 top-6 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="mt-8">
            {!userType ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-gray-400">Select your role to continue</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setUserType('admin')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Shield className="w-6 h-6" />
                    Admin Login
                  </button>

                  <button
                    onClick={() => setUserType('driver')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <User className="w-6 h-6" />
                    Driver Login
                  </button>

                  <button
                    onClick={() => setUserType('customer')}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Package className="w-6 h-6" />
                    Customer Login
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
                    onClick={() => setUserType(null)}
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Change Role
                  </button>
                </div>

                <p className="text-gray-400 mb-6">
                  Login to your {userType} account
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                      placeholder={
                        userType === 'admin' ? 'admin' :
                          userType === 'driver' ? 'driver1' :
                            'customer'
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
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

            <div className="mt-8 pt-6 border-t border-gray-800 text-center">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} CargoLens XR. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-pink-500 to-blue-500 p-12 flex-col justify-center items-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <Truck className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">CargoLens XR</h1>
            <p className="text-lg text-white/90 mb-12">
              Master your logistics with AI-powered optimization and real-time tracking
            </p>

            <div className="space-y-4 text-left max-w-sm mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">AI-powered load optimization</p>
                  <p className="text-sm text-white/80">Maximize space utilization</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">Real-time route planning</p>
                  <p className="text-sm text-white/80">Efficient delivery management</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold">Comprehensive analytics</p>
                  <p className="text-sm text-white/80">Track performance metrics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
