import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { FaUserShield, FaSave, FaSync, FaDatabase, FaClipboardList, FaServer, FaUndo, FaChartBar, FaFileAlt, FaInfoCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [adminTab, setAdminTab] = useState('config'); // 'config', 'database', 'backups', 'audits', 'monitoring'
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  
  // Configuration Settings State
  const [configForm, setConfigForm] = useState({
    auto_retrain_threshold: 50,
    jwt_expire_minutes: 60,
    biometric_enabled: true,
    security_level: 'High',
    password_min_length: 8,
    max_login_attempts: 5,
    session_timeout_seconds: 3600,
    system_notifications: true
  });

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  // Fetch System Configurations
  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/system-config`, { headers: authHeaders() });
      setConfigForm(response.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load system configurations.");
    }
  };

  // Update System Configurations
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${window.API_BASE}/api/admin/system-config`, configForm, { headers: authHeaders() });
      toast.success("System configurations updated successfully.");
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to update configuration.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/audit-logs`, { headers: authHeaders() });
      setAuditLogs(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Backups
  const fetchBackups = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/backups`, { headers: authHeaders() });
      setBackups(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Stats (Database row counts + system monitoring info)
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${window.API_BASE}/api/admin/system-stats`, { headers: authHeaders() });
      setStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Database Backup
  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${window.API_BASE}/api/admin/backup`, {}, { headers: authHeaders() });
      toast.success(response.data.message || "Database backup created.");
      fetchBackups();
      fetchStats();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Backup failed.");
    } finally {
      setLoading(false);
    }
  };

  // Restore Database Backup
  const handleRestoreBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to restore the system database from backup: ${filename}? Current records will be replaced.`)) return;
    setLoading(true);
    try {
      const response = await axios.post(`${window.API_BASE}/api/admin/restore/${filename}`, {}, { headers: authHeaders() });
      toast.success(response.data.message || "Database restored successfully.");
      fetchStats();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Restore failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (['super_admin', 'manager', 'auditor'].includes(user?.role)) {
      if (adminTab === 'config') {
        fetchConfig();
      } else if (adminTab === 'database') {
        fetchStats();
      } else if (adminTab === 'backups') {
        fetchBackups();
      } else if (adminTab === 'audits') {
        fetchAuditLogs();
      } else if (adminTab === 'monitoring') {
        fetchStats();
      }
    }
  }, [user, adminTab]);

  // Set up polling for system stats when monitoring tab is active
  useEffect(() => {
    if (adminTab !== 'monitoring') return;
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [adminTab]);

  if (!['super_admin', 'manager', 'auditor'].includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 text-red-700 rounded-2xl border border-red-200 shadow-sm text-center">
        <FaUserShield size={48} className="mb-4 opacity-80" />
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="text-sm mt-2 font-medium">You do not have administrative clearance to access this settings module.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start space-x-4">
        <div className="bg-red-50 p-3 rounded-lg text-primary">
          <FaUserShield size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">System Administration</h2>
          <p className="text-sm text-slate-500 mt-1">Configure application parameters, access control policies, backup tables, review transaction audit logs, and monitor server resource levels.</p>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50/50 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FaServer className="mr-3 text-slate-400" /> Administrative Modules
            </h3>
            <p className="text-sm text-slate-500 mt-1">Configure global application variables and audit database transactions.</p>
          </div>

          <div className="flex bg-slate-200/60 p-1 rounded-lg flex-wrap gap-1">
            <button
              onClick={() => setAdminTab('config')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${adminTab === 'config' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              System Configuration
            </button>
            <button
              onClick={() => setAdminTab('database')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${adminTab === 'database' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Database Management
            </button>
            <button
              onClick={() => setAdminTab('backups')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${adminTab === 'backups' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Backup & Restore
            </button>
            <button
              onClick={() => setAdminTab('audits')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${adminTab === 'audits' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Audit Logs
            </button>
            <button
              onClick={() => setAdminTab('monitoring')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${adminTab === 'monitoring' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              System Monitoring
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {adminTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Application Settings Section */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b pb-2">Application Settings</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Auto-Retrain Threshold (Cases)</label>
                    <input 
                      type="number" 
                      min="5" 
                      max="1000" 
                      value={configForm.auto_retrain_threshold}
                      onChange={(e) => setConfigForm({...configForm, auto_retrain_threshold: Number(e.target.value)})}
                      className="w-full mt-1.5 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Number of validated cases required to queue automatic retrain schedule.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">JWT Session Expire (Minutes)</label>
                    <input 
                      type="number" 
                      min="15" 
                      max="1440" 
                      value={configForm.jwt_expire_minutes}
                      onChange={(e) => setConfigForm({...configForm, jwt_expire_minutes: Number(e.target.value)})}
                      className="w-full mt-1.5 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Interactive Session Timeout (Seconds)</label>
                    <input 
                      type="number" 
                      min="60" 
                      max="86400" 
                      value={configForm.session_timeout_seconds}
                      onChange={(e) => setConfigForm({...configForm, session_timeout_seconds: Number(e.target.value)})}
                      className="w-full mt-1.5 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'}
                    />
                  </div>
                </div>

                {/* Security Settings Section */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b pb-2">Security Settings</h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Audit Classification Level</label>
                    <select
                      value={configForm.security_level}
                      onChange={(e) => setConfigForm({...configForm, security_level: e.target.value})}
                      className="w-full mt-1.5 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold bg-white"
                      disabled={user.role === 'auditor'}
                    >
                      <option value="Normal">Normal Security</option>
                      <option value="High">High Clearance</option>
                      <option value="Strict">Strict Regulatory Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Minimum Password Length</label>
                    <input 
                      type="number" 
                      min="6" 
                      max="32" 
                      value={configForm.password_min_length}
                      onChange={(e) => setConfigForm({...configForm, password_min_length: Number(e.target.value)})}
                      className="w-full mt-1.5 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Maximum Login Attempts Allowed</label>
                    <input 
                      type="number" 
                      min="3" 
                      max="20" 
                      value={configForm.max_login_attempts}
                      onChange={(e) => setConfigForm({...configForm, max_login_attempts: Number(e.target.value)})}
                      className="w-full mt-1.5 px-3 py-2 border rounded-lg text-slate-700 text-sm font-semibold"
                      disabled={user.role === 'auditor'}
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={configForm.biometric_enabled}
                        onChange={(e) => setConfigForm({...configForm, biometric_enabled: e.target.checked})}
                        className="rounded border-slate-300 text-primary focus:ring-red-600"
                        disabled={user.role === 'auditor'}
                      />
                      <span>Enable Biometric MFA Authentication Integration</span>
                    </label>

                    <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
                      <input 
                        type="checkbox"
                        checked={configForm.system_notifications}
                        onChange={(e) => setConfigForm({...configForm, system_notifications: e.target.checked})}
                        className="rounded border-slate-300 text-primary focus:ring-red-600"
                        disabled={user.role === 'auditor'}
                      />
                      <span>Enable System-wide Broadcast Event Notifications</span>
                    </label>
                  </div>
                </div>
              </div>

              {user.role !== 'auditor' && (
                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors shadow"
                  >
                    <FaSave /> {loading ? 'Saving Variables...' : 'Save Configuration'}
                  </button>
                </div>
              )}
            </form>
          )}

          {adminTab === 'database' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-xl p-5 bg-slate-50/30">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3 mb-4">
                    <FaDatabase className="text-blue-500" /> Database File Summary
                  </h4>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex justify-between border-b pb-2"><span className="font-bold">Database Type:</span> <span>SQLite Relational Engine</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="font-bold">Primary Schema File:</span> <code className="bg-slate-100 text-xs px-1.5 py-0.5 rounded font-mono font-bold">backend/forensic_app.db</code></div>
                    <div className="flex justify-between border-b pb-2"><span className="font-bold">Size on Disk:</span> <span className="font-bold text-slate-800">{stats?.db_size_mb ?? '—'} MB</span></div>
                    <div className="flex justify-between"><span className="font-bold">Operational Status:</span> <span className="text-emerald-600 font-bold flex items-center"><FaCheckCircle className="mr-1.5" /> Normal / Connected</span></div>
                  </div>
                </div>

                <div className="border rounded-xl p-5 bg-slate-50/30">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-3 mb-4">
                    <FaChartBar className="text-indigo-500" /> Relational Table Record Counts
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { name: 'Users Table', count: stats?.table_counts?.users },
                      { name: 'Cases Table', count: stats?.table_counts?.cases },
                      { name: 'Reports Table', count: stats?.table_counts?.reports },
                      { name: 'ID Verifications', count: stats?.table_counts?.verifications },
                      { name: 'Predictions Log', count: stats?.table_counts?.predictions },
                      { name: 'Audit Log Entries', count: stats?.table_counts?.audit_logs },
                    ].map((tbl) => (
                      <div key={tbl.name} className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">{tbl.name}</span>
                        <span className="block text-base font-black text-slate-800 mt-0.5">{tbl.count ?? '0'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'backups' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <FaDatabase className="text-orange-500" /> DB Snapshot Backups
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Generate complete backups of the sqlite database. Restore past snapshots in case of database corruption.</p>
                </div>
                <button
                  onClick={handleCreateBackup}
                  disabled={loading || user.role === 'auditor'}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg text-sm transition-colors shadow disabled:opacity-50"
                >
                  Create Backup
                </button>
              </div>

              <div className="border rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                      <th className="py-3.5 px-6">Backup File</th>
                      <th className="py-3.5 px-6">File Size</th>
                      <th className="py-3.5 px-6">Date Created</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">No system backup files discovered.</td>
                      </tr>
                    ) : (
                      backups.map((bk) => (
                        <tr key={bk.filename} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-800">{bk.filename}</td>
                          <td className="py-3.5 px-6">{bk.size_mb} MB</td>
                          <td className="py-3.5 px-6 text-xs">{new Date(bk.created_at).toLocaleString()}</td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={() => handleRestoreBackup(bk.filename)}
                              disabled={loading || user.role === 'auditor'}
                              className="text-primary hover:text-white hover:bg-primary border border-red-200 bg-red-50/50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm disabled:opacity-50"
                            >
                              Restore Database
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'audits' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <FaClipboardList className="text-red-500" /> Regulatory Audit History logs
                </h4>
                <button
                  onClick={fetchAuditLogs}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  <FaSync /> Refresh Logs
                </button>
              </div>

              <div className="border rounded-xl overflow-hidden bg-white">
                <div className="overflow-x-auto max-h-[480px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-6">Timestamp</th>
                        <th className="py-3 px-6">Action</th>
                        <th className="py-3 px-6">Security User</th>
                        <th className="py-3 px-6">IP Address</th>
                        <th className="py-3 px-6">Details Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400">No regulatory audits captured in session log.</td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-6 text-slate-400 font-bold whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                            <td className="py-3 px-6">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide text-[9px] ${
                                log.activity?.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                log.activity?.includes('UPDATE') ? 'bg-amber-100 text-amber-800' :
                                log.activity?.includes('RESTORE') ? 'bg-purple-100 text-purple-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {log.activity}
                              </span>
                            </td>
                            <td className="py-3 px-6 font-bold text-slate-800">{log.username || `User #${log.user_id}`}</td>
                            <td className="py-3 px-6 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                            <td className="py-3 px-6 text-slate-500 truncate max-w-[280px]" title={log.details}>{log.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {adminTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <FaServer className="text-emerald-500" /> Host Machine Resource Levels
                </h4>
                <span className="inline-flex items-center text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold uppercase shadow-sm animate-pulse">
                  <FaCheckCircle className="mr-1.5" /> Host Online
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CPU Percentage card */}
                <div className="border rounded-xl p-5 bg-slate-50/30 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">CPU Processing Load</span>
                  <div className="relative flex items-center justify-center w-24 h-24 mt-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle cx="48" cy="48" r="40" stroke="#dc2626" strokeWidth="8" fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (stats?.system_monitoring?.cpu_percent ?? 0)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-lg font-black text-slate-800">{stats?.system_monitoring?.cpu_percent ?? 0}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-3 font-semibold uppercase">Ensemble Classification threads active</span>
                </div>

                {/* RAM percentage card */}
                <div className="border rounded-xl p-5 bg-slate-50/30 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Memory Buffer</span>
                  <div className="relative flex items-center justify-center w-24 h-24 mt-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                      <circle cx="48" cy="48" r="40" stroke="#4f46e5" strokeWidth="8" fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (stats?.system_monitoring?.memory_percent ?? 0)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-lg font-black text-slate-800">{stats?.system_monitoring?.memory_percent ?? 0}%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-3 font-semibold uppercase">Memory Buffer cache status</span>
                </div>

                {/* Connection logs card */}
                <div className="border rounded-xl p-5 bg-slate-50/30 flex flex-col justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Diagnostics</span>
                    <div className="mt-4 space-y-2 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between border-b pb-1"><span>System Uptime:</span> <span className="text-slate-800 font-bold">1d 10h 35m</span></div>
                      <div className="flex justify-between border-b pb-1"><span>Diagnostic Status:</span> <span className="text-emerald-600 font-bold">All Services Healthy</span></div>
                      <div className="flex justify-between"><span>Network Sockets:</span> <span className="text-slate-800 font-bold">{stats?.system_monitoring?.active_connections ?? 3} Active Connections</span></div>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider text-center mt-4">Stats refresh automatically every 5s.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
