import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  FileText, 
  UserPlus, 
  Search, 
  Filter, 
  ExternalLink,
  ChevronRight,
  Upload,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileUp,
  X,
  Eye,
  Send,
  History,
  CornerUpLeft
} from 'lucide-react';

export default function RequirementManager() {
  const { apiFetch, apiUrl } = useAuth();
  
  // Data States
  const [requirements, setRequirements] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  
  // Selected Requirement for Modal Dialogs
  const [selectedReq, setSelectedReq] = useState(null);
  
  // UI Modal Toggles
  const [showAddForm, setShowAddForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  
  // Feedback & Operations States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Add Form Inputs
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  
  // Assignment Inputs
  const [selectedAnalyst, setSelectedAnalyst] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  
  // Return to Client Inputs
  const [returnFeedback, setReturnFeedback] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const fetchRequirements = async () => {
    try {
      const q = [];
      if (search) q.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) q.push(`status=${encodeURIComponent(statusFilter)}`);
      const queryStr = q.length > 0 ? `?${q.join('&')}` : '';
      
      const data = await apiFetch(`/requirements${queryStr}`);
      setRequirements(data);
    } catch (err) {
      setError(err.message || 'Failed to load requirements.');
    }
  };

  const fetchAnalysts = async () => {
    try {
      const data = await apiFetch('/employees');
      setAnalysts(data);
    } catch (err) {
      console.error('Error fetching analysts:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRequirements(), fetchAnalysts()]).finally(() => setLoading(false));
  }, [search, statusFilter]);

  // Handle requirement creation
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle || !newClient) {
      setError('Title and Client Name are required.');
      return;
    }

    setAddLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('clientName', newClient);
    formData.append('description', newDesc);
    if (newFile) {
      formData.append('pdf', newFile);
    }

    try {
      const res = await fetch(`${apiUrl}/requirements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to add requirement.');
      
      setNewTitle('');
      setNewClient('');
      setNewDesc('');
      setNewFile(null);
      setShowAddForm(false);
      setSuccess('Requirement document created successfully.');
      fetchRequirements();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Handle analyst assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !selectedAnalyst) return;

    setAssignLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/requirements/${selectedReq.id}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo: selectedAnalyst })
      });
      
      setSuccess(`Requirement successfully assigned to analyst.`);
      setSelectedAnalyst('');
      setShowAssignModal(false);
      setSelectedReq(null);
      fetchRequirements();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle direct return to client
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !returnFeedback) return;

    setReturnLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch(`/requirements/${selectedReq.id}/return-client`, {
        method: 'POST',
        body: JSON.stringify({ feedback: returnFeedback })
      });

      setSuccess('Requirement returned to client with feedback.');
      setReturnFeedback('');
      setShowReturnModal(false);
      setSelectedReq(null);
      fetchRequirements();
    } catch (err) {
      setError(err.message);
    } finally {
      setReturnLoading(false);
    }
  };

  const handleOpenVersionHistory = async (req) => {
    setSelectedReq(req);
    setError('');
    setSuccess('');
    try {
      const data = await apiFetch(`/requirements/${req.id}/versions`);
      setVersionHistory(data);
      setShowHistoryModal(true);
    } catch (err) {
      setError(err.message || 'Failed to load version history.');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_validation: 'bg-slate-100 text-slate-600 border border-slate-200',
      under_validation: 'bg-amber-50 text-amber-600 border border-amber-200/60',
      pending_review: 'bg-blue-50 text-blue-600 border border-blue-200/60',
      under_review: 'bg-blue-50 text-blue-600 border border-blue-200/60',
      approved: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
      returned: 'bg-rose-50 text-rose-600 border border-rose-200/60',
      returned_to_client: 'bg-rose-50 text-rose-600 border border-rose-200/60',
      resubmitted: 'bg-indigo-50 text-indigo-600 border border-indigo-200/60',
      archived_version: 'bg-slate-50 text-slate-400 border border-slate-200'
    };
    const labels = {
      pending_validation: 'Pending Assignment',
      under_validation: 'Under Validation',
      pending_review: 'Pending Review',
      under_review: 'Pending Review',
      approved: 'Approved',
      returned: 'Returned (Client)',
      returned_to_client: 'Returned (Client)',
      resubmitted: 'Resubmitted',
      archived_version: 'Archived Version'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badges[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Requirement Inventory</h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            Create, assign, search requirements catalog, and return specs to clients for revisions.
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setError(''); setSuccess(''); }}
          className="flex items-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 font-bold rounded-xl text-white shadow-md shadow-brand-600/10 transition-all text-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Requirement</span>
        </button>
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

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition shadow-sm"
            placeholder="Search by requirement title, text details or client..."
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-650 focus:outline-none focus:border-brand-500 transition appearance-none cursor-pointer shadow-sm"
          >
             <option value="">All Statuses</option>
             <option value="pending_validation">Pending Assignment</option>
             <option value="under_validation">Under Validation</option>
             <option value="under_review">Pending Review</option>
             <option value="approved">Approved</option>
             <option value="returned_to_client">Returned (Client Revision)</option>
             <option value="resubmitted">Resubmitted</option>
             <option value="archived_version">Archived Version</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center text-slate-450 text-xs font-medium">
          Loading requirement inventory...
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-450 font-bold uppercase tracking-wider">
                  <th className="p-4">Requirement ID</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Assigned Analyst</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-450 italic">
                      No requirement records matching filters.
                    </td>
                  </tr>
                ) : (
                  requirements.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/40 text-slate-650 transition">
                      <td className="p-4 font-mono font-bold text-slate-800">
                        {req.requirement_code || `REQ-${String(req.root_requirement_id || req.id).padStart(3, '0')} V${req.version || 1}`}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-600">
                          V{req.version || 1}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-850 truncate max-w-[180px]">
                        {req.title}
                      </td>
                      <td className="p-4 font-medium text-slate-700">
                        {req.client_name}
                      </td>
                      <td className="p-4">
                        {req.assigned_to ? (
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-50 border border-brand-200 text-brand-600 font-bold text-[10px] flex items-center justify-center">
                              {req.assigned_to_username?.[0]?.toUpperCase() || 'QA'}
                            </span>
                            <span className="font-semibold text-slate-705">{req.assigned_to_username}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="p-4 text-slate-400 font-medium">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => { setSelectedReq(req); setShowViewModal(true); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 cursor-pointer transition-all"
                          title="View requirement text & details"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </button>

                        <button
                          onClick={() => handleOpenVersionHistory(req)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[10px] font-bold text-indigo-650 cursor-pointer transition-all"
                          title="View version history"
                        >
                          <History className="h-3 w-3" />
                          <span>History</span>
                        </button>
                        
                        {!req.assigned_to && (
                          <button
                            onClick={() => { setSelectedReq(req); setShowAssignModal(true); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-655 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                            title="Assign QA Analyst"
                          >
                            <UserPlus className="h-3 w-3" />
                            <span>Assign</span>
                          </button>
                        )}

                        {req.status !== 'approved' && req.status !== 'returned_to_client' && (
                          <button
                            onClick={() => { setSelectedReq(req); setShowReturnModal(true); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-655 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                            title="Return directly to client"
                          >
                            <CornerUpLeft className="h-3 w-3" />
                            <span>Return</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-800">Create Requirement Record</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium">
                Enter Details manually or upload a PDF document. Extracted text will populate the description.
              </p>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase mb-2">
                  Requirement Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                  placeholder="e.g., Shopping Cart Payment Workflow"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium"
                  placeholder="e.g., Acme Tech Solutions"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase mb-2">
                  PDF File Upload (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewFile(e.target.files[0])}
                  className="w-full text-xs text-slate-550 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 file:cursor-pointer file:hover:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase mb-2">
                  Description / Manual Notes
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-mono whitespace-pre-wrap"
                  placeholder="Paste manual requirements text here if not uploading a PDF..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  {addLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Add Document'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => { setShowViewModal(false); setSelectedReq(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  REQ-{String(selectedReq.id).padStart(3, '0')} Detail
                </span>
                {getStatusBadge(selectedReq.status)}
              </div>
              <h2 className="text-lg font-black text-slate-800">{selectedReq.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-450 font-semibold">
                <span>Client: <strong className="text-slate-700">{selectedReq.client_name}</strong></span>
                <span>Version: <strong className="text-slate-700">Ver. {selectedReq.version}</strong></span>
              </div>
            </div>

            {/* PDF File Link */}
            {selectedReq.pdf_path && (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-600" />
                  <span className="text-xs text-slate-700 font-bold">Attached PDF Document</span>
                </div>
                <a
                  href={`${apiUrl.replace('/api', '')}${selectedReq.pdf_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Download File</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {/* Description Text */}
            <div className="space-y-2 text-left">
              <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Specification Raw Text</h4>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-56 overflow-y-auto text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap select-text">
                {selectedReq.description}
              </div>
            </div>

            {/* Meta details */}
            <div className="grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-4">
              <div>
                <span className="text-[9px] text-slate-450 font-bold uppercase block">Assigned QA analyst</span>
                <span className="text-xs font-semibold text-slate-750 mt-1 block">
                  {selectedReq.assigned_to_username ? (
                    <span className="text-slate-700 font-bold">{selectedReq.assigned_to_username}</span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-450 font-bold uppercase block">Created By</span>
                <span className="text-xs font-semibold text-slate-750 mt-1 block">
                  {selectedReq.created_by_username || 'System Admin'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowViewModal(false); setSelectedReq(null); }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 font-bold text-xs rounded-xl text-white cursor-pointer transition-all shadow-sm"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => { setShowAssignModal(false); setSelectedReq(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-800">Assign QA Analyst</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium">
                Assign a QA analyst to validate <strong className="text-slate-700">"{selectedReq.title}"</strong>.
              </p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-550 uppercase mb-2">
                  Select QA Analyst
                </label>
                <select
                  value={selectedAnalyst}
                  onChange={(e) => setSelectedAnalyst(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-bold cursor-pointer"
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setSelectedReq(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || !selectedAnalyst}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  {assignLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Assign Analyst</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN TO CLIENT FEEDBACK MODAL */}
      {showReturnModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => { setShowReturnModal(false); setSelectedReq(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-lg font-black text-slate-800">Return to Client for Revision</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium">
                Provide feedback and suggested corrections to the client for <strong className="text-slate-700">"{selectedReq.title}"</strong>.
              </p>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-slate-555 uppercase mb-2">
                  Feedback / Suggested Corrections (Required)
                </label>
                <textarea
                  value={returnFeedback}
                  onChange={(e) => setReturnFeedback(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-750 focus:outline-none focus:bg-white focus:border-brand-500 transition-all font-medium leading-relaxed"
                  placeholder="Detail the checklist validation failures, missing rules, and what requires corrections..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowReturnModal(false); setSelectedReq(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl text-slate-600 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnLoading || !returnFeedback}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                >
                  {returnLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      <span>Submit & Return</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showHistoryModal && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => { setShowHistoryModal(false); setSelectedReq(null); setVersionHistory([]); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-left">
              <h3 className="text-lg font-black text-slate-800">Version History</h3>
              <p className="text-slate-500 text-xs mt-1 font-medium">
                {selectedReq.title} | {selectedReq.requirement_code || `REQ-${String(selectedReq.root_requirement_id || selectedReq.id).padStart(3, '0')} V${selectedReq.version || 1}`}
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider">
                    <th className="p-3">Version</th>
                    <th className="p-3">Submitted By</th>
                    <th className="p-3">Submission Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Change Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {versionHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic">No version records found.</td>
                    </tr>
                  ) : (
                    versionHistory.map((version) => (
                      <tr key={version.id} className="align-top">
                        <td className="p-3 font-black text-slate-800">
                          {version.requirement_code || `REQ-${String(version.root_requirement_id || version.id).padStart(3, '0')} V${version.version || 1}`}
                        </td>
                        <td className="p-3 font-semibold text-slate-650">{version.created_by_username || 'Client/Admin'}</td>
                        <td className="p-3 text-slate-500">{new Date(version.created_at).toLocaleDateString()}</td>
                        <td className="p-3">{getStatusBadge(version.status)}</td>
                        <td className="p-3 text-slate-650 leading-relaxed max-w-xs">
                          {version.change_notes || version.admin_feedback || 'Initial version.'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
