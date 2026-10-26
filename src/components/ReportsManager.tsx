/**
 * Vishal Enterprises CRM - Business Analytics & Executive Reports
 * Revenue breakdown, pipeline conversion metrics, DSA partner commissions, and CSV data export
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, DollarSign, Award, ArrowUpRight } from 'lucide-react';
import { User, Sale } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface ReportsManagerProps {
  user: User;
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({ user }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Sale[]>('/api/sales');
      setSales(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalSalesVolume = sales.reduce((acc, s) => acc + s.finalAmount, 0);
  const totalAdvanceCollected = sales.reduce((acc, s) => acc + s.advancePaid, 0);
  const totalBalancePending = sales.reduce((acc, s) => acc + s.balanceAmount, 0);
  const totalDsaCommission = sales.reduce((acc, s) => acc + (s.commissionAmount || 0), 0);

  // Group by service
  const serviceStats: Record<string, { count: number; revenue: number }> = {};
  sales.forEach((s) => {
    if (!serviceStats[s.serviceName]) {
      serviceStats[s.serviceName] = { count: 0, revenue: 0 };
    }
    serviceStats[s.serviceName].count += 1;
    serviceStats[s.serviceName].revenue += s.finalAmount;
  });

  const exportCSV = () => {
    const headers = ['Sale ID', 'Customer', 'Service', 'Total Amount', 'Advance Paid', 'Balance', 'Delivery Status', 'Agent', 'Commission'];
    const rows = sales.map((s) => [
      s.saleId,
      `"${s.customerName}"`,
      `"${s.serviceName}"`,
      s.finalAmount,
      s.advancePaid,
      s.balanceAmount,
      s.deliveryStatus,
      `"${s.closingAgentName}"`,
      s.commissionAmount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vishal_enterprises_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Executive Reports & Financial Performance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Website revenue realization, milestone recovery rates, and partner commission breakdown.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          Export Sales CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-medium">Total Website Deal Value</p>
          <p className="text-2xl font-bold text-white mt-1">₹{formatINR(totalSalesVolume)}</p>
          <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Across {sales.length} verified projects
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-medium">Realized Advance Deposits</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            ₹{formatINR(totalAdvanceCollected)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {totalSalesVolume > 0
              ? `${Math.round((totalAdvanceCollected / totalSalesVolume) * 100)}% collected`
              : '0%'}
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-medium">Pending Milestone Balances</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            ₹{formatINR(totalBalancePending)}
          </p>
          <p className="text-[10px] text-amber-300/80 mt-1">Subject to project delivery</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <p className="text-slate-400 text-xs font-medium">Total 10% Partner Commissions</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            ₹{formatINR(totalDsaCommission)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Automated 10% policy</p>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 text-xs space-y-4">
          <h3 className="text-sm font-semibold text-white">Revenue by Service Category</h3>

          <div className="space-y-3">
            {Object.entries(serviceStats).map(([service, data]) => {
              const pct = totalSalesVolume > 0 ? Math.round((data.revenue / totalSalesVolume) * 100) : 0;
              return (
                <div key={service} className="space-y-1">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>{service} ({data.count} deals)</span>
                    <span className="font-bold text-white">₹{formatINR(data.revenue)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 text-xs space-y-4">
          <h3 className="text-sm font-semibold text-white">Milestone Delivery Health</h3>

          <div className="space-y-3">
            {[
              {
                label: 'Delivered & Completed (Commission Released)',
                count: sales.filter((s) => s.deliveryStatus === 'Delivered').length,
                color: 'bg-emerald-500',
              },
              {
                label: 'In Progress (Active Development / Staging)',
                count: sales.filter((s) => s.deliveryStatus === 'In Progress').length,
                color: 'bg-blue-500',
              },
              {
                label: 'Pending Initial Client Requirements',
                count: sales.filter((s) => s.deliveryStatus === 'Pending').length,
                color: 'bg-amber-500',
              },
            ].map((st, i) => (
              <div key={i} className="p-3 bg-slate-900 rounded-xl border border-slate-700/70 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                  <span className="text-slate-300">{st.label}</span>
                </div>
                <span className="font-bold text-white font-mono">{st.count} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
