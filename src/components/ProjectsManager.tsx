/**
 * Vishal Enterprises CRM - Website Projects Development Pipeline
 * Milestone execution: Requirements -> UI/UX -> Development -> QA -> Delivery
 */

import React, { useState, useEffect } from 'react';
import { FolderGit2, Plus, Search, Globe, CheckCircle2, Clock, Edit } from 'lucide-react';
import { WebsiteProject, User } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface ProjectsManagerProps {
  user: User;
}

export const ProjectsManager: React.FC<ProjectsManagerProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [projects, setProjects] = useState<WebsiteProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<WebsiteProject | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    customerName: '',
    domain: '',
    packageType: 'Corporate Website',
    stage: 'UI/UX Design' as any,
    progress: 30,
    assignedDeveloper: 'In-house IT Team',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<WebsiteProject[]>('/api/projects');
      setProjects(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await fetchApi(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/api/projects', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingProject(null);
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Error saving project.');
    }
  };

  const filtered = projects.filter(
    (p) =>
      p.projectId.toLowerCase().includes(search.toLowerCase()) ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (p.domain && p.domain.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-blue-400" />
            Website Development Pipelines
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track design sprints, staging builds, testing QA, and production DNS deployments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setFormData({
              title: '',
              customerName: '',
              domain: '',
              packageType: 'Corporate Website',
              stage: 'UI/UX Design',
              progress: 30,
              assignedDeveloper: 'In-house IT Team',
              deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Create Project Tracker
        </button>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by ID, Project Title, Client, Domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 text-xs space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] text-blue-400 font-semibold">{p.projectId}</span>
                <h4 className="text-sm font-bold text-white mt-0.5">{p.title}</h4>
                <p className="text-slate-400">Client: {p.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProject(p);
                  setFormData({
                    title: p.title,
                    customerName: p.customerName,
                    domain: p.domain || '',
                    packageType: p.packageType,
                    stage: p.stage,
                    progress: p.progress,
                    assignedDeveloper: p.assignedDeveloper,
                    deadline: p.deadline,
                  });
                  setShowModal(true);
                }}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {p.domain && (
              <div className="flex items-center gap-1.5 text-blue-300 font-mono text-[11px]">
                <Globe className="w-3.5 h-3.5" />
                <span>{p.domain}</span>
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-400">Milestone: <strong className="text-white">{p.stage}</strong></span>
                <span className="font-bold text-emerald-400 font-mono">{p.progress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-[11px] text-slate-400">
              <span>Developer: <strong className="text-slate-300">{p.assignedDeveloper}</strong></span>
              <span>Due: <strong className="text-amber-400 font-mono">{p.deadline}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">
              {editingProject ? `Update Project (${editingProject.projectId})` : 'New Website Project'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex E-Commerce Redesign"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Target Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. apex.in"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Milestone Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Requirements">Requirements</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Development">Development</option>
                    <option value="Testing & QA">Testing & QA</option>
                    <option value="Delivered">Delivered & Live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Completion % ({formData.progress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Assigned Developer</label>
                  <input
                    type="text"
                    value={formData.assignedDeveloper}
                    onChange={(e) => setFormData({ ...formData, assignedDeveloper: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
