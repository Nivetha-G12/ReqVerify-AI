import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  AlertCircle,
  AlertTriangle, 
  CornerUpLeft, 
  History, 
  Upload, 
  CheckCircle,
  FileCheck,
  Send,
  Clock,
  ArrowRight,
  Info,
  ExternalLink
} from 'lucide-react';

export default function ClientReturn() {
  const { apiFetch, apiUrl } = useAuth();
  
  // Data roster
  const [returnedReqs, setReturnedReqs] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [report, setReport] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  
  // Resubmission Inputs
  const [reviseTitle, setReviseTitle] = useState('');
  const [reviseFile, setReviseFile] = useState(null);
  const [reviseDesc, setReviseDesc] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchReturnedRequirements = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/requirements/client/returned');
      setReturnedReqs(data);
    } catch (err) {
      setError('Failed to fetch returned requirements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnedRequirements();
  }, []);

  const handleSelectReq = async (req) => {
    setSelectedReq(req);
    setReport(null);
    setVersionHistory([]);
    setReviseTitle(req.title);
    setReviseFile(null);
    setReviseDesc('');
    setError('');
    setSuccess('');

    try {
      // Fetch validation reports to find feedback for this requirement
      const reports = await apiFetch('/reports');
      const reqReport = reports.find(r => r.requirement_id === req.id);
      setReport(reqReport || null);

      const versions = await apiFetch(`/requirements/${req.id}/versions`);
      setVersionHistory(versions);
    } catch (err) {
      console.error('Error fetching report details for client view:', err);
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSubmitLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('title', reviseTitle || selectedReq.title);
    formData.append('clientName', selectedReq.client_name);
    formData.append('description', reviseDesc || `Resubmitted revised version for REQ-${selectedReq.id}`);
    if (reviseFile) {
      formData.append('pdf', reviseFile);
    }

    try {
      const res = await fetch(`${apiUrl}/requirements/${selectedReq.id}/revise`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to submit revised document.');

      setSuccess('Revised specification submitted successfully. Validation workflow restarted.');
      setReviseTitle('');
      setReviseFile(null);
      setReviseDesc('');
      setSelectedReq(null);
      fetchReturnedRequirements();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="border-b border-slate-200/50 pb-5">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Client Portal</h1>
        <p className="text-slate-500 text-xs mt-1.5 font-medium">
          View returned requirements, review Admin feedback, edit requirement details, and resubmit a new version for validation.
        </p>
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
          Loading returned documents...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* Left Panel: Catalog List */}
          <div className="lg:col-span-2 space-y-4 max-h-[600px] overflow-y-auto pr-1 text-left">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest px-1">Returned Specifications</h3>
            
            {returnedReqs.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl text-slate-450 text-xs font-medium">
                No returned specifications in queue.
              </div>
            ) : (
              returnedReqs.map((req) => (
                <div
                  key={req.id}
                  onClick={() => handleSelectReq(req)}
                  className={`bg-white p-5 rounded-2xl border cursor-pointer hover:border-brand-500/30 hover:shadow-xs transition-all border-l-4 ${
                    selectedReq?.id === req.id 
                      ? 'border-l-brand-600 border-slate-250 shadow-xs' 
                      : 'border-l-rose-500 border-slate-200/80 shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Revision Required
                      </span>
                      <span className="text-[10px] text-slate-450 font-bold">
                        {req.requirement_code || `REQ-${String(req.root_requirement_id || req.id).padStart(3, '0')} V${req.version || 1}`}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-805 truncate">{req.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold">
                      Returned: {req.returned_at ? new Date(req.returned_at).toLocaleDateString() : 'Date unavailable'}
                    </p>
                    <p className="text-[10px] text-slate-450 font-semibold truncate">
                      {req.return_reason || 'Admin returned requirement to client'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Panel: Selected Item Detail */}
          <div className="lg:col-span-3">
            {selectedReq ? (
              <div className="space-y-6">
                
                {/* Details and Rejection Feedback Card */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-6 text-left shadow-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">
                      {selectedReq.requirement_code || `REQ-${String(selectedReq.root_requirement_id || selectedReq.id).padStart(3, '0')} V${selectedReq.version || 1}`} Analysis
                    </span>
                    <h2 className="text-lg font-black text-slate-805">{selectedReq.title}</h2>
                    <p className="text-xs text-slate-500 font-semibold">
                      Client Name: {selectedReq.client_name} | Return Date: {selectedReq.returned_at ? new Date(selectedReq.returned_at).toLocaleDateString() : 'Not recorded'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Requirement ID</span>
                      <span className="font-black text-slate-750 mt-1 block">
                        REQ-{String(selectedReq.root_requirement_id || selectedReq.parent_id || selectedReq.id).padStart(3, '0')}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Current Version</span>
                      <span className="font-black text-slate-750 mt-1 block">V{selectedReq.version || 1}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Return Reason</span>
                      <span className="font-black text-slate-750 mt-1 block">{selectedReq.return_reason || 'Admin revision requested'}</span>
                    </div>
                  </div>

                  {/* Feedback Gaps Display */}
                  {report ? (
                    <div className="space-y-4">
                      {/* Admin feedback */}
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-bold text-rose-700 uppercase tracking-wide text-[10px]">
                          <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                          <span>Admin Correction Instructions</span>
                        </div>
                        <p className="leading-relaxed text-slate-700 font-medium pl-0.5 whitespace-pre-wrap">
                          {selectedReq.admin_feedback || report.admin_feedback || 'No comments provided. Please review checklist failures.'}
                        </p>
                      </div>

                      {/* Gaps detected details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 normal-case font-medium">
                          <span className="text-amber-600 font-bold uppercase block text-[8px]">Ambiguous Terms</span>
                          <p className="text-slate-650 italic">
                            {report.ambiguous_requirements ? `"${report.ambiguous_requirements}"` : 'None logged.'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 normal-case font-medium">
                          <span className="text-indigo-600 font-bold uppercase block text-[8px]">Missing Limits/Rules</span>
                          <p className="text-slate-650 italic">
                            {report.missing_requirements ? `"${report.missing_requirements}"` : 'None logged.'}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 normal-case font-medium">
                          <span className="text-rose-600 font-bold uppercase block text-[8px]">Incomplete Workflow Gaps</span>
                          <p className="text-slate-650 italic">
                            {report.incomplete_requirements ? `"${report.incomplete_requirements}"` : 'None logged.'}
                          </p>
                        </div>
                      </div>

                      {/* Suggested corrections */}
                      {report.recommendations && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1 text-xs text-slate-700">
                          <span className="text-xs font-bold text-slate-800 block">Suggested Corrections & Rewrites:</span>
                          <p className="leading-relaxed font-medium pl-0.5">{report.recommendations}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium italic">
                      No validation report logs found. This requirement was returned directly by Admin.
                    </div>
                  )}

                  {/* PDF download */}
                  {selectedReq.pdf_path && (
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand-600" />
                        <span className="text-xs text-slate-700 font-bold">Attached PDF Version {selectedReq.version}</span>
                      </div>
                      <a
                        href={`${apiUrl.replace('/api', '')}${selectedReq.pdf_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-655 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>Download</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Upload resubmission version */}
                <form onSubmit={handleResubmit} className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-5 text-left shadow-sm">
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">Upload Revised Requirement</h3>
                    <p className="text-slate-500 text-xs mt-1.5 font-medium">
                      Submit corrected documentation to restart the manual QA checklist validation process.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Requirement Title
                      </label>
                      <input
                        type="text"
                        value={reviseTitle}
                        onChange={(e) => setReviseTitle(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Revised PDF File (Optional)
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setReviseFile(e.target.files[0])}
                        className="w-full text-xs text-slate-550 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 file:cursor-pointer file:hover:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                        Revision Notes / Corrections Description
                      </label>
                      <textarea
                        value={reviseDesc}
                        onChange={(e) => setReviseDesc(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium leading-relaxed"
                        placeholder="Detail what changes were made in this document version based on corrections feedback..."
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitLoading || !reviseTitle || !reviseDesc}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-150 disabled:text-slate-400 font-bold text-xs rounded-xl text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      {submitLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Submit Revised Specification</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Requirement Version History */}
                <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-4 text-left shadow-sm">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <History className="h-4 w-4 text-indigo-650" />
                    <span>Version History & Resubmission Tracking</span>
                  </h3>
                  <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-5 py-2">
                    {versionHistory.map((vReq) => (
                      <div key={vReq.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <div className={`absolute -left-9.5 top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                          vReq.version === selectedReq.version 
                            ? 'border-rose-500 shadow-sm' 
                            : 'border-slate-300'
                        }`} />
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {vReq.requirement_code || `REQ-${String(vReq.root_requirement_id || vReq.id).padStart(3, '0')} V${vReq.version || 1}`}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              vReq.status === 'returned_to_client' 
                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                : vReq.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-slate-50 text-slate-500 border border-slate-200'
                            }`}>
                              {vReq.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold ml-auto">
                              {new Date(vReq.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-550 leading-relaxed font-mono text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 max-h-24 overflow-y-auto whitespace-pre-wrap">
                            {vReq.change_notes || vReq.description?.substring(0, 150) || 'Initial version.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-center text-slate-400 border border-slate-200 border-dashed rounded-3xl p-6 bg-white shadow-sm">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-medium">Select a returned requirement from the queue list to inspect correction feedback and resubmit revised documents.</p>
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
