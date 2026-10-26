/**
 * Vishal Enterprises CRM - Master Audit Trails Viewer
 * Immutable system logs tracking user actions, IP addresses, logins, and administrative changes
 */

import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldAlert } from 'lucide-react';
import { AuditLog } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

export const AuditLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [roleFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let q = '';
      if (roleFilter) q = `?role=${roleFilter}`;
      const data = await fetchApi<AuditLog[]>(`/api/admin/audit-logs${q}`);
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(
    (l) =>
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.userId.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Security & Operational Audit Logs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident logs of user activities, logins, commission releases, and administrative updates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search logs by User, Action, Details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
          >
            <option value="">All User Roles</option>
            <option value="ADMIN">Super Admin</option>
            <option value="STAFF">Staff Employees</option>
            <option value="DSA">DSA Partners</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Audit Records ({filtered.length})</h3>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No audit logs matching query.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User & ID</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Event Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{l.userName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{l.userId}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          l.userRole === 'ADMIN'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : l.userRole === 'DSA'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {l.userRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{l.action}</td>
                    <td className="py-2.5 px-3 text-slate-300 leading-snug">{l.details}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{l.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
