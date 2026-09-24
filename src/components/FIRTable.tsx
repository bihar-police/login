import React, { useState, useMemo } from 'react';
import { FIRCase, UserRole, CaseDesignation, CrimeHead } from '../types';
import { getDeadlineInfo, formatReadableDate } from '../utils/helpers';
import { exportToExcel, exportToPDF } from '../utils/reportExport';
import { CRIME_HEADS_CONFIG, classifyCrimeHead } from '../utils/crimeClassifier';
import {
  Shield,
  ShieldAlert,
  Eye,
  Edit3,
  CloudUpload,
  Clock,
  FileCheck,
  CheckCircle2,
  User,
  MapPin,
  Tag,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  SlidersHorizontal,
  RotateCcw,
  FileSpreadsheet,
  Download,
  QrCode,
} from 'lucide-react';

export type FIRSortField =
  | 'firNumber'
  | 'firDate'
  | 'ps'
  | 'status'
  | 'designation'
  | 'deadlineDays'
  | 'daysRemaining'
  | 'ioName'
  | 'chargesheetDate'
  | 'disposedDate'
  | 'complainantName';

export interface SortRule {
  field: FIRSortField;
  direction: 'asc' | 'desc';
}

const SORT_FIELD_LABELS: Record<FIRSortField, string> = {
  firDate: 'FIR Date',
  firNumber: 'FIR Number',
  ps: 'Police Station',
  status: 'Case Status',
  designation: 'SR / NON-SR',
  daysRemaining: 'Days Remaining (Limit)',
  deadlineDays: 'Statutory Limit (60/90d)',
  ioName: 'Investigating Officer',
  chargesheetDate: 'Chargesheet Date',
  disposedDate: 'Disposed Date',
  complainantName: 'Complainant',
};

interface FIRTableProps {
  cases: FIRCase[];
  currentRole: UserRole;
  onViewCase: (caseItem: FIRCase) => void;
  onEditCase: (caseItem: FIRCase) => void;
  onDesignateCase: (caseId: string, designation: CaseDesignation) => void;
  onDeleteCase?: (caseId: string) => void;
  onOpenQRCode?: (caseItem: FIRCase) => void;
  isReadOnly?: boolean;
}

