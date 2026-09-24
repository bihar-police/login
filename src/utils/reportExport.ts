// Report Export Utility for Excel (.csv/.xls) and Printable / Direct PDF reports
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  // Format CSV with UTF-8 BOM so Excel opens special characters correctly
  const processCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const cellStr = String(cell).replace(/"/g, '""');
    return `"${cellStr}"`;
  };

  const csvRows: string[] = [];
  csvRows.push(headers.map(processCell).join(','));

  rows.forEach((row) => {
    csvRows.push(row.map(processCell).join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateDirectPDF(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  summaryBadges?: { label: string; value: string | number }[],
  orientation: 'landscape' | 'portrait' = 'landscape'
) {
  const doc = new jsPDF({
    orientation: headers.length > 6 ? 'landscape' : orientation,
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('BIHAR POLICE • CRIME & CASE REVIEW MONITORING SYSTEM', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), pageWidth / 2, 45, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(subtitle, pageWidth / 2, 59, { align: 'center' });

  // Timestamp & Meta line
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated On: ${currentDate} | Total Records: ${rows.length}`, 30, 75);

  let startY = 85;

  // Summary Badges
  if (summaryBadges && summaryBadges.length > 0) {
    let currentX = 30;
    doc.setFontSize(8);
    summaryBadges.forEach((badge) => {
      const text = `${badge.label}: ${badge.value}`;
      const badgeWidth = doc.getTextWidth(text) + 14;
      if (currentX + badgeWidth < pageWidth - 30) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(currentX, startY - 8, badgeWidth, 16, 3, 3, 'FD');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(text, currentX + 7, startY + 3);
        currentX += badgeWidth + 8;
      }
    });
    startY += 16;
  }

  // AutoTable
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => (c === null || c === undefined ? '-' : String(c)))),
    startY: startY,
    margin: { top: 30, right: 25, bottom: 35, left: 25 },
    styles: {
      fontSize: headers.length > 10 ? 6.5 : headers.length > 7 ? 7.5 : 8.5,
      cellPadding: 4,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: headers.length > 10 ? 7 : headers.length > 7 ? 8 : 9,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, pageWidth - 45, doc.internal.pageSize.getHeight() - 15);
      doc.text('Confidential - For Official Police & Court Administration Use Only', 30, doc.internal.pageSize.getHeight() - 15);
    },
  });

  const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(cleanFilename);
}

export function exportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  summaryBadges?: { label: string; value: string | number }[]
) {
  // Direct PDF save using jsPDF
  generateDirectPDF(title, title, subtitle, headers, rows, summaryBadges);
}
