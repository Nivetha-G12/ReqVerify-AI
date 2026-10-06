import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Send, 
  Brain, 
  ClipboardCheck, 
  AlertCircle,
  Clock,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash
} from 'lucide-react';

export default function Reports({ setCurrentTab, setSelectedRequirementForQA }) {
  const { user, apiFetch, apiUrl } = useAuth();
  
  // Data States
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Review Decision Inputs (Admin)
  const [decision, setDecision] = useState(''); // 'approve', 'reject', 'return_client'
  const [feedback, setFeedback] = useState('');
  const [checklistRules, setChecklistRules] = useState([]);
  const [loggedMistakes, setLoggedMistakes] = useState([]);
  const [tempRule, setTempRule] = useState('');
  const [tempType, setTempType] = useState('Missed Ambiguous Requirement');
  const [tempSeverity, setTempSeverity] = useState('Medium');
  const [actionLoading, setActionLoading] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [showRequirementView, setShowRequirementView] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/reports');
      if (user.role === 'admin') {
        // Admins review reports in 'submitted' or requirements in 'under_review' status
        setReports(data.filter(r => r.requirement_status === 'under_review' || r.status === 'submitted'));
      } else {
        // QA Analysts see all their reports
        setReports(data);
      }
    } catch (err) {
      setError('Failed to load validation reports.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklist = async () => {
    try {
      const data = await apiFetch('/checklist');
      setChecklistRules(data);
    } catch (err) {
      console.error('Error fetching checklist for review:', err);
    }
  };

  useEffect(() => {
    fetchReports();
    if (user && user.role === 'admin') {
      fetchChecklist();
    }
  }, [user]);

  const handleSelectReport = async (report) => {
    setSelectedReport(report);
    setAiAnalysis(null);
    setDecision('');
    setFeedback('');
    setSuccess('');
    setError('');
    setLoggedMistakes([]);
    setTempRule('');
    setTempType('Missed Ambiguous Requirement');
    setTempSeverity('Medium');

    if (user.role === 'admin') {
      setAiLoading(true);
      try {
        const [aiData, versions] = await Promise.all([
          apiFetch('/ai/analyze', {
            method: 'POST',
            body: JSON.stringify({
              requirementId: report.requirement_id,
              analysisType: 'admin_verification'
            })
          }),
          apiFetch(`/requirements/${report.requirement_id}/versions`)
        ]);
        setAiAnalysis(aiData.issues || []);
        setVersionHistory(versions);
      } catch (err) {
        console.error('Error running AI analysis for verification:', err);
      } finally {
        setAiLoading(false);
      }
    }
  };

  const handleAddMistake = () => {
    if (!tempRule) return;
    const newMistake = {
      missedChecklistRule: tempRule,
      mistakeType: tempType,
      severity: tempSeverity
    };
    setLoggedMistakes([...loggedMistakes, newMistake]);
    setTempRule('');
  };

  const parseChecklistResults = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport || !decision) return;

    if (decision === 'reject' && loggedMistakes.length === 0) {
      setError('Please add at least one logged mistake before rejecting a report.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (decision === 'approve' || decision === 'reject') {
        await apiFetch(`/reports/${selectedReport.id}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            decision,
            feedback,
            mistakes: decision === 'reject' ? loggedMistakes : []
          })
        });

        setSuccess(`Validation report successfully verified & ${decision}ed!`);
      } else if (decision === 'return_client') {
        // Trigger direct return to client endpoint
        await apiFetch(`/requirements/${selectedReport.requirement_id}/return-client`, {
          method: 'POST',
          body: JSON.stringify({ feedback })
        });

        setSuccess('Requirement returned to client for correction.');
      }

      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      setError(err.message || 'Failed to submit report verification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorrectionResubmit = (report) => {
    if (setSelectedRequirementForQA) {
      setSelectedRequirementForQA(report.requirement_id);
    }
    setCurrentTab('requirements');
  };

  const getStatusBadge = (status) => {
    const badges = {
      submitted: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      approved: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      rejected: 'bg-rose-50 text-rose-600 border border-rose-200/60',
      qa_rejected: 'bg-rose-50 text-rose-600 border border-rose-200/60',
      returned_to_client: 'bg-orange-50 text-orange-600 border border-orange-200/60'
    };
    const labels = {
      qa_rejected: 'QA Mistake',
      returned_to_client: 'Returned Client'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${badges[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-[96rem]">
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {user.role === 'admin' ? 'Report Verification Workspace' : 'Submitted Quality Reports'}
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            {user.role === 'admin' 
              ? 'Review QA Analyst checklists side-by-side with AI Comparative Analysis results, and log mistake patterns.' 
              : 'Review submitted validation checklist score logs, check Admin feedback reviews, and resubmit rejected reports.'}
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-650 font-bold transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Sync Reports</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-450 text-xs font-medium">
          Loading validation reports...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-start">
          
          {/* Catalog Roster List */}
          <div className="lg:col-span-2 space-y-4 max-h-[600px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest px-1 text-left">
              {user.role === 'admin' ? 'Reports Verification Queue' : 'Submitted Report Logs'}
            </h3>
            {reports.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl text-slate-400 text-xs font-medium">
                {user.role === 'admin' ? 'No reports pending verification.' : 'No validation reports submitted yet.'}
              </div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => handleSelectReport(rep)}
                  className={`bg-white p-5 rounded-2xl border cursor-pointer hover:border-brand-500/30 hover:shadow-xs transition-all border-l-4 ${
                    selectedReport?.id === rep.id 
                      ? 'border-l-brand-600 border-slate-250 shadow-xs' 
                      : rep.status === 'rejected'
                        ? 'border-l-rose-500 border-slate-200/80'
                        : 'border-l-indigo-400 border-slate-200/80'
                  }`}
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider">
                        {user.role === 'admin' ? `Analyst: ${rep.qa_username}` : `Quality Rating`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-700 font-black bg-slate-100 px-2 py-0.5 rounded">
                          {Math.round(rep.overall_quality_score)}% Quality
                        </span>
                        {getStatusBadge(rep.status)}
                      </div>
                    </div>
                    <h4 className="font-extrabold text-slate-805 truncate">{rep.requirement_title}</h4>
                    <p className="text-xs text-slate-500 font-semibold">Client: {rep.client_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Details & Review Workspace */}
          <div className="lg:col-span-4">
            {selectedReport ? (
              user.role === 'admin' ? (
                /* Admin review layout (Report verification & Mistake log spawner) */
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowRequirementView(!showRequirementView)}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold rounded-xl cursor-pointer transition"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{showRequirementView ? 'Hide Requirement View' : 'View Requirement'}</span>
                    </button>
                    <span className="text-[10px] font-bold text-slate-500">
                      {selectedReport.requirement_code || `REQ-${String(selectedReport.root_requirement_id || selectedReport.requirement_id).padStart(3, '0')} V${selectedReport.requirement_version || 1}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-6">
                    {/* Column 1: Original Requirement */}
                    <div className={`bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 max-h-[450px] overflow-y-auto text-left shadow-sm ${showRequirementView ? '' : 'hidden 2xl:block'}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-slate-600" />
                          <span>Original Requirement</span>
                        </h4>
                        <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          V1
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Requirement Title</span>
                          <h3 className="text-sm font-black text-slate-800 mt-1 leading-snug">{selectedReport.requirement_title}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Client</span>
                            <span className="text-[10px] font-black text-slate-700 mt-1 block truncate">{selectedReport.client_name}</span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                            <span className="text-[10px] font-black text-indigo-600 mt-1 block uppercase">{selectedReport.requirement_status}</span>
                          </div>
                        </div>

                        {selectedReport.pdf_path && (
                          <a
                            href={`${apiUrl.replace('/api', '')}${selectedReport.pdf_path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black transition"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>View Requirement PDF</span>
                          </a>
                        )}

                        <div>
                          <h5 className="font-bold text-slate-400 uppercase tracking-wide text-[9px] mb-1.5">Extracted Requirement Content</h5>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 max-h-64 overflow-y-auto">
                            <p className="text-[10px] text-slate-650 font-medium leading-relaxed whitespace-pre-wrap">
                              {selectedReport.requirement_description || 'No extracted requirement content is available for this report.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Current Requirement Version */}
                    <div className={`bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 max-h-[450px] overflow-y-auto text-left shadow-sm ${showRequirementView ? '' : 'hidden 2xl:block'}`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-brand-600" />
                          <span>Current Requirement Version</span>
                        </h4>
                        <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                          V{selectedReport.requirement_version || 1}
                        </span>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Title</span>
                          <h3 className="text-sm font-black text-slate-800 mt-1">{selectedReport.requirement_title}</h3>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl max-h-48 overflow-y-auto">
                          <p className="text-[10px] text-slate-650 font-medium leading-relaxed whitespace-pre-wrap">
                            {selectedReport.requirement_description || 'No content available.'}
                          </p>
                        </div>
                        {versionHistory.length > 1 && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Version History</span>
                            {versionHistory.slice(0, 3).map((v) => (
                              <div key={v.id} className="p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[9px] flex justify-between">
                                <span className="font-bold">V{v.version}</span>
                                <span className="text-slate-500">{v.status?.replace(/_/g, ' ')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: QA Checklist Results */}
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 max-h-[450px] overflow-y-auto text-left shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <ClipboardCheck className="h-4 w-4 text-indigo-650" />
                          <span>QA Checklist Results</span>
                        </h4>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {Math.round(selectedReport.overall_quality_score)}% Score
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <h5 className="font-bold text-slate-400 uppercase tracking-wide text-[9px] mb-1.5">Checklist Audit Findings</h5>
                          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 max-h-36 overflow-y-auto">
                            {selectedReport.checklist_results?.map((cr, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-2 text-[10px] py-1 border-b border-slate-100/50 last:border-b-0">
                                <span className="text-slate-700 font-semibold leading-relaxed">{cr.rule}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  cr.checked 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                  {cr.checked ? 'Pass' : 'Fail'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-bold text-slate-400 uppercase tracking-wide text-[9px] mb-1.5">Defects & Annotations</h5>
                          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-[10px] leading-relaxed">
                            {selectedReport.ambiguous_requirements && (
                              <div>
                                <span className="text-amber-600 font-bold block text-[8px] uppercase tracking-wide">Ambiguities:</span>
                                <p className="text-slate-650 italic pl-0.5">"{selectedReport.ambiguous_requirements}"</p>
                              </div>
                            )}
                            {selectedReport.missing_requirements && (
                              <div>
                                <span className="text-indigo-600 font-bold block text-[8px] uppercase tracking-wide">Missing Limits/Rules:</span>
                                <p className="text-slate-650 italic pl-0.5">"{selectedReport.missing_requirements}"</p>
                              </div>
                            )}
                            {selectedReport.incomplete_requirements && (
                              <div>
                                <span className="text-rose-600 font-bold block text-[8px] uppercase tracking-wide">Incomplete Paths:</span>
                                <p className="text-slate-655 italic pl-0.5">"{selectedReport.incomplete_requirements}"</p>
                              </div>
                            )}
                            {selectedReport.recommendations && (
                              <div className="pt-2 border-t border-slate-200/60 mt-1">
                                <span className="text-slate-500 font-bold block text-[8px] uppercase tracking-wide">Suggested Rewrite recommendations:</span>
                                <p className="text-slate-700 font-medium pl-0.5">{selectedReport.recommendations}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 4: AI Comparative Audit */}
                    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 max-h-[450px] overflow-y-auto text-left shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Brain className="h-4 w-4 text-brand-600" />
                          <span>AI Comparative Audit</span>
                        </h4>
                        <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">Co-Pilot Mode</span>
                      </div>

                      {aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                          <div className="h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-[10px] font-bold">Generating AI Analysis...</p>
                        </div>
                      ) : aiAnalysis && aiAnalysis.length > 0 ? (
                        <div className="space-y-3 text-[10px] pr-1">
                          {aiAnalysis.map((issue, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 relative overflow-hidden">
                              <div className={`absolute top-0 left-0 w-1 h-full ${issue.findingType === 'Recommendation' ? 'bg-amber-400' : 'bg-rose-500'}`}></div>
                              <div className="flex items-center justify-between pl-1 flex-wrap gap-1">
                                <span className={`font-black px-1.5 py-0.5 rounded text-[8px] border ${
                                  issue.findingType === 'Recommendation'
                                    ? 'text-amber-700 bg-amber-50 border-amber-100'
                                    : 'text-rose-600 bg-rose-50 border-rose-100'
                                }`}>
                                  {issue.findingType || 'Defect'} · {issue.issueType}
                                </span>
                                <span className="text-[8px] text-slate-450 uppercase font-black">{issue.severity}</span>
                              </div>
                              <p className="text-[8px] text-indigo-600 font-bold pl-1">Rule: {issue.checklistRule || issue.violatedChecklistRule}</p>
                              <p className="text-slate-800 font-extrabold leading-relaxed pl-1 text-[10px]">"{issue.requirementText}"</p>
                              <p className="text-[9px] text-slate-500 leading-relaxed pl-1">{issue.explanation}</p>
                              <div className="pt-2 border-t border-slate-200/50 pl-1">
                                <span className="text-emerald-600 font-bold uppercase block text-[8px] tracking-wide">Suggested Rewrite:</span>
                                <p className="text-slate-700 text-[9px] leading-relaxed mt-0.5">{issue.suggestedRewrite || issue.suggestedFix}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-20 text-slate-400 text-xs italic">
                          No quality issues identified by AI engine.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision verification spawner form */}
                  <form onSubmit={handleDecisionSubmit} className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-5 shadow-sm text-left">
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">Review Verification Decision Panel</h3>
                      <p className="text-slate-500 text-xs mt-1.5 font-medium">Compare the manual findings against the AI findings side-by-side before making an audit decision.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => { setDecision('approve'); setFeedback(''); }}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          decision === 'approve'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span>Approve Spec</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setDecision('reject'); setFeedback(''); }}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          decision === 'reject'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <XCircle className="h-4 w-4 text-rose-500" />
                        <span>Reject & Return QA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setDecision('return_client'); setFeedback(''); }}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          decision === 'return_client'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Send className="h-4 w-4 text-amber-500" />
                        <span>Return Client</span>
                      </button>
                    </div>

                    {/* Rejection logs check fields */}
                    {decision === 'reject' && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-rose-700">
                          <ShieldAlert className="h-4.5 w-4.5" />
                          <span>Track Analyst Mistake Gaps</span>
                        </div>

                        <div className="space-y-3 text-xs">
                          {/* Missed Checklist Rule Dropdown */}
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                              Missed Checklist Rule
                            </label>
                            <select
                              value={tempRule}
                              onChange={(e) => setTempRule(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                            >
                              <option value="">Select Missed Rule...</option>
                              {checklistRules.map((r) => (
                                <option key={r.id} value={r.rule_text}>
                                  {r.rule_text}
                                </option>
                              ))}
                              <option value="General Requirement Quality Gap">General Requirement Quality Gap</option>
                            </select>
                          </div>

                          {/* Mistake Type and Severity in a Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                                Mistake Type
                              </label>
                              <select
                                value={tempType}
                                onChange={(e) => setTempType(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-755 font-semibold focus:outline-none"
                              >
                                <option value="Missed Ambiguous Requirement">Missed Ambiguous Requirement</option>
                                <option value="Missed Validation Rule">Missed Validation Rule</option>
                                <option value="Missed Business Rule">Missed Business Rule</option>
                                <option value="Missed Acceptance Criteria">Missed Acceptance Criteria</option>
                                <option value="Incorrect Checklist Evaluation">Incorrect Checklist Evaluation</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                                Severity
                              </label>
                              <select
                                value={tempSeverity}
                                onChange={(e) => setTempSeverity(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-755 font-semibold focus:outline-none"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                              </select>
                            </div>
                          </div>

                          {/* Add Mistake Button */}
                          <button
                            type="button"
                            onClick={handleAddMistake}
                            disabled={!tempRule}
                            className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-400 rounded-xl font-bold transition-all text-xs cursor-pointer"
                          >
                            Add Logged Mistake to List
                          </button>
                        </div>

                        {/* List of Added Mistakes */}
                        {loggedMistakes.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mistakes List ({loggedMistakes.length})</h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                              {loggedMistakes.map((m, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                                  <div className="min-w-0 pr-2 text-left">
                                    <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded inline-block mb-1">
                                      {m.mistakeType} ({m.severity})
                                    </span>
                                    <p className="text-slate-700 font-bold truncate">{m.missedChecklistRule}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setLoggedMistakes(loggedMistakes.filter((_, i) => i !== idx))}
                                    className="text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer transition shrink-0 pl-1"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {decision && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {decision === 'approve' 
                            ? 'Approval Comments (Optional)' 
                            : decision === 'reject' 
                              ? 'Feedback to QA Analyst (Required)' 
                              : 'Feedback to Client (Required)'}
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={3}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium leading-relaxed"
                          placeholder="Type validation review comments here..."
                          required={decision !== 'approve'}
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={actionLoading || !decision || (decision !== 'approve' && !feedback)}
                        className="py-2.5 px-6 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        {actionLoading ? (
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4" />
                            <span>Confirm Review Decision</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* QA Analyst view layout (Validation report log details & feedback resubmit hooks) */
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-6 relative overflow-hidden text-left shadow-sm">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-300 via-indigo-500 to-brand-400"></div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Report Details Log</span>
                      {getStatusBadge(selectedReport.status)}
                    </div>
                    <h3 className="text-lg font-black text-slate-800">{selectedReport.requirement_title}</h3>
                    <p className="text-xs text-slate-500 font-semibold">Client: {selectedReport.client_name}</p>
                  </div>

                  {/* Feedback Box if Rejected */}
                  {['rejected', 'qa_rejected'].includes(selectedReport.status) && selectedReport.admin_feedback && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl space-y-3 text-xs font-medium">
                      <div className="flex items-center gap-2 font-bold text-rose-700">
                        <ShieldAlert className="h-4.5 w-4.5" />
                        <span>Admin Rejection Feedback</span>
                      </div>
                      <p className="leading-relaxed text-slate-650 italic bg-white p-3 rounded-xl border border-rose-100">
                        "{selectedReport.admin_feedback}"
                      </p>
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCorrectionResubmit(selectedReport)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 font-bold rounded-xl text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
                        >
                          <span>Correct & Resubmit Checklist</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Approved Feedback */}
                  {selectedReport.status === 'approved' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl space-y-2 text-xs font-medium">
                      <div className="flex items-center gap-2 font-bold text-emerald-700">
                        <CheckCircle className="h-4.5 w-4.5" />
                        <span>Admin Approval Comments</span>
                      </div>
                      <p className="leading-relaxed text-slate-700 pl-1">{selectedReport.admin_feedback || 'Report approved and specs locked.'}</p>
                    </div>
                  )}

                  {/* General observations details read-only */}
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Checklist Audits Passed</span>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[10px]">
                          {parseChecklistResults(selectedReport.checklist_results).map((c, i) => (
                            <div key={i} className="flex justify-between items-center py-0.5">
                              <span className="text-slate-650 font-semibold truncate max-w-[170px]">{c.rule}</span>
                              <span className={c.checked ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                                {c.checked ? 'Pass' : 'Fail'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Logged quality findings</span>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 max-h-36 overflow-y-auto text-[10px] leading-relaxed">
                          {selectedReport.ambiguous_requirements && (
                            <div>
                              <strong className="text-amber-600 block text-[8px] uppercase tracking-wide">Ambiguous:</strong>
                              <p className="text-slate-650 pl-0.5">"{selectedReport.ambiguous_requirements}"</p>
                            </div>
                          )}
                          {selectedReport.missing_requirements && (
                            <div>
                              <strong className="text-indigo-600 block text-[8px] uppercase tracking-wide">Missing Limits/Rules:</strong>
                              <p className="text-slate-650 pl-0.5">"{selectedReport.missing_requirements}"</p>
                            </div>
                          )}
                          {selectedReport.incomplete_requirements && (
                            <div>
                              <strong className="text-rose-600 block text-[8px] uppercase tracking-wide">Incomplete:</strong>
                              <p className="text-slate-650 pl-0.5">"{selectedReport.incomplete_requirements}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Validation Recommendations</span>
                      <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 font-medium leading-relaxed whitespace-pre-wrap">{selectedReport.recommendations}</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="h-[350px] flex flex-col items-center justify-center text-center text-slate-400 border border-slate-200 border-dashed rounded-3xl p-6 bg-white shadow-sm">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-medium">
                  {user.role === 'admin' 
                    ? 'Select a submitted report from the queue list to perform verification audits side-by-side.' 
                    : 'Select a report log from the queue to view details, check verification status, and read Admin reviews.'}
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
