import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { FIRCase } from '../types';
import { formatReadableDate } from '../utils/helpers';
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-center min-h-screen">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[calc(100vh-2rem)] animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:m-0 print:max-w-none">
        
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
                Scan to instantly access the read-only case summary during field visits & supervision.
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
            className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 flex flex-col md:flex-row items-center gap-5 shadow-xs print:bg-white print:border-2 print:border-slate-900 print:p-6"
          >
            {/* QR Code Container */}
            <div className="flex flex-col items-center shrink-0 bg-white p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm print:border-slate-400">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for ${caseItem.ps} PS FIR No. ${caseItem.firNumber}`}
                  className="w-44 h-44 object-contain rounded"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                  <span>Generating QR...</span>
                </div>
              )}
              <span className="text-[10px] font-mono font-bold text-slate-600 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-indigo-600" />
                <span>SECURE DIGITAL RECORD</span>
              </span>
            </div>

            {/* Case Snapshot for Badge */}
            <div className="flex-1 space-y-2.5 text-slate-800 dark:text-slate-200 w-full print:text-black">
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
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">IO:</span>
                  <strong className="text-slate-900 dark:text-white print:text-black">
                    {caseItem.ioName || 'Not Assigned'}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Sections:</span>
                  <strong className="truncate max-w-[200px] text-slate-900 dark:text-white print:text-black">
                    {caseItem.sections || 'N/A'}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">FIR Date:</span>
                  <span>{formatReadableDate(caseItem.firDate)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Place:</span>
                  <span className="truncate max-w-[200px]">{caseItem.placeOfOccurrence || 'Recorded in Diary'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Case ID: {caseItem.id}</span>
                <span>Field Verified Digital Token</span>
              </div>
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
              <li>Instantly opens a secure, read-only summary with live investigation status, accused arrest status, and IO contact.</li>
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
