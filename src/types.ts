export type UserRole = 
  | 'ADMINISTRATOR' // State / System Administrator (Full control over all districts, subdivisions, police stations)
  | 'SP'            // District Police Chief / Senior Superintendent of Police (Full District View, Add/Edit Subdivisions & PS)
  | 'DISTRICT_ADMIN'// District Control Room / Crime Bureau Admin
  | 'SDPO'          // Subdivisional Police Officer (Full Subdivision View & PS within)
  | 'CI'            // Circle Inspector (Subdivision & Circle monitoring)
  | 'SHO'           // Station House Officer (PS Level)
  | 'OPERATOR'      // Computer Operator / Munshi (PS Level)
  | 'PS_TARAPUR'    // Legacy PS roles
  | 'PS_ASARGANJ'
  | 'PS_SANGRAMPUR'
  | 'PS_HARPUR'
  | string;

export type PoliceStationName = string;

// Organizational Hierarchy Interfaces
export interface PoliceDistrict {
  id: string; // e.g. "dist-munger"
  name: string; // e.g. "Munger"
  state?: string; // e.g. "Bihar"
  hqName?: string; // e.g. "Munger District Police HQ"
  description?: string;
  createdAt?: string;
}

export interface PoliceSubdivision {
  id: string; // e.g. "subdiv-tarapur"
  districtId: string; // references PoliceDistrict.id
  districtName: string; // e.g. "Munger"
  name: string; // e.g. "Tarapur"
  headquarters?: string; // e.g. "Tarapur Subdivision HQ"
  sdpoOfficerName?: string;
  createdAt?: string;
}

export interface PoliceStation {
  id: string; // e.g. "ps-tarapur"
  subdivisionId: string; // references PoliceSubdivision.id
  subdivisionName: string; // e.g. "Tarapur"
  districtId: string; // references PoliceDistrict.id
  districtName: string; // e.g. "Munger"
  name: string; // e.g. "Tarapur"
  code?: string;
  shoName?: string;
  contactNumber?: string;
  createdAt?: string;
}

export type CrimeHead =
  | 'Murder'
  | 'Mob Lynching'
  | 'Culpable Homicide'
  | 'Attempt to Murder'
  | 'Dacoity'
  | 'Robbery / Loot'
  | 'Extortion / Rangdari'
  | 'Snatching'
  | 'Theft'
  | 'Nocturnal Burglary / House-Breaking'
  | 'Stolen Property'
  | 'Electric Energy Theft'
  | 'Kidnapping / Abduction'
  | 'Dowry Death'
  | 'Sec 69 BNS (Sexual Deceit)'
  | 'Rape'
  | 'POCSO Act'
  | 'Molestation / Outraging Modesty'
  | 'Cruelty by Husband (85 BNS / 498A)'
  | 'Hit-and-Run / Rash Driving Fatalities'
  | 'Dowry Prohibition Act'
  | 'SC/ST Act'
  | 'Immoral Traffic (ITPA) Act'
  | 'Child Labour Act'
  | 'Arms Act'
  | 'Explosive Substances Act'
  | 'Essential Commodities Act'
  | 'IT Act / Cyber Crime'
  | 'NDPS Act'
  | 'Awaidh Khanan (Illegal Mining)'
  | 'Forgery / Cheating (318, 319 BNS)'
  | 'Aarthik Gaban (316 BNS / CBT)'
  | 'Bihar Prohibition & Excise Act (Liquor)'
  | 'Public Gambling Act'
  | 'Wildlife Protection Act'
  | 'Other / General IPC & BNS'
  | (string & {});

export type CaseDesignation = 'SR' | 'NON_SR' | 'PENDING_DESIGNATION';

export type CaseStatus = 
  | 'Under Investigation'
  | 'Chargesheeted / Final Form Submitted / Mistake of Fact'
  | 'Disposed'
  | 'Chargesheeted / Final Form Submitted'
  | 'False Case / Mistake of Fact';

export type ReviewStatus = 'YES' | 'PENDING' | 'NA';

export type DeadlineCategory = 60 | 90;

export type CCTNSSyncOption = 'ALL' | 'CS_SYNC' | 'CD_SYNC' | 'BOTH_SYNC' | 'NONE_SYNC';

