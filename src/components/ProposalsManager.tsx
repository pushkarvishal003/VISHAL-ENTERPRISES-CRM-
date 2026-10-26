/**
 * Vishal Enterprises CRM - Proposals & Quotations Module
 * Real database-backed quotation management, pricing engine, automated lifecycle,
 * conversion to official sales, touchpoints, and printable PDF documents.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Printer,
  Send,
  ShoppingBag,
  Repeat,
  RotateCcw,
  Calendar,
  Building,
  UserCheck,
  AlertTriangle,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';
import { Proposal, ProposalStatus, User, WebsiteService } from '../types/crm.ts';
import { fetchApi, formatINR, formatDate } from '../lib/api.ts';
import { ProposalSummaryCards, ProposalSummaryData } from './proposals/ProposalSummaryCards.tsx';
import { ProposalFormModal } from './proposals/ProposalFormModal.tsx';
import { ProposalDetailModal } from './proposals/ProposalDetailModal.tsx';
import { ProposalPrintView } from './proposals/ProposalPrintView.tsx';
import { ConvertToSaleModal } from './proposals/ConvertToSaleModal.tsx';

interface ProposalsManagerProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const ProposalsManager: React.FC<ProposalsManagerProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN';
  const canCreate = user.permissions?.proposals?.create ?? true;
  const canEdit = user.permissions?.proposals?.edit ?? true;
  const canDelete = user.permissions?.proposals?.delete ?? (isAdmin ? true : false);

  // Core data states
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState<ProposalSummaryData>({
    totalProposals: 0,
    draft: 0,
    sent: 0,
    viewed: 0,
    negotiation: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    convertedToSale: 0,
    totalQuotedAmount: 0,
  });

  const [servicesList, setServicesList] = useState<WebsiteService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7days' | '30days' | 'this_month'>('all');

  // Modal active states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [viewingProposal, setViewingProposal] = useState<Proposal | null>(null);
  const [printingProposal, setPrintingProposal] = useState<Proposal | null>(null);
  const [convertingProposal, setConvertingProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch proposals and summary
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [proposalsData, summaryData, servicesData] = await Promise.all([
        fetchApi<Proposal[]>('/api/proposals'),
        fetchApi<ProposalSummaryData>('/api/proposals/summary'),
        fetchApi<WebsiteService[]>('/api/services').catch(() => []),
      ]);

      setProposals(proposalsData || []);
      if (summaryData) {
        setSummary(summaryData);
      }
      setServicesList(servicesData || []);
    } catch (err: any) {
      console.error('Failed to load proposals:', err);
      setError(err.message || 'Error loading proposals from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Duplication
  const handleDuplicate = async (targetProp: Proposal) => {
    try {
      const duplicated = await fetchApi<Proposal>(
        `/api/proposals/${targetProp.id || targetProp.proposalId}/duplicate`,
        { method: 'POST' }
      );
      // Reload list to get updated numbering and summary
      await loadData();
      // Open in detail or edit modal
      setViewingProposal(duplicated);
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate proposal.');
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingProposal) return;
    setDeleteLoading(true);
    try {
      await fetchApi(`/api/proposals/${deletingProposal.id || deletingProposal.proposalId}`, {
        method: 'DELETE',
      });
      setDeletingProposal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete proposal.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter logic
  const filteredProposals = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    return proposals.filter((p) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          p.proposalId.toLowerCase().includes(query) ||
          p.businessName.toLowerCase().includes(query) ||
          p.contactPerson.toLowerCase().includes(query) ||
          p.mobile.includes(query) ||
          (p.email && p.email.toLowerCase().includes(query)) ||
          p.serviceName.toLowerCase().includes(query) ||
          (p.city && p.city.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // 3. Service Filter
      if (serviceFilter !== 'all' && p.serviceId !== serviceFilter) {
        return false;
      }

      // 4. Date Range Filter
      if (dateRangeFilter !== 'all') {
        const pDate = new Date(p.createdAt);
        if (dateRangeFilter === '7days' && pDate < sevenDaysAgo) return false;
        if (dateRangeFilter === '30days' && pDate < thirtyDaysAgo) return false;
        if (dateRangeFilter === 'this_month' && !p.createdAt.startsWith(currentMonth)) return false;
      }

      return true;
    });
  }, [proposals, searchTerm, statusFilter, serviceFilter, dateRangeFilter]);

  // Status Badge Helper
  const renderStatusBadge = (status: ProposalStatus) => {
    const config: Record<ProposalStatus, { bg: string; text: string; border: string }> = {
      Draft: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600' },
      Sent: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
      Viewed: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
      Negotiation: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
      Accepted: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
      Rejected: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' },
      Expired: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30' },
      'Converted to Sale': { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/30' },
    };
    const c = config[status] || config.Draft;
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border} whitespace-nowrap`}>
        {status}
      </span>
    );
  };

  const hasActiveFilters =
    statusFilter !== 'all' || serviceFilter !== 'all' || dateRangeFilter !== 'all' || searchTerm.trim() !== '';

  const resetFilters = () => {
    setStatusFilter('all');
    setServiceFilter('all');
    setDateRangeFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Website Proposals & Quotations
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive client quotations, line-item budgeting, audit trails, and automated sale conversion.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh Proposals"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <button
              id="create-proposal-btn"
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Proposal</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Summary Metrics Cards */}
      <ProposalSummaryCards
        summary={summary}
        activeFilter={statusFilter}
        onSelectFilter={(filterId) => setStatusFilter(filterId)}
      />

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Query Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              id="search-proposals-input"
              type="text"
              placeholder="Search by ID, business name, contact person, phone, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Dropdown Filter */}
          <div>
            <select
              id="filter-proposal-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses ({proposals.length})</option>
              <option value="Draft">Draft ({summary.draft})</option>
              <option value="Sent">Sent to Client ({summary.sent})</option>
              <option value="Viewed">Viewed ({summary.viewed})</option>
              <option value="Negotiation">In Negotiation ({summary.negotiation})</option>
              <option value="Accepted">Accepted ({summary.accepted})</option>
              <option value="Rejected">Rejected ({summary.rejected})</option>
              <option value="Expired">Expired ({summary.expired})</option>
              <option value="Converted to Sale">Converted to Sale ({summary.convertedToSale})</option>
            </select>
          </div>

          {/* Service Dropdown Filter */}
          <div>
            <select
              id="filter-proposal-service"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Website Solutions</option>
              {servicesList.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown Filter */}
          <div className="flex gap-2">
            <select
              id="filter-proposal-daterange"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition flex-shrink-0"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Proposals List / Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredProposals.length}</strong> of{' '}
            <strong className="text-white">{proposals.length}</strong> quotations
          </span>
          {hasActiveFilters && (
            <span className="text-amber-400 font-medium">Filtered results active</span>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading quotations from database...</p>
          </div>
        ) : proposals.length === 0 ? (
          /* Empty Database State - strictly adheres to instructions */
          <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-950/40 rounded-xl border border-slate-800/80">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No proposals found.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by creating your first official website proposal for a prospective client or CRM lead.
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Quotation
              </button>
            )}
          </div>
        ) : filteredProposals.length === 0 ? (
          /* Empty Filter State */
          <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-950/30 rounded-xl border border-slate-800/60">
            <p className="text-sm font-medium text-slate-300">No proposals match the selected filters.</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or resetting filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Responsive Proposals Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <tr>
                  <th className="py-3 px-3.5">Quote ID & Date</th>
                  <th className="py-3 px-3.5">Client & Contact</th>
                  <th className="py-3 px-3.5">Website Scope</th>
                  <th className="py-3 px-3.5 text-right">Investment (₹)</th>
                  <th className="py-3 px-3.5 text-center">Valid Until</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5">Executive</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredProposals.map((proposal) => {
                  const isExpired =
                    proposal.validUntil &&
                    proposal.validUntil < new Date().toISOString().split('T')[0] &&
                    proposal.status !== 'Converted to Sale';
                  const isConverted =
                    proposal.status === 'Converted to Sale' || Boolean(proposal.saleId);

                  return (
                    <tr
                      key={proposal.id || proposal.proposalId}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* Quote ID & Date */}
                      <td className="py-3 px-3.5">
                        <button
                          type="button"
                          onClick={() => setViewingProposal(proposal)}
                          className="font-mono font-bold text-blue-400 hover:text-blue-300 text-left block"
                        >
                          {proposal.proposalId}
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {proposal.createdAt.split('T')[0]}
                        </span>
                      </td>

                      {/* Client Profile */}
                      <td className="py-3 px-3.5">
                        <p className="font-bold text-white leading-tight">{proposal.businessName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {proposal.contactPerson} • {proposal.mobile}
                        </p>
                        {proposal.city && (
                          <span className="text-[10px] text-slate-500">{proposal.city}</span>
                        )}
                      </td>

                      {/* Service & Tier */}
                      <td className="py-3 px-3.5">
                        <p className="font-semibold text-slate-200">{proposal.serviceName}</p>
                        {proposal.packageName && (
                          <span className="text-[10px] text-blue-400 font-mono">
                            {proposal.packageName}
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500">
                          {proposal.deliveryTimeline || '5-7 Days'}
                        </p>
                      </td>

                      {/* Financials / Amount */}
                      <td className="py-3 px-3.5 text-right font-mono">
                        <span className="font-bold text-emerald-400 text-sm">
                          ₹{formatINR(proposal.finalAmount)}
                        </span>
                        {proposal.discount > 0 && (
                          <span className="block text-[10px] text-emerald-500/80">
                            -₹{formatINR(proposal.discount)} off
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400">
                          Adv: ₹{formatINR(proposal.advancePaymentAmount || Math.round(proposal.finalAmount * 0.5))}
                        </span>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className={isExpired ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                          {proposal.validUntil || '15 Days'}
                        </span>
                        {isExpired && (
                          <span className="block text-[9px] text-rose-500 uppercase tracking-tight">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center">
                        {renderStatusBadge(proposal.status)}
                      </td>

                      {/* Executive / Partner */}
                      <td className="py-3 px-3.5 text-[11px]">
                        <p className="text-slate-300 font-medium truncate max-w-[130px]">
                          {proposal.assignedDsaName || proposal.assignedStaffName || proposal.createdByName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {proposal.assignedDsaName ? 'DSA Partner' : proposal.createdByRole}
                        </p>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            id={`view-proposal-${proposal.proposalId}`}
                            type="button"
                            onClick={() => setViewingProposal(proposal)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                            title="View Proposal Details & Touchpoints"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print / Save PDF */}
                          <button
                            id={`print-proposal-${proposal.proposalId}`}
                            type="button"
                            onClick={() => setPrintingProposal(proposal)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg transition"
                            title="Official PDF / Print Quotation"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Convert to Sale (Highlight) */}
                          {!isConverted && (
                            <button
                              id={`convert-proposal-${proposal.proposalId}`}
                              type="button"
                              onClick={() => setConvertingProposal(proposal)}
                              className="px-2 py-1 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                              title="Convert Quotation to Official Sale"
                            >
                              <ShoppingBag className="w-3 h-3" /> Convert
                            </button>
                          )}

                          {/* Edit (if not converted) */}
                          {!isConverted && canEdit && (
                            <button
                              id={`edit-proposal-${proposal.proposalId}`}
                              type="button"
                              onClick={() => setEditingProposal(proposal)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                              title="Edit Proposal"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            id={`duplicate-proposal-${proposal.proposalId}`}
                            type="button"
                            onClick={() => handleDuplicate(proposal)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                            title="Duplicate Proposal"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Admin or delete permission) */}
                          {canDelete && (
                            <button
                              id={`delete-proposal-${proposal.proposalId}`}
                              type="button"
                              onClick={() => setDeletingProposal(proposal)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-lg transition"
                              title="Delete Proposal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create / Edit Proposal Form */}
      {(isCreateOpen || editingProposal) && (
        <ProposalFormModal
          user={user}
          initialProposal={editingProposal}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingProposal(null);
          }}
          onSuccess={(saved) => {
            setIsCreateOpen(false);
            setEditingProposal(null);
            loadData();
            setViewingProposal(saved);
          }}
        />
      )}

      {/* MODAL 2: Comprehensive Proposal Detail View */}
      {viewingProposal && (
        <ProposalDetailModal
          proposal={viewingProposal}
          user={user}
          onClose={() => setViewingProposal(null)}
          onUpdate={(updated) => {
            setViewingProposal(updated);
            loadData();
          }}
          onEdit={(prop) => {
            setViewingProposal(null);
            setEditingProposal(prop);
          }}
          onPrint={(prop) => {
            setPrintingProposal(prop);
          }}
          onConvertToSale={(prop) => {
            setViewingProposal(null);
            setConvertingProposal(prop);
          }}
          onDuplicate={(prop) => {
            handleDuplicate(prop);
          }}
        />
      )}

      {/* MODAL 3: Official Printable PDF Sheet */}
      {printingProposal && (
        <ProposalPrintView
          proposal={printingProposal}
          onClose={() => setPrintingProposal(null)}
        />
      )}

      {/* MODAL 4: Convert to Official Sale */}
      {convertingProposal && (
        <ConvertToSaleModal
          proposal={convertingProposal}
          onClose={() => setConvertingProposal(null)}
          onSuccess={(updatedProposal) => {
            loadData();
            setViewingProposal(updatedProposal);
          }}
          onNavigateToSales={() => {
            if (onNavigate) {
              onNavigate('sales');
            }
          }}
        />
      )}

      {/* MODAL 5: Delete Confirmation Dialog */}
      {deletingProposal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Delete Quotation?</h3>
                <p className="text-xs text-slate-400 font-mono">{deletingProposal.proposalId}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete the quotation for{' '}
              <strong className="text-white">{deletingProposal.businessName}</strong>? This action will permanently remove the proposal and its recorded activity trail from the database.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProposal(null)}
                disabled={deleteLoading}
                className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-proposal-btn"
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="w-1/2 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
