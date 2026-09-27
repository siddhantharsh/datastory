import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown, RotateCcw, Calendar, Sliders, Check } from 'lucide-react';
import { formatColName } from '../../utils/smartDetector';

export function FilterBar({ meta, rows, filters, onFilterChange, onClearFilters, displayColumns = [] }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const { categoricalCols = [], numericCols = [], dateCol = null } = meta || {};

  // Filter columns by enabled attributes in sidebar if provided
  const activeCategoricalCols = displayColumns.length > 0
    ? categoricalCols.filter((c) => displayColumns.includes(c))
    : categoricalCols;

  const activeNumericCols = displayColumns.length > 0
    ? numericCols.filter((c) => displayColumns.includes(c))
    : numericCols;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute unique values & counts for categorical columns
  const getCategoryOptions = (col) => {
    const map = {};
    (rows || []).forEach((r) => {
      const val = r[col];
      if (val !== undefined && val !== null && val !== '') {
        const key = String(val).trim();
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map).map(([value, count]) => ({ value, count }));
  };

  // Toggle categorical value in filter
  const handleCategoryToggle = (col, value) => {
    const strVal = String(value).trim();
    const current = filters.categorical?.[col] || [];
    let updated;
    if (current.includes(strVal)) {
      updated = current.filter((v) => v !== strVal);
    } else {
      updated = [...current, strVal];
    }

    onFilterChange({
      ...filters,
      categorical: {
        ...filters.categorical,
        [col]: updated
      }
    });
  };

  // Handle numeric range min/max
  const handleNumericRangeChange = (col, type, value) => {
    const numVal = value === '' ? null : Number(value);
    const current = filters.numeric?.[col] || [null, null];
    const updated = type === 'min' ? [numVal, current[1]] : [current[0], numVal];

    onFilterChange({
      ...filters,
      numeric: {
        ...filters.numeric,
        [col]: updated
      }
    });
  };

  // Handle Date range
  const handleDateChange = (type, val) => {
    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [type]: val
      }
    });
  };

  // Remove individual active filter
  const handleRemoveChip = (type, col, extraVal) => {
    if (type === 'categorical') {
      const current = filters.categorical?.[col] || [];
      const updated = current.filter((v) => v !== extraVal);
      onFilterChange({
        ...filters,
        categorical: {
          ...filters.categorical,
          [col]: updated
        }
      });
    } else if (type === 'numeric') {
      const updated = { ...filters.numeric };
      delete updated[col];
      onFilterChange({ ...filters, numeric: updated });
    } else if (type === 'date') {
      onFilterChange({ ...filters, dateRange: { start: '', end: '' } });
    }
  };

  // Count active filters
  const activeChips = [];

  if (filters.categorical) {
    Object.entries(filters.categorical).forEach(([col, vals]) => {
      (vals || []).forEach((val) => {
        activeChips.push({ type: 'categorical', col, val, label: `${formatColName(col)}: ${val}` });
      });
    });
  }

  if (filters.numeric) {
    Object.entries(filters.numeric).forEach(([col, range]) => {
      const [min, max] = range || [];
      if (min !== null || max !== null) {
        const label = `${formatColName(col)}: ${min ?? 'min'} – ${max ?? 'max'}`;
        activeChips.push({ type: 'numeric', col, label });
      }
    });
  }

  if (filters.dateRange?.start || filters.dateRange?.end) {
    const label = `Date: ${filters.dateRange.start || 'Start'} to ${filters.dateRange.end || 'End'}`;
    activeChips.push({ type: 'date', col: dateCol, label });
  }

  return (
    <div className="sticky top-0 z-40 bg-[#faf9f7]/95 backdrop-blur-md border-y border-[#161513]/12 py-3.5 px-6 -mx-6 mb-8 transition-colors">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-3">
        
        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-3" ref={dropdownRef}>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#161513] mr-2 shrink-0">
            <Filter className="w-4 h-4 text-[#b5470b]" />
            <span>Filter Engine</span>
          </div>

          {/* Categorical Dropdowns */}
          {activeCategoricalCols.map((col) => {
            const options = getCategoryOptions(col);
            const selected = filters.categorical?.[col] || [];
            const isOpen = openDropdown === col;

            return (
              <div key={col} className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : col)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] border text-xs font-sans font-medium transition-all cursor-pointer shadow-xs ${
                    selected.length > 0
                      ? 'bg-[#b5470b] border-[#b5470b] text-white font-semibold'
                      : 'bg-white border-[#161513]/15 text-[#161513] hover:bg-[#faf9f7]'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{formatColName(col)}</span>
                  {selected.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-white text-[#b5470b] text-[10px] flex items-center justify-center font-mono font-bold shrink-0">
                      {selected.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="absolute left-0 mt-2 w-64 max-h-72 overflow-y-auto bg-white border border-[#161513]/15 rounded-[12px] shadow-xl z-50 p-2 text-xs space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#9b958c] px-2 py-1.5 border-b border-[#161513]/8 font-semibold flex justify-between">
                      <span className="truncate">Filter by {formatColName(col)}</span>
                      {selected.length > 0 && (
                        <button
                          onClick={() =>
                            onFilterChange({
                              ...filters,
                              categorical: { ...filters.categorical, [col]: [] }
                            })
                          }
                          className="text-[#b5470b] hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {options.map((opt) => {
                      const isChecked = selected.includes(opt.value);
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleCategoryToggle(col, opt.value)}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-[8px] hover:bg-[#faf9f7] cursor-pointer text-[#161513] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[#b5470b] border-[#b5470b] text-white' : 'border-[#161513]/30 bg-white'}`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate font-sans font-medium">{opt.value}</span>
                          </div>
                          <span className="font-mono text-[10px] text-[#9b958c] shrink-0 ml-2">({opt.count})</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Date Range Picker if Date Col Exists and Enabled */}
          {dateCol && (displayColumns.length === 0 || displayColumns.includes(dateCol)) && (
            <div className="flex items-center gap-2 bg-white border border-[#161513]/15 rounded-[10px] px-3 py-1.5 text-xs shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-[#b5470b] shrink-0" />
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="bg-transparent text-xs font-mono text-[#161513] focus:outline-none cursor-pointer"
              />
              <span className="text-[#9b958c] font-mono text-[11px]">to</span>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="bg-transparent text-xs font-mono text-[#161513] focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Numeric Range Control */}
          {activeNumericCols.slice(0, 2).map((col) => {
            const range = filters.numeric?.[col] || [null, null];
            return (
              <div key={col} className="flex items-center gap-1.5 bg-white border border-[#161513]/15 rounded-[10px] px-3 py-1.5 text-xs shadow-xs">
                <Sliders className="w-3.5 h-3.5 text-[#b5470b] shrink-0" />
                <span className="font-mono text-[11px] text-[#6f6a62] font-semibold truncate max-w-[100px]">{formatColName(col)}:</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={range[0] ?? ''}
                  onChange={(e) => handleNumericRangeChange(col, 'min', e.target.value)}
                  className="w-16 bg-transparent text-xs font-mono text-[#161513] focus:outline-none border-b border-transparent focus:border-[#b5470b]"
                />
                <span className="text-[#9b958c]">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={range[1] ?? ''}
                  onChange={(e) => handleNumericRangeChange(col, 'max', e.target.value)}
                  className="w-16 bg-transparent text-xs font-mono text-[#161513] focus:outline-none border-b border-transparent focus:border-[#b5470b]"
                />
              </div>
            );
          })}

          {/* Clear All Button */}
          {activeChips.length > 0 && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-[#b5470b] hover:bg-[#b5470b]/10 rounded-[10px] transition-colors ml-auto cursor-pointer font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips Bar */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#161513]/8">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#9b958c] font-semibold mr-1">Active Filters:</span>
            {activeChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b5470b]/10 text-[#b5470b] border border-[#b5470b]/20 text-xs font-mono font-semibold"
              >
                <span>{chip.label}</span>
                <button
                  onClick={() => handleRemoveChip(chip.type, chip.col, chip.val)}
                  className="hover:bg-[#b5470b]/20 rounded-full p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