export type IOStatus = 'ACTIVE' | 'TRANSFERRED';

export interface OfficerLeaveQuotaYear {
  cl: number;      // Casual Leave (default 16 or 20)
  cpl: number;     // Compensatory Permission Leave (default 20)
  others: number;  // Other leaves: Medical/Earned/Special (default 30)
}

export interface InvestigatingOfficer {
  id: string;
  name: string;
  rank: 'SDPO' | 'Circle Inspector' | 'Inspector' | 'Sub-Inspector (SI)' | 'Asst. Sub-Inspector (ASI)' | 'PTC';
  district?: string;
  subdivision?: string;
  ps: PoliceStationName | 'Subdivision HQ';
  phone?: string;
  activeCasesCount?: number;
  status?: IOStatus;
  transferredTo?: string;
  transferDate?: string;
  leaveQuotas?: Record<string, OfficerLeaveQuotaYear>; // Year (e.g. '2026') -> { cl, cpl, others }
}

export type PunishmentTerm = '7_years_or_more' | 'less_than_7_years';

export interface FIRCase {
  id: string;
  firNumber: string; // e.g. "124/2026"
  district?: string; // e.g. "Munger"
  subdivision?: string; // e.g. "Tarapur"
  ps: PoliceStationName;
  firDate: string; // YYYY-MM-DD
  sections: string; // e.g., "Sec 302, 120B IPC" or "Sec 307, 34 BNS"
  crimeHead?: CrimeHead | string; // Automatic AI or manual crime classification (primary or joined)
  crimeHeads?: (CrimeHead | string)[]; // Multi-crime head classification (e.g. ['Attempt to Murder', 'Arms Act'])
  punishmentTerm?: PunishmentTerm; // 7 yrs or more | less than 7 yrs
  complainantName: string;
  complainantPhone?: string;
  placeOfOccurrence: string; // Village / Landmark / Ward
  ioName: string; // Selected from IO drop-down
  designation: CaseDesignation; // Decided ONLY by Super User (SDPO)
  designationDate?: string;
  deadlineDays: DeadlineCategory; // 60 or 90 days
  
  // Status & Progress
  status: CaseStatus;
  chargesheetNumber?: string;
  chargesheetDate?: string;
  disposedDate?: string;
  disposalType?: string; // e.g. 'False Case', 'Mistake of Fact', 'Final Report Disposed', 'Compromise', 'Quashed'
  disposalRemarks?: string;
  
  // CCTNS Tracking
  chargesheetUploadedCCTNS: boolean;
  chargesheetCCTNSDate?: string;
  caseDiaryUploadedCCTNS: boolean;
  lastCaseDiaryNo?: string;
  lastCaseDiaryDate?: string;
  
  // Supervision & Notes
  poVisitDate?: string;          // Place of Occurrence Visit Date (YYYY-MM-DD)
  supervisionDate?: string;       // SDPO Supervision Note Date (YYYY-MM-DD)
  prDates?: string[];            // Progress Report (PR) issue dates [YYYY-MM-DD, ...]
  finalPrDate?: string;          // Final Progress Report Date (YYYY-MM-DD)
  caseReviewDates?: string[];     // Case Review dates [YYYY-MM-DD, ...]
  sdpoSupervisionNote?: string;
  ciSupervisionNote?: string;
  psProgressRemarks?: string;
  
  // Comprehensive Case Review Parameters
  // 1. Injury & Medical / Forensics
  isInjuryPresent?: boolean;
  injuryReportReceived?: ReviewStatus | boolean;
  pmReportReceived?: ReviewStatus | boolean;      // Post-Mortem Report Received
  visceraPreserved?: ReviewStatus | boolean;
  fslVisitedPO?: ReviewStatus | boolean;
  fslItemPreservedName?: string;
  fslItemSentOrPermissionTaken?: ReviewStatus | boolean;
  fslReportReceived?: ReviewStatus | boolean;

