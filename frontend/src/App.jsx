import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RequirementManager from './components/RequirementManager';
import EmployeeCenter from './components/EmployeeCenter';
import RequirementValidator from './components/RequirementValidator';
import Reports from './components/Reports';
import ClientReturn from './components/ClientReturn';
import { Cpu } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedRequirementForQA, setSelectedRequirementForQA] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'client' && currentTab !== 'client_return') {
      setCurrentTab('client_return');
    } else if (user.role !== 'client' && currentTab === 'client_return') {
      setCurrentTab('dashboard');
    } else if (user.role === 'client' && currentTab === 'employees') {
      setCurrentTab('client_return');
    }
  }, [user, currentTab]);

  // Display premium dark-theme loader while session is validating
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl border border-brand-200/50 animate-pulse">
          <Cpu className="h-8 w-8 text-brand-500 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Validating Session...</p>
      </div>
    );
  }

  // Route to Login if user is not authenticated
  if (!user) {
    return <Login />;
  }

  // Active Screen Selector based on tab state and role
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} />;
      
      // Requirement views differ by role
      case 'requirements':
        if (user.role === 'admin') {
          return <RequirementManager />;
        }
        if (user.role === 'qa_analyst') {
          return <RequirementValidator 
              selectedRequirementForQA={selectedRequirementForQA}
              setSelectedRequirementForQA={setSelectedRequirementForQA}
            />;
        }
        return <ClientReturn />;
      
      // Unified Reports tab
      case 'reports':
        return <Reports 
          setCurrentTab={setCurrentTab}
          setSelectedRequirementForQA={setSelectedRequirementForQA}
        />;

      case 'employees':
        return (user.role === 'admin' || user.role === 'qa_analyst') ? <EmployeeCenter /> : null;
      
      // Simulated Client Return portal tab
      case 'client_return':
        return <ClientReturn />;
        
      default:
        return <Dashboard setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-50">
        <div className="relative">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
