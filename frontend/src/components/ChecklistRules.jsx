import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ChecklistRules() {
  const { apiFetch } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const data = await apiFetch('/checklist');
        setRules(data);
      } catch (err) {
        setError(err.message || 'Failed to load checklist rules.');
      } finally {
        setLoading(false);
      }
    };
    fetchChecklist();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Company Checklist</h1>
          <p className="text-slate-400 text-sm mt-1">
            Predefined organization rules. Neither Admin nor QA Analyst can modify these standards.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Locked by Organization Policies</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-900/40 border border-slate-800/80 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule, index) => (
            <div 
              key={rule.id}
              className="glass-panel hover:border-brand-500/20 hover:bg-slate-900/50 p-6 rounded-2xl flex items-start gap-4 transition-all duration-300"
            >
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">
                    Rule #{index + 1}
                  </span>
                </div>
                <h3 className="font-bold text-slate-200">{rule.rule_text}</h3>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