export const FIRTable: React.FC<FIRTableProps> = ({
  cases,
  currentRole,
  onViewCase,
  onEditCase,
  onDesignateCase,
  onDeleteCase,
  onOpenQRCode,
  isReadOnly = false,
}) => {
  const isSuperUser = currentRole === 'SDPO';

  // Multi-Sort State
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { field: 'firDate', direction: 'desc' },
  ]);
  const [isAddingSort, setIsAddingSort] = useState(false);
  const [selectedNewField, setSelectedNewField] = useState<FIRSortField>('ps');

  const getFieldValue = (c: FIRCase, field: FIRSortField): any => {
    switch (field) {
      case 'firNumber': {
        const num = parseInt(c.firNumber.replace(/\D/g, ''), 10);
        return isNaN(num) ? c.firNumber.toLowerCase() : num;
      }
      case 'firDate':
        return c.firDate || '';
      case 'ps':
        return (c.ps || '').toLowerCase();
      case 'status':
        return (c.status || '').toLowerCase();
      case 'designation':
        return c.designation || '';
      case 'deadlineDays':
        return c.deadlineDays || 0;
      case 'daysRemaining': {
        const info = getDeadlineInfo(c);
        return info.daysRemaining ?? 9999;
      }
      case 'ioName':
        return (c.ioName || '').toLowerCase();
      case 'chargesheetDate':
        return c.chargesheetDate || '';
      case 'disposedDate':
        return c.disposedDate || '';
      case 'complainantName':
        return (c.complainantName || '').toLowerCase();
      default:
        return '';
    }
  };

  const sortedCases = useMemo(() => {
    if (sortRules.length === 0) return cases;
    return [...cases].sort((a, b) => {
      for (const rule of sortRules) {
        const valA = getFieldValue(a, rule.field);
        const valB = getFieldValue(b, rule.field);
        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else {
          cmp = String(valA).localeCompare(String(valB));
        }
        if (cmp !== 0) {
          return rule.direction === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
  }, [cases, sortRules]);

  const handleHeaderClick = (field: FIRSortField, e: React.MouseEvent) => {
    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
    setSortRules((prev) => {
      const existingIdx = prev.findIndex((r) => r.field === field);
      if (existingIdx >= 0) {
        const current = prev[existingIdx];
        if (current.direction === 'asc') {
          const updated = [...prev];
          updated[existingIdx] = { ...current, direction: 'desc' };
          return updated;
        } else {
          if (isMulti) {
            return prev.filter((_, idx) => idx !== existingIdx);
          } else {
            return [{ field, direction: 'asc' }];
          }
        }
      } else {
        if (isMulti) {
          return [...prev, { field, direction: 'asc' }];
        } else {
          return [{ field, direction: 'asc' }];
        }
      }
    });
  };

  const handleToggleRuleDirection = (index: number) => {
    setSortRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, direction: r.direction === 'asc' ? 'desc' : 'asc' } : r))
    );
  };

  const handleRemoveRule = (index: number) => {
    setSortRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddRule = () => {
    if (sortRules.some((r) => r.field === selectedNewField)) {
      setIsAddingSort(false);
      return;
    }
    setSortRules((prev) => [...prev, { field: selectedNewField, direction: 'asc' }]);
    setIsAddingSort(false);
  };

  const getSortBadge = (field: FIRSortField) => {
    const idx = sortRules.findIndex((r) => r.field === field);
    if (idx === -1) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />;
    }
    const rule = sortRules[idx];
    return (
      <span className="inline-flex items-center gap-0.5 bg-blue-600 text-white rounded px-1 py-0.2 text-[9px] font-bold">
        {sortRules.length > 1 && <span>#{idx + 1}</span>}
        {rule.direction === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      </span>
    );
  };

  // Report Export Handlers (Strictly Sorted as per active table sort rules)
  const handleExportExcel = () => {
    const headers = [
      'FIR No',
      'Police Station',
      'FIR Date',
      'Sections',
      'Punishment Term',
      'Complainant',
      'IO Name',
      'Classification',
      'Statutory Limit',
      'Status',
      'Chargesheet No',
      'Chargesheet Date',
      'CCTNS Chargesheet Sync',
      'CCTNS Case Diary Sync',
    ];

    const rows = sortedCases.map((c) => [
      c.firNumber,
      `${c.ps} PS`,
      c.firDate,
      c.sections,
      c.punishmentTerm === '7_years_or_more' ? '≥ 7 Yrs' : c.punishmentTerm === 'less_than_7_years' ? '< 7 Yrs' : 'Unclassified',
      c.complainantName,
      c.ioName,
      c.designation,
      `${c.deadlineDays} Days`,
      c.status,
      c.chargesheetNumber || 'N/A',
      c.chargesheetDate || 'N/A',
      c.chargesheetUploadedCCTNS ? 'YES' : 'NO',
      c.caseDiaryUploadedCCTNS ? 'YES' : 'NO',
    ]);

    exportToExcel('FIR_Sorted_Register_Report', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['FIR No & PS', 'FIR Date', 'Sections & Complainant', 'Punishment', 'IO Name', 'Type', 'Status', 'CCTNS'];
    const rows = sortedCases.map((c) => [
      `FIR ${c.firNumber} (${c.ps} PS)`,
      c.firDate,
      `${c.sections} — ${c.complainantName}`,
      c.punishmentTerm === '7_years_or_more' ? '≥ 7 Yrs' : c.punishmentTerm === 'less_than_7_years' ? '< 7 Yrs' : 'General',
      c.ioName,
      c.designation,
      c.status,
      `CS: ${c.chargesheetUploadedCCTNS ? 'Synced' : 'Pending'} | CD: ${c.caseDiaryUploadedCCTNS ? 'Synced' : 'Pending'}`,
    ]);

    exportToPDF(
      'FIR & CASE REGISTER DOSSIER',
      `Sorted Official Case Register (${sortedCases.length} Cases)`,
      headers,
      rows,
      [{ label: 'Total Cases Exported', value: sortedCases.length }]
    );
  };

  if (cases.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-heading">No FIR Cases Match Your Criteria</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Try adjusting or resetting your active filters to display recorded jurisdiction cases.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      
      {/* Table Header Info & Multi-Sort Toolbar */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider font-heading">
              FIR & Investigation Register ({sortedCases.length} records)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export sorted case records to Excel (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Export</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export sorted case dossier to PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>

        {/* Multi-Sorting Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Multiple Sorting:</span>
          </div>

          {/* Active Sort Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {sortRules.map((rule, idx) => (
              <span
                key={rule.field}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-medium text-slate-800 dark:text-slate-200 shadow-xs"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-extrabold">
                  {idx + 1}
                </span>
                <span>{SORT_FIELD_LABELS[rule.field]}</span>
                <button
                  type="button"
                  onClick={() => handleToggleRuleDirection(idx)}
                  className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-indigo-700 dark:text-indigo-300 cursor-pointer flex items-center gap-0.5"
                  title="Click to toggle Ascending / Descending"
                >
                  {rule.direction === 'asc' ? (
                    <span className="flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ArrowUp className="w-3 h-3" /> Asc
                    </span>
                  ) : (
                    <span className="flex items-center text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                      <ArrowDown className="w-3 h-3" /> Desc
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveRule(idx)}
                  className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                  title="Remove this sort level"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Sort Level */}
          {isAddingSort ? (
            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
              <select
                value={selectedNewField}
                onChange={(e) => setSelectedNewField(e.target.value as FIRSortField)}
                className="bg-white dark:bg-slate-900 text-[11px] font-semibold rounded px-1.5 py-0.5 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                {(Object.keys(SORT_FIELD_LABELS) as FIRSortField[])
                  .filter((f) => !sortRules.some((r) => r.field === f))
                  .map((f) => (
                    <option key={f} value={f}>
                      {SORT_FIELD_LABELS[f]}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddRule}
                className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingSort(false)}
                className="p-0.5 text-slate-500 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingSort(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 px-2 py-0.5 rounded-lg cursor-pointer transition"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>+ Add Sort Level</span>
            </button>
          )}

          {/* Reset Sort Button */}
          {sortRules.length > 0 && (
            <button
              type="button"
              onClick={() => setSortRules([{ field: 'firDate', direction: 'desc' }])}
              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-auto cursor-pointer font-medium"
              title="Reset to default FIR Date (Newest first)"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sort</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800 select-none">
            <tr>
              {/* FIR Details */}
              <th
                onClick={(e) => handleHeaderClick('firNumber', e)}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition group"
                title="Click to sort by FIR Number, Shift+Click for multi-sort"
              >
                <div className="flex items-center gap-1.5">
                  <span>FIR Details</span>
                  {getSortBadge('firNumber')}
                </div>
              </th>

              {/* PS & Date */}
              <th
                onClick={(e) => handleHeaderClick('firDate', e)}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition group"
                title="Click to sort by FIR Date, Shift+Click for multi-sort"
              >
                <div className="flex items-center gap-1.5">
                  <span>PS & Date</span>
                  {getSortBadge('firDate')}
                </div>
              </th>

              {/* Status */}
              <th
                onClick={(e) => handleHeaderClick('status', e)}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition group"
                title="Click to sort by Status, Shift+Click for multi-sort"
              >
                <div className="flex items-center gap-1.5">
                  <span>Case Status</span>
                  {getSortBadge('status')}
                </div>
              </th>

              {/* Sections & PO */}
              <th className="py-3 px-4">
                <span>Sections & PO</span>
              </th>

              {/* Investigating Officer */}
              <th
                onClick={(e) => handleHeaderClick('ioName', e)}
                className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition group"
                title="Click to sort by Investigating Officer, Shift+Click for multi-sort"
              >
                <div className="flex items-center gap-1.5">
                  <span>IO Name</span>
                  {getSortBadge('ioName')}
                </div>
              </th>

              {/* SR / NON-SR */}
              <th
                onClick={(e) => handleHeaderClick('designation', e)}
                className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition group"
                title="Click to sort by Designation, Shift+Click for multi-sort"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>SR / NON-SR</span>
                  {getSortBadge('designation')}
                </div>
              </th>

              {/* 60/90 Day Limit */}
              <th
                onClick={(e) => handleHeaderClick('daysRemaining', e)}
                className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition group"
                title="Click to sort by Days Remaining, Shift+Click for multi-sort"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>60/90 Day Limit</span>
                  {getSortBadge('daysRemaining')}
                </div>
              </th>

              {/* CCTNS Sync */}
              <th className="py-3 px-4 text-center">
                <span>CCTNS Sync</span>
              </th>

              {/* Actions */}
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-medium">
            {sortedCases.map((c) => {
              const deadline = getDeadlineInfo(c);

              return (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  
                  {/* FIR Details */}
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        FIR No. {c.firNumber}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                      Comp: <strong className="text-slate-700 dark:text-slate-300">{c.complainantName}</strong>
                    </div>
                  </td>

                  {/* PS & FIR Date */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {c.ps} PS
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>FIR: {formatReadableDate(c.firDate)}</span>
                    </div>
                    {c.chargesheetDate && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5" title={`Chargesheet filed on ${c.chargesheetDate}`}>
                        <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>CS: {formatReadableDate(c.chargesheetDate)}</span>
                      </div>
                    )}
                    {c.disposedDate && (
                      <div className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold flex items-center gap-1 mt-0.5" title={`Disposed on ${c.disposedDate}`}>
                        <CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>Disp: {formatReadableDate(c.disposedDate)}</span>
                      </div>
                    )}
                  </td>

                  {/* Case Status Badge */}
                  <td className="py-3 px-4">
                    {c.status === 'Disposed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
                        <CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>Disposed</span>
                      </span>
                    ) : c.status?.includes('Chargesheeted') ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                        <FileCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[130px]" title={c.status}>Chargesheeted / Final</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Under Investigation</span>
                      </span>
                    )}
                  </td>

                  {/* Sections & PO */}
                  <td className="py-3 px-4 max-w-xs">
                    {(() => {
                      const head = (c.crimeHead as CrimeHead) || classifyCrimeHead(c);
                      const meta = CRIME_HEADS_CONFIG[head] || CRIME_HEADS_CONFIG['Other / General IPC & BNS'];
                      return (
                        <div className="mb-1">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${meta.color.badgeBg} ${meta.color.badgeText}`}>
                            <span>{meta.icon}</span>
                            <span>{meta.name}</span>
                          </span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={c.sections}>
                        {c.sections}
                      </span>
                      {c.punishmentTerm && (
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          c.punishmentTerm === '7_years_or_more'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}>
                          {c.punishmentTerm === '7_years_or_more' ? '≥ 7 Yrs' : '< 7 Yrs'}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate" title={c.placeOfOccurrence}>
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.placeOfOccurrence || 'PO Not Recorded'}</span>
                    </div>
                  </td>

                  {/* Investigating Officer */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {c.ioName || 'Not Assigned'}
                      </span>
                    </div>
                  </td>

                  {/* SR / NON-SR Classification */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {c.designation === 'SR' ? (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          <span>SR Case (SDPO)</span>
                        </span>
                      ) : c.designation === 'NON_SR' ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          <span>NON-SR (CI)</span>
                        </span>
                      ) : (
                        <span className="inline-block bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded">
                          Unassigned
                        </span>
                      )}

                      {/* Quick Designate Action for SuperUser (SP/SDPO/CI) */}
                      {!isReadOnly && isSuperUser && (
                        <div className="flex items-center gap-1 text-[9px]">
                          {c.designation !== 'SR' && (
                            <button
                              onClick={() => onDesignateCase(c.id, 'SR')}
                              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                              title="Mark as Special Report (SR)"
                            >
                              +SR
                            </button>
                          )}
                          {c.designation !== 'NON_SR' && (
                            <button
                              onClick={() => onDesignateCase(c.id, 'NON_SR')}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                              title="Mark as Non-SR"
                            >
                              +Non-SR
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 60/90 Day Limit Indicator */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${deadline.badgeBg}`}>
                        {deadline.code === 'OVERDUE' && <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />}
                        {deadline.code === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                        {deadline.code === 'APPROACHING' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                        <span>{deadline.label}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                        Statutory: {c.deadlineDays}d
                      </span>
                    </div>
                  </td>

                  {/* CCTNS Sync Indicators */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center gap-1 text-[10px] font-medium">
                      <span className={`inline-block px-1.5 py-0.2 rounded ${
                        c.chargesheetUploadedCCTNS
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                      }`}>
                        <span>CS: {c.chargesheetUploadedCCTNS ? 'Synced' : 'Pending'}</span>
                      </span>
                      <span className={`inline-block px-1.5 py-0.2 rounded ${
                        c.caseDiaryUploadedCCTNS
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                      }`}>
                        <span>CD: {c.caseDiaryUploadedCCTNS ? 'Synced' : 'Pending'}</span>
                      </span>
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenQRCode && (
                        <button
                          type="button"
                          onClick={() => onOpenQRCode(c)}
                          className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg transition cursor-pointer border border-indigo-200 dark:border-indigo-800"
                          title="Generate Case QR Code for Field Verification"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewCase(c)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                        title="View Case Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => onEditCase(c)}
                          className="p-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white rounded-lg font-semibold transition flex items-center gap-1 text-[10px] px-2.5 cursor-pointer shadow-xs"
                          title="Edit Case / Progress"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}

                      {!isReadOnly && onDeleteCase && (
                        <button
                          type="button"
                          onClick={() => onDeleteCase(c.id)}
                          className="p-1.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white rounded-lg font-semibold transition flex items-center gap-1 text-[10px] px-2 cursor-pointer"
                          title="Delete FIR Case Record"
                        >
                          <Trash2 className="w-3 h-3" />
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
    </div>
  );
};