  // 2. Accused Tracking, Arrests, Notice (41A) & Bail
  pendingForArrest?: boolean;
  pendingArrestCount?: number;
  pendingArrestNames?: string;
  anyPersonArrested?: boolean;
  arrestedCount?: number;
  arrestedNames?: string;
  anyPersonServedNotice?: boolean; // Notice served under 41A CrPC / Sec 35 BNSS
  noticeServedCount?: number;
  noticeServedNames?: string;
  anyPersonOnBailOrSurrendered?: boolean;
  bailSurrenderedCount?: number;
  bailSurrenderedNames?: string;
  otherPendingReasons?: string;

  // 3. Recovery of Girl / Boy (POCSO / Abduction / Kidnapping / Missing)
  isVictimRecoveryCase?: boolean;
  victimCount?: number;
  victimAgeType?: 'minor' | 'major';
  victimRecovered?: boolean;
  victimRecoveryDate?: string;
  victimRecoveryDetails?: string;

  // 4. Arms Act Case Details
  isArmsCase?: boolean;
  armsSentForVerification?: ReviewStatus | boolean;
  armsReportReceived?: ReviewStatus | boolean;

  // 5. Liquor / Excise Prohibition Case Details
  isLiquorCase?: boolean;
  liquorSentToLab?: ReviewStatus | boolean;
  liquorLabReportReceived?: ReviewStatus | boolean;
  confiscationOfLiquor?: ReviewStatus | boolean;
  liquorVehicleSeized?: boolean;
  vehicleVerifiedRTO?: ReviewStatus | boolean;
  vehicleRajsatStatus?: ReviewStatus | boolean | string;

  // 6. NDPS (Narcotics & Psychotropic Substances)
  isNdpsCase?: boolean;
  ndpsSampleSentToLab?: ReviewStatus | boolean;
  ndpsLabReportReceived?: ReviewStatus | boolean;
  ndpsExhibitSentToSafeHouse?: ReviewStatus | boolean;

  // 7. Investigation Forensics & Digital Stats
  totalCdUploaded?: number;
  poPreserved?: ReviewStatus | boolean;
  poVideographyDone?: ReviewStatus | boolean;
  totalSidCreated?: number;
  sidLinkedWithFir?: ReviewStatus | boolean;
  targetDisposalDate?: string;
  targetRemarks?: string;
  lastCaseReviewDate?: string;
  noOfReviews?: number;

  createdAt: string;
  updatedAt: string;
}

export interface LandDispute {
  id: string;
  district?: string;
  subdivision?: string;
  ps: PoliceStationName;
  date: string; // Auto-fetched date (YYYY-MM-DD)
  victimName: string;
  victimAddress: string; // Full address with village / panchayat
  oppositePartyName?: string;
  plotDetails: string; // Khata/Khesra/Plot No, Mauza
  disputeNature: string; // Boundary / Encroachment / Illegal Possession / Pathway
  status: 'Pending' | 'Disposed';
  disposalDate?: string;
  disposalRemarks?: string;
  janataDarbarAction?: string;
  remarks?: string;
  createdAt: string;
}

export interface UDCase {
  id: string;
  udCaseNo: string; // e.g., "UD 05/2026"
  district?: string;
  subdivision?: string;
  ps: PoliceStationName;
  date: string;
  deceasedName: string;
  deceasedAgeGender?: string;
  placeOfOccurrence: string;
  causeOfDeath: string;
  postMortemReportStatus: 'Pending' | 'Received';
  visceralReportStatus: 'Not Required' | 'Sent for Testing' | 'Report Received';
  status: 'Under Investigation' | 'Final Report Submitted' | 'Closed';
  ciSupervisionRemarks?: string;
  sdpoRemarks?: string;
}

export interface RegisteredFIRItem {
  firNumber: string;
  date: string;
  sections: string;
  ioName: string;
}

export interface ODShiftItem {
  id?: string;
  shiftName: string; // e.g. 'OD 1 (Day Shift)', 'OD 2 (Evening Shift)', 'OD 3 (Night Shift)'
  timeSlot: string;  // e.g. '06:00 - 14:00', '14:00 - 22:00', '22:00 - 06:00', or custom
  ioName: string;
  ioId?: string;
  phone?: string;
  remarks?: string;
}

