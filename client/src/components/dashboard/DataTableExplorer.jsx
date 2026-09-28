import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatColName } from '../../utils/smartDetector';
import { parseNumericValue, parseDateValue } from '../../utils/csvHelpers';

export function DataTableExplorer({ rows = [], columns = [], meta = {} }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Filter rows by search term across all text columns
  const searchedRows = useMemo(() => {
    if (!searchTerm.trim() || !rows || !rows.length) return rows || [];
    const term = searchTerm.toLowerCase();

    return rows.filter((row) =>
      Object.values(row).some(
        (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      )
    );
  }, [rows, searchTerm]);

  // Sort rows. Column-type aware: a currency-formatted numeric column
  // ("$1,234.56") or a non-ISO date column would otherwise fall through to
  // plain string comparison below (typeof !== 'number'), sorting "$1,234"
  // before "$99" and DD/MM/YYYY dates in the wrong order.
  const sortedRows = useMemo(() => {
    if (!sortCol || !searchedRows.length) return searchedRows;

    const isNumericCol = meta?.numericCols?.includes(sortCol);
    const isDateCol = sortCol === meta?.dateCol;

    return [...searchedRows].sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (valA === null || valA === undefined || valA === '') return 1;
      if (valB === null || valB === undefined || valB === '') return -1;

      if (isNumericCol) {
        const numA = parseNumericValue(valA);
        const numB = parseNumericValue(valB);
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      if (isDateCol) {
        const dateA = parseDateValue(valA, meta?.dateFormat)?.getTime() ?? 0;
        const dateB = parseDateValue(valB, meta?.dateFormat)?.getTime() ?? 0;
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();

      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchedRows, sortCol, sortDir, meta]);

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage]);

  const handleSort = (col) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else setSortCol(null); // Reset sort on 3rd click
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-7 bg-white border border-[var(--ink)]/12 rounded-[18px] card-shadow mb-8 transition-all">
      
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--ink)]/8">
        <div>
          <h3 className="font-serif font-normal text-2xl text-[var(--ink)]">
            Data Table Explorer
          </h3>
          <p className="font-mono text-xs text-[var(--muted-2)] uppercase tracking-wider mt-0.5">
            Showing {sortedRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows
          </p>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted-2)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search across all attributes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs font-sans bg-[var(--bg)] border border-[var(--ink)]/15 rounded-[10px] text-[var(--ink)] focus:outline-none focus:border-[#b5470b]"
          />
        </div>
      </div>

      {/* Paginated Table Container */}
      <div className="overflow-x-auto border border-[var(--ink)]/12 rounded-[12px] bg-white">
        <table className="w-full text-left border-collapse font-sans text-xs">
          
          {/* Header Row */}
          <thead>
            <tr className="bg-[var(--bg)] border-b border-[var(--ink)]/12 text-[var(--muted)] font-mono text-[11px] uppercase tracking-wider">
              {columns.map((col, idx) => {
                const isSorted = sortCol === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`p-3.5 font-semibold cursor-pointer select-none hover:text-[var(--ink)] transition-colors whitespace-nowrap ${
                      idx === 0 ? 'sticky left-0 bg-[var(--bg)] z-10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{formatColName(col)}</span>
                      {isSorted ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#b5470b]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#b5470b]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[var(--ink)]/6">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-[var(--bg)] transition-colors text-[var(--ink)]"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col}
                      className={`p-3.5 font-mono text-xs whitespace-nowrap ${
                        cIdx === 0 ? 'sticky left-0 bg-white font-semibold text-[#b5470b] z-10' : ''
                      }`}
                    >
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-[var(--muted-2)] font-mono text-xs">
                  No matching data records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-2 text-xs font-mono text-[var(--muted)]">
        <div>
          Page {currentPage} of {totalPages} ({paginatedRows.length} rows shown)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-[8px] border border-[var(--ink)]/15 hover:bg-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3.5 py-1 bg-[var(--bg)] border border-[var(--ink)]/15 rounded-[8px] font-semibold text-[var(--ink)]">
            {currentPage}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-[8px] border border-[var(--ink)]/15 hover:bg-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
