import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  Cpu, 
  ShieldCheck, 
  FileCheck2 
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { user, actualUser, logout } = useAuth();

  if (!user) return null;

  const adminMenu = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'requirements', name: 'Requirements', icon: FileText },
    { id: 'reports', name: 'Reports', icon: FileCheck2 },
    { id: 'employees', name: 'Employees', icon: Users },
  ];

  const qaMenu = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'requirements', name: 'Requirements', icon: FileText },
    { id: 'reports', name: 'Reports', icon: FileCheck2 },
    { id: 'employees', name: 'Employees', icon: Users },
  ];

  const clientMenu = [
    { id: 'client_return', name: 'Client Portal', icon: FileText }
  ];

  const menuItems = user.role === 'admin' 
    ? adminMenu 
    : user.role === 'qa_analyst' 
      ? qaMenu 
      : clientMenu;

  return (
    <div className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-sm z-30">
      <div>
        {/* Brand Logo */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-600">
            <Cpu className="h-5.5 w-5.5 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 tracking-tight leading-none text-sm font-sans">
              ReqVerify <span className="text-brand-600">AI</span>
            </h1>
            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-1 block">Enterprise</span>
          </div>
        </div>

        {/* Removed portal simulation UI per product decision */}

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-250 cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Info card */}
      <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/20">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 border ${
            user.role === 'admin' 
              ? 'bg-brand-50 text-brand-600 border-brand-200/50' 
              : user.role === 'qa_analyst'
                ? 'bg-indigo-50 text-indigo-650 border-indigo-200/50'
                : 'bg-teal-50 text-teal-650 border-teal-200/50'
          }`}>
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{actualUser.username}</p>
            <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">
              {user.role === 'admin' 
                ? 'Administrator' 
                : user.role === 'qa_analyst'
                  ? `QA Analyst`
                  : 'Client Portal'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-250 border border-slate-200 rounded-xl text-xs text-slate-550 font-bold transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
