/**
 * Vishal Enterprises CRM - Admin Attendance Review & Override
 * Displays all staff camera photos with department/date filters and audited corrections
 */

import React, { useState, useEffect } from 'react';
import { Camera, Filter, Eye, Edit, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { AttendanceRecord } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

export const AdminAttendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRange, setFilterRange] = useState<'today' | 'yesterday' | 'thisMonth' | 'all'>('today');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [searchStaff, setSearchStaff] = useState('');

  // Selected Photo Viewer
  const [selectedPhoto, setSelectedPhoto] = useState<AttendanceRecord | null>(null);

  // Correction Modal
  const [overrideModal, setOverrideModal] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<'Present' | 'Late' | 'Half Day'>('Present');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  useEffect(() => {
    loadAttendance();
  }, [filterRange, department, status]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      let query = `?filterRange=${filterRange}`;
      if (department) query += `&department=${department}`;
      if (status) query += `&status=${status}`;

      const data = await fetchApi<AttendanceRecord[]>(`/api/admin/attendance${query}`);
      setRecords(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModal) return;
    if (!overrideReason.trim()) {
      setOverrideError('Authorization reason is strictly required.');
      return;
    }

    try {
      await fetchApi(`/api/admin/attendance/${overrideModal.id}/override`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, reason: overrideReason }),
      });
      setOverrideModal(null);
      setOverrideReason('');
      setOverrideError(null);
      loadAttendance();
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to update attendance.');
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.staffName.toLowerCase().includes(searchStaff.toLowerCase()) ||
      r.staffId.toLowerCase().includes(searchStaff.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            Staff Attendance Administration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time camera verified daily attendance across all departments.
          </p>
        </div>

        {/* Quick Range Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
          {(['today', 'yesterday', 'thisMonth', 'all'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilterRange(r)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition ${
                filterRange === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'thisMonth' ? 'This Month' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Staff Name or ID..."
            value={searchStaff}
            onChange={(e) => setSearchStaff(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>

        <div>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
          >
            <option value="">All Departments</option>
            <option value="Sales">Sales</option>
            <option value="Verification">Verification</option>
            <option value="HR">HR</option>
            <option value="Accounts">Accounts</option>
            <option value="IT">IT</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>

        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
          >
            <option value="">All Attendance Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Half Day">Half Day</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Attendance Log ({filteredRecords.length} records)
          </h3>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading real records...</span>}
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No attendance records matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Photo</th>
                  <th className="py-2.5 px-3">Attendance ID</th>
                  <th className="py-2.5 px-3">Staff Member</th>
                  <th className="py-2.5 px-3">Department / Role</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3">
                      <img
                        src={item.capturedPhoto}
                        alt="Staff attendance selfie"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition"
                        onClick={() => setSelectedPhoto(item)}
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{item.attendanceId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{item.staffName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.staffId}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p>{item.department}</p>
                      <p className="text-[10px] text-slate-400">{item.designation}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p>{item.date}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.exactTime}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.status === 'Present'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : item.status === 'Late'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.overrideReason && (
                        <p className="text-[9px] text-purple-300 mt-0.5">Admin Adjusted</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(item)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded"
                          title="View High-Res Photo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideModal(item);
                            setNewStatus(item.status);
                            setOverrideReason('');
                            setOverrideError(null);
                          }}
                          className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-slate-700 rounded"
                          title="Authorize Correction"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <div>
                <p className="font-bold text-white text-sm">{selectedPhoto.staffName} ({selectedPhoto.staffId})</p>
                <p className="text-slate-400 text-[11px]">
                  {selectedPhoto.date} at {selectedPhoto.exactTime} • {selectedPhoto.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
              <img
                src={selectedPhoto.capturedPhoto}
                alt="Verification Photo"
                className="w-full max-h-[65vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Admin Correction Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Attendance Correction / Override</h3>
            <p className="text-xs text-slate-400 mb-4">
              Staff: {overrideModal.staffName} ({overrideModal.attendanceId}) on {overrideModal.date}
            </p>

            {overrideError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{overrideError}</span>
              </div>
            )}

            <form onSubmit={handleOverrideSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Corrected Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Authorization Reason * (Will be logged in Audit Trail)
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State the official reason for adjusting this attendance record..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setOverrideModal(null)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Confirm & Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
