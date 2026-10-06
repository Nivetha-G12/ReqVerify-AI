import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Award, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ChevronRight,
  RefreshCw,
  Info,
  Users,
  Play,
  Cpu
} from 'lucide-react';

export default function CompetencyCenter() {
  const { user, apiFetch } = useAuth();
  
  // Shared States
  const [assessments, setAssessments] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // QA Analyst Specific States
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: optionIndex }
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Admin Specific Generator States
  const [selectedAnalyst, setSelectedAnalyst] = useState('');
  const [assessmentType, setAssessmentType] = useState('multiple_choice');
  const [category, setCategory] = useState(''); // Empty = Auto-Detect
  const [genLoading, setGenLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/assessments');
      setAssessments(data);

      if (user.role === 'admin') {
        const emps = await apiFetch('/employees');
        setAnalysts(emps);

        try {
          const recs = await apiFetch('/assessments/recommendations');
          setRecommendations(recs);
        } catch (recErr) {
          console.error('Error fetching competency recommendations:', recErr);
        }
      }
    } catch (err) {
      setError('Failed to load assessment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleQuickAssign = async (analystId, recCategory) => {
    setGenLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch('/assessments/generate', {
        method: 'POST',
        body: JSON.stringify({
          qaAnalystId: analystId,
          category: recCategory,
          assessmentType: 'multiple_choice'
        })
      });

      const selectedName = analysts.find(a => a.id === parseInt(analystId))?.username || 'Analyst';
      setSuccess(`Targeted competency assessment successfully generated and assigned to ${selectedName}!`);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to generate targeted assessment.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleSelectQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
    setError('');
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!activeQuiz) return;

    const unanswered = activeQuiz.questions.some(q => selectedAnswers[q.id] === undefined);
    if (unanswered) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitLoading(true);
    setError('');

    try {
      const result = await apiFetch(`/assessments/${activeQuiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: selectedAnswers })
      });
      
      setQuizResult(result);
      setQuizSubmitted(true);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to submit assessment answers.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    if (!selectedAnalyst) {
      setError('Please select a QA Analyst.');
      return;
    }

    setGenLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        qaAnalystId: selectedAnalyst,
        assessmentType
      };
      if (category) {
        payload.category = category;
      }

      await apiFetch('/assessments/generate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const selectedName = analysts.find(a => a.id === parseInt(selectedAnalyst))?.username || 'Analyst';
      setSuccess(`Assessment quiz successfully generated and assigned to ${selectedName}!`);
      
      setSelectedAnalyst('');
      setCategory('');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to generate competency assessment.');
    } finally {
      setGenLoading(false);
    }
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 85) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
    if (score >= 70) return 'text-amber-600 border-amber-200 bg-amber-50';
    return 'text-rose-600 border-rose-200 bg-rose-50';
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {user.role === 'admin' ? 'Competency Assessment Center' : 'Competency Assessments'}
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            {user.role === 'admin' 
              ? 'Analyze mistake patterns, assign targeted training modules, and track analyst competencies.' 
              : 'Complete assigned training quizzes to build skills and inspect customized improvement recommendations.'}
          </p>
        </div>
        {!activeQuiz && (
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-655 font-bold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Sync Assessments</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-450" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-450 text-xs font-medium">
          Loading assessments portal...
        </div>
      ) : !activeQuiz ? (
        /* List & Administration view */
        <div className="space-y-6">
          {/* Mistake Pattern Warning Cards (Admin only) */}
          {user.role === 'admin' && recommendations.length > 0 && (
            <div className="bg-rose-50/50 border border-rose-200 p-5 rounded-2xl space-y-3 text-left">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs uppercase tracking-wide">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-550 shrink-0" />
                <span>Detected Mistake Pattern Warnings</span>
              </div>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                The following analysts have repeatedly made the same mistake type on 3 or more separate requirements. We recommend launching a targeted training drill immediately.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-white border border-rose-200/80 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                        QA001 missed {rec.mistakeType} on {rec.reqCount} Requirements
                      </span>
                      <h4 className="font-extrabold text-slate-800 text-xs mt-2">Analyst: {rec.qaUsername}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">Recommended Quiz Category: {rec.recommendedCategory}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAssign(rec.qaAnalystId, rec.recommendedCategory)}
                      disabled={genLoading}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all text-[10px] shrink-0 cursor-pointer shadow-sm"
                    >
                      Generate Assessment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left Panel: Assessments History Queue */}
            <div className="lg:col-span-3 space-y-4 max-h-[600px] overflow-y-auto pr-1 text-left">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest px-1">Organization Quizzes</h3>
              {assessments.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl text-slate-400 text-xs font-medium">
                  No competency assessments generated yet.
                </div>
              ) : (
                assessments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between gap-4 shadow-sm hover:shadow-xs transition"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="text-[9px] text-indigo-600 font-black uppercase tracking-wider block">
                        Category: {a.category}
                      </span>
                      <h4 className="font-extrabold text-slate-850 truncate">{a.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap pt-1">
                        <span>Analyst: <strong className="text-slate-750">{a.qa_username}</strong></span>
                        <span>Type: <strong className="text-slate-750 lowercase">{a.assessment_type.replace('_', ' ')}</strong></span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {a.status === 'completed' ? (
                        <div className="space-y-1">
                          <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-black ${getScoreBadgeColor(a.score)}`}>
                            {a.score}% Score
                          </span>
                          <span className="text-[9px] text-slate-400 block uppercase tracking-wider mt-1 text-center font-bold">Completed</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {user.role === 'qa_analyst' ? (
                            <button
                              onClick={() => handleSelectQuiz(a)}
                              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-[10px] font-bold rounded-xl transition cursor-pointer shadow-sm"
                            >
                              Take Quiz
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              Assigned
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Panel: Generator Form Spawner (Admin Only) */}
            {user.role === 'admin' && (
              <div className="lg:col-span-2">
                <form onSubmit={handleGenerateQuiz} className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 text-left shadow-sm">
                  <div>
                    <h3 className="font-black text-slate-805 text-sm">Generate Competency Assessment</h3>
                    <p className="text-slate-500 text-xs mt-1.5 font-medium">
                      Launch an AI-generated training assessment targeting specific QA analyst vulnerabilities.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Assign QA Analyst
                      </label>
                      <select
                        value={selectedAnalyst}
                        onChange={(e) => setSelectedAnalyst(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                        required
                      >
                        <option value="">Select Analyst...</option>
                        {analysts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.username} ({a.level || 'Analyst'} - {a.experience} yrs exp)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Question Type
                      </label>
                      <select
                        value={assessmentType}
                        onChange={(e) => setAssessmentType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                      >
                        <option value="multiple_choice">Multiple Choice Questions</option>
                        <option value="scenario_based">Scenario Based Questions</option>
                        <option value="practical_analysis">Requirement Analysis Questions</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Competency Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
                      >
                        <option value="">Auto-Detect Category (Recommended)</option>
                        <option value="Requirement Analysis">Requirement Analysis</option>
                        <option value="Requirement Validation">Requirement Validation</option>
                        <option value="Business Rules">Business Rules</option>
                        <option value="Validation Rules">Validation Rules</option>
                        <option value="Security Requirements">Security Requirements</option>
                        <option value="Requirement Quality">Requirement Quality</option>
                        <option value="Testability Analysis">Testability Analysis</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={genLoading}
                      className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 font-bold text-xs rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {genLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Play className="h-4 w-4 text-white" />
                          <span>Generate and Assign Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* QA Analyst Active Quiz Taker Pane */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-left">
          {/* Main Quiz Sheet */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">{activeQuiz.title}</h3>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block mt-0.5">
                    Category: {activeQuiz.category}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded text-[10px] font-bold text-brand-655 border border-brand-200 bg-brand-50 uppercase">
                  {activeQuiz.assessment_type.replace(/_/g, ' ')}
                </span>
              </div>

              <form onSubmit={handleQuizSubmit} className="space-y-6">
                {activeQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="space-y-3 p-4 bg-slate-50/50 border border-slate-200 rounded-2xl">
                    <div className="flex items-start gap-2 justify-between">
                      <h4 className="text-xs font-bold text-slate-800 leading-relaxed">
                        Q{idx + 1}. {q.question}
                      </h4>
                      <span className="text-[9px] font-black text-slate-450 uppercase shrink-0">
                        {q.difficultyLevel}
                      </span>
                    </div>

                    <div className="space-y-2.5 font-semibold text-xs">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = selectedAnswers[q.id] === oIdx;
                        const isCorrect = q.correctAnswer === oIdx;
                        const showCorrectStyle = quizSubmitted && isCorrect;
                        const showWrongStyle = quizSubmitted && isSelected && !isCorrect;

                        return (
                          <button
                            type="button"
                            key={oIdx}
                            onClick={() => handleOptionSelect(q.id, oIdx)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                              showCorrectStyle
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                                : showWrongStyle
                                  ? 'bg-rose-50 border-rose-500 text-rose-700'
                                  : isSelected
                                    ? 'bg-brand-50 border-brand-500 text-brand-700 font-bold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full border text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                              isSelected || showCorrectStyle
                                ? 'bg-brand-600 border-brand-600 text-white'
                                : 'border-slate-300 bg-slate-50 text-slate-450'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 mt-3 text-[10px] leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-[8px] uppercase tracking-wider text-slate-400">
                          <Info className="h-3.5 w-3.5 text-slate-500" />
                          <span>Evaluation Explanation</span>
                        </div>
                        <p className="text-slate-650 font-medium">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}

                {!quizSubmitted && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="py-2.5 px-8 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {submitLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'Submit Answers'
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Right Panel: Dynamic recommendations */}
          <div className="space-y-6">
            {quizSubmitted && quizResult ? (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl text-center space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-300 via-emerald-500 to-teal-400"></div>
                  
                  <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                    <Award className="h-8 w-8 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-600 text-xs uppercase tracking-wider">Assessment Score</h3>
                    <div className="text-4xl font-black text-slate-800 mt-2">
                      <span className={`px-4 py-1.5 rounded-2xl border font-black ${getScoreBadgeColor(quizResult.score)}`}>
                        {quizResult.score}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    You answered {Math.round((quizResult.score / 100) * activeQuiz.questions.length)} of {activeQuiz.questions.length} questions correctly.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-indigo-650" />
                    <span>Improvement Recommendations</span>
                  </h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-655 leading-relaxed font-semibold">
                    {quizResult.improvement_recommendations}
                  </div>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="w-full py-2.5 bg-slate-900 border border-slate-850 text-xs font-bold rounded-xl text-white hover:bg-slate-800 transition cursor-pointer shadow-sm"
                  >
                    Return to Assessments list
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-3 text-xs leading-relaxed font-semibold text-slate-500">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">Training Quiz Rules</h4>
                <p className="font-medium text-slate-500">
                  Carefully read the scenarios and questions. Select the single best answer option for each. Grade metrics are calculated instantly upon submission.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