export interface GastiShiftItem {
  id?: string;
  shiftName: string; // e.g. 'Morning Gasti', 'Day / Mobile Gasti', 'Night Gasti / Nakabandi', 'Rural Gasti'
  timeSlot: string;  // e.g. '06:00 - 14:00', '14:00 - 22:00', '22:00 - 06:00', or custom
  ioName: string;
  ioId?: string;
  vehicleNumber?: string;
  sectorArea?: string;
  forceCount?: number;
  remarks?: string;
}

export interface OfficerOnDutyDetails {
  od1IoName?: string;
  od2IoName?: string;
  od3IoName?: string;
  odShifts?: ODShiftItem[];
}

export interface GastiPatrolDetails {
  morningGastiIoName?: string;
  dayGastiIoName?: string;
  nightGastiIoName?: string;
  gastiShifts?: GastiShiftItem[];
}

export interface CaseArrestItem {
  caseNumber: string;
  arrestCount: number;
  isLiquorRelated: boolean;
}

export interface ArrestDetails {
  caseArrests: CaseArrestItem[];
  otherArrestsCount: number;
  totalArrestsCount: number;
  liquorArrestsCount: number;
}

export interface RankStrengthDetails {
  rank: 'Inspector' | 'Sub-Inspector (SI)' | 'ASI & PTC' | 'Constable';
  totalStrength: number;
  present: number;
  onLeave: number;
  arrivingToday?: number; // Arriving on leave today (considered present)
  departingToday?: number; // Departing on leave today (considered present)
}

export type OfficerLeaveRank = 'Inspector' | 'Sub-Inspector (SI)' | 'ASI & PTC';

export type OfficerLeaveType = 'CL' | 'CPL' | 'OTHERS';

export interface LeaveLedgerEntry {
  id: string;
  reportId?: string;
  district?: string;
  subdivision?: string;
  ps: PoliceStationName;
  officerName: string;
  rank: OfficerLeaveRank;
  departureDate: string; // YYYY-MM-DD
  daysOnLeave: number; // e.g. 4
  arrivalDate: string; // YYYY-MM-DD (calculated: departureDate + (daysOnLeave + 1) days)
  actualArrivalDate?: string;
  status: 'ON_LEAVE' | 'ARRIVED' | 'OVERDUE';
  leaveType?: OfficerLeaveType | string;
  remarks?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface DailyCrimeReport {
  id: string;
  district?: string;
  subdivision?: string;
  ps: PoliceStationName;
  date: string;
  firsRegisteredCount: number;
  registeredFirs?: RegisteredFIRItem[];
  odDetails?: OfficerOnDutyDetails;
  gastiDetails?: GastiPatrolDetails;
  arrestsCount: number;
  arrestDetails?: ArrestDetails;
  rankStrengths?: RankStrengthDetails[];
  leaveLedgerEntries?: LeaveLedgerEntry[];
  seizuresSummary?: string;
  majorIncidentsNotes?: string;
  submittedBy: string;
  createdAt?: string;
}

export interface UserMessage {
  id: string;
  senderUserId: string;
  senderName: string;
  senderRole: UserRole;
  recipientUserId: string; // Specific userId or 'ALL' or PS role or 'SDPO' or comma-separated
  recipientUserIds?: string[]; // Array of registered user IDs when sent to multiple officers
  recipientName: string;
  subject: string;
  messageText: string;
  priority: 'Routine' | 'Urgent' | 'Directive';
  createdAt: string;
  readBy?: string[];
}

export interface FilterOptions {
  searchQuery: string;
  policeStations: PoliceStationName[]; // Empty array means ALL
  subdivisions?: string[];             // Subdivisions filter for District Level
  districts?: string[];                // Districts filter
  designations: CaseDesignation[];     // Empty array means ALL
  deadlineStatus: 'ALL' | 'ON_TRACK' | 'APPROACHING' | 'OVERDUE' | 'COMPLETED';
  crimeHeads?: string[];               // Empty array means ALL crime heads
  statuses: CaseStatus[];               // Empty array means ALL (Under Investigation, Disposed)
  chargesheetedFilter?: 'ALL' | 'YES' | 'NO'; // Filter: Chargesheeted / Final Form Submitted / Mistake of Fact (ALL / YES / NO)
  cctnsSyncFilter: CCTNSSyncOption;
  chargesheetCCTNS?: 'ALL' | 'YES' | 'NO';
  caseDiaryCCTNS?: 'ALL' | 'YES' | 'NO';
  punishmentFilter?: 'ALL' | '7_years_or_more' | 'less_than_7_years';
  ioNames: string[];                   // Empty array means ALL
  startDate: string;
  endDate: string;
  chargesheetStartDate?: string;
  chargesheetEndDate?: string;
  disposedStartDate?: string;
  disposedEndDate?: string;
  deadlineCategories: DeadlineCategory[]; // Empty array means ALL (both 60 & 90)
}

export type ReviewFilterValue = 'ALL' | 'YES' | 'PENDING' | 'NA' | 'NO';

export interface CaseReviewFilterOptions {
  searchQuery: string;
  policeStation: PoliceStationName | 'ALL';
  ioName?: string;
  firStartDate?: string;
  firEndDate?: string;
  disposedStartDate?: string;
  disposedEndDate?: string;
  subdivision?: string;
  district?: string;
  designation: 'ALL' | CaseDesignation;
  status: 'ALL' | CaseStatus;
  
