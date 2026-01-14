import React, { useState } from 'react';
import { loginUser, registerUser, initializeDefaultUsers } from '../services/authService';
import { AuthSession } from '../types';
import { IconZap } from './Icons';

interface LoginProps {
  onLoginSuccess: (session: AuthSession) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier' | 'manager'>('cashier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Initialize default users on component mount
  React.useEffect(() => {
    initializeDefaultUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await loginUser(username, password);
    
    if (result.success && result.session) {
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(result.session!);
      }, 500);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await registerUser(username, email, password, role);
    
    if (result.success) {
      setMessage('Registration successful! You can now log in.');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsLoginMode(true);
      }, 1500);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    
    const result = await loginUser('admin', 'admin123');
    
    if (result.success && result.session) {
      onLoginSuccess(result.session);
    } else {
      setError('Demo login failed');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass backdrop-blur-md border border-white border-opacity-20 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-3">
              <IconZap className="w-6 h-6 text-white" />
            </div>
            <h1 className="ml-3 text-2xl font-bold text-white">CloudPOS</h1>
          </div>

          {/* Title */}
          <h2 className="text-center text-xl font-semibold text-white mb-2">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-center text-slate-300 text-sm mb-6">
            {isLoginMode ? 'Sign in to your account' : 'Register a new account'}
          </p>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-400 rounded-lg text-green-200 text-sm">
              {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Email (Register only) */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                  className="w-full px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Confirm Password (Register only) */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            )}

            {/* Role (Register only) */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'cashier' | 'manager')}
                  className="w-full px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="cashier" className="bg-slate-800">Cashier</option>
                  <option value="manager" className="bg-slate-800">Manager</option>
                  <option value="admin" className="bg-slate-800">Admin</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition duration-200 mt-6"
            >
              {loading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Register'}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-slate-300 text-sm">
              {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError('');
                  setMessage('');
                }}
                className="ml-2 text-blue-400 hover:text-blue-300 font-semibold transition"
              >
                {isLoginMode ? 'Register' : 'Sign In'}
              </button>
            </p>
          </div>

          {/* Demo Login (Login mode only) */}
          {isLoginMode && (
            <div className="mt-6 pt-6 border-t border-white border-opacity-10">
              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-2 bg-white bg-opacity-10 hover:bg-opacity-20 border border-white border-opacity-20 rounded-lg text-slate-200 font-semibold transition"
              >
                Demo Login (admin/admin123)
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          CloudPOS Pro | Secure Retail Management
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default Login;
