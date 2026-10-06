import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, AlertTriangle, BookOpen, Plus, Play, CheckCircle, Calendar, X,
  Target, TrendingUp, Award, FileText, RefreshCw, BarChart2
} from 'lucide-react';

const COMPETENCY_CATEGORIES = [
  'Validation Rules', 'Acceptance Criteria', 'Business Rules', 'Requirement Completeness',
  'Ambiguity Detection', 'Exception Handling', 'Checklist Evaluation'
];

const CORE_METRICS = [
  { key: 'assignedCount', label: 'Assigned Requirements' },
  { key: 'totalSubmissions', label: 'Total Submissions' },
  { key: 'approvedCount', label: 'Approved Reviews', color: 'text-emerald-600' },
  { key: 'qaMistakes', label: 'QA Mistakes', color: 'text-rose-600' },
  { key: 'returnedToClientCount', label: 'Returned to Client', color: 'text-amber-600' },
  { key: 'accuracy', label: 'Accuracy', suffix: '%', color: 'text-brand-600' },
];

function getAccuracyColor(pct) {
  if (pct >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (pct >= 70) return 'text-amber-600 bg-amber-50 border-amber-100';
  return 'text-rose-600 bg-rose-50 border-rose-100';
}

function getTrendColor(trend) {
  if (trend === 'improving') return 'text-emerald-600 bg-emerald-50';
  if (trend === 'declining' || trend === 'needs_attention') return 'text-rose-600 bg-rose-50';
  return 'text-slate-600 bg-slate-50';
}

export default function EmployeeCenter() {
  const { user, apiFetch } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [assessmentType, setAssessmentType] = useState('scenario_based');
  const [category, setCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addEmployeeId, setAddEmployeeId] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addLevel, setAddLevel] = useState('Junior QA Analyst');
  const [addExperience, setAddExperience] = useState(0);
  const [addEmploymentStatus, setAddEmploymentStatus] = useState('Full-time');
  const [addStatus, setAddStatus] = useState('Active');
  const [addLoading, setAddLoading] = useState(false);

  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editExperience, setEditExperience] = useState(0);
  const [editEmploymentStatus, setEditEmploymentStatus] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoadError('');
    try {
      const endpoint = isAdmin ? '/employees' : '/employees/me';
      const data = await apiFetch(endpoint);
      if (isAdmin) {
        setEmployees(data);
        if (selectedEmp) {
          const updated = data.find((e) => e.id === selectedEmp.id);
          if (updated) setSelectedEmp(updated);
        }
      } else {
        setSelectedEmp(data);
        setEmployees([data]);
      }
      return true;
    } catch (err) {
      const msg = err.message || 'Failed to load profile data.';
      setLoadError(isAdmin ? `Failed to load employee directory: ${msg}` : `Failed to load your profile: ${msg}`);
      if (!isAdmin) setSelectedEmp(null);
      return false;
    }
  }, [apiFetch, isAdmin, selectedEmp?.id]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchEmployees().finally(() => setLoading(false));
  }, [user?.role]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true); setError(''); setSuccess('');
    try {
      await apiFetch('/employees', { method: 'POST', body: JSON.stringify({
        username: addUsername, email: addEmail, employee_id: addEmployeeId, password: addPassword,
        level: addLevel, experience: addExperience, employment_status: addEmploymentStatus, status: addStatus
      })});
      setSuccess('QA Analyst added successfully!');
      setShowAddModal(false);
      fetchEmployees();
    } catch (err) { setError(err.message); } finally { setAddLoading(false); }
  };

  const submitEdit = async () => {
    setEditLoading(true); setError(''); setSuccess('');
    try {
      await apiFetch(`/employees/${selectedEmp.id}`, { method: 'PUT', body: JSON.stringify({
        username: editUsername, email: editEmail, level: editLevel, experience: editExperience,
        employment_status: editEmploymentStatus, status: editStatus, password: editPassword || undefined
      })});
      setSuccess('QA Analyst updated successfully!');
      setShowEditModal(false); setShowDeactivateModal(false);
      fetchEmployees();
    } catch (err) { setError(err.message); } finally { setEditLoading(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editStatus === 'Inactive' && selectedEmp.status !== 'Inactive') {
      setShowDeactivateModal(true);
      return;
    }
    await submitEdit();
  };

  const handleDeleteSubmit = async () => {
    setDeleteLoading(true); setError('');
    try {
      await apiFetch(`/employees/${selectedEmp.id}`, { method: 'DELETE' });
      setSuccess(`Analyst "${selectedEmp.username}" deleted.`);
      setSelectedEmp(null); setShowDeleteModal(false);
      fetchEmployees();
    } catch (err) { setError(err.message); } finally { setDeleteLoading(false); }
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setQuizLoading(true); setError(''); setSuccess('');
    try {
      const payload = { qaAnalystId: selectedEmp.id, assessmentType };
      if (category) payload.category = category;
      await apiFetch('/assessments/generate', { method: 'POST', body: JSON.stringify(payload) });
      setSuccess(`10-question assessment assigned to ${selectedEmp.username}!`);
      fetchEmployees();
    } catch (err) { setError(err.message); } finally { setQuizLoading(false); }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!activeQuiz) return;
    if (activeQuiz.questions.some((q) => selectedAnswers[q.id] === undefined)) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setSubmitLoading(true); setError('');
    try {
      const result = await apiFetch(`/assessments/${activeQuiz.id}/submit`, {
        method: 'POST', body: JSON.stringify({ answers: selectedAnswers })
      });
      setQuizResult(result); setQuizSubmitted(true);
      fetchEmployees();
    } catch (err) { setError(err.message); } finally { setSubmitLoading(false); }
  };

  const formatDate = (v) => v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  if (activeQuiz) {
    return (
      <div className="p-6 space-y-5 max-w-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-800">{activeQuiz.title}</h1>
            <p className="text-slate-500 text-xs mt-1">{activeQuiz.questions?.length || 10} questions · {activeQuiz.category}</p>
          </div>
          <button onClick={() => { setActiveQuiz(null); setQuizSubmitted(false); setQuizResult(null); }}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">← Back</button>
        </div>
        {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}
        {quizSubmitted && quizResult ? (
          <div className="bg-white border rounded-2xl p-6 text-center space-y-4">
            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl border text-xl font-black ${getAccuracyColor(quizResult.score)}`}>
              <Award className="h-6 w-6" />{quizResult.score}%
            </div>
            <p className="text-sm text-slate-600">{quizResult.improvement_recommendations}</p>
            <button onClick={() => { setActiveQuiz(null); setQuizSubmitted(false); }} className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg cursor-pointer">Done</button>
          </div>
        ) : (
          <form onSubmit={handleQuizSubmit} className="space-y-4">
            {activeQuiz.questions?.map((q, idx) => (
              <div key={q.id} className="bg-white border rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-slate-800"><span className="text-brand-600 mr-2">Q{idx + 1}.</span>{q.question}</p>
                {q.options.map((opt, i) => (
                  <label key={i} className={`flex gap-2 p-2.5 rounded-lg border text-xs cursor-pointer ${selectedAnswers[q.id] === i ? 'border-brand-500 bg-brand-50' : 'border-slate-200'}`}>
                    <input type="radio" name={`q${q.id}`} checked={selectedAnswers[q.id] === i}
                      onChange={() => setSelectedAnswers((p) => ({ ...p, [q.id]: i }))} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ))}
            <button type="submit" disabled={submitLoading} className="w-full py-2.5 bg-brand-600 text-white text-sm font-bold rounded-lg cursor-pointer disabled:opacity-50">
              {submitLoading ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </form>
        )}
      </div>
    );
  }

  const renderPerformanceCards = (emp) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {CORE_METRICS.map((m) => {
        let val = emp[m.key];
        if (m.key === 'qaMistakes') val = emp.qaMistakes ?? emp.qaMistakeCount ?? 0;
        if (m.key === 'totalSubmissions') val = emp.totalSubmissions ?? emp.submittedCount ?? 0;
        if (m.key === 'returnedToClientCount') val = emp.returnedToClientCount || 0;
        return (
          <div key={m.key} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-center">
            <span className="text-[9px] uppercase tracking-wider text-slate-450 font-bold block">{m.label}</span>
            <span className={`text-lg font-black mt-0.5 block ${m.color || 'text-slate-800'}`}>{val}{m.suffix || ''}</span>
          </div>
        );
      })}
    </div>
  );

  const renderWeaknessAnalysis = (emp) => {
    if (!emp.weaknessAnalysis?.length) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <BarChart2 className="h-4 w-4 text-rose-500" />Competency Weakness Analysis
        </h4>
        <div className="space-y-2">
          {emp.weaknessAnalysis.map((w) => (
            <div key={w.category} className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">{w.category}</span>
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">{w.mistakeCount} mistake{w.mistakeCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.min(w.mistakeCount * 20, 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className={`font-bold px-1.5 py-0.5 rounded ${getTrendColor(w.trend)}`}>{w.trend.replace(/_/g, ' ')}</span>
                <span className="text-slate-500 font-semibold">{w.improvementStatus}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrainingSection = (emp) => {
    const hasAssigned = (emp.assignedAssessmentCount || 0) > 0;
    const hasCompleted = (emp.completedAssessmentCount || 0) > 0;
    const hasHistory = (emp.competencyHistory?.length || 0) > 0;
    if (!hasAssigned && !hasCompleted && !hasHistory) return null;

    const assigned = emp.assessments?.filter((a) => a.status === 'assigned') || [];
    const completed = emp.assessments?.filter((a) => a.status === 'completed') || [];

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-indigo-600" />Training & Assessments
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          {hasAssigned && (
            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Assigned</span>
              <span className="text-lg font-black text-amber-600">{emp.assignedAssessmentCount}</span>
            </div>
          )}
          {hasCompleted && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Completed</span>
              <span className="text-lg font-black text-emerald-600">{emp.completedAssessmentCount}</span>
            </div>
          )}
          {emp.avgAssessmentScore != null && (
            <div className="p-2.5 bg-brand-50 border border-brand-100 rounded-xl">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Avg Score</span>
              <span className="text-lg font-black text-brand-600">{emp.avgAssessmentScore}%</span>
            </div>
          )}
        </div>
        {emp.improvementPercentage != null && (
          <div className="flex items-center gap-2 p-2.5 bg-brand-50 border border-brand-100 rounded-lg text-xs font-bold text-brand-700">
            <TrendingUp className="h-3.5 w-3.5" />
            Competency improvement: {emp.improvementPercentage > 0 ? '+' : ''}{emp.improvementPercentage}%
          </div>
        )}
        <div className="space-y-1.5">
          {assigned.map((a) => (
            <div key={a.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="font-bold text-slate-700 truncate">{a.title}</p>
                <span className="text-[9px] text-slate-400">{a.category}</span>
              </div>
              {!isAdmin ? (
                <button onClick={() => { setActiveQuiz(a); setSelectedAnswers({}); setQuizSubmitted(false); setQuizResult(null); }}
                  className="px-2.5 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-lg cursor-pointer shrink-0">Take Quiz</button>
              ) : (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded shrink-0">Pending</span>
              )}
            </div>
          ))}
          {completed.map((a) => (
            <div key={a.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <p className="font-bold text-slate-700 truncate">{a.title}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border shrink-0 ${getAccuracyColor(a.score)}`}>{Math.round(a.score)}%</span>
            </div>
          ))}
        </div>
        {hasHistory && (
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-450 uppercase">History</span>
            {emp.competencyHistory.slice(0, 5).map((h) => (
              <div key={h.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[10px]">
                <span className="text-slate-600">{formatDate(h.completedAt)}</span>
                <span className={`font-black ${getAccuracyColor(h.score).split(' ')[0]}`}>{h.score}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetailPanel = (emp) => (
    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-5 text-left shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-slate-800">{emp.username}</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            {emp.employee_id || `QA-${emp.id}`} · {emp.level || 'QA Analyst'} · {emp.experience ?? 0} yrs
            {!isAdmin && <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-black border ${emp.status !== 'Inactive' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>{emp.status || 'Active'}</span>}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-1.5">
            <button onClick={() => { setEditUsername(emp.username); setEditEmail(emp.email || ''); setEditLevel(emp.level || ''); setEditExperience(emp.experience || 0); setEditEmploymentStatus(emp.employment_status || 'Full-time'); setEditStatus(emp.status || 'Active'); setEditPassword(''); setShowEditModal(true); }}
              className="px-2 py-1 text-[10px] font-bold border rounded-lg cursor-pointer">Edit</button>
            <button onClick={() => setShowDeleteModal(true)} className="px-2 py-1 text-[10px] font-bold text-rose-600 border border-rose-200 rounded-lg cursor-pointer">Delete</button>
          </div>
        )}
      </div>

      {renderPerformanceCards(emp)}

      {emp.assignedRequirements?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Assigned Requirements</h4>
          {emp.assignedRequirements.map((r) => (
            <div key={r.id} className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg flex justify-between text-[10px]">
              <span className="font-bold text-slate-700 truncate">{r.title}</span>
              <span className="text-slate-400 shrink-0 ml-2">{r.status?.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {renderWeaknessAnalysis(emp)}
      {renderTrainingSection(emp)}

      {isAdmin && emp.trainingRecommendations?.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <h4 className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1"><Target className="h-3.5 w-3.5" />Training Recommendations</h4>
          {emp.trainingRecommendations.map((rec, i) => (
            <p key={i} className="text-[10px] text-slate-600">{rec.mistakeType} ({rec.count}x) → {rec.action}</p>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-800">{isAdmin ? 'Employees' : 'My Performance'}</h1>
          <p className="text-slate-500 text-xs mt-1">{isAdmin ? 'Manage analysts and track performance.' : 'Review your validation performance and complete training.'}</p>
        </div>
        <button onClick={() => { setLoading(true); fetchEmployees().finally(() => setLoading(false)); }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      {(error || success) && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${error ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
          {error || success}
        </div>
      )}

      {loadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
          <div className="flex items-start gap-2 text-rose-700 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>{loadError}</span>
          </div>
          <button onClick={() => { setLoading(true); fetchEmployees().finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-slate-400 text-xs">Loading...</div>
      ) : loadError ? null : isAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Directory</h3>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"><Plus className="h-3 w-3" />Add Analyst</button>
            </div>
            <div className="bg-white border rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead><tr className="bg-slate-50 border-b text-[9px] font-bold uppercase text-slate-450">
                  {['Name', 'ID', 'Designation', 'Exp', 'Status', 'Accuracy', 'Submissions'].map((h) => <th key={h} className="p-2.5">{h}</th>)}
                </tr></thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} onClick={() => { setSelectedEmp(emp); setError(''); }}
                      className={`border-b cursor-pointer hover:bg-slate-50 ${selectedEmp?.id === emp.id ? 'bg-brand-50/40' : ''}`}>
                      <td className="p-2.5 font-bold">{emp.username}</td>
                      <td className="p-2.5">{emp.employee_id}</td>
                      <td className="p-2.5 text-[10px]">{emp.level}</td>
                      <td className="p-2.5">{emp.experience}y</td>
                      <td className="p-2.5"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${emp.status !== 'Inactive' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{emp.status || 'Active'}</span></td>
                      <td className="p-2.5 font-black text-brand-600">{emp.accuracy}%</td>
                      <td className="p-2.5">{emp.totalSubmissions ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {selectedEmp ? renderDetailPanel(selectedEmp) : (
              <div className="p-12 text-center text-slate-400 border border-dashed rounded-2xl text-xs">Select an analyst</div>
            )}
            {selectedEmp && (
              <form onSubmit={handleGenerateQuiz} className="bg-white border p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-black text-slate-800">Generate Assessment</h3>
                <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs">
                  <option value="scenario_based">Scenario-Based MCQ</option>
                  <option value="multiple_choice">Multiple Choice</option>
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2 py-1.5 border rounded-lg text-xs">
                  <option value="">Auto-detect weakness</option>
                  {COMPETENCY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="submit" disabled={quizLoading} className="w-full py-2 bg-brand-600 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50">
                  {quizLoading ? 'Generating...' : 'Generate 10-Question Quiz'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : selectedEmp ? (
        <div className="max-w-2xl">{renderDetailPanel(selectedEmp)}</div>
      ) : (
        <div className="p-12 text-center text-slate-400 border border-dashed rounded-2xl text-xs">No profile data available.</div>
      )}

      {/* Modals - Add, Edit, Delete, Deactivate - kept minimal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-4 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 cursor-pointer"><X className="h-4 w-4" /></button>
            <h3 className="font-black text-slate-800">Add QA Analyst</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <input placeholder="Username" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              <input placeholder="Password" type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 border rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={addLoading} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg cursor-pointer">{addLoading ? '...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3">
            <h3 className="font-black">Edit Analyst</h3>
            <form onSubmit={handleEditSubmit} className="space-y-2 text-xs">
              <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-3 py-1.5 border rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded-lg cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 text-xs">
            <p>Delete <strong>{selectedEmp?.username}</strong>? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-3 py-1.5 border rounded-lg cursor-pointer">Cancel</button>
              <button onClick={handleDeleteSubmit} disabled={deleteLoading} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 text-xs">
            <p>Deactivate <strong>{selectedEmp?.username}</strong>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeactivateModal(false)} className="px-3 py-1.5 border rounded-lg cursor-pointer">Cancel</button>
              <button onClick={submitEdit} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg cursor-pointer">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