  // Injury & Forensics
  isInjuryPresent: 'ALL' | 'YES' | 'NO';
  injuryReportReceived: ReviewFilterValue;
  pmReportReceived: ReviewFilterValue;
  visceraPreserved: ReviewFilterValue;
  fslVisitedPO: ReviewFilterValue;
  fslItemPreserved: 'ALL' | 'YES' | 'NO';
  fslItemSentOrPermission: ReviewFilterValue;
  fslReportReceived: ReviewFilterValue;

  // Arrests, Notice, Bail
  pendingForArrest: 'ALL' | 'YES' | 'NO';
  anyPersonArrested: 'ALL' | 'YES' | 'NO';
  anyPersonServedNotice: 'ALL' | 'YES' | 'NO';
  anyPersonOnBailOrSurrendered: 'ALL' | 'YES' | 'NO';

  // Victim Recovery
  isVictimRecoveryCase: 'ALL' | 'YES' | 'NO';
  victimAgeType: 'ALL' | 'minor' | 'major';
  victimRecovered: 'ALL' | 'YES' | 'NO';

  // Special Acts
  isArmsCase: 'ALL' | 'YES' | 'NO';
  armsVerificationStatus: 'ALL' | 'SENT' | 'REPORT_RECEIVED' | 'PENDING';
  armsSentForVerification?: ReviewFilterValue;
  armsReportReceived?: ReviewFilterValue;

  isLiquorCase: 'ALL' | 'YES' | 'NO';
  liquorSentToLab?: ReviewFilterValue;
  liquorLabReport: ReviewFilterValue;
  confiscationOfLiquor?: ReviewFilterValue;
  liquorVehicleSeized: 'ALL' | 'YES' | 'NO';
  vehicleVerifiedRTO?: ReviewFilterValue;

  isNdpsCase: 'ALL' | 'YES' | 'NO';
  ndpsSampleSentToLab?: ReviewFilterValue;
  ndpsLabReport: ReviewFilterValue;
  ndpsSafeHouse: ReviewFilterValue;

  // Forensics & Digital
  poPreserved: ReviewFilterValue;
  poVideographyDone: ReviewFilterValue;
  sidLinkedWithFir: ReviewFilterValue;
  reviewCountFilter: 'ALL' | 'ZERO' | '1_OR_MORE' | '2_OR_MORE' | '3_OR_MORE';
  targetDateStatus: 'ALL' | 'SET' | 'NOT_SET';
  
  startDate?: string;
  endDate?: string;
}

export type PermissionLevel = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'OPERATOR';

export interface UserAccount {
  id: string;
  userId: string;
  password: string;
  role: UserRole;
  permissionLevel: PermissionLevel;
  officerName: string;
  rank: string;
  district?: string; // e.g. "Munger"
  subdivision?: string; // e.g. "Tarapur"
  policeStation: string; // e.g. "Tarapur", "Subdivision HQ", or "District HQ"
  contactNumber?: string;
  isActive: boolean;
  lastLogin?: string;
}

export interface UserAuthSession {
  role: UserRole;
  userId: string;
  loginTime: string;
}

