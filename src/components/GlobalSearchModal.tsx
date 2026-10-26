import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, UserCheck, Briefcase, FileText, Globe, CreditCard, ArrowRight, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api.ts';

interface SearchResultItem {
  id: string;
  type: 'Lead' | 'Customer' | 'Sale' | 'Proposal' | 'Project' | 'Payment' | 'Staff' | 'DSA' | 'Renewal';
  title: string;
  subtitle: string;
  badge?: string;
  link: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string, recordId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchApi<{ results: SearchResultItem[] }>(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item: SearchResultItem) => {
    const moduleName = item.link.replace(/^\//, '');
    onNavigate(moduleName, item.id);
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Lead':
        return <Users className="w-4 h-4 text-amber-400" />;
      case 'Customer':
        return <UserCheck className="w-4 h-4 text-blue-400" />;
      case 'Sale':
        return <Briefcase className="w-4 h-4 text-emerald-400" />;
      case 'Proposal':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'Project':
        return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'Payment':
        return <CreditCard className="w-4 h-4 text-green-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Leads, Customers, Sales, Quotations, Projects, Invoices... (e.g. LD-2026-001, Salon, 9876543210)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin mr-2 shrink-0" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto divide-y divide-slate-800/60 p-2 flex-1">
          {query.trim() === '' ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
              <p className="font-medium text-slate-400">Global CRM Universal Search</p>
              <p className="mt-1 text-[11px]">
                Type an ID, business name, phone number, email, or domain name to search across the real database.
              </p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <p className="font-semibold text-slate-400">No matching records found in database</p>
              <p className="mt-1 text-[11px]">Try searching with a partial business name, mobile number, or Lead ID.</p>
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${
                  selectedIndex === idx ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 uppercase font-mono">
                        {item.type}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 text-[9px] bg-slate-800 rounded">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 text-[9px] bg-slate-800 rounded">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-800 rounded">↵</kbd> to select
            </span>
          </div>
          <span>Real Database Query</span>
        </div>
      </div>
    </div>
  );
};
