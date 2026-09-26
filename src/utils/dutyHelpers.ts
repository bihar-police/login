import { DailyCrimeReport, PoliceStationName, ODShiftItem, GastiShiftItem } from '../types';

export interface DutyRosterEntry {
  id: string;
  reportId: string;
  date: string; // YYYY-MM-DD
  ps: PoliceStationName;
  dutyType: 'OD' | 'GASTI';
  shiftName: string; // e.g. 'OD 1 (Day Shift)', 'Night Gasti'
  timeSlot: string;  // e.g. '06:00 - 14:00', '14:00 - 22:00', '22:00 - 06:00'
  timeCategory?: DutyTimeCategory;
  ioName: string;
  ioId?: string;
  vehicleNumber?: string;
  sectorArea?: string;
  forceCount?: number;
  remarks?: string;
  submittedBy: string;
}

export type DutyTimeCategory = 'ALL' | 'MORNING' | 'DAY_EVENING' | 'NIGHT' | 'CUSTOM';

/**
 * Normalizes time string to categorize shift into Morning, Day/Evening, or Night
 */
export function categorizeDutyTime(timeSlot: string, shiftName: string): 'MORNING' | 'DAY_EVENING' | 'NIGHT' | 'CUSTOM' {
  const text = `${timeSlot} ${shiftName}`.toLowerCase();
  
  // Try to parse the start hour (first digit group before a colon)
  const match = timeSlot.match(/(\d{1,2})\s*:\s*\d{2}/);
  if (match) {
    const startHour = parseInt(match[1], 10);
    if (startHour >= 6 && startHour < 12) {
      return 'MORNING';
    }
    if (startHour >= 12 && startHour < 22) {
      return 'DAY_EVENING';
    }
    if (startHour >= 22 || startHour < 6) {
      return 'NIGHT';
    }
  }

  // Fallbacks using text matches
  if (text.includes('night') || text.includes('nakabandi')) {
    return 'NIGHT';
  }
  if (text.includes('morning')) {
    return 'MORNING';
  }
  if (text.includes('day') || text.includes('evening') || text.includes('mobile')) {
    return 'DAY_EVENING';
  }

  const trimmedSlot = timeSlot.trim();
  const startsWithNightHour = /^(22|23|00|01|02|03|04|05):/.test(trimmedSlot);
  if (startsWithNightHour) return 'NIGHT';

  const startsWithMorningHour = /^(06|07|08|09|10|11):/.test(trimmedSlot);
  if (startsWithMorningHour || text.includes('od 1')) return 'MORNING';

  const startsWithDayHour = /^(12|13|14|15|16|17|18|19|20|21):/.test(trimmedSlot);
  if (startsWithDayHour || text.includes('od 2')) return 'DAY_EVENING';

  return 'CUSTOM';
}

/**
 * Extracts and unifies all OD & Gasti duty records across all DailyCrimeReports
 */
