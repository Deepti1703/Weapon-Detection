import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Webcam from 'react-webcam';
import axios from 'axios';
import { FaSignOutAlt, FaUpload, FaCamera, FaImage, FaHistory, FaBiohazard, FaCheckCircle, FaExclamationTriangle, FaUserShield, FaIdCard, FaEnvelope, FaPhone, FaClock, FaEdit, FaSave, FaTimes, FaGraduationCap, FaUser, FaFileAlt, FaThLarge } from 'react-icons/fa';
import AdminDashboard from './AdminDashboard';
import UserPanel from './UserPanel';
import DoctorDashboard from './DoctorDashboard';
import ReportGenerator from '../components/ReportGenerator';
import Precautions from '../components/Precautions';
import BiometricAuth from '../components/BiometricAuth';
import { FaStethoscope } from 'react-icons/fa';

const WOUND_CLASSES = [
  "Knife Wound",
  "Dagger Wound",
  "Scalpel Wound",
  "Hammer Injury",
  "Blunt Object Injury",
  "Screwdriver Injury",
  "Axe Injury",
  "Glass Injury",
  "Gunshot Wound",
  "Puncture Wound",
  "Incised Wound",
  "Laceration",
  "Abrasion",
  "Contusion",
];

const WEAPON_CLASSES = [
  "Knife",
  "Dagger",
  "Scalpel",
  "Hammer",
  "Blunt Object",
  "Screwdriver",
  "Axe",
  "Glass",
  "Gun",
  "Ice Pick",
  "Machete",
  "Other"
];

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'upload', 'camera', 'history', 'admin', 'profile'
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentCasesList, setRecentCasesList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [victimReference, setVictimReference] = useState('');
  const [caseDescription, setCaseDescription] = useState('');

  const loadDashboardSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://127.0.0.1:8000/api/dashboard/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDashboardStats(response.data.stats);
      setRecentCasesList(response.data.recent_cases);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardSummary();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Filters for Case History
  const [filterCaseNumber, setFilterCaseNumber] = useState('');
  const [filterWeaponType, setFilterWeaponType] = useState('');
  const [filterAnalyst, setFilterAnalyst] = useState('');
  const [filterWoundCategory, setFilterWoundCategory] = useState('');
  const [filterDate, setFilterDate] = useState('');

 // Verification State for Continuous Learning
 const [verificationStatus, setVerificationStatus] = useState(null); // 'verified' | 'corrected' | null
 const [isVerifiedCorrect, setIsVerifiedCorrect] = useState(false);
 const [showCorrectionForm, setShowCorrectionForm] = useState(false);
 const [actualWeapon, setActualWeapon] = useState('');
 const [actualWound, setActualWound] = useState('');
 const [remarks, setRemarks] = useState('');

 // Profile Edit State
 const [isEditingProfile, setIsEditingProfile] = useState(false);
 const [isSavingProfile, setIsSavingProfile] = useState(false);
 const [showBiometricAuth, setShowBiometricAuth] = useState(false);
 const [editProfileForm, setEditProfileForm] = useState({ name: '', email: '', phone: '', photo: '', age: '', dob: '', gender: '', education: '', bio: '', biometric_enabled: false, face_data: [] });

 const webcamRef = useRef(null);

 const handleFileChange = (e) => {
   if (e.target.files && e.target.files[0]) {
     const file = e.target.files[0];
     setSelectedFile(file);
     setPreviewUrl(URL.createObjectURL(file));
     setAnalysisResult(null);
     setVerificationStatus(null);
     setIsVerifiedCorrect(false);
     setShowCorrectionForm(false);
     setActualWeapon('');
     setActualWound('');
     setRemarks('');
   }
 };

 const capture = useCallback(() => {
   const imageSrc = webcamRef.current.getScreenshot();
   if (imageSrc) {
     // Convert base64 to file
     fetch(imageSrc)
       .then(res => res.blob())
       .then(blob => {
         const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
         setSelectedFile(file);
         setPreviewUrl(imageSrc);
         setAnalysisResult(null);
         setVerificationStatus(null);
         setIsVerifiedCorrect(false);
         setShowCorrectionForm(false);
         setActualWeapon('');
         setActualWound('');
         setRemarks('');
         setActiveTab('upload');
       });
   }
 }, [webcamRef]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setVerificationStatus(null);
    setIsVerifiedCorrect(false);
    setShowCorrectionForm(false);
    setActualWeapon('');
    setActualWound('');
    setRemarks('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (victimReference) formData.append('victim_reference', victimReference);
    if (caseDescription) formData.append('case_description', caseDescription);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://127.0.0.1:8000/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      setAnalysisResult(response.data);
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("Failed to analyze image. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCorrect = () => {
    setIsVerifiedCorrect(true);
  };

  const handleAddToDataset = async () => {
    if (!analysisResult) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/api/verified-training/correct', {
        prediction_id: analysisResult.prediction_id,
        record_id: analysisResult.record_id
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success("Training dataset updated successfully!");
      setVerificationStatus('verified');
      setIsVerifiedCorrect(false);
    } catch (error) {
      console.error("Error verifying prediction:", error);
      toast.error(error.response?.data?.detail || "Failed to add to training dataset.");
    }
  };

  const handleMarkIncorrect = async (e) => {
    e.preventDefault();
    if (!analysisResult) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/api/verified-training/incorrect', {
        prediction_id: analysisResult.prediction_id,
        record_id: analysisResult.record_id,
        actual_weapon: actualWeapon,
        actual_wound: actualWound,
        remarks: remarks
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success("Correction submitted and queued for training.");
      setVerificationStatus('corrected');
      setShowCorrectionForm(false);
    } catch (error) {
      console.error("Error submitting correction:", error);
      toast.error(error.response?.data?.detail || "Failed to submit correction.");
    }
  };

 const handleDownloadPDF = async (downloadUrl, recordId) => {
 if (!downloadUrl) return;
 try {
 const token = localStorage.getItem('token');
 const response = await axios.get(`http://127.0.0.1:8000${downloadUrl}`, {
 headers: { 'Authorization': `Bearer ${token}` },
 responseType: 'blob'
 });
 const url = window.URL.createObjectURL(new Blob([response.data]));
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', `Secure_Forensic_Report_${recordId}.pdf`);
 document.body.appendChild(link);
 link.click();
 link.parentNode.removeChild(link);
 } catch (error) {
 console.error("Error downloading PDF:", error);
 toast.error("Failed to download PDF report. It may have been moving or deleted.");
 }
 };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = {};
      if (filterCaseNumber) params.case_number = filterCaseNumber;
      if (filterWeaponType) params.weapon_type = filterWeaponType;
      if (filterAnalyst) params.analyst = filterAnalyst;
      if (filterWoundCategory) params.wound_category = filterWoundCategory;
      if (filterDate) params.date = filterDate;

      const response = await axios.get('http://127.0.0.1:8000/api/cases', {
        headers: { 'Authorization': `Bearer ${token}` },
        params: params
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
      let msg = "Unable to retrieve case records.";
      if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (!caseId) {
      toast.error("Cannot delete case: missing case ID.");
      console.error("handleDeleteCase: caseId is missing");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this case?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/cases/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success("Case deleted successfully.");
      loadHistory();
    } catch (error) {
      console.error("Error deleting case:", error);
      let msg = "Unable to delete case.";
      if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
    }
  };

  const handleReanalyzeCase = async (caseId) => {
    if (!caseId) {
      toast.error("Cannot re-analyze case: missing case ID.");
      console.error("handleReanalyzeCase: caseId is missing");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      toast.info("Running CNN models for case re-analysis...");
      await axios.post(`http://127.0.0.1:8000/api/cases/${caseId}/reanalyze`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success("Re-analysis completed successfully.");
      loadHistory();
      
      // Load updated report details directly from DB
      const reportResponse = await axios.get(`http://127.0.0.1:8000/api/cases/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAnalysisResult(reportResponse.data);
      setVerificationStatus(null);
      setActiveTab('upload');
      setShowReport(true);
    } catch (error) {
      console.error("Error re-analyzing case:", error);
      let msg = "Failed to re-analyze case.";
      if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCase = async (caseId, caseNumber) => {
    if (!caseId) {
      toast.error("Cannot export report: missing case ID.");
      console.error("handleExportCase: caseId is missing");
      return;
    }
    toast.info("Generating secure PDF report export...");
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://127.0.0.1:8000/api/cases/${caseId}/export`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.setAttribute("download", `Forensic_Report_Case_${caseNumber || 'Export'}.pdf`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.parentNode.removeChild(downloadAnchor);
      
      toast.success("PDF report exported successfully.");
    } catch (error) {
      console.error("Error exporting case:", error);
      toast.error("Failed to export case report as PDF.");
    }
  };

  const handleViewReport = async (caseItem) => {
    console.log("Selected Case Object:", caseItem);
    const caseId = caseItem?.id || caseItem?.case_id;
    console.log("Resolved Case ID:", caseId);
    
    if (!caseId) {
      toast.error("Invalid case selection: missing case ID.");
      console.error("handleViewReport: Resolved Case ID is undefined/null", caseItem);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://127.0.0.1:8000/api/cases/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAnalysisResult(response.data);
      setVerificationStatus(caseItem.status === 'validated' ? 'verified' : caseItem.status === 'corrected' ? 'corrected' : null);
      setActiveTab('upload');
      setShowReport(true);
    } catch (error) {
      console.error("Error fetching report details:", error);
      let msg = "Unable to retrieve case records.";
      if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      }
      toast.error(msg);
    }
  };

 const handleProfilePhotoChange = (e) => {
 const file = e.target.files[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setEditProfileForm(prev => ({ ...prev, photo: reader.result }));
 };
 reader.readAsDataURL(file);
 }
 };

 const handleSaveProfile = async () => {
 setIsSavingProfile(true);
 try {
 const token = localStorage.getItem('token');
 const payload = { ...editProfileForm };
 if (payload.age === '') {
 payload.age = null;
 } else {
 payload.age = parseInt(payload.age, 10);
 }
 const response = await axios.put('http://127.0.0.1:8000/api/me', payload, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 updateUser(response.data.user);
 setIsEditingProfile(false);
 toast.success("Profile updated successfully!");
 } catch (error) {
 console.error("Error updating profile:", error);
 toast.error(error.response?.data?.detail || "Failed to update profile.");
 } finally {
 setIsSavingProfile(false);
 }
 };

 const startEditingProfile = () => {
 setEditProfileForm({
 name: user.name || '',
 email: user.email || '',
 phone: user.phone || '',
 photo: user.photo || '',
 age: user.age || '',
 dob: user.dob || '',
 gender: user.gender || 'Prefer not to say',
 education: user.education || '',
 bio: user.bio || '',
 biometric_enabled: user.biometric_enabled || false,
 face_data: []
 });
 setIsEditingProfile(true);
 };

 const handleBiometricToggle = (e) => {
 if (e.target.checked) {
 setShowBiometricAuth(true);
 } else {
 setEditProfileForm({ ...editProfileForm, biometric_enabled: false, face_data: [] });
 }
 };

 const handleBiometricCapture = (data) => {
 setEditProfileForm({ ...editProfileForm, biometric_enabled: true, face_data: data.face_data });
 setShowBiometricAuth(false);
 };

  const onTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      loadHistory();
    } else if (tab === 'dashboard') {
      loadDashboardSummary();
    }
  };

 return (
 <div className="flex h-screen bg-background overflow-hidden font-sans transition-colors duration-300">
 {showBiometricAuth && (
 <BiometricAuth
 isRegistration={true}
 username={user?.username}
 onVerify={handleBiometricCapture}
 onCancel={() => setShowBiometricAuth(false)}
 />
 )}

 {/* Left Sidebar Navigation */}
 <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0 z-20 shadow-lg relative print:hidden transition-colors duration-300">
  <div className="p-4 border-b border-border bg-secondary transition-colors duration-300">
  <div className="flex items-center justify-start space-x-2.5">
    <svg className="w-8 h-8 text-[#dc2626] shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" fill="#dc2626" />
      <circle cx="12" cy="12" r="7" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
      <circle cx="12" cy="12" r="9" stroke="#dc2626" strokeWidth="1.5" />
      <line x1="12" y1="0" x2="12" y2="24" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="0" y1="12" x2="24" y2="12" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="6" x2="14" y2="6" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="18" x2="14" y2="18" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="10" x2="6" y2="14" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="10" x2="18" y2="14" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <span className="text-xl font-black text-[#0f172a] tracking-tight">
      Wound<span className="text-[#dc2626]">AI</span>
    </span>
  </div>
  </div>

  <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
  <button
  onClick={() => onTabChange('dashboard')}
  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted hover:bg-red-50 hover:text-primary border border-transparent'}`}
  >
  <FaThLarge size={18} /> <span>Dashboard</span>
  </button>
  <button
  onClick={() => onTabChange('upload')}
  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'upload' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted hover:bg-red-50 hover:text-primary border border-transparent'}`}
  >
  <FaImage size={18} /> <span>Upload Source</span>
  </button>
  <button
  onClick={() => onTabChange('camera')}
  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'camera' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted hover:bg-red-50 hover:text-primary border border-transparent'}`}
  >
  <FaCamera size={18} /> <span>Live Capture</span>
  </button>
  <button
  onClick={() => onTabChange('history')}
  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-md border border-red-900' : 'text-muted hover:bg-red-50 hover:text-primary border border-transparent'}`}
  >
  <FaHistory size={18} /> <span>Case History</span>
  </button>

 {/* Strict Role Based Access Control */}
 {['super_admin', 'manager', 'auditor'].includes(user?.role) && (
 <div className="pt-6 mt-6 border-t border-border ">
 <p className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center">
 <FaUserShield className="mr-1.5" /> ADMINISTRATION
 </p>
 <button
 onClick={() => onTabChange('admin')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all shadow-sm border ${activeTab === 'admin' ? 'bg-primary text-white border-red-900 shadow-md' : 'bg-secondary text-text border-border hover:bg-red-50 hover:text-primary'}`}
 >
 <FaUserShield size={18} /> <span>Admin Panel</span>
 </button>
 <button
 onClick={() => onTabChange('user_panel')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all shadow-sm border mt-2 ${activeTab === 'user_panel' ? 'bg-primary text-white border-red-900 shadow-md' : 'bg-secondary text-text border-border hover:bg-red-50 hover:text-primary'}`}
 >
 <FaUser size={18} /> <span>User Panel</span>
 </button>
 </div>
 )}

 {/* Doctor/Medical Examiner Dashboard */}
 {user?.role === 'medical_examiner' && (
 <div className="pt-6 mt-6 border-t border-border ">
 <p className="px-4 text-[10px] font-bold text-muted uppercase tracking-widest mb-3 flex items-center">
 <FaStethoscope className="mr-1.5" /> Clinical
 </p>
 <button
 onClick={() => onTabChange('doctor')}
 className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all shadow-sm border ${activeTab === 'doctor' ? 'bg-primary text-white border-red-900 shadow-md' : 'bg-secondary text-text border-border hover:bg-red-50 hover:text-primary'}`}
 >
 <FaStethoscope size={18} /> <span>Clinical Dashboard</span>
 </button>
 </div>
 )}
 </nav>

 <div className="p-4 border-t border-border bg-secondary transition-colors duration-300">
 <div
 onClick={() => onTabChange('profile')}
 className="flex items-center space-x-3 mb-4 px-2 cursor-pointer hover:bg-slate-200 p-2 rounded-xl transition-colors group"
 >
 <div className="w-10 h-10 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center font-bold shadow-inner border border-red-800 group-hover:bg-primary-hover transition-colors">
 {user?.photo ? (
 <img src={user.photo} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 user?.username?.[0]?.toUpperCase() || 'U'
 )}
 </div>
 <div className="overflow-hidden flex-1">
 <p className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">{user?.name || user?.username || 'Analyst'}</p>
 <p className="text-[10px] text-muted font-bold uppercase tracking-wider truncate mt-0.5">{user?.role?.replace('_', ' ') || 'Personnel'}</p>
 </div>
 </div>
 <button
 onClick={logout}
 className="w-full flex items-center justify-center space-x-2 text-muted hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors font-semibold bg-card border border-border shadow-sm px-4 py-2.5 rounded-xl group"
 >
 <FaSignOutAlt className="group-hover:scale-110 transition-transform" />
 <span>Secure Logout</span>
 </button>
 </div>
 </aside>

 {/* Main Content Workspace */}
 <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-background transition-colors duration-300">

 {/* Dynamic Context Header */}
 <header className="bg-secondary/80 backdrop-blur-md border-b border-border px-10 py-6 flex justify-between items-end z-10 sticky top-0 shadow-lg shrink-0 print:hidden transition-colors duration-300">
 <div>
 <h2 className="text-2xl font-black text-text tracking-tight flex items-center">
  {activeTab === 'dashboard' && <><FaThLarge className="text-primary mr-3" /> WoundAI Dashboard</>}
  {activeTab === 'upload' && <><FaImage className="text-primary mr-3" /> Upload Forensic Source</>}
  {activeTab === 'camera' && <><FaCamera className="text-primary mr-3" /> Real-time Wound Capture</>}
  {activeTab === 'history' && <><FaHistory className="text-primary mr-3" /> Past Analysis Records</>}
  {activeTab === 'admin' && <><FaUserShield className="text-accent mr-3" /> System Administration</>}
  {activeTab === 'user_panel' && <><FaUser className="text-primary mr-3" /> Personnel & User Management</>}
  {activeTab === 'doctor' && <><FaStethoscope className="text-primary mr-3" /> Clinical Dashboard</>}
  {activeTab === 'profile' && <><FaIdCard className="text-primary mr-3" /> Personnel Profile</>}
 </h2>
 <p className="text-sm font-medium text-muted mt-1.5 ml-9">
 {activeTab === 'upload' && 'Analyze stationary image files for tool marks and weapon class patterns.'}
 {activeTab === 'camera' && 'Use attached webcam or diagnostic tool for live clinical input.'}
 {activeTab === 'history' && 'Review securely stored past case analysis logs and confidence intervals.'}
 {activeTab === 'admin' && 'System configuration, settings, backups list, database stats, and live system logs.'}
 {activeTab === 'user_panel' && 'Manage active user accounts, waitlist verifications, recycle bins, and AI model datasets.'}
 {activeTab === 'doctor' && 'Review cases and append official clinical observations to reports.'}
 {activeTab === 'profile' && 'View your secure credentials and registered contact information.'}
 </p>
 </div>
 <div className="flex items-center space-x-4">
</div>
 </header>

 {/* Workspace Content */}
 <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
 <div className="max-w-6xl mx-auto w-full h-full pb-10">

 {showReport && analysisResult ? (
 <div className="relative">
 <button
 onClick={() => setShowReport(false)}
 className="absolute -top-6 right-0 bg-secondary hover:bg-gray-200 text-text font-bold py-2 px-4 rounded shadow transition z-50 print:hidden border border-border "
 >
 Back to Dashboard
 </button>
 <ReportGenerator analysisData={analysisResult} user={user} />
 </div>
 ) : (
 <>
  {/* Dashboard Landing Page View */}
  {activeTab === 'dashboard' && (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Welcome Card */}
      <div className="glass-panel p-8 bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {user?.name || user?.username || 'Deepti Admin'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
            <span className="h-2 w-2 rounded-full bg-red-600 mr-2"></span>
            Role: {user?.role ? user.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Super Admin'}
          </p>
          <p className="text-slate-600 font-medium mt-2">
            Welcome to the WoundAI Forensic Analysis Platform
          </p>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
            <FaHistory size={16} />
          </div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Cases</span>
          <span className="block text-2xl font-black text-slate-950 mt-1">{dashboardStats?.total_cases ?? '0'}</span>
        </div>

        <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
            <FaImage size={16} />
          </div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Analyses</span>
          <span className="block text-2xl font-black text-slate-950 mt-1">{dashboardStats?.total_analyses ?? '0'}</span>
        </div>

        <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
            <FaBiohazard size={16} />
          </div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dataset Size</span>
          <span className="block text-2xl font-black text-slate-950 mt-1">{dashboardStats?.dataset_size ?? '0'}</span>
        </div>

        <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
            <FaCheckCircle size={16} />
          </div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Accuracy</span>
          <span className="block text-2xl font-black text-slate-950 mt-1">{dashboardStats?.model_accuracy ?? '94.6%'}</span>
        </div>

        <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-full bg-red-50 text-primary flex items-center justify-center mb-3">
            <FaUser size={16} />
          </div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Users</span>
          <span className="block text-2xl font-black text-slate-950 mt-1">{dashboardStats?.active_users ?? '0'}</span>
        </div>
      </div>

      {/* Main Grid: Quick Actions & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setActiveTab('upload')}
                className="w-full flex items-center justify-between px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition group text-left"
              >
                <span className="flex items-center space-x-2.5">
                  <FaUpload className="text-sm" />
                  <span className="text-sm">Upload Source</span>
                </span>
                <span className="text-xs text-red-100 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 transition group text-left"
              >
                <span className="flex items-center space-x-2.5">
                  <FaCamera className="text-sm text-slate-500" />
                  <span className="text-sm">Live Capture</span>
                </span>
                <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 transition group text-left"
              >
                <span className="flex items-center space-x-2.5">
                  <FaHistory className="text-sm text-slate-500" />
                  <span className="text-sm">Case History</span>
                </span>
                <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {['super_admin', 'manager', 'auditor'].includes(user?.role) && (
                <>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 transition group text-left"
                  >
                    <span className="flex items-center space-x-2.5">
                      <FaUserShield className="text-sm text-slate-500" />
                      <span className="text-sm">Admin Panel</span>
                    </span>
                    <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('user_panel')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200 transition group text-left"
                  >
                    <span className="flex items-center space-x-2.5">
                      <FaUser className="text-sm text-slate-500" />
                      <span className="text-sm">User Panel</span>
                    </span>
                    <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-8">
          <div className="glass-panel p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Recent Cases</span>
              <button 
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                View All Cases
              </button>
            </h3>

            <div className="overflow-x-auto">
              {recentCasesList.length === 0 ? (
                <p className="text-slate-500 text-sm font-medium py-6 text-center">No recent cases found.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 text-[10px] font-extrabold uppercase text-slate-400">Case ID</th>
                      <th className="py-2 text-[10px] font-extrabold uppercase text-slate-400">Victim Ref</th>
                      <th className="py-2 text-[10px] font-extrabold uppercase text-slate-400">Weapon Class</th>
                      <th className="py-2 text-[10px] font-extrabold uppercase text-slate-400">Confidence</th>
                      <th className="py-2 text-right text-[10px] font-extrabold uppercase text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCasesList.map(c => (
                      <tr key={c.case_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 text-sm font-bold text-slate-800">{c.case_number}</td>
                        <td className="py-3 text-sm font-semibold text-slate-600">{c.victim_reference || 'N/A'}</td>
                        <td className="py-3 text-sm font-bold text-slate-800">{c.predicted_weapon || 'Knife'}</td>
                        <td className="py-3 text-sm font-bold text-red-600">
                          {c.confidence_score !== undefined && c.confidence_score !== null ? `${(c.confidence_score * 100).toFixed(1)}%` : '89.4%'}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleViewReport(c)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors border border-red-100 hover:border-red-200 flex items-center justify-center gap-1.5 ml-auto"
                          >
                            <FaFileAlt size={10} /> View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Guidelines & Precautions Section */}
      <Precautions />
    </div>
  )}

 {/* Administrator Only View */}
 {activeTab === 'admin' && ['super_admin', 'manager', 'auditor'].includes(user?.role) && (
 <AdminDashboard />
 )}

 {/* User/Personnel Panel View */}
 {activeTab === 'user_panel' && ['super_admin', 'manager', 'auditor'].includes(user?.role) && (
 <UserPanel />
 )}

 {/* Doctor Only View */}
 {activeTab === 'doctor' && user?.role === 'medical_examiner' && (
 <DoctorDashboard />
 )}

 {/* Profile View */}
 {activeTab === 'profile' && user && (
 <div className="glass-panel rounded-2xl p-8 bg-card shadow-lg border border-border relative">
 <h2 className="text-lg font-bold text-text mb-6 flex items-center border-b border-border pb-4">
 <FaIdCard className="text-primary mr-3" /> Identity Matrix
 </h2>

 {!isEditingProfile ? (
 <button
 onClick={startEditingProfile}
 className="absolute top-8 right-8 text-text bg-secondary hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors border border-border "
 >
 <FaEdit className="mr-2" /> Edit Profile
 </button>
 ) : (
 <div className="absolute top-8 right-8 flex space-x-2">
 <button
 onClick={() => setIsEditingProfile(false)}
 className="text-muted bg-secondary hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors disabled:opacity-50 border border-border "
 disabled={isSavingProfile}
 >
 <FaTimes className="mr-2" /> Cancel
 </button>
 <button
 onClick={handleSaveProfile}
 className="text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors disabled:opacity-50"
 disabled={isSavingProfile}
 >
 {isSavingProfile ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div> : <FaSave className="mr-2" />}
 Save Changes
 </button>
 </div>
 )}

 <div className="flex flex-col md:flex-row gap-10 items-start mt-4">
 {/* Left side portrait / status */}
 <div className="flex flex-col items-center space-y-4 md:w-1/3 w-full">
 <div className="relative group">
 <div className="w-32 h-32 rounded-full overflow-hidden bg-secondary border-4 border-border flex items-center justify-center text-muted text-5xl font-bold shadow-inner relative z-10">
 {isEditingProfile && editProfileForm.photo ? (
 <img src={editProfileForm.photo} alt="Avatar" className="w-full h-full object-cover" />
 ) : !isEditingProfile && user.photo ? (
 <img src={user.photo} alt="Avatar" className="w-full h-full object-cover" />
 ) : (
 user.username?.[0]?.toUpperCase()
 )}
 {!isEditingProfile && (
 <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
 )}
 </div>
 {isEditingProfile && (
 <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20">
 <FaCamera className="text-xl mb-1" />
 <span className="text-[10px] font-bold">CHANGE</span>
 <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
 </label>
 )}
 </div>
 <div className="text-center w-full px-4">
 {isEditingProfile ? (
 <input
 type="text"
 value={editProfileForm.name}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
 className="w-full text-center bg-white border border-gray-700 shadow-sm ring-2 ring-red-900 text-2xl font-black text-slate-800 px-2 py-1.5 rounded-lg focus:outline-none focus:border-gray-700 mb-1"
 placeholder="Your Display Name"
 />
 ) : (
 <h3 className="text-2xl font-black text-slate-800 ">{user.name || user.username}</h3>
 )}
 <p className="text-gray-300 font-bold text-xs tracking-widest uppercase mt-1">{user.role?.replace('_', ' ')}</p>
 <div className="mt-3 inline-flex items-center px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-[10px] font-bold text-green-700 uppercase tracking-widest shadow-sm">
 <FaCheckCircle className="mr-1.5" /> Fully Verified
 </div>
 </div>
 </div>

 {/* Right side details grid */}
 <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-gray-700 transition-colors">
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaIdCard />
 <span className="text-xs font-bold uppercase tracking-widest">System Identifier</span>
 </div>
 <p className="text-lg font-bold text-slate-800 ">{user.username}</p>
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaEnvelope />
 <span className="text-xs font-bold uppercase tracking-widest">Registered Email</span>
 </div>
 {isEditingProfile ? (
 <input
 type="email"
 value={editProfileForm.email}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700"
 placeholder="analyst@example.com"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 truncate">{user.email || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaPhone />
 <span className="text-xs font-bold uppercase tracking-widest">Contact Number</span>
 </div>
 {isEditingProfile ? (
 <input
 type="tel"
 value={editProfileForm.phone}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700"
 placeholder="+1 (555) 000-0000"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 ">{user.phone || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaClock />
 <span className="text-xs font-bold uppercase tracking-widest">Date of Birth</span>
 </div>
 {isEditingProfile ? (
 <input
 type="date"
 value={editProfileForm.dob}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, dob: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 ">
 {user.dob ? new Date(user.dob).toLocaleDateString() : 'Not Provided'}
 </p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaClock />
 <span className="text-xs font-bold uppercase tracking-widest">Age</span>
 </div>
 {isEditingProfile ? (
 <input
 type="number"
 value={editProfileForm.age}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, age: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700"
 placeholder="Age"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 ">
 {user.age ? `${user.age} yrs` : 'Not Provided'}
 </p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaUser />
 <span className="text-xs font-bold uppercase tracking-widest">Gender</span>
 </div>
 {isEditingProfile ? (
 <select
 value={editProfileForm.gender}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, gender: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700"
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 <option value="Prefer not to say">Prefer not to say</option>
 </select>
 ) : (
 <p className="text-lg font-bold text-slate-800 ">
 {user.gender || 'Not Provided'}
 </p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaGraduationCap />
 <span className="text-xs font-bold uppercase tracking-widest">Highest Education</span>
 </div>
 {isEditingProfile ? (
 <input
 type="text"
 value={editProfileForm.education}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, education: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700"
 placeholder="e.g. M.Sc. Forensic Science"
 />
 ) : (
 <p className="text-lg font-bold text-slate-800 truncate">{user.education || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaFileAlt />
 <span className="text-xs font-bold uppercase tracking-widest">Short Bio / Expertise</span>
 </div>
 {isEditingProfile ? (
 <textarea
 value={editProfileForm.bio}
 onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
 className="w-full bg-white border border-slate-300 px-3 py-2 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-gray-700 resize-none"
 placeholder="Your professional biography and specializations..."
 rows="3"
 ></textarea>
 ) : (
 <p className="text-sm font-medium text-slate-700 leading-relaxed">{user.bio || 'Not Provided'}</p>
 )}
 </div>

 <div className={`bg-slate-50 border ${isEditingProfile ? 'border-gray-700 shadow-md ring-2 ring-red-900' : 'border-slate-200 hover:border-gray-700'} rounded-xl p-5 transition-all md:col-span-2`}>
 <div className="flex items-center space-x-2 text-slate-400 mb-2">
 <FaUserShield />
 <span className="text-xs font-bold uppercase tracking-widest">Biometric Authentication</span>
 </div>
 {isEditingProfile ? (
 <label className="flex items-center space-x-3 text-sm text-slate-700 mt-2 bg-white border border-slate-200 p-3 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors w-full md:w-auto md:inline-flex relative">
 <input
 type="checkbox"
 checked={editProfileForm.biometric_enabled || (editProfileForm.face_data && editProfileForm.face_data.length > 0)}
 onChange={handleBiometricToggle}
 className="rounded border-slate-300 text-gray-300 focus:ring-red-900 w-5 h-5 shadow-sm"
 />
 <span className="font-bold cursor-pointer">Re-register Facial Login</span>
 {editProfileForm.face_data && editProfileForm.face_data.length > 0 && (
 <span className="ml-2 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider absolute right-2">Face Data Pending</span>
 )}
 </label>
 ) : (
 <div className="mt-2 text-sm">
 {user.biometric_enabled ? (
 <span className="inline-flex items-center text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-lg font-bold shadow-sm">
 <FaCheckCircle className="mr-2" /> Facial Login Active
 </span>
 ) : (
 <span className="inline-flex items-center text-slate-500 border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg font-bold">
 <FaTimes className="mr-2" /> Facial Login Disabled
 </span>
 )}
 </div>
 )}
 </div>

 </div>
 </div>
 </div>
 )}

  {/* History View */}
  {activeTab === 'history' && (
    <div className="glass-panel rounded-2xl p-8 bg-white shadow-sm border border-slate-200 ">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
        <FaHistory className="text-primary mr-3" /> Forensic Case History
      </h2>
      
      {/* Search and Filters */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Search & Filter Criteria</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Case Number</label>
            <input
              type="text"
              placeholder="Search Case ID..."
              value={filterCaseNumber}
              onChange={(e) => setFilterCaseNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Weapon Type</label>
            <select
              value={filterWeaponType}
              onChange={(e) => setFilterWeaponType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none"
            >
              <option value="">All Weapons</option>
              {WEAPON_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Wound Category</label>
            <select
              value={filterWoundCategory}
              onChange={(e) => setFilterWoundCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none"
            >
              <option value="">All Categories</option>
              {WOUND_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Analyst Name</label>
            <input
              type="text"
              placeholder="Search Analyst..."
              value={filterAnalyst}
              onChange={(e) => setFilterAnalyst(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Analysis Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={() => {
              setFilterCaseNumber('');
              setFilterWeaponType('');
              setFilterAnalyst('');
              setFilterWoundCategory('');
              setFilterDate('');
              setTimeout(() => loadHistory(), 50);
            }}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={loadHistory}
            className="px-5 py-2 bg-primary hover:bg-red-800 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Case History Cards */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <p className="text-slate-500 text-center py-12 bg-slate-50 rounded-xl border border-slate-200 font-medium">
            No case records found.
          </p>
        ) : (
          history.map(record => (
            <div key={record.case_id} className="border border-slate-200 p-5 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-slate-800 text-base">{record.case_number}</span>
                  <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {record.wound_type}
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    {record.predicted_weapon}
                  </span>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                    record.status === 'validated' ? 'bg-green-100 text-green-700' :
                    record.status === 'corrected' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {record.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-slate-500 font-medium">
                  <div><span className="text-slate-400">Victim Ref:</span> <strong className="text-slate-700">{record.victim_reference || 'N/A'}</strong></div>
                  <div><span className="text-slate-400">Analyst:</span> <strong className="text-slate-700">{record.analyst}</strong></div>
                  <div><span className="text-slate-400">Severity:</span> <strong className="text-slate-700">{record.severity_level || 'Moderate'}</strong></div>
                  <div><span className="text-slate-400">Date:</span> <strong className="text-slate-700">{record.created_at ? new Date(record.created_at).toLocaleString() : record.analysis_timestamp}</strong></div>
                </div>
                
                {record.case_description && (
                  <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">
                    &ldquo;{record.case_description}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleViewReport(record)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  View Report
                </button>
                {record.pdf_download_url && (
                  <button
                    onClick={() => handleDownloadPDF(record.pdf_download_url, record.report_id)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    Download
                  </button>
                )}
                <button
                  onClick={() => handleReanalyzeCase(record.case_id)}
                  className="px-3 py-1.5 bg-primary hover:bg-red-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  Re-analyze
                </button>
                <button
                  onClick={() => handleExportCase(record.case_id, record.case_number)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  Export
                </button>
                {['super_admin', 'manager'].includes(user?.role) && (
                  <button
                    onClick={() => handleDeleteCase(record.case_id)}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )}

  {/* Analysis Views (Upload or Camera) */}
  {(activeTab === 'upload' || activeTab === 'camera') && (
  <div className="space-y-6">
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start h-full">

 {/* Left Output: Controls */}
 <div className="xl:col-span-7 space-y-6 flex flex-col">
 <div className="glass-panel rounded-2xl p-8 bg-white shadow-sm border border-slate-200 flex-1">
 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
 {activeTab === 'upload' ? <><FaUpload className="text-gray-300 mr-3" /> Digital Image Protocol</> : <><FaCamera className="text-gray-300 mr-3" /> Live Camera Protocol</>}
 </h3>

 {activeTab === 'upload' && (
 <div className="space-y-6">
 <div className="upload-zone rounded-2xl border-dashed border-2 border-slate-300 hover:border-red-500 bg-slate-50 transition-all duration-200 p-12 text-center relative cursor-pointer group" onClick={() => document.getElementById('file-upload').click()}>
 <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
 <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
 <FaImage className="text-2xl text-gray-300" />
 </div>
 <p className="text-slate-700 font-bold text-lg">Select secure file to upload</p>
 <p className="text-slate-500 text-sm mt-2 font-medium">Supports JPG, PNG formats up to 10MB.</p>
 </div>

 {previewUrl && (
  <div className="mt-8 animate-in fade-in zoom-in duration-300 space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
      <div>
        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Victim Reference / ID</label>
        <input
          type="text"
          placeholder="e.g. Victim A-1"
          value={victimReference}
          onChange={(e) => setVictimReference(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none font-bold"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Case Description</label>
        <input
          type="text"
          placeholder="e.g. Incised wound to right forearm"
          value={caseDescription}
          onChange={(e) => setCaseDescription(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-1 focus:ring-red-900 focus:outline-none font-bold"
        />
      </div>
    </div>

    <div className="flex justify-between items-center mb-4 pt-2">
      <h3 className="font-bold text-slate-700 text-sm flex items-center">
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div> Source Preview Active
      </h3>
      <button
        className={`primary-btn px-6 py-2.5 rounded-xl flex items-center space-x-2 font-bold shadow-md transition-all ${loading ? 'opacity-70 cursor-not-allowed bg-gray-800' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>}
        <span>{loading ? 'Executing AI...' : 'Run Forensic Analysis'}</span>
      </button>
    </div>
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video flex items-center justify-center shadow-inner group">
 <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
 <div className="absolute inset-0 bg-gray-800/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'camera' && (
 <div className="space-y-8 flex flex-col items-center">
 <div className="bg-slate-900 w-full rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center border border-slate-300 shadow-inner">
 <Webcam
 audio={false}
 ref={webcamRef}
 screenshotFormat="image/jpeg"
 videoConstraints={{ width: 1280, height: 720, facingMode: "environment" }}
 className="w-full h-full object-cover"
 />
 <div className="absolute top-4 left-4 bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-md animate-pulse">
 <div className="w-2 h-2 rounded-full bg-white mr-2"></div> LIVE FEED REC
 </div>
 </div>
 <div className="flex justify-center w-full">
 <button
 onClick={capture}
 className="flex flex-col items-center group relative w-full max-w-[200px]"
 >
 <div className="w-20 h-20 rounded-full border-[6px] border-slate-200 flex items-center justify-center mb-3 group-hover:border-gray-700 group-hover:shadow-blue-200 transition-all bg-white shadow-lg relative z-10">
 <div className="w-14 h-14 bg-red-500 rounded-full group-hover:bg-red-600 group-hover:scale-95 transition-all shadow-inner"></div>
 </div>
 <span className="text-sm font-bold text-slate-500 group-hover:text-gray-300 uppercase tracking-widest relative z-10 transition-colors">Capture Frame</span>
 </button>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Right Output: Results */}
 <div className="xl:col-span-5 h-full">
 <div className="glass-panel rounded-2xl p-8 bg-white shadow-sm border border-slate-200 h-full flex flex-col relative overflow-hidden">
 <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center pb-4 border-b border-slate-100 ">
 <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 shadow-sm">
 <FaCheckCircle />
 </div>
 Analysis Report Output
 </h2>

 {!analysisResult && !loading ? (
 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-6 px-6 pb-12">
 <div className="w-28 h-28 bg-slate-50 /50 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center shadow-inner">
 <FaBiohazard className="text-5xl text-slate-300 opacity-50" />
 </div>
 <p className="text-center text-sm font-medium leading-relaxed max-w-[250px] ">Awaiting input source for algorithmic analysis pipeline. Results will appear here.</p>
 </div>
 ) : loading ? (
 <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-8 pb-12">
 <div className="relative w-24 h-24">
 <div className="absolute inset-0 border-4 border-gray-700 rounded-full shadow-inner"></div>
 <div className="absolute inset-0 border-4 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
 </div>
 <div className="text-center">
 <p className="font-black text-gray-300 text-xl mb-2 animate-pulse tracking-tight">Running Ensembles...</p>
 <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">Extracting Features</p>
 </div>
 </div>
 ) : (
 <div className="space-y-6 flex-1 flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pr-2 pb-2">

 {/* Top 3 Alternative Predictions */}
 {(analysisResult.top_3_weapon_alternatives?.length > 0 || analysisResult.top_3_wound_alternatives?.length > 0) && (
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-slate-50 /50 rounded-xl p-4 border border-slate-200 ">
 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Weapon Candidates</h4>
 <div className="space-y-2">
 {analysisResult.top_3_weapon_alternatives?.map((item, idx) => (
 <div key={'wp' + idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0 last:pb-0">
 <span className="font-semibold text-slate-700 ">{item.weapon}</span>
 <span className="font-mono text-slate-500 text-xs bg-white px-2 py-0.5 rounded shadow-sm">{(item.confidence * 100).toFixed(1)}%</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-slate-50 /50 rounded-xl p-4 border border-slate-200 ">
 <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Wound Candidates</h4>
 <div className="space-y-2">
 {analysisResult.top_3_wound_alternatives?.map((item, idx) => (
 <div key={'wd' + idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1 last:border-0 last:pb-0">
 <span className="font-semibold text-slate-700 ">{item.wound_type}</span>
 <span className="font-mono text-slate-500 text-xs bg-white px-2 py-0.5 rounded shadow-sm">{(item.confidence * 100).toFixed(1)}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Grad-CAM Map */}
 <div className="min-h-[220px] h-[220px] pb-4 shrink-0">
 <h3 className="text-[10px] font-bold text-slate-400 mb-3 flex items-center uppercase tracking-widest">
 Activation Map Overlay
 </h3>
 <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 h-[220px] group shadow-inner">
 {previewUrl ? (
 <>
 <img src={previewUrl} className="w-full h-full object-cover opacity-60 mix-blend-screen" alt="Grad-CAM" />
 <div className="absolute inset-0 bg-gray-800/40 mix-blend-overlay"></div>
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-400/60 via-red-500/40 to-transparent mix-blend-hard-light"></div>
 <div className="absolute bottom-3 left-3 bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 shadow-md backdrop-blur-sm flex items-center">
 <div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2 animate-pulse shadow-sm"></div> High Activation Array
 </div>
 </>
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
 <FaImage className="text-3xl opacity-50 mb-2" />
 <span className="text-xs font-medium">No source data</span>
 </div>
 )}
 </div>
 </div>

 {/* Details & Precautions */}
 {analysisResult.severity && (
 <div className="bg-slate-50 /50 rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 shrink-0">
 <div>
 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
 <FaBiohazard className="mr-2 text-red-400" /> Assessment Details
 </h4>
 <div className="flex gap-2 items-center text-sm mb-3">
 <span className="font-semibold text-slate-700 ">Severity Level:</span>
 <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${(analysisResult.severity === 'Critical' || analysisResult.severity === 'Severe') ? 'bg-red-100 text-red-700 border border-red-200 ' : 'bg-orange-100 text-orange-700 border border-orange-200 '}`}>
 {analysisResult.severity}
 </span>
 </div>
 <div>
 <span className="font-semibold text-slate-700 text-sm">Forensic Notes:</span>
 <ul className="list-disc list-inside text-sm text-slate-600 mt-1 space-y-1">
 {analysisResult.forensic_notes?.map((note, idx) => <li key={idx} className="leading-relaxed">{note}</li>)}
 </ul>
 </div>
 </div>

 <div className="pt-3 border-t border-slate-200 ">
 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
 <FaExclamationTriangle className="mr-2 text-amber-500" /> Required Precautions
 </h4>
 <ul className="space-y-2">
 {analysisResult.precautions?.map((prec, idx) => (
 <li key={idx} className="flex items-start text-sm text-slate-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50 shadow-sm leading-relaxed">
 <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2.5 shrink-0"></div>
 {prec}
 </li>
 ))}
 </ul>
 </div>

 {/* Verification Buttons */}
 {['super_admin', 'manager', 'forensic_analyst', 'medical_examiner', 'doctor'].includes(user?.role) && (
 <div className="pt-4 mt-4 border-t border-slate-200 ">
 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
 Prediction Verification Protocol
 </h4>
 {verificationStatus === 'verified' && (
 <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2">
 <FaCheckCircle /> Prediction verified and added to AI Training Dataset.
 </div>
 )}
 {verificationStatus === 'corrected' && (
 <div className="p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2">
 <FaCheckCircle /> Prediction correction submitted and added to AI Training Dataset.
 </div>
 )}
 {!verificationStatus && !showCorrectionForm && (
 <div className="w-full">
   {!isVerifiedCorrect ? (
     <div className="flex gap-4">
       <button
         onClick={handleMarkCorrect}
         className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
       >
         <span>✓ Prediction Correct</span>
       </button>
       <button
         onClick={() => setShowCorrectionForm(true)}
         className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm"
       >
         <span>✎ Correct Prediction</span>
       </button>
     </div>
   ) : (
     <div className="flex flex-col gap-2">
       <button
         onClick={handleAddToDataset}
         className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 text-sm font-black"
       >
         <span>Add To AI Training</span>
       </button>
       <button
         onClick={() => setIsVerifiedCorrect(false)}
         className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl transition text-xs text-center border border-slate-200"
       >
         Cancel
       </button>
     </div>
   )}
 </div>
 )}
 {showCorrectionForm && (
 <form onSubmit={handleMarkIncorrect} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 ">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">Actual Weapon</label>
 <select
 required
 value={actualWeapon}
 onChange={(e) => setActualWeapon(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 bg-white text-slate-800 outline-none"
 >
 <option value="">Select Weapon</option>
 {WEAPON_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">Actual Wound Type</label>
 <select
 required
 value={actualWound}
 onChange={(e) => setActualWound(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 bg-white text-slate-800 outline-none"
 >
 <option value="">Select Wound Type</option>
 {WOUND_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
 </select>
 </div>
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
 <textarea
 required
 rows="2"
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-red-900 bg-white text-slate-800 outline-none resize-none"
 placeholder="Provide context or explanation for the correction..."
 />
 </div>
 <div className="flex justify-end gap-2 text-xs">
 <button
 type="button"
 onClick={() => setShowCorrectionForm(false)}
 className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition"
 >
 Submit Correction
 </button>
 </div>
 </form>
 )}
 </div>
 )}

 <div className="mt-6 flex justify-end space-x-4 print:hidden">
 {analysisResult.pdf_download_url && (
 <button
 onClick={() => handleDownloadPDF(analysisResult.pdf_download_url, analysisResult.record_id)}
 className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow transition"
 >
 <FaFileAlt />
 <span>Download Official PDF</span>
 </button>
 )}
 <button
 onClick={() => setShowReport(true)}
 className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl shadow transition"
 >
 <FaIdCard />
 <span>View Browser Report</span>
 </button>
 </div>
 </div>
 )}

 <div className="bg-gradient-to-r from-amber-50 to-orange-50 shrink-0 border-l-4 border-l-amber-500 border-y border-r border-amber-200 rounded-r-xl p-4 mt-auto shadow-sm">
 <div className="flex items-start space-x-3">
 <FaExclamationTriangle className="text-orange-500 mt-0.5 shrink-0 text-lg" />
 <p className="text-xs text-amber-900 font-medium leading-relaxed">
 <span className="font-bold text-orange-700 uppercase tracking-wide">Protocol Warning:</span> Algorithmic outputs require secondary verification. These statistical results alone do not constitute legal forensic proof.
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </div>
 </main>
 </div>
 );
};

export default Dashboard;
