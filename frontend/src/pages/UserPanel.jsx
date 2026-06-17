import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaUserShield, FaUserPlus, FaEnvelope, FaPhone, FaIdBadge, FaCheckCircle, FaClipboardList, FaUsers, FaCheck, FaTimes, FaEdit, FaSave, FaBrain, FaChartBar, FaPlay, FaSync, FaDatabase, FaClock, FaUser, FaTrashAlt, FaUndo } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const UserPanel = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  
  const [usersList, setUsersList] = useState([]);
  const [recycleBinList, setRecycleBinList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRecycle, setLoadingRecycle] = useState(false);
  const [panelTab, setPanelTab] = useState('active'); // 'active', 'recycle', 'records_recycle', 'verifications', 'model_training'
  
  const [modelStats, setModelStats] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainConfig, setTrainConfig] = useState({ epochs: 30, batch_size: 16, lr: 0.0001 });
  const [loadingModelStats, setLoadingModelStats] = useState(false);
  const [trainingBusy, setTrainingBusy] = useState(false);
  
  const [verifiedSamples, setVerifiedSamples] = useState([]);
  const [verifiedStats, setVerifiedStats] = useState(null);
  const [verificationsList, setVerificationsList] = useState([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ 
    name: '', email: '', phone: '', role: '', id_proof: '', 
    age: '', dob: '', gender: '', education: '', bio: '', 
    is_profile_complete: false, biometric_enabled: false 
  });
  const [recycleBinRecords, setRecycleBinRecords] = useState([]);
  const [loadingRecordsRecycle, setLoadingRecordsRecycle] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // AI Training History & Comparison States
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [compareModelA, setCompareModelA] = useState('');
  const [compareModelB, setCompareModelB] = useState('');

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    id_proof: '',
    role: 'forensic_analyst'
  });

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/users`, {
        headers: authHeaders()
      });
      setUsersList(response.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log out and log in again.");
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRecycleBin = async () => {
    setLoadingRecycle(true);
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/recycle-bin`, {
        headers: authHeaders()
      });
      setRecycleBinList(response.data);
    } catch (err) {
      console.error("Failed to fetch recycle bin:", err);
    } finally {
      setLoadingRecycle(false);
    }
  };

  const fetchRecordsRecycleBin = async () => {
    setLoadingRecordsRecycle(true);
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/records/recycle-bin`, {
        headers: authHeaders()
      });
      setRecycleBinRecords(response.data);
    } catch (err) {
      console.error("Failed to fetch records recycle bin:", err);
    } finally {
      setLoadingRecordsRecycle(false);
    }
  };

  const fetchVerifications = async () => {
    setLoadingVerifications(true);
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/id-verification`, {
        headers: authHeaders()
      });
      setVerificationsList(response.data);
    } catch (err) {
      console.error("Failed to fetch verifications:", err);
      toast.error("Failed to load ID verifications.");
    } finally {
      setLoadingVerifications(false);
    }
  };

  const handleVerifyStatus = async (id, status) => {
    try {
      await axios.post(`${window.API_BASE}/api/admin/id-verification/${id}/${status}`, {}, {
        headers: authHeaders()
      });
      toast.success(`ID verification ${status} successfully.`);
      fetchVerifications();
    } catch (err) {
      toast.error(`Failed to ${status} ID verification.`);
    }
  };

  const fetchModelStats = async () => {
    setLoadingModelStats(true);
    try {
      const response = await axios.get(`${window.API_BASE}/api/model/stats`, { headers: authHeaders() });
      setModelStats(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModelStats(false);
    }
  };

  const fetchTrainingStatus = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/training/status`, { headers: authHeaders() });
      setTrainingStatus(response.data);
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handlePrepareDataset = async () => {
    setTrainingBusy(true);
    try {
      const response = await axios.post(`${window.API_BASE}/api/training/prepare-dataset`, {}, { headers: authHeaders() });
      toast.success(`Dataset ready: ${response.data.total_images} images (${response.data.images_imported} imported).`);
      fetchModelStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to prepare dataset.');
    } finally {
      setTrainingBusy(false);
    }
  };

  const fetchVerifiedStats = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/verified-training/stats`, { headers: authHeaders() });
      setVerifiedStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVerifiedSamples = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/verified-training/list`, { headers: authHeaders() });
      setVerifiedSamples(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrainingHistory = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/training/history`, { headers: authHeaders() });
      setTrainingHistory(response.data);
      if (response.data.length > 0) {
        setCompareModelA(prev => prev || response.data[0].training_id);
        if (response.data.length > 1) {
          setCompareModelB(prev => prev || response.data[1].training_id);
        }
      }
    } catch (err) {
      console.error("Error fetching training history:", err);
    }
  };

  const handleStartTraining = async () => {
    if (!window.confirm('Train AI model on verified forensic cases? This may take several minutes.')) return;
    setTrainingBusy(true);
    try {
      const response = await axios.post(`${window.API_BASE}/api/training/retrain`, trainConfig, { headers: authHeaders() });
      setTrainingStatus(response.data);
      toast.success('Training started in background.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start training.');
    } finally {
      setTrainingBusy(false);
    }
  };

  useEffect(() => {
    if (['super_admin', 'manager', 'auditor'].includes(user?.role)) {
      if (panelTab === 'active') fetchUsers();
      if (panelTab === 'recycle') fetchRecycleBin();
      if (panelTab === 'records_recycle') fetchRecordsRecycleBin();
      if (panelTab === 'verifications') fetchVerifications();
      if (panelTab === 'model_training') {
        fetchModelStats();
        fetchTrainingStatus();
        fetchVerifiedStats();
        fetchTrainingHistory();
        if (['super_admin', 'manager'].includes(user?.role)) fetchVerifiedSamples();
      }
    }
  }, [user, panelTab]);

  useEffect(() => {
    if (panelTab !== 'model_training' || trainingStatus?.state !== 'running') return;
    const timer = setInterval(async () => {
      const status = await fetchTrainingStatus();
      if (status?.state === 'completed' || status?.state === 'failed') {
        fetchModelStats();
        fetchTrainingHistory();
        toast.success(status.state === 'completed' ? 'Training completed.' : 'Training failed.');
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [panelTab, trainingStatus?.state]);

  const handleRegisterChange = (e) => {
    setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const response = await axios.post(`${window.API_BASE}/api/admin/create-user`, registerForm, {
        headers: authHeaders()
      });

      setSuccess({
        username: response.data.username,
        password: response.data.temporary_password
      });

      setRegisterForm({ name: '', email: '', phone: '', id_proof: '', role: 'forensic_analyst' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message;
      setError(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (u) => {
    setEditingUserId(u.id);
    setEditUserForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'forensic_analyst',
      id_proof: u.id_proof || '',
      age: u.age || '',
      dob: u.dob || '',
      gender: u.gender || '',
      education: u.education || '',
      bio: u.bio || '',
      is_profile_complete: u.is_profile_complete || false,
      biometric_enabled: u.biometric_enabled || false
    });
  };

  const handleSaveEditUser = async (e, userId) => {
    e.preventDefault();
    try {
      const dataToSubmit = { ...editUserForm };
      if (dataToSubmit.age === '') dataToSubmit.age = null;
      if (dataToSubmit.dob === '') dataToSubmit.dob = null;
      await axios.put(`${window.API_BASE}/api/admin/users/${userId}`, dataToSubmit, {
        headers: authHeaders()
      });
      setEditingUserId(null);
      fetchUsers();
      toast.success("User updated successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to suspend this user? They will be moved to the waitlist bin.")) return;
    try {
      await axios.delete(`${window.API_BASE}/api/admin/users/${userId}`, {
        headers: authHeaders()
      });
      fetchUsers();
      toast.success("User suspended successfully");
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error(err.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleRecoverUser = async (userId) => {
    try {
      await axios.post(`${window.API_BASE}/api/admin/users/${userId}/recover`, {}, {
        headers: authHeaders()
      });
      fetchRecycleBin();
      toast.success("User restored successfully");
    } catch (err) {
      console.error("Failed to recover user:", err);
      toast.error(err.response?.data?.detail || "Failed to restore user");
    }
  };

  const handleRecoverRecord = async (recordId) => {
    try {
      await axios.post(`${window.API_BASE}/api/admin/records/${recordId}/recover`, {}, {
        headers: authHeaders()
      });
      fetchRecordsRecycleBin();
      toast.success("Report record recovered successfully");
    } catch (err) {
      console.error("Failed to recover record:", err);
      toast.error(err.response?.data?.detail || "Failed to recover record");
    }
  };

  const handlePermanentDeleteRecord = async (recordId) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this record? This action cannot be undone.")) return;
    try {
      await axios.delete(`${window.API_BASE}/api/admin/records/${recordId}/permanent`, {
        headers: authHeaders()
      });
      fetchRecordsRecycleBin();
      toast.success("Record permanently deleted");
    } catch (err) {
      console.error("Failed to permanently delete record:", err);
      toast.error(err.response?.data?.detail || "Failed to permanently delete record");
    }
  };

  if (!['super_admin', 'manager', 'auditor'].includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 text-red-700 rounded-2xl border border-red-200 shadow-sm text-center">
        <FaUserShield size={48} className="mb-4 opacity-80" />
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="text-sm mt-2 font-medium">You do not have the required credentials to view the User Panel.</p>
      </div>
    );
  }

  if (selectedUserForDetails) {
    const u = selectedUserForDetails;
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-red-50 p-3 rounded-lg text-primary">
              <FaIdBadge size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Additional Details</h2>
              <p className="text-sm text-slate-500 mt-1">Viewing full profile and details for {u.name || u.username}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedUserForDetails(null);
              setIsEditingDetails(false);
            }}
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-lg transition-colors shadow-sm"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Profile Information</h3>
            <div className="flex space-x-2">
              {!isEditingDetails ? (
                <>
                  <button
                    onClick={() => {
                      handleEditUser(u);
                      setIsEditingDetails(true);
                    }}
                    className="text-text bg-gray-100 border border-gray-200 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm disabled:opacity-50"
                    disabled={user.role === 'auditor'}
                  >
                    <FaEdit className="mr-1.5" /> Edit User
                  </button>
                  {u.id !== user.id && (
                    <button
                      onClick={() => {
                        handleDeleteUser(u.id);
                        setSelectedUserForDetails(null);
                      }}
                      className="text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm disabled:opacity-50"
                      disabled={user.role === 'auditor'}
                    >
                      Suspend User
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditingDetails(false)}
                    className="text-muted bg-gray-100 border border-gray-200 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm transition-colors"
                  >
                    <FaTimes className="mr-1.5" /> Cancel
                  </button>
                  <button
                    onClick={async (e) => {
                      await handleSaveEditUser(e, u.id);
                      setIsEditingDetails(false);
                      setSelectedUserForDetails({ ...u, ...editUserForm });
                    }}
                    className="text-white bg-primary hover:bg-primary-hover border border-transparent px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm transition-colors"
                  >
                    <FaSave className="mr-1.5" /> Save
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Name / Username</span>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full text-sm font-bold text-slate-800 p-1.5 rounded border border-slate-300 bg-white mb-1"
                  placeholder="Name"
                />
              ) : (
                <div className="font-bold text-slate-800 text-lg">{u.name || 'N/A'}</div>
              )}
              <div className="text-sm text-slate-500 font-mono mt-1">{u.username}</div>
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Info</span>
              {isEditingDetails ? (
                <>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="w-full text-sm font-medium text-slate-800 p-1.5 rounded border border-slate-300 bg-white mb-2"
                    placeholder="Email"
                  />
                  <input
                    type="tel"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                    className="w-full text-sm text-slate-600 p-1.5 rounded border border-slate-300 bg-white"
                    placeholder="Phone"
                  />
                </>
              ) : (
                <>
                  <div className="font-medium text-slate-800">{u.email || 'N/A'}</div>
                  <div className="text-sm text-slate-500 mt-1">{u.phone || 'N/A'}</div>
                </>
              )}
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Security Role</span>
              {isEditingDetails ? (
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="w-full text-sm p-1.5 rounded border border-slate-300"
                  disabled={user.role === 'auditor'}
                >
                  <option value="forensic_analyst">Forensic Analyst</option>
                  <option value="medical_examiner">Medical Examiner</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="manager">Manager</option>
                  <option value="auditor">Auditor</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold uppercase tracking-wider ${['super_admin', 'manager', 'auditor'].includes(u.role) ? 'bg-red-100 text-red-800 border border-red-200' :
                  u.role === 'medical_examiner' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-gray-100 text-slate-700 border border-gray-200'
                }`}>
                  {u.role.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Security Features</span>
              {isEditingDetails ? (
                <div className="space-y-2 mt-1">
                  <label className="flex items-center space-x-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editUserForm.biometric_enabled}
                      onChange={(e) => setEditUserForm({ ...editUserForm, biometric_enabled: e.target.checked })}
                      className="rounded border-slate-300 text-primary focus:ring-red-600"
                      disabled={user.role === 'auditor'}
                    />
                    <span>Biometric Access Enabled</span>
                  </label>
                </div>
              ) : (
                <div className="mt-1">
                  {u.biometric_enabled ? (
                    <span className="inline-flex items-center text-emerald-700 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                      Biometrics: Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-slate-500 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-full text-xs font-bold">
                      Biometrics: Inactive
                    </span>
                  )}
                </div>
              )}
            </div>

            {isEditingDetails && (
              <div className="bg-slate-50 rounded-lg p-4 border border-primary ring-2 ring-primary">
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">ID Proof Reference</span>
                <input
                  type="text"
                  value={editUserForm.id_proof}
                  onChange={(e) => setEditUserForm({ ...editUserForm, id_proof: e.target.value })}
                  className="w-full text-sm text-slate-800 p-1.5 rounded border border-slate-300 bg-white"
                  placeholder="ID Proof Reference"
                />
              </div>
            )}

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</span>
              {isEditingDetails ? (
                <select
                  value={editUserForm.is_profile_complete ? 'true' : 'false'}
                  onChange={(e) => setEditUserForm({ ...editUserForm, is_profile_complete: e.target.value === 'true' })}
                  className="w-full text-sm p-1.5 rounded border border-slate-300 bg-white mt-1"
                >
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              ) : u.is_profile_complete ? (
                <span className="inline-flex mt-1 items-center text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold uppercase shadow-sm">
                  <FaCheckCircle className="mr-1.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex mt-1 items-center text-slate-500 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-full text-xs font-bold uppercase">
                  <FaTimes className="mr-1.5" /> Unverified
                </span>
              )}
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Age & Gender</span>
              {isEditingDetails ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={editUserForm.age}
                    onChange={(e) => setEditUserForm({ ...editUserForm, age: e.target.value })}
                    className="w-full text-sm text-slate-800 p-1.5 rounded border border-slate-300 bg-white"
                    placeholder="Age"
                  />
                  <select
                    value={editUserForm.gender}
                    onChange={(e) => setEditUserForm({ ...editUserForm, gender: e.target.value })}
                    className="w-full text-sm p-1.5 rounded border border-slate-300 bg-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              ) : (
                <>
                  <div className="font-medium text-slate-800 mt-1">{u.age ? `${u.age} years` : 'Age N/A'}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{u.gender || 'Gender N/A'}</div>
                </>
              )}
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Date of Birth</span>
              {isEditingDetails ? (
                <input
                  type="date"
                  value={editUserForm.dob}
                  onChange={(e) => setEditUserForm({ ...editUserForm, dob: e.target.value })}
                  className="w-full text-sm text-slate-800 p-1.5 rounded border border-slate-300 bg-white mt-1"
                />
              ) : (
                <div className="font-medium text-slate-800 mt-1">{u.dob ? new Date(u.dob).toLocaleDateString() : 'N/A'}</div>
              )}
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary' : 'border-slate-100'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Education</span>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={editUserForm.education}
                  onChange={(e) => setEditUserForm({ ...editUserForm, education: e.target.value })}
                  className="w-full text-sm text-slate-800 p-1.5 rounded border border-slate-300 bg-white mt-1"
                  placeholder="Highest Education"
                />
              ) : (
                <div className="font-medium text-slate-800 mt-1">{u.education || 'N/A'}</div>
              )}
            </div>

            <div className={`bg-slate-50 rounded-lg p-4 border ${isEditingDetails ? 'border-primary ring-2 ring-primary lg:col-span-2 md:col-span-2' : 'border-slate-100 lg:col-span-2 md:col-span-2'}`}>
              <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Specialization / Bio</span>
              {isEditingDetails ? (
                <textarea
                  value={editUserForm.bio}
                  onChange={(e) => setEditUserForm({ ...editUserForm, bio: e.target.value })}
                  className="w-full text-sm text-slate-800 p-1.5 rounded border border-slate-300 mt-1 resize-y min-h-[80px]"
                  placeholder="Professional Biography"
                />
              ) : (
                <div className="font-medium text-slate-800 text-sm leading-relaxed whitespace-pre-wrap mt-1">{u.bio || 'N/A'}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start space-x-4">
        <div className="bg-red-50 p-3 rounded-lg text-primary">
          <FaUsers size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Personnel & User Panel</h2>
          <p className="text-sm text-slate-500 mt-1">Create user accounts, manage personnel waitlists, view active rosters, verify biometric IDs, and control retraining datasets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create User Card */}
        {user?.role !== 'auditor' ? (
          <div className="glass-panel p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5 flex items-center">
              <FaUserPlus className="mr-2 text-primary" /> Register New Personnel
            </h3>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Legal Name</label>
                <input type="text" name="name" required value={registerForm.name} onChange={handleRegisterChange}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
                  placeholder="Dr. Jane Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center"><FaEnvelope className="mr-1 text-slate-400" /> Email Address</label>
                  <input type="email" name="email" required value={registerForm.email} onChange={handleRegisterChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
                    placeholder="jane@forensics.org"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center"><FaPhone className="mr-1 text-slate-400" /> Contact Number</label>
                  <input type="tel" name="phone" required value={registerForm.phone} onChange={handleRegisterChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center"><FaIdBadge className="mr-1 text-slate-400" /> ID Proof Reference</label>
                  <input type="text" name="id_proof" required value={registerForm.id_proof} onChange={handleRegisterChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 outline-none transition-all placeholder-slate-400"
                    placeholder="e.g. License/Badge ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">System Role</label>
                  <select name="role" value={registerForm.role} onChange={handleRegisterChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 outline-none bg-white"
                  >
                    <option value="forensic_analyst">Forensic Analyst</option>
                    <option value="medical_examiner">Medical Examiner</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className={`w-full py-2.5 px-4 mt-2 rounded-lg text-white font-medium transition-all shadow-sm ${loading ? 'bg-red-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover'}`}
              >
                {loading ? 'Registering...' : 'Register Access Credentials'}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel p-6 bg-slate-50 flex flex-col items-center justify-center rounded-xl border border-slate-200 shadow-inner">
            <FaUserShield size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-500">Registration Restricted</h3>
            <p className="text-sm text-slate-400 mt-2 text-center">As an Auditor, you possess read-only clearance. Identity creation is restricted to Super Admins and Managers.</p>
          </div>
        )}

        {/* Output Panel for Success Credentials */}
        <div className="glass-panel p-6 bg-slate-50 flex flex-col justify-center rounded-xl border border-slate-200 shadow-inner min-h-[300px]">
          {success ? (
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="mx-auto bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mb-2">
                <FaCheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Account Generated</h3>
              <p className="text-sm text-slate-500 px-4">Provide these temporary credentials to the new user securely. They will be prompted to set their own password upon first login.</p>

              <div className="bg-white border border-slate-200 rounded-lg p-5 mt-4 text-left shadow-sm">
                <div className="mb-3 border-b border-slate-100 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase">Generated Username</span>
                  <div className="text-lg font-mono font-bold text-slate-800 select-all">{success.username}</div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Temporary Passcode</span>
                  <div className="text-lg font-mono font-bold text-primary select-all">{success.password}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FaClipboardList className="text-3xl text-slate-300" />
              </div>
              <p className="font-medium text-slate-500">Awaiting Registration Submission</p>
              <p className="text-xs mt-2 max-w-[200px]">Generated credentials will appear here securely instead of sending via unencrypted email.</p>
            </div>
          )}
        </div>
      </div>

      {/* Directory and AI tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50/50 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FaUsers className="mr-3 text-slate-400" /> Personnel Management
            </h3>
            <p className="text-sm text-slate-500 mt-1">Review active rosters, waitlists, verification files, and system dataset retraining parameters.</p>
          </div>

          <div className="flex bg-slate-200/60 p-1 rounded-lg flex-wrap gap-1">
            <button
              onClick={() => setPanelTab('active')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${panelTab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active Roster
            </button>
            <button
              onClick={() => setPanelTab('recycle')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${panelTab === 'recycle' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Personnel Waitlist
            </button>
            <button
              onClick={() => setPanelTab('records_recycle')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${panelTab === 'records_recycle' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Records Recycle Bin
            </button>
            <button
              onClick={() => setPanelTab('verifications')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${panelTab === 'verifications' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Verify IDs
            </button>
            <button
              onClick={() => setPanelTab('model_training')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${panelTab === 'model_training' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              AI Training Center
            </button>
          </div>
        </div>

        {panelTab === 'model_training' ? (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">AI Training Center</h3>
                <p className="text-sm text-slate-500 max-w-xl mt-1">
                  Verified analyst cases auto-build the dataset. Models retrain after {verifiedStats?.auto_retrain_threshold || 50} pending samples.
                </p>
              </div>
              <button
                onClick={() => { fetchModelStats(); fetchTrainingStatus(); fetchVerifiedStats(); fetchTrainingHistory(); if (['super_admin', 'manager'].includes(user?.role)) fetchVerifiedSamples(); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <FaSync /> Refresh
              </button>
            </div>

            {(verifiedStats || modelStats) && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Total Verified Cases', value: verifiedStats?.total_verified_cases ?? modelStats?.verified_training?.total_verified_cases ?? 0 },
                  { label: 'Pending Training Samples', value: verifiedStats?.pending_training_samples ?? 0 },
                  { label: 'Model Accuracy', value: verifiedStats?.model_accuracy?.weapon_accuracy ? `${(verifiedStats.model_accuracy.weapon_accuracy * 100).toFixed(1)}%` : 'N/A' },
                  { label: 'Last Training Date', value: verifiedStats?.last_training_date ? new Date(verifiedStats.last_training_date).toLocaleDateString() : 'Never' },
                  { label: 'Current Model Version', value: verifiedStats?.current_model_version || 'N/A' },
                ].map((c) => (
                  <div key={c.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
                    <p className="text-lg font-black text-slate-800 mt-1 truncate">{c.value}</p>
                  </div>
                ))}
              </div>
            )}

            {loadingModelStats && !modelStats ? (
              <p className="text-center text-slate-400 py-4">Loading statistics...</p>
            ) : null}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <FaDatabase className="text-indigo-500" /> Dataset size & preparation
                </h4>
                <p className="text-xs text-slate-500 mb-4 font-medium">Imports verified images from uploads into dataset folder and constructs annotations.</p>
                <button
                  onClick={handlePrepareDataset}
                  disabled={trainingBusy || user.role === 'auditor'}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  Prepare Dataset
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl p-5">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <FaPlay className="text-emerald-500" /> Retrain Model Button
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Epochs</label>
                    <input type="number" min="1" max="200" value={trainConfig.epochs}
                      onChange={(e) => setTrainConfig({ ...trainConfig, epochs: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Batch</label>
                    <input type="number" min="1" max="128" value={trainConfig.batch_size}
                      onChange={(e) => setTrainConfig({ ...trainConfig, batch_size: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400">Learning Rate</label>
                    <input type="number" step="0.00001" value={trainConfig.lr}
                      onChange={(e) => setTrainConfig({ ...trainConfig, lr: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'} />
                  </div>
                </div>
                <button
                  onClick={handleStartTraining}
                  disabled={trainingBusy || trainingStatus?.state === 'running' || user.role === 'auditor'}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FaBrain /> {trainingStatus?.state === 'running' ? 'Retraining...' : 'Retrain Model'}
                </button>
              </div>
            </div>

            {['super_admin', 'manager'].includes(user?.role) && verifiedSamples.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
                <h4 className="font-bold text-slate-800 px-5 py-3 border-b border-slate-200 bg-slate-50/50">
                  Verified Dataset Samples
                </h4>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-50">
                      <tr>
                        <th className="py-3 px-4">Image Filename</th>
                        <th className="py-3 px-4">Weapon Class</th>
                        <th className="py-3 px-4">Wound Type</th>
                        <th className="py-3 px-4">Verified By</th>
                        <th className="py-3 px-4">Verified Date</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {verifiedSamples.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-4 font-mono text-xs truncate max-w-[120px]">{s.image_path?.split(/[/\\]/).pop()}</td>
                          <td className="py-2 px-4">{s.weapon_label}</td>
                          <td className="py-2 px-4">{s.wound_label}</td>
                          <td className="py-2 px-4">{s.verified_by}</td>
                          <td className="py-2 px-4 text-xs">{s.verified_at ? new Date(s.verified_at).toLocaleString() : '—'}</td>
                          <td className="py-2 px-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${s.training_status === 'trained' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {s.training_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {trainingStatus && (
              <div className={`rounded-xl p-4 border ${
                trainingStatus.state === 'running' ? 'bg-amber-50 border-amber-200' :
                trainingStatus.state === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                trainingStatus.state === 'failed' ? 'bg-red-50 border-red-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <p className="font-bold text-sm uppercase tracking-wider text-slate-600">Retrain Job State: {trainingStatus.state}</p>
                <p className="text-sm mt-1 text-slate-700">{trainingStatus.message}</p>
                {trainingStatus.progress > 0 && (
                  <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${trainingStatus.progress}%` }} />
                  </div>
                )}
              </div>
            )}

            {modelStats?.training_metrics?.test_metrics && (
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <FaChartBar className="text-blue-500" /> Model Accuracy Metrics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm font-medium text-slate-700">
                  <div><span className="text-slate-400">Weapon Accuracy:</span> <strong className="text-slate-800">{(modelStats.training_metrics.test_metrics.weapon_accuracy * 100).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400">Wound Accuracy:</span> <strong className="text-slate-800">{(modelStats.training_metrics.test_metrics.wound_accuracy * 100).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400">Weapon F1 Score:</span> <strong className="text-slate-800">{(modelStats.training_metrics.test_metrics.weapon_f1 * 100).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400">Wound F1 Score:</span> <strong className="text-slate-800">{(modelStats.training_metrics.test_metrics.wound_f1 * 100).toFixed(1)}%</strong></div>
                  <div><span className="text-slate-400">CNN Model Architecture:</span> <strong className="text-xs text-indigo-700">{modelStats.training_metrics.model_architecture}</strong></div>
                </div>
              </div>
            )}

            {/* Model Comparison & History Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
              <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <FaSync className="text-primary" /> Model Performance Comparison
                </h4>
                <p className="text-xs text-slate-500 font-semibold mb-4">
                  Select two historical retraining runs to compare their classification performance metrics.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Model A (Reference)</label>
                    <select
                      value={compareModelA}
                      onChange={(e) => setCompareModelA(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-bold text-slate-700"
                    >
                      <option value="">Select Model A</option>
                      {trainingHistory.map(run => (
                        <option key={run.training_id} value={run.training_id}>
                          {new Date(run.training_date).toLocaleDateString()} - Run #{run.training_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Model B (Comparison)</label>
                    <select
                      value={compareModelB}
                      onChange={(e) => setCompareModelB(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white font-bold text-slate-700"
                    >
                      <option value="">Select Model B</option>
                      {trainingHistory.map(run => (
                        <option key={run.training_id} value={run.training_id}>
                          {new Date(run.training_date).toLocaleDateString()} - Run #{run.training_id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareModelA && compareModelB ? (() => {
                  const modelA = trainingHistory.find(h => h.training_id == compareModelA);
                  const modelB = trainingHistory.find(h => h.training_id == compareModelB);
                  if (!modelA || !modelB) return <p className="text-xs text-slate-400">Please select valid models to compare.</p>;

                  const diffColor = (valA, valB) => {
                    if (valA === valB) return "text-slate-500";
                    return valB > valA ? "text-green-600 font-bold" : "text-red-600 font-bold";
                  };

                  const diffText = (valA, valB) => {
                    const diff = valB - valA;
                    if (diff === 0) return "—";
                    return (diff > 0 ? "+" : "") + (diff * 100).toFixed(1) + "%";
                  };

                  return (
                    <div className="overflow-x-auto pt-2">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                            <th className="py-2">Performance Metric</th>
                            <th className="py-2">Model A</th>
                            <th className="py-2">Model B</th>
                            <th className="py-2">Accuracy Delta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          <tr>
                            <td className="py-2.5 text-slate-500 font-bold">Dataset Count</td>
                            <td className="py-2.5 text-slate-800 font-bold">{modelA.dataset_count}</td>
                            <td className="py-2.5 text-slate-800 font-bold">{modelB.dataset_count}</td>
                            <td className={`py-2.5 ${diffColor(modelA.dataset_count, modelB.dataset_count)}`}>
                              {modelB.dataset_count - modelA.dataset_count > 0 ? "+" : ""}{modelB.dataset_count - modelA.dataset_count}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-slate-500 font-bold">Weapon Accuracy</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelA.accuracy * 100).toFixed(1)}%</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelB.accuracy * 100).toFixed(1)}%</td>
                            <td className={`py-2.5 ${diffColor(modelA.accuracy, modelB.accuracy)}`}>
                              {diffText(modelA.accuracy, modelB.accuracy)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-slate-500 font-bold">Precision Score</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelA.precision_score * 100).toFixed(1)}%</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelB.precision_score * 100).toFixed(1)}%</td>
                            <td className={`py-2.5 ${diffColor(modelA.precision_score, modelB.precision_score)}`}>
                              {diffText(modelA.precision_score, modelB.precision_score)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-slate-500 font-bold">Recall Score</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelA.recall_score * 100).toFixed(1)}%</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelB.recall_score * 100).toFixed(1)}%</td>
                            <td className={`py-2.5 ${diffColor(modelA.recall_score, modelB.recall_score)}`}>
                              {diffText(modelA.recall_score, modelB.recall_score)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 text-slate-500 font-bold">Ensemble F1 Score</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelA.f1_score * 100).toFixed(1)}%</td>
                            <td className="py-2.5 text-slate-800 font-bold">{(modelB.f1_score * 100).toFixed(1)}%</td>
                            <td className={`py-2.5 ${diffColor(modelA.f1_score, modelB.f1_score)}`}>
                              {diffText(modelA.f1_score, modelB.f1_score)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })() : (
                  <p className="text-slate-400 text-xs text-center py-6">
                    Select Model A and Model B to compare performance.
                  </p>
                )}
              </div>

              {/* Retraining History Logs */}
              <div className="lg:col-span-5 border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <FaClipboardList className="text-indigo-500" /> Training History
                </h4>
                <div className="overflow-y-auto max-h-64 space-y-2 pr-1">
                  {trainingHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No retraining runs logged in database yet.</p>
                  ) : (
                    trainingHistory.map(run => (
                      <div key={run.training_id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5 shadow-sm hover:border-indigo-300 transition-colors">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-indigo-700">Retrain Run #{run.training_id}</span>
                          <span className="text-slate-400">{new Date(run.training_date).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-medium text-slate-500">
                          <div>Dataset Size: <strong className="text-slate-700 font-bold">{run.dataset_count}</strong></div>
                          <div>F1 Score: <strong className="text-slate-700 font-bold">{(run.f1_score * 100).toFixed(1)}%</strong></div>
                          <div>Accuracy: <strong className="text-slate-700 font-bold">{(run.accuracy * 100).toFixed(1)}%</strong></div>
                          <div>Recall: <strong className="text-slate-700 font-bold">{(run.recall_score * 100).toFixed(1)}%</strong></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {panelTab === 'verifications' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-4 px-6">Username</th>
                    <th className="py-4 px-6">Doc Type</th>
                    <th className="py-4 px-6">Document Image</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                  {loadingVerifications ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400">Loading verifications...</td>
                    </tr>
                  ) : verificationsList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-500 bg-slate-50/50">No pending ID verifications found.</td>
                    </tr>
                  ) : (
                    verificationsList.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800">{v.username}</td>
                        <td className="py-4 px-6">{v.document_type}</td>
                        <td className="py-4 px-6">
                          <a href={`${window.API_BASE}${v.document_path}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">View Document</a>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${v.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            v.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          {v.status === 'pending' && (
                            <>
                              <button onClick={() => handleVerifyStatus(v.id, 'approve')} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase disabled:opacity-50" disabled={user.role === 'auditor'}>
                                <FaCheck className="inline mr-1" /> Approve
                              </button>
                              <button onClick={() => handleVerifyStatus(v.id, 'reject')} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase disabled:opacity-50" disabled={user.role === 'auditor'}>
                                <FaTimes className="inline mr-1" /> Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : panelTab === 'active' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-4 px-6">Name / Username</th>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Security Role</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">User Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Decrypting personnel records...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                        No active registered personnel found.
                      </td>
                    </tr>
                  ) : usersList.map(u => (
                    editingUserId === u.id ? (
                      <tr key={u.id} className="bg-slate-50">
                        <td className="py-2 px-6" colSpan="5">
                          <form onSubmit={(e) => handleSaveEditUser(e, u.id)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                            <div className="md:col-span-1">
                              <input type="text" className="w-full text-xs p-2 rounded border border-slate-300" placeholder="Name" value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} required />
                              <input type="text" className="w-full text-xs p-2 mt-1 rounded border border-slate-300" placeholder="ID Proof" value={editUserForm.id_proof} onChange={(e) => setEditUserForm({ ...editUserForm, id_proof: e.target.value })} required />
                            </div>
                            <div className="md:col-span-1">
                              <input type="email" className="w-full text-xs p-2 rounded border border-slate-300" placeholder="Email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} required />
                              <input type="tel" className="w-full text-xs p-2 mt-1 rounded border border-slate-300" placeholder="Phone" value={editUserForm.phone} onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })} required />
                            </div>
                            <div className="md:col-span-1">
                              <select className="w-full text-xs p-2 rounded border border-slate-300" value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} disabled={user.role === 'auditor'}>
                                <option value="forensic_analyst">Forensic Analyst</option>
                                <option value="medical_examiner">Medical Examiner</option>
                                <option value="super_admin">Super Admin</option>
                                <option value="manager">Manager</option>
                                <option value="auditor">Auditor</option>
                              </select>
                            </div>
                            <div className="md:col-span-1 text-right flex space-x-2 justify-end">
                              <button type="button" onClick={() => setEditingUserId(null)} className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 font-bold rounded-lg transition-colors">Cancel</button>
                              <button type="submit" disabled={user.role === 'auditor'} className="px-3 py-1.5 text-xs text-white bg-primary hover:bg-primary-hover font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50">Save</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{u.name || 'Pending Name'}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{u.username}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-slate-700">{u.email || 'N/A'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{u.phone || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${['super_admin', 'manager', 'auditor'].includes(u.role) ? 'bg-red-50 text-primary border border-red-100' :
                            u.role === 'medical_examiner' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                            'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {u.is_profile_complete ? (
                            <span className="inline-flex items-center text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shadow-sm">
                              <FaCheck className="mr-1.5" size={10} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-slate-500 border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">
                              <FaTimes className="mr-1.5" size={10} /> Incomplete
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedUserForDetails(u)}
                            className="text-slate-700 hover:text-primary hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider shadow-sm bg-white"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            ) : panelTab === 'recycle' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-4 px-6">Name / Username</th>
                    <th className="py-4 px-6">Security Role</th>
                    <th className="py-4 px-6">Deletion Date</th>
                    <th className="py-4 px-6">Expiration</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                  {loadingRecycle ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading waitlist recycle bin...
                      </td>
                    </tr>
                  ) : recycleBinList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                        Personnel Waitlist is empty.
                      </td>
                    </tr>
                  ) : (
                    recycleBinList.map(u => (
                      <React.Fragment key={u.id}>
                        <tr className="hover:bg-red-50/30 transition-colors opacity-75">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-800 line-through decoration-slate-400">{u.name || 'Pending Name'}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{u.username}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            {new Date(u.deleted_at).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-bold text-red-500 flex items-center">
                              <FaClock className="mr-1.5" /> {u.days_remaining} days left
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              onClick={() => setViewingProfileId(viewingProfileId === u.id ? null : u.id)}
                              className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 text-xs font-bold uppercase tracking-wider bg-white shadow-sm"
                            >
                              {viewingProfileId === u.id ? 'Hide Details' : 'View Profile'}
                            </button>
                            <button
                              onClick={() => handleRecoverUser(u.id)}
                              className="text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 hover:border-emerald-600 text-xs font-bold uppercase tracking-wider shadow-sm"
                            >
                              Restore User
                            </button>
                          </td>
                        </tr>
                        {viewingProfileId === u.id && (
                          <tr className="bg-slate-50/50">
                            <td colSpan="5" className="p-4 border-b border-t border-slate-200">
                              <div className="flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-6">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center text-2xl font-bold text-slate-300">
                                  {u.photo ? <img src={u.photo} alt="Profile" className="w-full h-full object-cover" /> : u.username?.[0]?.toUpperCase()}
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 flex-1 text-sm text-slate-700">
                                  <div><span className="block text-xs font-bold text-slate-400 uppercase">Email</span><span className="font-semibold">{u.email || 'N/A'}</span></div>
                                  <div><span className="block text-xs font-bold text-slate-400 uppercase">Phone</span><span className="font-semibold">{u.phone || 'N/A'}</span></div>
                                  <div><span className="block text-xs font-bold text-slate-400 uppercase">DOB</span><span className="font-semibold">{u.dob ? new Date(u.dob).toLocaleDateString() : 'N/A'}</span></div>
                                  <div><span className="block text-xs font-bold text-slate-400 uppercase">Gender</span><span className="font-semibold">{u.gender || 'N/A'}</span></div>
                                  <div className="col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase">Education</span><span className="font-semibold">{u.education || 'N/A'}</span></div>
                                  <div className="col-span-2"><span className="block text-xs font-bold text-slate-400 uppercase">Bio / Expertise</span><span className="font-semibold">{u.bio || 'N/A'}</span></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            ) : panelTab === 'records_recycle' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-4 px-6">Record Details</th>
                    <th className="py-4 px-6">Confidence</th>
                    <th className="py-4 px-6">Deletion Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                  {loadingRecordsRecycle ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading deleted records...
                      </td>
                    </tr>
                  ) : recycleBinRecords.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                        Records recycle bin is empty.
                      </td>
                    </tr>
                  ) : (
                    recycleBinRecords.map(r => (
                      <tr key={r.id} className="hover:bg-orange-50/30 transition-colors opacity-80">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{r.weapon_type ? r.weapon_type.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Analyst: {r.user?.name || r.user?.username || 'Unknown'}</div>
                        </td>
                        <td className="py-4 px-6">
                          {r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          {new Date(r.deleted_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleRecoverRecord(r.id)}
                            className="text-orange-600 hover:text-white hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors border border-orange-200 hover:border-orange-600 text-xs font-bold uppercase tracking-wider shadow-sm bg-white"
                            disabled={user.role === 'auditor'}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDeleteRecord(r.id)}
                            className="text-red-600 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors border border-red-200 hover:border-red-600 text-xs font-bold uppercase tracking-wider shadow-sm bg-white"
                            disabled={user.role === 'auditor'}
                          >
                            Delete Record
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPanel;
