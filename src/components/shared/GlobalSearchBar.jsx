import React, { useState, useRef, useEffect } from 'react';
import { Search, User, AlertCircle, ClipboardList, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  resident: User,
  incident: AlertCircle,
  task: ClipboardList,
  document: FileText,
};

const TYPE_COLORS = {
  resident: 'text-blue-600 bg-blue-50',
  incident: 'text-red-600 bg-red-50',
  task: 'text-amber-600 bg-amber-50',
  document: 'text-slate-600 bg-slate-100',
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runSearch = async (q) => {
    if (q.trim().length < 2) { setResults(null); setOpen(false); return; }
    setLoading(true);
    setOpen(true);
    try {
      const res = await base44.functions.invoke('globalSearch', { query: q });
      setResults(res.data);
    } catch (e) {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 350);
  };

  const handleSelect = (url) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(url);
  };

  const allResults = results
    ? Object.values(results.results || {}).flat()
    : [];

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results) setOpen(true); }}
          placeholder="Search participants, tasks, incidents..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {allResults.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          )}
          {allResults.map((item) => {
            const Icon = TYPE_ICONS[item.type] || Search;
            const colorClass = TYPE_COLORS[item.type] || 'text-slate-600 bg-slate-100';
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item.url)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted-foreground capitalize flex-shrink-0">{item.type}</span>
              </button>
            );
          })}
          {results?.total_results > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {results.total_results} result{results.total_results !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
      )}
    </div>
  );
}