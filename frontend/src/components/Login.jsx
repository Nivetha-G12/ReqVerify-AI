import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, AlertTriangle, Cpu } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-tr from-slate-100 via-slate-50 to-blue-50/30 px-4">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-sec-200/35 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="w-full max-w-md z-10">
        {/* App Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 mb-4 shadow-sm">
            <Cpu className="h-9 w-9 text-brand-600" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
            ReqVerify <span className="text-brand-600">AI</span>
          </h1>
          <p className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Requirement Analysis & Competency assessment
          </p>
        </div>

        {/* Login Glass Card */}
        <div className="glass-panel-glow rounded-3xl p-8 shadow-xl relative overflow-hidden bg-white border border-slate-200/60">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-400 via-brand-600 to-sec-400"></div>

          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Sign In to Dashboard</h2>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-xs font-medium"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-xs font-medium"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 font-bold rounded-xl text-white shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition flex items-center justify-center gap-2 mt-8 text-xs cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Access System'
              )}
            </button>
          </form>

          {/* Quick Demo Logins Panel */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-4">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillCredentials('Shakshi', 'adminpassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-brand-500" />
                <span>Admin Shakshi</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Harini', 'qapassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Analyst Harini</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Monika', 'qapassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Analyst Monika</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Vikram', 'qapassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Analyst Vikram</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Arjun', 'qapassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Analyst Arjun</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Maya', 'qapassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Analyst Maya</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('Varun', 'qapassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Analyst Varun</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('ClientDemo', 'clientpassword')}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-slate-100 hover:text-brand-600 border border-slate-200 rounded-xl text-[10px] text-slate-650 font-bold transition cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-brand-500" />
                <span>Client Demo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
