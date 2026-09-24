import React from 'react';
import { FIRCase } from '../types';
import { getDeadlineInfo, formatReadableDate } from '../utils/helpers';
import { X, Shield, Printer, MapPin, User, FileText, Clock, CloudUpload, CheckCircle2, AlertCircle, Trash2, QrCode } from 'lucide-react';

interface ViewCaseModalProps {
  caseItem: FIRCase | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (caseItem: FIRCase) => void;
  onDeleteCase?: (caseId: string) => void;
  onOpenQRCode?: (caseItem: FIRCase) => void;
  isReadOnly?: boolean;
}

export const ViewCaseModal: React.FC<ViewCaseModalProps> = ({
  caseItem,
  isOpen,
  onClose,
  onEdit,
  onDeleteCase,
  onOpenQRCode,
  isReadOnly = false,
}) => {
  if (!isOpen || !caseItem) return null;

  const deadline = getDeadlineInfo(caseItem);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-start min-h-screen">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] print:border-none print:shadow-none print:m-0 print:max-w-none">
        
        {/* Header */}
        <div className="shrink-0 bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between print:bg-white print:text-black print:border-b-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold print:hidden">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-amber-400 print:text-slate-700">
                  BIHAR POLICE • TARAPUR SUBDIVISION
                </span>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono print:hidden">
                  ID: {caseItem.id}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white print:text-slate-900">
                {caseItem.ps} PS FIR No. {caseItem.firNumber}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {onOpenQRCode && (
              <button
                onClick={() => onOpenQRCode(caseItem)}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
                title="Generate Field Verification QR Code"
              >
                <QrCode className="w-4 h-4" />
                <span>Field QR Code</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* Top Status Badges Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Designation */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Classification</span>
              <div className="mt-1">
                {caseItem.designation === 'SR' && (
                  <span className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">⭐ Special Report (SR) Case</span>
                )}
                {caseItem.designation === 'NON_SR' && (
                  <span className="font-extrabold text-blue-700 dark:text-blue-300 text-sm">👮 NON-SR Case (CI Supervision)</span>
                )}
                {caseItem.designation === 'PENDING_DESIGNATION' && (
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">❓ Pending SDPO Classification</span>
                )}
              </div>
            </div>

            {/* Deadline Status */}
            <div className={`p-3 rounded-xl border ${deadline.badgeBg}`}>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400">Statutory {caseItem.deadlineDays}-Day Limit</span>
              <div className="font-extrabold text-sm mt-1">{deadline.label}</div>
            </div>

            {/* Stage Status */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Investigation Stage</span>
              <div className="font-extrabold text-slate-900 dark:text-white text-sm mt-1">
                {caseItem.status}
              </div>
            </div>

          </div>

          {/* Primary Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-500 font-bold block mb-1">Police Station:</span>
              <p className="text-slate-900 dark:text-white font-extrabold text-sm">{caseItem.ps} PS</p>
            </div>

            <div>
              <span className="text-slate-500 font-bold block mb-1">FIR Date:</span>
              <p className="text-slate-900 dark:text-white font-extrabold text-sm">{formatReadableDate(caseItem.firDate)}</p>
            </div>

            <div>
              <span className="text-slate-500 font-bold block mb-1">Complainant Details:</span>
              <p className="text-slate-900 dark:text-white font-bold">{caseItem.complainantName}</p>
              {caseItem.complainantPhone && (
                <p className="text-slate-500 text-[11px]">Phone: {caseItem.complainantPhone}</p>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-bold block mb-1">Investigating Officer (IO):</span>
              <p className="text-amber-600 dark:text-amber-400 font-extrabold text-sm">{caseItem.ioName}</p>
            </div>

            <div>
              <span className="text-slate-500 font-bold block mb-1">Punishment Term:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                caseItem.punishmentTerm === '7_years_or_more'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                  : caseItem.punishmentTerm === 'less_than_7_years'
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                {caseItem.punishmentTerm === '7_years_or_more'
                  ? '7 Years or More (≥ 7 Yrs)'
                  : caseItem.punishmentTerm === 'less_than_7_years'
                  ? 'Less than 7 Years (< 7 Yrs)'
                  : 'Unclassified / General'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-slate-500 font-bold block mb-1">IPC / BNS & Special Sections:</span>
              <p className="text-slate-900 dark:text-white font-extrabold bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                {caseItem.sections}
              </p>
            </div>

            <div className="sm:col-span-2">
              <span className="text-slate-500 font-bold block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Place of Occurrence (PO):</span>
              </span>
              <p className="text-slate-900 dark:text-white font-semibold">
                {caseItem.placeOfOccurrence}
              </p>
            </div>
          </div>

          {/* Case Review & Investigation Parameters Dossier */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-500" />
                <span>Case Review, Forensics & Accused Status</span>
              </span>
              {caseItem.targetDisposalDate && (
                <span className="text-rose-600 dark:text-rose-400 font-black text-xs">
                  TARGET: {formatReadableDate(caseItem.targetDisposalDate)}
                </span>
              )}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-bold block">Injury / Medical</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {caseItem.isInjuryPresent ? 'Yes (Injury Present)' : 'No Injury'}
                </span>
                {caseItem.isInjuryPresent && (
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                    {caseItem.injuryReportReceived ? '✓ Injury Recd' : '✗ Injury Pending'} • {caseItem.pmReportReceived ? '✓ PM Recd' : '✗ PM Pending'} • {caseItem.visceraPreserved ? '✓ Viscera' : ''}
                  </div>
                )}
              </div>

              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-bold block">FSL Forensic</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {caseItem.fslVisitedPO ? '✓ Visited PO' : 'No FSL Visit'}
                </span>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Report: {caseItem.fslReportReceived ? '✓ Received' : 'Pending'} {caseItem.fslItemPreservedName ? `(${caseItem.fslItemPreservedName})` : ''}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-bold block">Arrests & Notices</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Arrested: {caseItem.arrestedCount || (caseItem.anyPersonArrested ? 'Yes' : '0')} | Pending: {caseItem.pendingArrestCount || (caseItem.pendingForArrest ? 'Yes' : '0')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  41A Notice: {caseItem.noticeServedCount || (caseItem.anyPersonServedNotice ? 'Yes' : '0')} | Bail: {caseItem.bailSurrenderedCount || (caseItem.anyPersonOnBailOrSurrendered ? 'Yes' : '0')}
                </div>
              </div>

              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 font-bold block">Victim / Recovery</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {caseItem.isVictimRecoveryCase ? (
                    caseItem.victimRecovered ? '✓ Recovered' : `Pending (${caseItem.victimAgeType || 'minor'})`
                  ) : 'N/A'}
                </span>
                {caseItem.victimRecoveryDate && (
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    Date: {formatReadableDate(caseItem.victimRecoveryDate)}
                  </div>
                )}
              </div>
            </div>

            {/* Special Acts info if present */}
            {(caseItem.isArmsCase || caseItem.isLiquorCase || caseItem.isNdpsCase) && (
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 text-xs flex flex-wrap gap-3">
                {caseItem.isArmsCase && (
                  <div>
                    <strong className="text-purple-800 dark:text-purple-300">Arms Act:</strong> Sent: {caseItem.armsSentForVerification ? 'Yes' : 'No'} | Report: {caseItem.armsReportReceived ? 'Yes' : 'Pending'}
                  </div>
                )}
                {caseItem.isLiquorCase && (
                  <div>
                    <strong className="text-emerald-800 dark:text-emerald-300">Liquor Case:</strong> Lab: {caseItem.liquorLabReportReceived ? 'Report Recd' : 'Pending'} | Vehicle: {caseItem.liquorVehicleSeized ? (caseItem.vehicleVerifiedRTO ? 'RTO Verified' : 'Seized') : 'No'}
                  </div>
                )}
                {caseItem.isNdpsCase && (
                  <div>
                    <strong className="text-indigo-800 dark:text-indigo-300">NDPS Case:</strong> Lab: {caseItem.ndpsLabReportReceived ? 'Recd' : 'Pending'} | Safe House: {caseItem.ndpsExhibitSentToSafeHouse ? 'Sent' : 'Pending'}
                  </div>
                )}
              </div>
            )}

            {/* Accused names list if present */}
            {(caseItem.pendingArrestNames || caseItem.arrestedNames || caseItem.noticeServedNames || caseItem.bailSurrenderedNames || caseItem.otherPendingReasons) && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1">
                {caseItem.pendingArrestNames && (
                  <div><strong className="text-rose-600">Persons to be arrested:</strong> {caseItem.pendingArrestNames}</div>
                )}
                {caseItem.arrestedNames && (
                  <div><strong className="text-emerald-600">Arrested persons:</strong> {caseItem.arrestedNames}</div>
                )}
                {caseItem.noticeServedNames && (
                  <div><strong className="text-blue-600">41A Notice served:</strong> {caseItem.noticeServedNames}</div>
                )}
                {caseItem.bailSurrenderedNames && (
                  <div><strong className="text-amber-600">Bail / Surrendered:</strong> {caseItem.bailSurrenderedNames}</div>
                )}
                {caseItem.otherPendingReasons && (
                  <div><strong className="text-slate-600">Other reasons for pending:</strong> {caseItem.otherPendingReasons}</div>
                )}
              </div>
            )}
          </div>

          {/* CCTNS Status Box */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-blue-500" />
              <span>CCTNS Portal Synchronization Record</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                {caseItem.chargesheetUploadedCCTNS ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Chargesheet CCTNS Status:</span>
                  <div className="text-slate-500 text-[11px]">
                    {caseItem.chargesheetUploadedCCTNS 
                      ? `Uploaded on ${formatReadableDate(caseItem.chargesheetCCTNSDate)}` 
                      : 'Pending upload to CCTNS'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {caseItem.caseDiaryUploadedCCTNS ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Case Diary (CD) CCTNS Sync:</span>
                  <div className="text-slate-500 text-[11px]">
                    {caseItem.caseDiaryUploadedCCTNS 
                      ? `Synced (Last CD: ${caseItem.lastCaseDiaryNo || 'Latest'})` 
                      : 'Case diary pending upload'}
                  </div>
                </div>
              </div>
            </div>

            {caseItem.chargesheetNumber && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                <span>Chargesheet / Final Form No: <strong>{caseItem.chargesheetNumber}</strong></span>
                <span>Date: <strong>{formatReadableDate(caseItem.chargesheetDate)}</strong></span>
              </div>
            )}
          </div>

          {/* Supervision Dates & Milestones */}
          {(caseItem.poVisitDate || caseItem.supervisionDate || caseItem.prDates?.length || caseItem.finalPrDate || caseItem.caseReviewDates?.length) && (
            <div className="bg-purple-50/70 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3">
              <h4 className="font-extrabold text-purple-900 dark:text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-500" />
                <span>SDPO Supervision Timeline & Milestone Dates</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">PO Visit Date</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {caseItem.poVisitDate ? formatReadableDate(caseItem.poVisitDate) : '✕ Pending Visit'}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Supervision Date</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {caseItem.supervisionDate ? formatReadableDate(caseItem.supervisionDate) : '✕ Pending Note'}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/60">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Final PR Date</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {caseItem.finalPrDate ? formatReadableDate(caseItem.finalPrDate) : '✕ Pending Final PR'}
                  </span>
                </div>
              </div>

              {/* Multiple PR Dates */}
              {caseItem.prDates && caseItem.prDates.length > 0 && (
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60">
                  <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block mb-1">
                    Progress Report (PR) Dates ({caseItem.prDates.length} Issued):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {caseItem.prDates.map((d, i) => (
                      <span key={d} className="bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-purple-300 dark:border-purple-700">
                        PR #{i + 1}: {formatReadableDate(d)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Multiple Review Dates */}
              {caseItem.caseReviewDates && caseItem.caseReviewDates.length > 0 && (
                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 block mb-1">
                    Case Review Dates ({caseItem.caseReviewDates.length} Reviews):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {caseItem.caseReviewDates.map((d, i) => (
                      <span key={d} className="bg-blue-200/80 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-blue-300 dark:border-blue-700">
                        Review #{i + 1}: {formatReadableDate(d)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disposed Details Record */}
          {(caseItem.status === 'Disposed' || caseItem.disposedDate) && (
            <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Case Disposal & Final Order Record</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Disposed Date</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {formatReadableDate(caseItem.disposedDate || caseItem.updatedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Disposal Type / Reason</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {caseItem.disposalType || 'Disposed (Court / Police Order)'}
                  </span>
                </div>
              </div>
              {caseItem.disposalRemarks && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Disposal Remarks / Orders:</span>
                  <p className="font-medium">{caseItem.disposalRemarks}</p>
                </div>
              )}
            </div>
          )}

          {/* Directives & Remarks Timeline */}
          <div className="space-y-3">
            
            {/* SDPO Note */}
            {caseItem.sdpoSupervisionNote && (
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="font-extrabold text-purple-900 dark:text-purple-300 text-xs mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>SDPO Tarapur Supervision Orders:</span>
                </div>
                <p className="text-slate-800 dark:text-purple-200 font-medium">
                  {caseItem.sdpoSupervisionNote}
                </p>
              </div>
            )}

            {/* CI Note */}
            {caseItem.ciSupervisionNote && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="font-bold text-blue-900 dark:text-blue-300 text-xs mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Circle Inspector (CI) Directive:</span>
                </div>
                <p className="text-slate-800 dark:text-blue-200 font-medium">
                  {caseItem.ciSupervisionNote}
                </p>
              </div>
            )}

            {/* PS Progress Remarks */}
            {caseItem.psProgressRemarks && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="font-bold text-slate-900 dark:text-slate-200 text-xs mb-1">
                  Police Station IO Progress Notes:
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {caseItem.psProgressRemarks}
                </p>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="text-[11px] text-slate-500">
            Last Updated: {formatReadableDate(caseItem.updatedAt)}
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && onDeleteCase && (
              <button
                onClick={() => {
                  onDeleteCase(caseItem.id);
                  onClose();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 font-bold rounded-xl text-white flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Case</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-bold rounded-xl text-slate-800 dark:text-slate-200"
            >
              Close
            </button>
            {!isReadOnly && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(caseItem);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 font-bold rounded-xl text-slate-950"
              >
                Edit Case Details
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
