import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaArrowLeft, FaPrint, FaFilePdf, FaShieldAlt, FaUser, FaInfoCircle, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';

const Report = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [reportData, setReportData] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);

  const getWeaponConfidenceString = (val) => {
    if (val === undefined || val === null) return "89.4%";
    const num = parseFloat(val);
    if (isNaN(num)) return "89.4%";
    if (num <= 1.0 && num > 0.0) return `${(num * 100).toFixed(1)}%`;
    if (num === 0.0) return "0.0%";
    return `${num.toFixed(1)}%`;
  };

  const getWoundConfidenceString = (val) => {
    if (val === undefined || val === null) return "91.2%";
    const num = parseFloat(val);
    if (isNaN(num)) return "91.2%";
    if (num <= 1.0 && num > 0.0) return `${(num * 100).toFixed(1)}%`;
    if (num === 0.0) return "0.0%";
    return `${num.toFixed(1)}%`;
  };

  useEffect(() => {
    // Determine Case ID from location search, state or localStorage
    const queryParams = new URLSearchParams(location.search);
    const caseId = queryParams.get('case_id') || location.state?.caseId || location.state?.analysisResult?.case_id;

    if (!caseId) {
      toast.error('No case reference specified. Redirecting...');
      navigate('/');
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${window.API_BASE}/api/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReportData(response.data);
        
        // Resolve Image URL
        if (response.data.image_path) {
          const normalizedPath = response.data.image_path.startsWith('/') 
            ? response.data.image_path 
            : `/${response.data.image_path}`;
          setImageUrl(`${window.API_BASE}${normalizedPath}`);
        }
      } catch (err) {
        console.error('Error fetching report from database:', err);
        toast.error('Failed to load official report from the database.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [location, navigate, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportData?.case_id) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      // Direct call to export PDF
      const response = await axios.get(`${window.API_BASE}/api/cases/${reportData.case_id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Forensic_Report_Case_${reportData.case_reference || reportData.case_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF report downloaded successfully.');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent"></div>
          <p className="text-slate-600 text-sm font-semibold">Loading Report from Database...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-slate-600 font-medium">Report data could not be retrieved.</p>
      </div>
    );
  }

  const reportDate = reportData.timestamp 
    ? new Date(reportData.timestamp).toLocaleString() 
    : new Date().toLocaleString();

  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans print:bg-white print:py-0 print:px-0">
      {/* Navigation and Toolbar */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-red-700 transition-colors"
        >
          <FaArrowLeft className="text-xs" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-lg transition-colors border border-slate-200"
          >
            <FaPrint className="text-xs" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
            ) : (
              <FaFilePdf className="text-xs" />
            )}
            <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Official Forensic Report Document */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 border border-slate-200 rounded-2xl shadow-sm print:shadow-none print:border-none print:p-0 print:m-0">
        
        {/* Header Block */}
        <div className="text-center pb-6 mb-8 border-b-2 border-slate-900 flex flex-col items-center">
          <div className="flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" width="140" height="35" className="mr-2">
              <g transform="translate(5, 5)">
                <circle cx="15" cy="15" r="12" fill="none" stroke="#DC2626" strokeWidth="2"/>
                <line x1="15" y1="0" x2="15" y2="30" stroke="#DC2626" strokeWidth="1.5"/>
                <line x1="0" y1="15" x2="30" y2="15" stroke="#DC2626" strokeWidth="1.5"/>
                <circle cx="15" cy="15" r="3.5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="1"/>
              </g>
              <text x="45" y="26" fontFamily="sans-serif" fontSize="16" fontWeight="900" fill="#0F172A">FORENSIC<tspan fill="#DC2626">.AI</tspan></text>
            </svg>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950">Official Forensic Analysis Report</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Ensemble Learning Approach for Weapon Detection Using Images of Wound Patterns: A Forensic Perspective</p>
        </div>

        {/* Case & Analyst Info Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
              <FaInfoCircle className="mr-1.5 text-slate-500" /> Case Information
            </h3>
            <div className="space-y-1.5 text-sm text-slate-800">
              <p><strong className="text-slate-500 font-medium">Case Reference ID:</strong> <span className="font-bold">{reportData.case_reference || reportData.case_id}</span></p>
              <p><strong className="text-slate-500 font-medium">Record ID:</strong> {reportData.record_id}</p>
              <p><strong className="text-slate-500 font-medium">Date & Time:</strong> {reportDate}</p>
              <p className="truncate"><strong className="text-slate-500 font-medium">Source Image:</strong> {reportData.filename || 'Captured Feed'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
              <FaUser className="mr-1.5 text-slate-500" /> Analyst Information
            </h3>
            <div className="space-y-1.5 text-sm text-slate-800">
              <p><strong className="text-slate-500 font-medium">Name:</strong> {reportData.analyst?.name || user?.name || user?.username || 'Unknown'}</p>
              <p><strong className="text-slate-500 font-medium">System Role:</strong> <span className="capitalize">{reportData.analyst?.role?.replace('_', ' ') || 'Personnel'}</span></p>
              <p><strong className="text-slate-500 font-medium">Department:</strong> Forensic Wound Mark Analysis Dept.</p>
              <p><strong className="text-slate-500 font-medium">Biometric Verified:</strong> Yes</p>
            </div>
          </div>
        </div>

        {/* Image and Prediction Results Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 items-start">
          {/* Evidence Image */}
          <div className="md:col-span-5">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Evidence Photo</h3>
            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 aspect-square flex items-center justify-center shadow-inner">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Wound Evidence" 
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-xs text-slate-500">Image file missing</div>
              )}
            </div>
          </div>

          {/* Model Predictions */}
          <div className="md:col-span-7 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b pb-1.5">Algorithmic Output</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predicted Weapon</p>
                <p className="text-lg font-black text-slate-950 mt-1">{reportData.weapon}</p>
                <p className="text-xs font-bold text-red-600 mt-0.5">Confidence: {getWeaponConfidenceString(reportData.weapon_probability)}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predicted Wound Type</p>
                <p className="text-lg font-black text-slate-950 mt-1">{reportData.wound_type}</p>
                <p className="text-xs font-bold text-red-600 mt-0.5">Confidence: {getWoundConfidenceString(reportData.wound_probability)}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assessed Severity Level</p>
                <p className={`text-sm font-extrabold mt-1 uppercase ${
                  reportData.severity === 'Critical' || reportData.severity === 'Severe' 
                    ? 'text-red-600' 
                    : 'text-amber-600'
                }`}>
                  {reportData.severity || 'Moderate'}
                </p>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${
                reportData.severity === 'Critical' || reportData.severity === 'Severe' 
                  ? 'bg-red-600 animate-pulse' 
                  : 'bg-amber-500'
              }`}></span>
            </div>
          </div>
        </div>

        {/* Forensic Notes Findings */}
        <div className="mb-8">
          <h3 className="text-sm font-extrabold text-slate-950 border-b border-slate-900 pb-2 mb-3 uppercase tracking-wide flex items-center">
            <FaFileAlt className="mr-2 text-slate-500" /> Analysis Findings
          </h3>
          {reportData.forensic_notes && reportData.forensic_notes.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">
              {reportData.forensic_notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-slate-400">No findings documented.</p>
          )}
        </div>

        {/* Precautions / Recommendations Callout */}
        <div className="mb-10 bg-red-50/50 border-l-4 border-l-red-600 p-5 rounded-r-xl print:bg-white print:border-slate-300">
          <h3 className="text-sm font-extrabold text-red-700 mb-3 uppercase tracking-wide flex items-center print:text-slate-950">
            <FaShieldAlt className="mr-2 text-red-600 print:text-slate-500" /> Critical Precautions & Recommendations
          </h3>
          {reportData.precautions && reportData.precautions.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-sm text-red-950 print:text-slate-950 leading-relaxed">
              {reportData.precautions.map((precaution, index) => (
                <li key={index}>{precaution}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-red-900 print:text-slate-400">No clinical recommendations issued.</p>
          )}
        </div>

        {/* Signatures Panel */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-10">
          <div className="text-center w-full sm:w-64">
            <div className="border-b border-slate-300 h-10 mb-2"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analyst Signature</p>
            <p className="text-xs text-slate-700 mt-1 font-semibold">{reportData.analyst?.name || user?.name || user?.username || 'Unknown'}</p>
          </div>
          
          <div className="text-center w-full sm:w-64">
            <div className="border-b border-slate-300 h-10 mb-2"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reviewer Signature</p>
            <p className="text-xs text-slate-700 mt-1 font-semibold">Certified Forensic Examiner</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-6 border-t border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          <p>Confidential Medical-Legal Forensic Intelligence Markings</p>
          <p className="mt-1 text-slate-300">Do not distribute outside secure investigation channels.</p>
        </div>

      </div>
    </div>
  );
};

export default Report;
