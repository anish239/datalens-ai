import React, { useState, useMemo } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  Eye,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  FileText,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import { exportDataAsCsv, exportDataAsJson } from '../common/ChartExporter';

interface DataTableViewProps {
  profile: DatasetProfile;
}

export const DataTableView: React.FC<DataTableViewProps> = ({ profile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(profile.columns.map((c) => c.name))
  );
  const [showColPicker, setShowColPicker] = useState(false);

  const rawRows = profile.previewRows || [];

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rawRows;
    const q = searchQuery.toLowerCase();
    return rawRows.filter((r) =>
      Object.values(r).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [rawRows, searchQuery]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const vA = a[sortColumn];
      const vB = b[sortColumn];
      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortAsc ? vA - vB : vB - vA;
      }
      return sortAsc
        ? String(vA ?? '').localeCompare(String(vB ?? ''))
        : String(vB ?? '').localeCompare(String(vA ?? ''));
    });
    return sorted;
  }, [filteredRows, sortColumn, sortAsc]);

  // Paginated rows
  const totalRows = sortedRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const handleSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortColumn(null);
        setSortAsc(true);
      }
    } else {
      setSortColumn(colName);
      setSortAsc(true);
    }
  };

  const toggleColumnVisibility = (colName: string) => {
    const next = new Set(visibleColumns);
    if (next.has(colName)) {
      if (next.size > 1) next.delete(colName);
    } else {
      next.add(colName);
    }
    setVisibleColumns(next);
  };

  const getColIcon = (type: string) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'categorical':
        return <Type className="w-3.5 h-3.5 text-emerald-500" />;
      case 'datetime':
        return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search records across all fields..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column Visibility Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColPicker(!showColPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Columns ({visibleColumns.size}/{profile.columns.length})</span>
            </button>

            {showColPicker && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl p-3 shadow-xl z-30 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-semibold">
                  <span>Toggle Columns</span>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns(new Set(profile.columns.map((c) => c.name)))}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {profile.columns.map((c) => (
                    <label
                      key={c.name}
                      className="flex items-center gap-2 p-1 rounded-md hover:bg-muted/60 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(c.name)}
                        onChange={() => toggleColumnVisibility(c.name)}
                        className="rounded-xs text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export CSV / JSON */}
          <button
            type="button"
            onClick={() => exportDataAsCsv(profile.fileName.replace(/\.[^/.]+$/, ''), sortedRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
            title="Download CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportDataAsJson(profile.fileName.replace(/\.[^/.]+$/, ''), sortedRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
            title="Download JSON"
          >
            <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/80 backdrop-blur-xs sticky top-0 z-10 border-b border-border">
              <tr>
                <th className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground w-12 text-center border-r border-border/40">
                  #
                </th>
                {profile.columns
                  .filter((c) => visibleColumns.has(c.name))
                  .map((col) => (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className="py-2.5 px-3 font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors select-none whitespace-nowrap border-r border-border/40 last:border-r-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {getColIcon(col.logicalType)}
                          <span className="font-mono">{col.name}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {sortColumn === col.name ? (
                            sortAsc ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-background font-mono text-[11px]">
              {pagedRows.length > 0 ? (
                pagedRows.map((row, rIdx) => {
                  const globalIdx = (page - 1) * pageSize + rIdx + 1;
                  return (
                    <tr key={rIdx} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2 px-3 text-center text-muted-foreground bg-muted/20 border-r border-border/40 select-none">
                        {globalIdx}
                      </td>
                      {profile.columns
                        .filter((c) => visibleColumns.has(c.name))
                        .map((col) => {
                          const val = row[col.name];
                          const isNull = val === null || val === undefined || val === '';
                          return (
                            <td
                              key={col.name}
                              className={`py-2 px-3 whitespace-nowrap border-r border-border/30 last:border-r-0 ${
                                isNull ? 'text-muted-foreground/40 italic' : 'text-foreground'
                              }`}
                            >
                              {isNull ? 'null' : String(val)}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={visibleColumns.size + 1}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/30 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              Showing {Math.min(1, totalRows) + (page - 1) * pageSize} to{' '}
              {Math.min(page * pageSize, totalRows)} of {totalRows.toLocaleString()} rows
            </span>
            {searchQuery && (
              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Filtered from {profile.rowCount.toLocaleString()} total
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-background border border-input rounded-md px-2 py-1 text-foreground focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded-md border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
