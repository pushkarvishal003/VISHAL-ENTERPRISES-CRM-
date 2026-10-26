import React from 'react';
import {
  FileText,
  Clock,
  Send,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShoppingBag,
  IndianRupee,
} from 'lucide-react';
import { formatINR } from '../../lib/api.ts';

export interface ProposalSummaryData {
  totalProposals: number;
  draft: number;
  sent: number;
  viewed: number;
  negotiation: number;
  accepted: number;
  rejected: number;
  expired: number;
  convertedToSale: number;
  totalQuotedAmount: number;
}

interface ProposalSummaryCardsProps {
  summary: ProposalSummaryData;
  activeFilter: string;
  onSelectFilter: (status: string) => void;
}

export const ProposalSummaryCards: React.FC<ProposalSummaryCardsProps> = ({
  summary,
  activeFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      id: 'all',
      title: 'Total Proposals',
      value: summary.totalProposals,
      subtext: 'All quotations created',
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/30',
    },
    {
      id: 'Draft',
      title: 'Draft',
      value: summary.draft,
      subtext: 'Pending review/send',
      icon: Clock,
      color: 'text-slate-300',
      bg: 'bg-slate-700/30',
      border: 'border-slate-600/30',
      activeBorder: 'border-slate-400 ring-2 ring-slate-400/30',
    },
    {
      id: 'Sent',
      title: 'Sent to Client',
      value: summary.sent,
      subtext: 'Awaiting client review',
      icon: Send,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      activeBorder: 'border-sky-500 ring-2 ring-sky-500/30',
    },
    {
      id: 'Viewed',
      title: 'Viewed by Client',
      value: summary.viewed,
      subtext: 'Opened & viewed',
      icon: Eye,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/30',
    },
    {
      id: 'Negotiation',
      title: 'In Negotiation',
      value: summary.negotiation,
      subtext: 'Scope/price discussion',
      icon: MessageSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/30',
    },
    {
      id: 'Accepted',
      title: 'Accepted',
      value: summary.accepted,
      subtext: 'Ready for conversion',
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/30',
    },
    {
      id: 'Rejected',
      title: 'Rejected',
      value: summary.rejected,
      subtext: 'Client declined quote',
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/30',
    },
    {
      id: 'Expired',
      title: 'Expired',
      value: summary.expired,
      subtext: 'Past validity date',
      icon: AlertTriangle,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      activeBorder: 'border-orange-500 ring-2 ring-orange-500/30',
    },
    {
      id: 'Converted to Sale',
      title: 'Converted to Sale',
      value: summary.convertedToSale,
      subtext: 'Won & linked to sale',
      icon: ShoppingBag,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      activeBorder: 'border-teal-500 ring-2 ring-teal-500/30',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Top Banner with Total Value Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {cards.slice(0, 5).map((card) => {
            const Icon = card.icon;
            const isSelected = activeFilter === card.id;
            return (
              <button
                key={card.id}
                id={`proposal-card-${card.id.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => onSelectFilter(card.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? `${card.bg} ${card.activeBorder} shadow-lg shadow-black/30 scale-[1.02]`
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">{card.title}</span>
                  <div className={`p-1.5 rounded-lg ${card.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-white">{card.value}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{card.subtext}</p>
              </button>
            );
          })}
        </div>

        {/* Total Pipeline Quoted Value Card */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">Total Quoted Pipeline</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <p className="text-2xl font-black text-white font-mono tracking-tight">
              ₹{formatINR(summary.totalQuotedAmount)}
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              Live calculated sum across active quotations
            </p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
            <span>{summary.totalProposals} Proposals</span>
            <span>{summary.convertedToSale} Converted</span>
          </div>
        </div>
      </div>

      {/* Secondary Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {cards.slice(5).map((card) => {
          const Icon = card.icon;
          const isSelected = activeFilter === card.id;
          return (
            <button
              key={card.id}
              id={`proposal-card-${card.id.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => onSelectFilter(card.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? `${card.bg} ${card.activeBorder} shadow-lg shadow-black/30 scale-[1.02]`
                  : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">{card.title}</span>
                <div className={`p-1.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-white">{card.value}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{card.subtext}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
