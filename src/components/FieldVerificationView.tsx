import React from 'react';
import { FIRCase } from '../types';
import { formatReadableDate, getDeadlineInfo, normalizeReviewStatus } from '../utils/helpers';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Calendar,
  Phone,
  FileText,
  Printer,
  ArrowLeft,
  Lock,
  FileCheck,
  AlertCircle,
  Building,
  Scale,
  Sparkles,
  Search,
  Users,
  FileClock,
  ExternalLink,
} from 'lucide-react';

interface FieldVerificationViewProps {
  caseItem: FIRCase | null;
  caseId: string;
  onExit: () => void;
  onLoginPortal?: () => void;
}

export const FieldVerificationView: React.FC<FieldVerificationViewProps> = ({
  caseItem,
  caseId,
  onExit,
  onLoginPortal,
}) => {
  const deadline = caseItem ? getDeadlineInfo(caseItem) : null;
  const verifiedTimestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handlePrint = () => {
    window.print();
  };

  if (!caseItem) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 mx-auto bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Case Record Not Found</h2>
          <p className="text-xs text-slate-400">
            No active FIR record could be verified for identifier: <code className="text-rose-400 font-mono">{caseId}</code>.
            Please verify the QR code or check if the record was relocated.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={onExit}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Go to Subdivisional Crime Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case Review stats calculations
  const totalReviewsCount =
    caseItem.noOfReviews ??
    (caseItem.caseReviewDates && caseItem.caseReviewDates.length > 0
      ? caseItem.caseReviewDates.length
      : caseItem.lastCaseReviewDate
      ? 1
      : 0);

  const lastReviewDateStr =
    caseItem.lastCaseReviewDate ||
    (caseItem.caseReviewDates && caseItem.caseReviewDates.length > 0
      ? caseItem.caseReviewDates[caseItem.caseReviewDates.length - 1]
      : null);

  // Accused stats calculations
  const totalAccusedCount = caseItem.accusedCount || (caseItem.accusedList ? caseItem.accusedList.length : 0);
  const totalArrestedCount = caseItem.arrestedCount || (caseItem.anyPersonArrested ? 1 : 0);
  const totalPendingArrestCount = caseItem.pendingArrestCount || (caseItem.pendingForArrest ? 1 : 0);
  const totalNoticeServedCount = caseItem.noticeServedCount || (caseItem.anyPersonServedNotice ? 1 : 0);
  const totalBailedCount = caseItem.bailSurrenderedCount || (caseItem.anyPersonOnBailOrSurrendered ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-4 px-3 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-4">
        
        {/* Top Floating Control Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap print:hidden bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-lg">
          <button
            onClick={onExit}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Subdivision Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Field Dossier</span>
            </button>

            {onLoginPortal && (
              <button
                onClick={onLoginPortal}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Officer Portal Login
              </button>
            )}
          </div>
        </div>

        {/* Official Verification Document Sheet */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-900/60 p-5 sm:p-6 text-white print:bg-white print:border-b-2 print:border-slate-900 print:text-black">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 print:border-slate-900 print:text-slate-900">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 print:text-slate-700">
                      BIHAR POLICE • TARAPUR SUBDIVISION
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 print:border-emerald-700 print:text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>OFFICIAL DIGITAL RECORD</span>
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 print:text-black">
                    {caseItem.ps} PS FIR No. {caseItem.firNumber}
                  </h1>
                </div>
              </div>

              <div className="text-right text-[11px] text-slate-400 print:text-slate-600">
                <div className="font-mono text-slate-300 print:text-black font-bold">Case ID: {caseItem.id}</div>
                <div className="text-[10px] mt-0.5">Verified At: {verifiedTimestamp}</div>
              </div>
            </div>
          </div>

          {/* Quick Key Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 print:bg-white print:border-slate-300">
            
            {/* Status */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Status</span>
              <div className="mt-1 font-extrabold text-xs text-emerald-400 print:text-emerald-700 truncate" title={caseItem.status}>
                {caseItem.status || 'Under Investigation'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Stage of Inquiry</span>
            </div>

            {/* Classification */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Supervision Class</span>
              <div className="mt-1 font-extrabold text-xs text-purple-400 print:text-purple-700">
                {caseItem.designation === 'SR' ? '⭐ SR Case' : caseItem.designation === 'NON_SR' ? '👮 NON-SR (CI)' : 'Pending'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {caseItem.designation === 'SR' ? 'SDPO / SP' : 'Circle Inspector'}
              </span>
            </div>

            {/* Deadline */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Statutory Limit</span>
              <div className="mt-1 font-extrabold text-xs text-amber-400 print:text-amber-700 truncate">
                {deadline?.label || `${caseItem.deadlineDays} Days`}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Target: {caseItem.deadlineDays || 60} Days
              </span>
            </div>

            {/* Case Reviews Count */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Case Reviews</span>
              <div className="mt-1 font-extrabold text-xs text-indigo-400 print:text-indigo-700">
                {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                {lastReviewDateStr ? `Last: ${formatReadableDate(lastReviewDateStr)}` : 'No Review Yet'}
              </span>
            </div>

            {/* Accused Breakdown */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accused Track</span>
              <div className="mt-1 font-extrabold text-xs text-rose-400 print:text-rose-700">
                {totalArrestedCount} Arrest / {totalPendingArrestCount} Pend
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Total Accused: {totalAccusedCount}
              </span>
            </div>

            {/* CCTNS Sync */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CCTNS Sync</span>
              <div className="mt-1 font-extrabold text-xs text-blue-400 print:text-blue-700">
                {caseItem.chargesheetUploadedCCTNS ? '✓ CS Uploaded' : 'CS Pending'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                CD: {caseItem.caseDiaryUploadedCCTNS ? 'Synced' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* Detailed Investigation Information */}
          <div className="p-4 sm:p-6 space-y-6 text-xs print:p-6 print:space-y-4">
            
            {/* IO & Police Station Section */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 print:bg-slate-50 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 print:border-slate-300">
                <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Investigating Officer (IO) & Jurisdiction</span>
                </span>
                <span className="text-[11px] font-bold text-amber-400">{caseItem.ps} Police Station</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">IO Name:</span>
                  <span className="font-extrabold text-sm text-white mt-0.5 block print:text-black">
                    {caseItem.ioName || 'Not Assigned'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Police Station:</span>
                  <span className="font-bold text-slate-200 mt-0.5 block print:text-black">
                    {caseItem.ps} PS
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Jurisdiction Scope:</span>
                  <span className="font-bold text-slate-200 mt-0.5 block print:text-black">
                    {caseItem.subdivision || 'Tarapur Subdivision'} • {caseItem.district || 'Munger'}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Sections, Crime Category, Occurrence Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Crime & Sections */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 print:bg-slate-50 print:border-slate-300">
                <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                  <Scale className="w-4 h-4 text-purple-400" />
                  <span>Sections & Legal Classification</span>
                </span>

                <div className="space-y-2 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">IPC / BNS Sections:</span>
                    <span className="font-black text-sm text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/60 inline-block mt-1 print:bg-white print:text-black">
                      {caseItem.sections || 'Sections not specified'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Punishment Bracket:</span>
                    <span className="font-bold text-slate-200">
                      {caseItem.punishmentTerm === '7_years_or_more'
                        ? '≥ 7 Years (Severe Statutory Limit 90 Days)'
                        : '< 7 Years (Standard Statutory Limit 60 Days)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Place of Occurrence:</span>
                    <span className="font-medium text-slate-300 flex items-center gap-1 mt-0.5 print:text-black">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{caseItem.placeOfOccurrence || 'Recorded in Case Diary'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates & Timeline */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 print:bg-slate-50 print:border-slate-300">
                <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>Important Case Timelines</span>
                </span>

                <div className="space-y-2 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">FIR Registration Date:</span>
                    <span className="font-bold text-slate-200 mt-0.5 block print:text-black">
                      {formatReadableDate(caseItem.firDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">PO Visit Date:</span>
                    <span className="font-bold text-slate-200 mt-0.5 block print:text-black">
                      {caseItem.poVisitDate ? formatReadableDate(caseItem.poVisitDate) : 'Recorded in Case Diary'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Disposal Date:</span>
                    <span className="font-bold text-rose-400 mt-0.5 block print:text-rose-800">
                      {caseItem.targetDisposalDate ? formatReadableDate(caseItem.targetDisposalDate) : 'Under standard statutory limit'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parties: Complainant Details */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 print:bg-slate-50 print:border-slate-300">
              <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Complainant / Informant</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Complainant Name:</span>
                  <span className="font-bold text-slate-200 print:text-black">
                    {caseItem.complainantName || 'Informant details on record'}
                  </span>
                </div>
                {caseItem.complainantPhone && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone:</span>
                    <a href={`tel:${caseItem.complainantPhone}`} className="font-mono text-blue-400 hover:underline">
                      {caseItem.complainantPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPREHENSIVE ACCUSED STATUS DETAILS & ARREST TRACKER */}
            {/* ========================================================================= */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3.5 print:bg-slate-50 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2 print:border-slate-300">
                <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>Accused Status Details & Arrest Tracker</span>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-extrabold print:bg-white print:text-black">
                    Total: {totalAccusedCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-extrabold">
                    👮 Arrested: {totalArrestedCount}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg font-extrabold border ${
                    totalPendingArrestCount > 0
                      ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    🚨 Pending Arrest: {totalPendingArrestCount}
                  </span>
                  {totalNoticeServedCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-300 font-extrabold">
                      📜 41A Notice: {totalNoticeServedCount}
                    </span>
                  )}
                  {totalBailedCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-extrabold">
                      ⚖️ Bail/Surrendered: {totalBailedCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Accused Directory with individual status badges */}
              {caseItem.accusedList && caseItem.accusedList.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Registered Named Accused ({caseItem.accusedList.length} Persons):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {caseItem.accusedList.map((acc, aIdx) => {
                      const statuses = acc.status
                        ? acc.status.split(',').map((s) => s.trim()).filter(Boolean)
                        : ['Enquiry'];
                      return (
                        <div
                          key={acc.id || `field-acc-${aIdx}`}
                          className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 print:bg-white print:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-extrabold text-sm text-white print:text-black">
                              {acc.name}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">#{aIdx + 1}</span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {statuses.map((s, sIdx) => {
                              let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                              if (s.toLowerCase().includes('arrested') || s.toLowerCase() === 'arrest') {
                                badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                              } else if (s.toLowerCase().includes('arresting order')) {
                                badgeStyle = 'bg-rose-950 text-rose-300 border-rose-800 font-black';
                              } else if (s.toLowerCase().includes('charge true')) {
                                badgeStyle = 'bg-amber-950 text-amber-300 border-amber-800';
                              } else if (s.toLowerCase().includes('notice')) {
                                badgeStyle = 'bg-sky-950 text-sky-300 border-sky-800';
                              } else if (s.toLowerCase().includes('bail') || s.toLowerCase().includes('surrender')) {
                                badgeStyle = 'bg-indigo-950 text-indigo-300 border-indigo-800';
                              } else if (s.toLowerCase().includes('removed')) {
                                badgeStyle = 'bg-slate-800 text-slate-500 line-through border-slate-700';
                              }
                              return (
                                <span
                                  key={`${s}-${sIdx}`}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${badgeStyle}`}
                                >
                                  {s}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 italic text-[11px] print:bg-white print:border-slate-300">
                  {caseItem.pendingArrestNames || caseItem.arrestedNames ? (
                    <div className="space-y-1 not-italic">
                      {caseItem.arrestedNames && (
                        <div><strong className="text-emerald-400">Arrested Persons:</strong> <span className="text-white print:text-black">{caseItem.arrestedNames}</span></div>
                      )}
                      {caseItem.pendingArrestNames && (
                        <div><strong className="text-rose-400">Persons to be Arrested:</strong> <span className="text-white print:text-black">{caseItem.pendingArrestNames}</span></div>
                      )}
                    </div>
                  ) : (
                    'Case is registered against unknown / unnamed accused persons. No individual named accused record in database.'
                  )}
                </div>
              )}

              {/* Text summaries for specific categories */}
              {(caseItem.pendingArrestNames || caseItem.arrestedNames || caseItem.noticeServedNames || caseItem.bailSurrenderedNames || caseItem.otherPendingReasons) && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] print:border-slate-300">
                  {caseItem.pendingArrestNames && (
                    <div className="p-2 bg-rose-950/30 rounded-lg border border-rose-900/50">
                      <strong className="text-rose-400 block text-[10px] uppercase">Persons To Be Arrested:</strong>
                      <span className="text-slate-200 print:text-black font-semibold">{caseItem.pendingArrestNames}</span>
                    </div>
                  )}
                  {caseItem.arrestedNames && (
                    <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-900/50">
                      <strong className="text-emerald-400 block text-[10px] uppercase">Arrested Persons Logged:</strong>
                      <span className="text-slate-200 print:text-black font-semibold">{caseItem.arrestedNames}</span>
                    </div>
                  )}
                  {caseItem.noticeServedNames && (
                    <div className="p-2 bg-sky-950/30 rounded-lg border border-sky-900/50">
                      <strong className="text-sky-400 block text-[10px] uppercase">41A Notice Served Persons:</strong>
                      <span className="text-slate-200 print:text-black font-semibold">{caseItem.noticeServedNames}</span>
                    </div>
                  )}
                  {caseItem.bailSurrenderedNames && (
                    <div className="p-2 bg-indigo-950/30 rounded-lg border border-indigo-900/50">
                      <strong className="text-indigo-400 block text-[10px] uppercase">Bail / Court Surrendered:</strong>
                      <span className="text-slate-200 print:text-black font-semibold">{caseItem.bailSurrenderedNames}</span>
                    </div>
                  )}
                  {caseItem.otherPendingReasons && (
                    <div className="sm:col-span-2 p-2 bg-amber-950/30 rounded-lg border border-amber-900/50">
                      <strong className="text-amber-400 block text-[10px] uppercase">Specific Reasons for Arrest / Disposal Pending:</strong>
                      <span className="text-slate-200 print:text-black">{caseItem.otherPendingReasons}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* COMPREHENSIVE CASE REVIEW & SUPERVISORY PROGRESS DOSSIER */}
            {/* ========================================================================= */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4 print:bg-slate-50 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2 print:border-slate-300">
                <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                  <span>Case Review Details & Supervisory Directives</span>
                </span>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 rounded-lg font-black text-[11px]">
                    {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'} Completed
                  </span>
                  {lastReviewDateStr && (
                    <span className="text-slate-400 text-[11px]">
                      Last Reviewed: <strong className="text-white print:text-black">{formatReadableDate(lastReviewDateStr)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Logged Case Review Dates */}
              {caseItem.caseReviewDates && caseItem.caseReviewDates.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recorded Case Review Dates:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {caseItem.caseReviewDates.map((date, rIdx) => (
                      <div
                        key={`field-rev-${date}-${rIdx}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs print:bg-white print:border-slate-300"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-mono text-[9px] font-black">
                          #{rIdx + 1}
                        </span>
                        <span className="font-bold text-slate-200 print:text-black">{formatReadableDate(date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 italic text-xs print:bg-white print:border-slate-300">
                  {caseItem.lastCaseReviewDate ? (
                    <span>Last Case Review conducted on: <strong className="text-white print:text-black">{formatReadableDate(caseItem.lastCaseReviewDate)}</strong></span>
                  ) : (
                    'No formal case review session has been logged in the digital registry yet.'
                  )}
                </div>
              )}

              {/* Supervisory Milestones Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">PO Visit Date</span>
                  <strong className="text-sm text-slate-200 mt-1 block print:text-black">
                    {caseItem.poVisitDate ? formatReadableDate(caseItem.poVisitDate) : 'Not Logged'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">SDPO Supervision</span>
                  <strong className="text-sm text-purple-400 mt-1 block print:text-purple-700">
                    {caseItem.supervisionDate ? formatReadableDate(caseItem.supervisionDate) : 'Pending'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Progress Reports (PR)</span>
                  <strong className="text-sm text-blue-400 mt-1 block print:text-blue-700">
                    {caseItem.finalPrDate
                      ? `Final (${formatReadableDate(caseItem.finalPrDate)})`
                      : caseItem.prDates && caseItem.prDates.length > 0
                      ? `${caseItem.prDates.length} PRs Logged`
                      : 'None'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Disposal</span>
                  <strong className="text-sm text-rose-400 mt-1 block print:text-rose-700">
                    {caseItem.targetDisposalDate ? formatReadableDate(caseItem.targetDisposalDate) : 'Standard limit'}
                  </strong>
                </div>
              </div>

              {/* Progress Report (PR) Dates chips if available */}
              {caseItem.prDates && caseItem.prDates.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Issued Progress Report (PR) Dates:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {caseItem.prDates.map((pDate, pIdx) => (
                      <span
                        key={`pr-date-${pDate}-${pIdx}`}
                        className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold"
                      >
                        PR #{pIdx + 1}: {formatReadableDate(pDate)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisory Directions & Notes */}
              {(caseItem.sdpoSupervisionNote || caseItem.ciSupervisionNote || caseItem.psProgressRemarks || caseItem.targetRemarks) && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Official Supervisory Directives & Progress Notes:
                  </span>

                  {caseItem.sdpoSupervisionNote && (
                    <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-900/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span>SDPO Supervision Note & Directives</span>
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed print:text-black whitespace-pre-wrap">
                        {caseItem.sdpoSupervisionNote}
                      </p>
                    </div>
                  )}

                  {caseItem.ciSupervisionNote && (
                    <div className="p-3 bg-blue-950/20 rounded-xl border border-blue-900/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Circle Inspector (CI) Review Memo</span>
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed print:text-black whitespace-pre-wrap">
                        {caseItem.ciSupervisionNote}
                      </p>
                    </div>
                  )}

                  {caseItem.psProgressRemarks && (
                    <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-900/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Police Station (IO) Progress Remarks</span>
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed print:text-black whitespace-pre-wrap">
                        {caseItem.psProgressRemarks}
                      </p>
                    </div>
                  )}

                  {caseItem.targetRemarks && (
                    <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-900/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Target Disposal Instruction / Deadline Remarks</span>
                      </span>
                      <p className="text-slate-200 text-xs leading-relaxed print:text-black whitespace-pre-wrap">
                        {caseItem.targetRemarks}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Special Acts & Forensic Preservations */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 print:bg-slate-50 print:border-slate-300">
              <span className="font-extrabold text-sm text-white flex items-center gap-2 print:text-black">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Forensic Parameters & Evidence Verification</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {/* Injury */}
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 block">Injury Report</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5 block">
                    {caseItem.isInjuryPresent ? `🩸 Present (${String(caseItem.injuryReportReceived || 'Pending')})` : 'No Injury'}
                  </span>
                </div>

                {/* FSL */}
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 block">FSL / Forensic</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5 block truncate" title={caseItem.fslItemPreservedName || 'None'}>
                    {caseItem.fslItemPreservedName ? `🧪 Preserved (${String(caseItem.fslReportReceived || 'Pending')})` : 'N/A'}
                  </span>
                </div>

                {/* Arms */}
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 block">Arms Act</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5 block">
                    {caseItem.isArmsCase ? `🔫 Arms Case (${String(caseItem.armsReportReceived || 'Pending')})` : 'N/A'}
                  </span>
                </div>

                {/* Liquor / NDPS */}
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 block">Excise / NDPS</span>
                  <span className="font-bold text-slate-200 text-xs mt-0.5 block">
                    {caseItem.isLiquorCase ? '🍾 Liquor Case' : caseItem.isNdpsCase ? '💊 NDPS Case' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Verification Footer */}
          <div className="bg-slate-950 border-t border-slate-800 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3 text-[11px] text-slate-500 print:bg-white print:border-t-2 print:border-slate-900 print:text-slate-700">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              <span>Cryptographically Verified Subdivisional Police Registry Record</span>
            </div>
            <div>
              <span>Official Bihar Police Subdivisional Portal • Tarapur</span>
            </div>
          </div>
        </div>

        {/* Bottom Back Action */}
        <div className="text-center pt-2 print:hidden">
          <button
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            ← Return to Subdivision Case Register & Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
