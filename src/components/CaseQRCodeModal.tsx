import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { FIRCase } from '../types';
import { formatReadableDate, normalizeReviewStatus } from '../utils/helpers';
import {
  X,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Shield,
  MapPin,
  User,
  Calendar,
  FileText,
  Smartphone,
  CheckCircle2,
  Lock,
  Users,
  AlertCircle,
  Clock,
  Scale,
  FileCheck,
  FileClock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface CaseQRCodeModalProps {
  caseItem: FIRCase | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenVerificationView?: (caseId: string) => void;
}

export const CaseQRCodeModal: React.FC<CaseQRCodeModalProps> = ({
  caseItem,
  isOpen,
  onClose,
  onOpenVerificationView,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseItem || !isOpen) return;

    // Construct the field verification URL
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?verify_case=${encodeURIComponent(caseItem.id)}`;
    setVerificationUrl(url);

    // Generate high-resolution QR code
    QRCode.toDataURL(
      url,
      {
        width: 360,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (err, urlResult) => {
        if (!err && urlResult) {
          setQrDataUrl(urlResult);
        } else {
          console.error('Error generating QR code:', err);
        }
      }
    );
  }, [caseItem, isOpen]);

  if (!isOpen || !caseItem) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_FIR_${caseItem.ps}_${caseItem.firNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintBadge = () => {
    window.print();
  };

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-center min-h-screen">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[calc(100vh-2rem)] animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:m-0 print:max-w-none">
        
        {/* Modal Header */}
        <div className="shrink-0 bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Official Case QR Code & Field Verification
              </h3>
              <p className="text-[11px] text-slate-400">
                Scan to instantly access the read-only case dossier, case reviews & accused status details during field visits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Printable Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          
          {/* Printable Field Verification Badge Card */}
          <div
            ref={printRef}
            className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 space-y-4 shadow-xs print:bg-white print:border-2 print:border-slate-900 print:p-6"
          >
            {/* Top Row: QR Code and Basic Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* QR Code Container */}
              <div className="flex flex-col items-center shrink-0 bg-white p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:border-slate-400">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${caseItem.ps} PS FIR No. ${caseItem.firNumber}`}
                    className="w-40 h-40 object-contain rounded"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <span>Generating QR...</span>
                  </div>
                )}
                <span className="text-[10px] font-mono font-bold text-slate-600 mt-1.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  <span>SECURE DIGITAL RECORD</span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {caseItem.id}</span>
              </div>

              {/* Case Snapshot for Badge */}
              <div className="flex-1 space-y-2 text-slate-800 dark:text-slate-200 w-full print:text-black">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    BIHAR POLICE • TARAPUR SUBDIVISION
                  </span>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5 print:text-black">
                    {caseItem.ps} PS FIR No. {caseItem.firNumber}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      caseItem.status?.includes('Chargesheeted')
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {caseItem.status || 'Under Investigation'}
                    </span>
                    {caseItem.designation && (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        {caseItem.designation === 'SR' ? '⭐ SR Case' : 'NON-SR'}
                      </span>
                    )}
                    {caseItem.targetDisposalDate && (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        Target: {formatReadableDate(caseItem.targetDisposalDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">IO:</span>
                    <strong className="text-slate-900 dark:text-white print:text-black truncate">
                      {caseItem.ioName || 'Not Assigned'}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">FIR Date:</span>
                    <span>{formatReadableDate(caseItem.firDate)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Sections:</span>
                    <strong className="truncate max-w-[280px] text-slate-900 dark:text-white print:text-black">
                      {caseItem.sections || 'N/A'}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Place:</span>
                    <span className="truncate max-w-[280px]">{caseItem.placeOfOccurrence || 'Recorded in Diary'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* ACCUSED STATUS DETAILS SECTION IN QR BADGE */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-2.5 print:bg-white print:border-slate-400">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 flex-wrap gap-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 print:text-black">
                  <Users className="w-3.5 h-3.5 text-rose-500" />
                  <span>Accused Status Details</span>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded">
                    Total: {totalAccusedCount}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold rounded border border-emerald-200 dark:border-emerald-800">
                    Arrested: {totalArrestedCount}
                  </span>
                  <span className={`px-2 py-0.5 font-bold rounded border ${
                    totalPendingArrestCount > 0
                      ? 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    Pending: {totalPendingArrestCount}
                  </span>
                  {totalNoticeServedCount > 0 && (
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold rounded border border-sky-200 dark:border-sky-800">
                      41A Notice: {totalNoticeServedCount}
                    </span>
                  )}
                  {totalBailedCount > 0 && (
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold rounded border border-indigo-200 dark:border-indigo-800">
                      Bail: {totalBailedCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Named Accused List with Status Badges */}
              {caseItem.accusedList && caseItem.accusedList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {caseItem.accusedList.map((acc, aIdx) => {
                    const statuses = acc.status
                      ? acc.status.split(',').map((s) => s.trim()).filter(Boolean)
                      : ['Enquiry'];
                    return (
                      <div
                        key={acc.id || `acc-${aIdx}`}
                        className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 print:bg-white print:border-slate-300"
                      >
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] truncate print:text-black">
                          {acc.name}
                        </span>
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {statuses.map((s, sIdx) => {
                            let badgeStyle = 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
                            if (s.toLowerCase().includes('arrested') || s.toLowerCase() === 'arrest') {
                              badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300';
                            } else if (s.toLowerCase().includes('arresting order')) {
                              badgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300';
                            } else if (s.toLowerCase().includes('charge true')) {
                              badgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300';
                            } else if (s.toLowerCase().includes('notice')) {
                              badgeStyle = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300';
                            } else if (s.toLowerCase().includes('bail') || s.toLowerCase().includes('surrender')) {
                              badgeStyle = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300';
                            } else if (s.toLowerCase().includes('removed')) {
                              badgeStyle = 'bg-slate-200 text-slate-500 line-through';
                            }
                            return (
                              <span
                                key={`${s}-${sIdx}`}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badgeStyle}`}
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
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {caseItem.pendingArrestNames || caseItem.arrestedNames ? (
                    <div className="space-y-1">
                      {caseItem.arrestedNames && (
                        <div><strong className="text-emerald-600">Arrested:</strong> {caseItem.arrestedNames}</div>
                      )}
                      {caseItem.pendingArrestNames && (
                        <div><strong className="text-rose-600">Pending Arrest:</strong> {caseItem.pendingArrestNames}</div>
                      )}
                    </div>
                  ) : (
                    'Case registered against unknown / unnamed persons. No named accused registered.'
                  )}
                </div>
              )}

              {/* Text summaries if present */}
              {(caseItem.noticeServedNames || caseItem.bailSurrenderedNames || caseItem.otherPendingReasons) && (
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] space-y-0.5">
                  {caseItem.noticeServedNames && (
                    <div className="text-sky-700 dark:text-sky-400">
                      <strong>41A Notice Served:</strong> {caseItem.noticeServedNames}
                    </div>
                  )}
                  {caseItem.bailSurrenderedNames && (
                    <div className="text-indigo-700 dark:text-indigo-400">
                      <strong>Bail / Surrendered:</strong> {caseItem.bailSurrenderedNames}
                    </div>
                  )}
                  {caseItem.otherPendingReasons && (
                    <div className="text-amber-700 dark:text-amber-400">
                      <strong>Pending Reasons:</strong> {caseItem.otherPendingReasons}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* CASE REVIEW & SUPERVISION DETAILS SECTION IN QR BADGE */}
            {/* ========================================================================= */}
            <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-2.5 print:bg-white print:border-slate-400">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 flex-wrap gap-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 print:text-black">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Case Review & Supervisory Progress Dossier</span>
                </span>

                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'} Logged
                  </span>
                  {lastReviewDateStr && (
                    <span className="text-slate-500 font-semibold">
                      Last: <strong className="text-slate-800 dark:text-slate-200">{formatReadableDate(lastReviewDateStr)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Review Timeline & Key Milestones */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 print:bg-white">
                  <span className="text-slate-500 font-bold block">PO Visit Date</span>
                  <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">
                    {caseItem.poVisitDate ? formatReadableDate(caseItem.poVisitDate) : 'Not Logged'}
                  </strong>
                </div>

                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 print:bg-white">
                  <span className="text-slate-500 font-bold block">SDPO Supervision</span>
                  <strong className="text-purple-700 dark:text-purple-300 block mt-0.5">
                    {caseItem.supervisionDate ? formatReadableDate(caseItem.supervisionDate) : 'Pending'}
                  </strong>
                </div>

                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 print:bg-white">
                  <span className="text-slate-500 font-bold block">PR Reports</span>
                  <strong className="text-slate-800 dark:text-slate-200 block mt-0.5">
                    {caseItem.finalPrDate
                      ? `Final (${formatReadableDate(caseItem.finalPrDate)})`
                      : caseItem.prDates && caseItem.prDates.length > 0
                      ? `${caseItem.prDates.length} PRs Issued`
                      : 'None'}
                  </strong>
                </div>

                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 print:bg-white">
                  <span className="text-slate-500 font-bold block">Target Disposal</span>
                  <strong className="text-rose-600 dark:text-rose-400 block mt-0.5">
                    {caseItem.targetDisposalDate ? formatReadableDate(caseItem.targetDisposalDate) : 'Standard limit'}
                  </strong>
                </div>
              </div>

              {/* Case Review Dates Tags */}
              {caseItem.caseReviewDates && caseItem.caseReviewDates.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Logged Review Dates:</span>
                  <div className="flex flex-wrap gap-1">
                    {caseItem.caseReviewDates.map((date, rIdx) => (
                      <span
                        key={`rev-${date}-${rIdx}`}
                        className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px] font-bold"
                      >
                        #{rIdx + 1}: {formatReadableDate(date)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervision Notes / Directives */}
              {(caseItem.sdpoSupervisionNote || caseItem.ciSupervisionNote || caseItem.psProgressRemarks || caseItem.targetRemarks) && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[10px] space-y-1 print:bg-white">
                  {caseItem.sdpoSupervisionNote && (
                    <div>
                      <strong className="text-purple-700 dark:text-purple-300">SDPO Directive:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{caseItem.sdpoSupervisionNote}</span>
                    </div>
                  )}
                  {caseItem.ciSupervisionNote && (
                    <div>
                      <strong className="text-blue-700 dark:text-blue-300">CI Review Note:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{caseItem.ciSupervisionNote}</span>
                    </div>
                  )}
                  {caseItem.psProgressRemarks && (
                    <div>
                      <strong className="text-amber-700 dark:text-amber-300">IO Progress Remark:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{caseItem.psProgressRemarks}</span>
                    </div>
                  )}
                  {caseItem.targetRemarks && (
                    <div>
                      <strong className="text-rose-700 dark:text-rose-400">Target Remark:</strong>{' '}
                      <span className="text-slate-700 dark:text-slate-300">{caseItem.targetRemarks}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Forensic & Legal Checklist Badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[9px] font-bold">
                {caseItem.isInjuryPresent && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    🩸 Injury ({normalizeReviewStatus(caseItem.injuryReportReceived) === 'YES' ? 'Recd' : 'Pending'})
                  </span>
                )}
                {caseItem.fslItemPreservedName && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    🧪 FSL: {caseItem.fslItemPreservedName} ({normalizeReviewStatus(caseItem.fslReportReceived) === 'YES' ? 'Recd' : 'Pending'})
                  </span>
                )}
                {caseItem.isArmsCase && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    🔫 Arms Act ({normalizeReviewStatus(caseItem.armsReportReceived) === 'YES' ? 'Verified' : 'Pending'})
                  </span>
                )}
                {caseItem.isLiquorCase && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    🍾 Excise ({normalizeReviewStatus(caseItem.liquorLabReportReceived) === 'YES' ? 'Lab Recd' : 'Pending'})
                  </span>
                )}
                {caseItem.isVictimRecoveryCase && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    👤 Victim ({caseItem.victimRecovered ? '✓ Recovered' : 'Pending'})
                  </span>
                )}
              </div>
            </div>

            {/* Badge Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Case ID: {caseItem.id}</span>
              <span>Field Verified Official Record • Bihar Police</span>
            </div>
          </div>

          {/* Verification URL Copy Bar */}
          <div className="space-y-1.5 print:hidden">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Direct Field Verification Web Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={verificationUrl}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Field Usage Instructions */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-1 text-[11px] text-indigo-950 dark:text-indigo-200 print:hidden">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>How Field Officers Use This QR Code:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
              <li>Print or affix the QR code to Case Diaries, Charge-sheet files, or Inspection notices.</li>
              <li>Patrol teams, supervising officers (CI/SDPO/SP), and checkpost units scan the code with any smartphone camera.</li>
              <li>Instantly opens a secure, read-only summary with live investigation status, case review directives, and complete accused arrest status.</li>
            </ul>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 print:hidden">
          <div className="flex items-center gap-2">
            {onOpenVerificationView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVerificationView(caseItem.id);
                }}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Field View</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadQR}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrintBadge}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Badge / Sticker</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
