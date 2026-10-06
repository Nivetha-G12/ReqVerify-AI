import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Users, BookOpen,
  Plus, ArrowRight, TrendingUp, RefreshCw, Activity, FileCheck2, Award
} from 'lucide-react';

export default function Dashboard({ setCurrentTab }) {
  const { user, apiFetch } = useAuth();

  const [requirements, setRequirements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const reqs = await apiFetch('/requirements');
      setRequirements(reqs);
      const reps = await apiFetch('/reports');
      setReports(reps);

      if (user.role === 'admin') {
        const emps = await apiFetch('/employees');
        setEmployees(emps);
        const tests = await apiFetch('/assessments');
        setAssessments(tests);
      } else if (user.role === 'qa_analyst') {
        const tests = await apiFetch('/assessments');
        setAssessments(tests);
        const profile = await apiFetch('/employees/me');
        setEmployees([profile]);
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  const totalReqs = requirements.length;
  const pendingValidation = requirements.filter((r) => r.status === 'pending_validation').length;
  const underReview = requirements.filter((r) => r.status === 'under_validation' || r.status === 'under_review').length;
  const approvedReqs = requirements.filter((r) => r.status === 'approved').length;
  const returnedReqs = requirements.filter((r) => r.status === 'returned_to_client').length;
  const activeAnalysts = employees.filter((e) => e.status !== 'Inactive').length;
  const avgAccuracy = employees.length > 0
    ? Math.round(employees.reduce((sum, emp) => sum + emp.accuracy, 0) / employees.length)
    : 100;

  const pendingReviewQueue = reports.filter(
    (r) => r.requirement_status === 'under_review' || r.status === 'submitted'
  );

  const assignedAssessments = assessments.filter((a) => a.status === 'assigned').length;
  const completedAssessments = assessments.filter((a) => a.status === 'completed').length;
  const completedScores = assessments.filter((a) => a.status === 'completed').map((a) => parseFloat(a.score || 0));
  const avgAssessmentScore = completedScores.length > 0
    ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
    : null;

  const myProfile = employees[0];
  const myAssignedReqs = requirements.length;
  const myPendingReports = requirements.filter((r) => r.status === 'under_validation' || r.status === 'returned_to_client').length;
  const mySubmittedReports = reports.length;
  const myAssessmentTasks = assessments.filter((a) => a.status === 'assigned').length;
  const myApproved = reports.filter((r) => r.status === 'approved').length;
  const myQaMistakes = reports.filter((r) => r.status === 'qa_rejected' || r.admin_decision === 'reject_qa').length;
  const myAccuracy = (myApproved + myQaMistakes) > 0
    ? Math.round((myApproved / (myApproved + myQaMistakes)) * 100)
    : 100;

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {user.role === 'admin' ? 'Executive Dashboard' : 'Analyst Workspace Dashboard'}
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            {user.role === 'admin'
              ? 'Operational overview of requirement states, validation queues, QA accuracy, and training progress.'
              : 'Monitor assigned requirements, review performance metrics, and complete competency assessments.'}
          </p>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl text-slate-650 cursor-pointer shadow-sm">
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" /><span>Sync Dashboard</span>
        </button>
      </div>

      {user.role === 'admin' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Requirements', value: totalReqs, icon: FileText, color: 'brand' },
              { label: 'Pending Validation', value: pendingValidation, icon: Clock, color: 'indigo' },
              { label: 'Under Review', value: underReview, icon: Activity, color: 'amber' },
              { label: 'Approved Requirements', value: approvedReqs, icon: CheckCircle2, color: 'emerald' },
              { label: 'Returned to Client', value: returnedReqs, icon: AlertTriangle, color: 'rose' },
              { label: 'Active QA Analysts', value: activeAnalysts, icon: Users, color: 'slate' },
              { label: 'Average QA Accuracy', value: `${avgAccuracy}%`, icon: TrendingUp, color: 'brand', wide: true },
            ].map((stat, i) => {
              const Icon = stat.icon;
              const colorMap = {
                brand: 'bg-brand-50 border-brand-100 text-brand-600',
                indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
                amber: 'bg-amber-50 border-amber-100 text-amber-600',
                emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
                rose: 'bg-rose-50 border-rose-100 text-rose-600',
                slate: 'bg-slate-100 border-slate-200 text-slate-600',
              };
              return (
                <div key={i} className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex items-center gap-4 ${stat.wide ? 'col-span-1 sm:col-span-2' : ''}`}>
                  <div className={`p-3 rounded-2xl border ${colorMap[stat.color]}`}><Icon className="h-5.5 w-5.5" /></div>
                  <div>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{stat.label}</p>
                    <h3 className={`text-2xl font-black mt-0.5 ${stat.label.includes('Accuracy') ? 'text-brand-600' : 'text-slate-850'}`}>{stat.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">Recent Requirements</h3>
              <div className="space-y-2">
                {requirements.slice(0, 5).map((req) => (
                  <div key={req.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{req.title}</p>
                      <span className="text-[10px] text-slate-500">{req.client_name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                      req.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                    }`}>{req.status?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />Pending Review Queue ({pendingReviewQueue.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingReviewQueue.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No reports pending verification.</p>
                ) : (
                  pendingReviewQueue.slice(0, 5).map((rep) => (
                    <div key={rep.id} onClick={() => setCurrentTab('reports')}
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl cursor-pointer hover:border-brand-300 transition text-xs">
                      <p className="font-bold text-slate-800 truncate">{rep.requirement_title}</p>
                      <span className="text-[10px] text-slate-500">Analyst: {rep.qa_username} | {Math.round(rep.overall_quality_score)}% quality</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setCurrentTab('reports')} className="w-full py-2 text-[10px] font-bold text-brand-600 hover:bg-brand-50 rounded-xl cursor-pointer">
                Open Report Verification →
              </button>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />Training Overview
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <span className="text-[9px] text-slate-450 font-bold uppercase block">Assigned</span>
                  <span className="text-xl font-extrabold text-amber-600">{assignedAssessments}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <span className="text-[9px] text-slate-450 font-bold uppercase block">Completed</span>
                  <span className="text-xl font-extrabold text-emerald-600">{completedAssessments}</span>
                </div>
              </div>
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Avg Quiz Score</span>
                  <span className="text-xl font-black text-brand-600">{avgAssessmentScore !== null ? `${avgAssessmentScore}%` : 'N/A'}</span>
                </div>
                <Award className="h-6 w-6 text-brand-600" />
              </div>
              <button onClick={() => setCurrentTab('employees')} className="w-full py-2 text-[10px] font-bold text-brand-600 hover:bg-brand-50 rounded-xl cursor-pointer">
                Manage Training in Employees →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Assigned Specs', value: myAssignedReqs, icon: FileText },
              { label: 'Pending Tasks', value: myPendingReports, icon: Clock },
              { label: 'Submitted Reports', value: mySubmittedReports, icon: FileCheck2 },
              { label: 'Assessment Tasks', value: myAssessmentTasks, icon: BookOpen },
              { label: 'Accuracy Rating', value: `${myAccuracy}%`, icon: Award, accent: true },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-brand-50 border border-brand-100 text-brand-600 rounded-2xl"><Icon className="h-5.5 w-5.5" /></div>
                  <div>
                    <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">{stat.label}</p>
                    <h3 className={`text-2xl font-black mt-0.5 ${stat.accent ? 'text-brand-600' : 'text-slate-850'}`}>{stat.value}</h3>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">Active Assigned Requirements</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {requirements.filter((r) => r.status === 'under_validation' || r.status === 'returned_to_client').length === 0 ? (
                  <p className="text-slate-450 text-xs py-8 text-center italic">No active validation tasks.</p>
                ) : (
                  requirements.filter((r) => r.status === 'under_validation' || r.status === 'returned_to_client').map((req) => (
                    <div key={req.id} onClick={() => setCurrentTab('requirements')}
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between text-xs cursor-pointer hover:bg-slate-100/50">
                      <div>
                        <h4 className="font-bold text-slate-850 truncate">{req.title}</h4>
                        <span className="text-[10px] text-slate-500">Client: {req.client_name}</span>
                      </div>
                      <span className="text-[8px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded">In Progress</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-100 pb-2">Pending Competency Quizzes</h3>
              <div className="space-y-2">
                {assessments.filter((a) => a.status === 'assigned').length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No pending assessments.</p>
                ) : (
                  assessments.filter((a) => a.status === 'assigned').map((a) => (
                    <div key={a.id} onClick={() => setCurrentTab('employees')}
                      className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl cursor-pointer hover:border-brand-300 text-xs">
                      <p className="font-bold text-slate-800">{a.title}</p>
                      <span className="text-[10px] text-slate-500">{a.category} | 10 questions</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setCurrentTab('employees')} className="w-full py-2 text-[10px] font-bold text-brand-600 hover:bg-brand-50 rounded-xl cursor-pointer">
                Go to My Training →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
