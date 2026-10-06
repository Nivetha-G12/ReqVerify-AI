import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  ClipboardCheck, 
  AlertCircle,
  Copy,
  ChevronRight,
  TrendingUp,
  Sliders,
  Send,
  HelpCircle,
  History,
  CheckCircle
} from 'lucide-react';

export default function RequirementValidator({ selectedRequirementForQA, setSelectedRequirementForQA }) {
  const { apiFetch } = useAuth();
  
  // Data States
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  
  // Interactive Validation States
  const [checkedRules, setCheckedRules] = useState({}); // { ruleText: 'pass' | 'fail' | null }
  const [ruleComments, setRuleComments] = useState({}); // { ruleText: string }
  
  // Report Final Inputs
  const [missingReqs, setMissingReqs] = useState('');
  const [ambiguousReqs, setAmbiguousReqs] = useState('');
  const [incompleteReqs, setIncompleteReqs] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [score, setScore] = useState(100);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTasks = async () => {
    try {
      const data = await apiFetch('/requirements');
      // Fetch only assigned, actively validating tasks
      const activeTasks = data.filter(t => t.status === 'under_validation' || t.status === 'returned_to_client');
      setTasks(activeTasks);
      return activeTasks;
    } catch (err) {
      setError('Failed to fetch assigned tasks.');
      return [];
    }
  };

  const fetchChecklist = async () => {
    try {
      const data = await apiFetch('/checklist');
      setChecklist(data);
      
      // Initialize checked state to null for all (unvalidated)
      const initialChecked = {};
      const initialComments = {};
      data.forEach(r => {
        initialChecked[r.rule_text] = null;
        initialComments[r.rule_text] = '';
      });
      setCheckedRules(initialChecked);
      setRuleComments(initialComments);
      return data;
    } catch (err) {
      console.error('Error fetching checklist:', err);
      return [];
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchChecklist()]).then(([activeTasks, checklistRules]) => {
      if (selectedRequirementForQA && activeTasks && checklistRules) {
        const matchingTask = activeTasks.find(t => t.id === selectedRequirementForQA);
        if (matchingTask) {
          handleSelectTask(matchingTask, checklistRules);
          if (setSelectedRequirementForQA) {
            setSelectedRequirementForQA(null);
          }
        }
      }
    }).finally(() => setLoading(false));
  }, [selectedRequirementForQA]);

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

  const handleSelectTask = async (task, checklistRules = checklist) => {
    setSelectedTask(task);
    setVersionHistory([]);
    setSuccess('');
    setError('');
    
    // Clear and reset form
    const initialChecked = {};
    const initialComments = {};
    checklistRules.forEach(r => {
      initialChecked[r.rule_text] = null;
      initialComments[r.rule_text] = '';
    });
    setCheckedRules(initialChecked);
    setRuleComments(initialComments);
    
    setMissingReqs('');
    setAmbiguousReqs('');
    setIncompleteReqs('');
    setRecommendations('');
    setScore(100);

    // Fetch previous reports for rejected resubmissions
    try {
      const versions = await apiFetch(`/requirements/${task.id}/versions`);
      setVersionHistory(versions);

      const reports = await apiFetch('/reports');
      const prevReport = reports.find(r => r.requirement_id === task.id);
      if (prevReport) {
        setMissingReqs(prevReport.missing_requirements || '');
        setAmbiguousReqs(prevReport.ambiguous_requirements || '');
        setIncompleteReqs(prevReport.incomplete_requirements || '');
        setRecommendations(prevReport.recommendations || '');
        setScore(parseFloat(prevReport.overall_quality_score || '100'));
        
        const prevChecklist = parseChecklistResults(prevReport.checklist_results);
        if (prevChecklist.length > 0) {
          const updatedChecked = { ...initialChecked };
          const updatedComments = { ...initialComments };
          prevChecklist.forEach(c => {
            updatedChecked[c.rule] = c.checked ? 'pass' : 'fail';
            updatedComments[c.rule] = c.comment || '';
          });
          setCheckedRules(updatedChecked);
          setRuleComments(updatedComments);
        }
      }
    } catch (err) {
      console.error('Error fetching previous report:', err);
    }
  };

  const handleCheckRule = (ruleText, status) => {
    const nextChecked = {
      ...checkedRules,
      [ruleText]: status
    };
    setCheckedRules(nextChecked);

    // Calculate score: percentage of checks that passed (i.e. status is 'pass')
    const passedCount = Object.values(nextChecked).filter(val => val === 'pass').length;
    const total = checklist.length;
    const nextScore = total > 0 ? Math.round((passedCount / total) * 100) : 100;
    setScore(nextScore);
  };

  const handleCommentChange = (ruleText, value) => {
    setRuleComments(prev => ({
      ...prev,
      [ruleText]: value
    }));
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    // Enforce that all checklist rules are evaluated
    const allReviewed = checklist.every(r => checkedRules[r.rule_text] === 'pass' || checkedRules[r.rule_text] === 'fail');
    if (!allReviewed) {
      setError('Please review all checklist items before submitting.');
      return;
    }

    // Enforce comments on all fails
    const failCommentsProvided = checklist.every(r => {
      if (checkedRules[r.rule_text] === 'fail') {
        return ruleComments[r.rule_text]?.trim().length > 0;
      }
      return true;
    });
    if (!failCommentsProvided) {
      setError('Please add comments/observations explaining why checklist items failed.');
      return;
    }

    setSubmitLoading(true);
    setError('');
    setSuccess('');

    // Prepare checklist results array
    const checklistResults = checklist.map(r => ({
      rule: r.rule_text,
      checked: checkedRules[r.rule_text] === 'pass',
      comment: ruleComments[r.rule_text] || ''
    }));

    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          requirementId: selectedTask.id,
          checklistResults,
          aiFindings: [], // AI is not run by QA Analysts
          missingRequirements: missingReqs,
          ambiguousRequirements: ambiguousReqs,
          incompleteRequirements: incompleteReqs,
          recommendations,
          overallQualityScore: score
        })
      });

      setSuccess('Validation report submitted to Admin successfully!');
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to submit validation report.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const reviewedCount = Object.values(checkedRules).filter(val => val !== null).length;
  const checklistTotal = checklist.length;
  const allReviewed = checklistTotal > 0 && reviewedCount === checklistTotal;
  
  const failCommentsProvided = checklist.every(r => {
    if (checkedRules[r.rule_text] === 'fail') {
      return ruleComments[r.rule_text]?.trim().length > 0;
    }
    return true;
  });
  
  // Submit should be allowed once all checklist items are reviewed
  // and all failed items have observation comments. Recommendations
  // are helpful but not mandatory for enabling submit per workflow.
  const canSubmit = allReviewed && failCommentsProvided;
  const progressPercent = checklistTotal > 0 ? Math.round((reviewedCount / checklistTotal) * 100) : 0;

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="border-b border-slate-200/50 pb-5">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manual Checklist Validator</h1>
        <p className="text-slate-500 text-xs mt-1.5 font-medium">
          Review assigned client requirements manually using the official checklist rules, identify specification gaps, and write QA reports.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-450 text-xs font-medium">
          Loading assigned validation tasks...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Left Panel: Assigned Tasks Queue */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest px-1">Active Queue</h3>
            {tasks.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl text-slate-400 text-xs font-medium">
                No assigned requirements.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`bg-white p-5 rounded-2xl cursor-pointer hover:border-brand-500/30 hover:shadow-sm transition-all border border-slate-200/80 border-l-4 ${
                    selectedTask?.id === task.id 
                      ? 'border-l-brand-600 border-brand-500/20 shadow-xs' 
                      : task.status === 'returned_to_client'
                        ? 'border-l-rose-500 bg-rose-50/20'
                        : 'border-l-amber-500 bg-amber-50/25'
                  }`}
                >
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        task.status === 'returned_to_client' 
                          ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {task.status === 'returned_to_client' ? 'Returned (Revised)' : 'Pending QA'}
                      </span>
                      <span className="text-[10px] text-slate-450 font-bold">Ver. {task.version}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 truncate">{task.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold">Client: {task.client_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Panel: Interactive Checklist Split Board */}
          <div className="lg:col-span-4 space-y-6">
            {selectedTask ? (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                
                {/* 2-Column Split Board */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* Panel 1: Document View */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 max-h-[500px] overflow-y-auto shadow-sm flex flex-col">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100 shrink-0">
                      <FileText className="h-4 w-4 text-brand-600" />
                      <span>Requirement Source Document</span>
                    </h4>
                    <div className="space-y-3 flex-1 flex flex-col min-h-0 text-left">
                      <div>
                        <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Title</span>
                        <h3 className="font-extrabold text-slate-800 text-xs mt-0.5">{selectedTask.title}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-slate-400 font-black uppercase tracking-wider block">Requirement</span>
                          <span className="text-slate-700 font-black mt-0.5 block">
                            {selectedTask.requirement_code || `REQ-${String(selectedTask.root_requirement_id || selectedTask.id).padStart(3, '0')} V${selectedTask.version || 1}`}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-slate-400 font-black uppercase tracking-wider block">Status</span>
                          <span className="text-slate-700 font-black mt-0.5 block">{selectedTask.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col min-h-0">
                        <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider">Document Content</span>
                        <div className="flex-1 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] text-slate-700 leading-relaxed font-mono whitespace-pre-wrap mt-1 select-text overflow-y-auto">
                          {selectedTask.description}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-[9px] text-slate-455 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Previous Versions</span>
                        </h5>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {versionHistory.length <= 1 ? (
                            <p className="text-[10px] text-slate-400 italic">No previous versions recorded.</p>
                          ) : (
                            versionHistory.map((version) => (
                              <div key={version.id} className="p-2.5 bg-white border border-slate-200 rounded-xl text-[10px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-slate-700">
                                    {version.requirement_code || `V${version.version || 1}`}
                                  </span>
                                  <span className="text-slate-400 font-bold">{new Date(version.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-500 font-semibold mt-1">{version.status.replace(/_/g, ' ')}</p>
                                <p className="text-slate-500 mt-1 line-clamp-2">{version.change_notes || 'Initial version.'}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
  
                  {/* Panel 2: Interactive Checklist Rules */}
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-4 max-h-[500px] overflow-y-auto shadow-sm text-left">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <ClipboardCheck className="h-4 w-4 text-indigo-650" />
                      <span>Validation Checklist Audit</span>
                    </h4>

                    {/* Progress Indicator */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                        <span>Checklist Review Progress</span>
                        <span className="text-brand-600 font-extrabold">{reviewedCount} / {checklistTotal} Rules ({progressPercent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
  
                    <div className="space-y-4 pr-1">
                      {checklist.map((rule, index) => {
                        const isPass = checkedRules[rule.rule_text] === 'pass';
                        const isFail = checkedRules[rule.rule_text] === 'fail';
                        const hasComment = ruleComments[rule.rule_text]?.trim().length > 0;
                        const showWarning = isFail && !hasComment;

                        return (
                          <div key={rule.id} className="p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-xs font-extrabold text-slate-850 leading-tight">
                                  {index + 1}. {rule.rule_text}
                                </p>
                                <p className="text-[10px] text-slate-500 font-semibold leading-normal">{rule.description}</p>
                              </div>
                              
                              <div className="flex gap-1.5 shrink-0 self-end sm:self-start">
                                <button
                                  type="button"
                                  onClick={() => handleCheckRule(rule.rule_text, 'pass')}
                                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 cursor-pointer ${
                                    isPass
                                      ? 'bg-emerald-600 text-white border-emerald-650'
                                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  Pass
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCheckRule(rule.rule_text, 'fail')}
                                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-200 cursor-pointer ${
                                    isFail
                                      ? 'bg-rose-600 text-white border-rose-650'
                                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  Fail
                                </button>
                              </div>
                            </div>

                            {/* Observation comment field (slide open when fail toggled) */}
                            {isFail && (
                              <div className="space-y-1 mt-2 transition-all duration-250">
                                <input
                                  type="text"
                                  value={ruleComments[rule.rule_text] || ''}
                                  onChange={(e) => handleCommentChange(rule.rule_text, e.target.value)}
                                  className={`w-full px-3 py-2 bg-white border rounded-lg text-[10px] text-slate-750 placeholder-slate-400 focus:outline-none transition-all duration-200 ${
                                    showWarning 
                                      ? 'border-rose-500 focus:border-rose-600' 
                                      : 'border-slate-200 focus:border-indigo-500'
                                  }`}
                                  placeholder="Observation comment is required for checklist failures..."
                                />
                                {showWarning && (
                                  <p className="text-[9px] text-rose-600 font-bold">⚠️ Observation comment is mandatory when marked as Fail.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
  
                </div>

                {/* Bottom Panel: Report Finalization */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-6 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">QA Quality Summary Rating</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-brand-600" />
                        <span className="text-xs font-semibold text-slate-500">Calculated Score:</span>
                      </div>
                      <span className="text-xs font-black text-brand-655 px-3 py-1 bg-brand-50 border border-brand-200/60 rounded-xl">
                        {score}% Quality Score
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
                    <div className="space-y-2">
                      <label className="block text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                        Ambiguous Requirements Gaps
                      </label>
                      <textarea
                        value={ambiguousReqs}
                        onChange={(e) => setAmbiguousReqs(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                        placeholder="Detail any ambiguous or vague terminology..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                        Missing Limits & Security Gaps
                      </label>
                      <textarea
                        value={missingReqs}
                        onChange={(e) => setMissingReqs(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                        placeholder="Describe missing inputs, ranges, or parameters..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                        Incomplete Workflows Gaps
                      </label>
                      <textarea
                        value={incompleteReqs}
                        onChange={(e) => setIncompleteReqs(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                        placeholder="Detail incomplete user paths or logic loops..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <label className="block text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      Validation Recommendations / Rewrites (Required)
                    </label>
                    <textarea
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium leading-relaxed"
                      placeholder="Outline recommendation rewrites for development teams to fix these specification issues..."
                    />
                  </div>

                  {(!allReviewed || !failCommentsProvided) && (
                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold select-none">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-500" />
                      <span>
                        {!allReviewed 
                          ? 'Please evaluate all checklist items (Pass/Fail) before submitting the report.' 
                          : 'Please write observation comments for all failed checklist rules.'}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={submitLoading || !canSubmit}
                      className="py-2.5 px-8 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 font-bold text-xs rounded-xl text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {submitLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send className="h-4 w-4 text-white" />
                          <span>Submit Quality Validation Report</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </form>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center text-slate-400 border border-slate-200 border-dashed rounded-3xl p-6 bg-white shadow-sm">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-medium">Select an assigned requirement task from the active queue to start checklist validation.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