export function extractAllDutyRecords(reports: DailyCrimeReport[]): DutyRosterEntry[] {
  const entries: DutyRosterEntry[] = [];

  reports.forEach((r) => {
    const reportDate = r.date;
    const ps = r.ps;
    const submittedBy = r.submittedBy || `SHO ${ps} PS`;

    // 1. Extract OD (Officer on Duty) records
    if (r.odDetails) {
      if (r.odDetails.odShifts && r.odDetails.odShifts.length > 0) {
        r.odDetails.odShifts.forEach((shift, index) => {
          if (shift.ioName && shift.ioName.trim()) {
            const shiftName = shift.shiftName || `OD ${index + 1}`;
            const timeSlot = shift.timeSlot || (index === 0 ? '06:00 - 14:00' : index === 1 ? '14:00 - 22:00' : '22:00 - 06:00');
            entries.push({
              id: shift.id || `${r.id}-od-${index}`,
              reportId: r.id,
              date: reportDate,
              ps,
              dutyType: 'OD',
              shiftName,
              timeSlot,
              timeCategory: categorizeDutyTime(timeSlot, shiftName),
              ioName: shift.ioName.trim(),
              ioId: shift.ioId,
              remarks: shift.remarks,
              submittedBy,
            });
          }
        });
      } else {
        // Legacy fallback
        if (r.odDetails.od1IoName && r.odDetails.od1IoName.trim()) {
          const shiftName = 'OD 1 (Day Shift)';
          const timeSlot = '06:00 - 14:00';
          entries.push({
            id: `${r.id}-od-1`,
            reportId: r.id,
            date: reportDate,
            ps,
            dutyType: 'OD',
            shiftName,
            timeSlot,
            timeCategory: categorizeDutyTime(timeSlot, shiftName),
            ioName: r.odDetails.od1IoName.trim(),
            submittedBy,
          });
        }
        if (r.odDetails.od2IoName && r.odDetails.od2IoName.trim()) {
          const shiftName = 'OD 2 (Evening Shift)';
          const timeSlot = '14:00 - 22:00';
          entries.push({
            id: `${r.id}-od-2`,
            reportId: r.id,
            date: reportDate,
            ps,
            dutyType: 'OD',
            shiftName,
            timeSlot,
            timeCategory: categorizeDutyTime(timeSlot, shiftName),
            ioName: r.odDetails.od2IoName.trim(),
            submittedBy,
          });
        }
        if (r.odDetails.od3IoName && r.odDetails.od3IoName.trim()) {
          const shiftName = 'OD 3 (Night Shift)';
          const timeSlot = '22:00 - 06:00';
          entries.push({
            id: `${r.id}-od-3`,
            reportId: r.id,
            date: reportDate,
            ps,
            dutyType: 'OD',
            shiftName,
            timeSlot,
            timeCategory: categorizeDutyTime(timeSlot, shiftName),
            ioName: r.odDetails.od3IoName.trim(),
            submittedBy,
          });
        }
      }
    }

    // 2. Extract GASTI (Patrol) records
    if (r.gastiDetails) {
      if (r.gastiDetails.gastiShifts && r.gastiDetails.gastiShifts.length > 0) {
        r.gastiDetails.gastiShifts.forEach((shift, index) => {
          if (shift.ioName && shift.ioName.trim()) {
            const shiftName = shift.shiftName || `Gasti Shift ${index + 1}`;
            const timeSlot = shift.timeSlot || (index === 0 ? '06:00 - 14:00' : index === 1 ? '14:00 - 22:00' : '22:00 - 06:00');
            entries.push({
              id: shift.id || `${r.id}-gasti-${index}`,
              reportId: r.id,
              date: reportDate,
              ps,
              dutyType: 'GASTI',
              shiftName,
              timeSlot,
              timeCategory: categorizeDutyTime(timeSlot, shiftName),
              ioName: shift.ioName.trim(),
              ioId: shift.ioId,
              vehicleNumber: shift.vehicleNumber,
              sectorArea: shift.sectorArea,
              forceCount: shift.forceCount,
              remarks: shift.remarks,
              submittedBy,
            });
          }
        });
      } else {
        // Legacy fallback
        if (r.gastiDetails.morningGastiIoName && r.gastiDetails.morningGastiIoName.trim()) {
          const shiftName = 'Morning Gasti';
          const timeSlot = '06:00 - 14:00';
          entries.push({
            id: `${r.id}-gasti-m`,
            reportId: r.id,
            date: reportDate,
            ps,
            dutyType: 'GASTI',
            shiftName,
            timeSlot,
            timeCategory: categorizeDutyTime(timeSlot, shiftName),
            ioName: r.gastiDetails.morningGastiIoName.trim(),
            submittedBy,
          });
        }
        if (r.gastiDetails.dayGastiIoName && r.gastiDetails.dayGastiIoName.trim()) {
          const shiftName = 'Day / Mobile Gasti';
          const timeSlot = '14:00 - 22:00';
          entries.push({
            id: `${r.id}-gasti-d`,
            reportId: r.id,
            date: reportDate,
            ps,
            dutyType: 'GASTI',
            shiftName,
            timeSlot,
            timeCategory: categorizeDutyTime(timeSlot, shiftName),
            ioName: r.gastiDetails.dayGastiIoName.trim(),
            submittedBy,
          });
        }
        if (r.gastiDetails.nightGastiIoName && r.gastiDetails.nightGastiIoName.trim()) {
          const shiftName = 'Night Gasti / Nakabandi';
          const timeSlot = '22:00 - 06:00';
          entries.push({
            id: `${r.id}-gasti-n`,
            reportId: r.id,
            date: reportDate,
            ps,
            dutyType: 'GASTI',
            shiftName,
            timeSlot,
            timeCategory: categorizeDutyTime(timeSlot, shiftName),
            ioName: r.gastiDetails.nightGastiIoName.trim(),
            submittedBy,
          });
        }
      }
    }
  });

  // Sort descending by date, then by shift
  return entries.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return a.dutyType.localeCompare(b.dutyType);
  });
}

/**
 * Filter duty records based on user search parameters
 */
export function filterDutyRecords(
  records: DutyRosterEntry[],
  filters: {
    startDate?: string;
    endDate?: string;
    policeStation?: string; // 'ALL' or specific PS
    ioName?: string; // 'ALL' or specific IO Name
    dutyType?: 'ALL' | 'OD' | 'GASTI';
    timeCategory?: DutyTimeCategory;
    searchQuery?: string;
  }
): DutyRosterEntry[] {
  return records.filter((rec) => {
    // 1. Date Range
    if (filters.startDate && rec.date < filters.startDate) return false;
    if (filters.endDate && rec.date > filters.endDate) return false;

    // 2. Police Station
    if (filters.policeStation && filters.policeStation !== 'ALL' && rec.ps !== filters.policeStation) {
      return false;
    }

    // 3. IO Name
    if (filters.ioName && filters.ioName !== 'ALL') {
      if (rec.ioName.toLowerCase() !== filters.ioName.toLowerCase()) {
        return false;
      }
    }

    // 4. Duty Type (OD vs GASTI)
    if (filters.dutyType && filters.dutyType !== 'ALL' && rec.dutyType !== filters.dutyType) {
      return false;
    }

    // 5. Time Category (Morning, Day/Evening, Night)
    if (filters.timeCategory && filters.timeCategory !== 'ALL') {
      const cat = categorizeDutyTime(rec.timeSlot, rec.shiftName);
      if (cat !== filters.timeCategory) {
        return false;
      }
    }

    // 6. Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const match =
        rec.ioName.toLowerCase().includes(q) ||
        rec.shiftName.toLowerCase().includes(q) ||
        rec.timeSlot.toLowerCase().includes(q) ||
        (rec.sectorArea && rec.sectorArea.toLowerCase().includes(q)) ||
        (rec.vehicleNumber && rec.vehicleNumber.toLowerCase().includes(q)) ||
        (rec.remarks && rec.remarks.toLowerCase().includes(q)) ||
        rec.ps.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}
