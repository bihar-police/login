import { FIRCase, CrimeHead } from '../types';

export type StatutoryCategory = 
  | 'Heinous & Violent' 
  | 'Property & Economic' 
  | 'Women & Children' 
  | 'Special & Local Laws (SLL)' 
  | 'Cyber & General' 
  | 'Custom / Local Laws';

export interface CrimeHeadMeta {
  id: CrimeHead;
  name: string;
  hindiName?: string;
  category: StatutoryCategory;
  isMajorHead: boolean; // Major highlight cards (Theft, Loot, Murder, Extortion, Dacoity, POCSO, SC/ST, Kidnapping, Arms Act, Liquor)
  isSpecialLocalLaw?: boolean; // Flag indicating law matching by Name / Keywords (ignores section numbers)
  bnsSections: string[];
  ipcSections: string[];
  sllProvisions?: string[]; // Specific SLL Acts / Local Law names
  lawKeywords?: string[]; // Law Name Keywords & Aliases to match (Zero-section dependency for SLL)
  remandTrack: string; // Remand Track (BNSS Sec. 187)
  forensicSceneVisit: string; // Forensic Scene Visit (BNSS Sec. 176(3))
  isForensicMandatory: boolean;
  punishmentTerm?: string;
  guidelines?: string;
  isCustom?: boolean;
  isEditable?: boolean;
  color: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    darkBadgeBg: string;
    darkBadgeText: string;
    chartColor: string;
  };
  icon: string;
  description: string;
}

export const DEFAULT_CRIME_HEADS_CONFIG: Record<string, CrimeHeadMeta> = {
  'Murder': {
    id: 'Murder',
    name: 'Murder',
    hindiName: 'हत्या (कत्ल)',
    category: 'Heinous & Violent',
    isMajorHead: true,
    bnsSections: ['Section 103(1)', '103/3(5)'],
    ipcSections: ['Section 302 IPC', '302/34', '302/120B'],
    remandTrack: '90-Day Track (Death / Life)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Death / Imprisonment for Life + Fine',
    guidelines: 'SDPO supervision note within 48 hrs. Immediate ballistic / forensic seizure.',
    color: {
      bg: 'bg-rose-500',
      text: 'text-rose-600',
      border: 'border-rose-300 dark:border-rose-800',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/80',
      badgeText: 'text-rose-800 dark:text-rose-300',
      darkBadgeBg: 'bg-rose-950',
      darkBadgeText: 'text-rose-300',
      chartColor: '#e11d48',
    },
    icon: '🩸',
    description: 'Murder (Sec 103(1) BNS / Sec 302 IPC) - Heinous Crime Monitored by SDPO/SP',
  },
  'Mob Lynching': {
    id: 'Mob Lynching',
    name: 'Mob Lynching',
    hindiName: 'भीड़ हिंसा / मॉब लिंचिंग',
    category: 'Heinous & Violent',
    isMajorHead: false,
    bnsSections: ['Section 103(2)'],
    ipcSections: ['No single section (Sec. 302 r/w 149/34 IPC)'],
    remandTrack: '90-Day Track (Death / Life)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Death / Life Imprisonment + Fine',
    color: {
      bg: 'bg-red-700',
      text: 'text-red-700',
      border: 'border-red-400 dark:border-red-800',
      badgeBg: 'bg-red-100 dark:bg-red-950',
      badgeText: 'text-red-900 dark:text-red-200',
      darkBadgeBg: 'bg-red-950',
      darkBadgeText: 'text-red-200',
      chartColor: '#b91c1c',
    },
    icon: '⚠️',
    description: 'Murder by mob of 5 or more persons (Sec 103(2) BNS)',
  },
  'Culpable Homicide': {
    id: 'Culpable Homicide',
    name: 'Culpable Homicide',
    hindiName: 'गैर-इरादतन हत्या',
    category: 'Heinous & Violent',
    isMajorHead: false,
    bnsSections: ['Section 105', '110'],
    ipcSections: ['Section 304 (Part I & Part II) IPC', '308 IPC'],
    remandTrack: '90-Day Track (Life / up to 10 Yrs)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Life / 10 Years',
    color: {
      bg: 'bg-amber-600',
      text: 'text-amber-600',
      border: 'border-amber-300 dark:border-amber-800',
      badgeBg: 'bg-amber-100 dark:bg-amber-950',
      badgeText: 'text-amber-800 dark:text-amber-300',
      darkBadgeBg: 'bg-amber-950',
      darkBadgeText: 'text-amber-300',
      chartColor: '#d97706',
    },
    icon: '⚖️',
    description: 'Culpable Homicide not amounting to murder (Sec 105 BNS / Sec 304 IPC)',
  },
  'Attempt to Murder': {
    id: 'Attempt to Murder',
    name: 'Attempt to Murder',
    hindiName: 'हत्या का प्रयास (जानलेवा हमला)',
    category: 'Heinous & Violent',
    isMajorHead: true,
    bnsSections: ['Section 109', '109(1)', '109(2)', '109/3(5)'],
    ipcSections: ['Section 307 IPC', '307/34', '307/149'],
    remandTrack: '90-Day Track (Up to 10 Yrs / Life if hurt caused)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Up to 10 Years / Life (if hurt caused)',
    guidelines: 'Collect injury report / O.D. slip from hospital. FSL ballistics if firing occurred.',
    color: {
      bg: 'bg-red-600',
      text: 'text-red-600',
      border: 'border-red-300 dark:border-red-800',
      badgeBg: 'bg-red-100 dark:bg-red-950',
      badgeText: 'text-red-800 dark:text-red-300',
      darkBadgeBg: 'bg-red-950',
      darkBadgeText: 'text-red-300',
      chartColor: '#dc2626',
    },
    icon: '🎯',
    description: 'Attempt to Murder (Sec 109 BNS & subsections / Sec 307 IPC)',
  },
  'Dacoity': {
    id: 'Dacoity',
    name: 'Dacoity',
    hindiName: 'डकैती / सशस्त्र डकैती',
    category: 'Property & Economic',
    isMajorHead: true,
    bnsSections: ['Section 310', '310(2)', '311', '312', '313'],
    ipcSections: ['Section 391', '395', '396', '397', '398 IPC'],
    remandTrack: '90-Day Track (10 Yrs / Life / Death under 311)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: '10 Years to Life Imprisonment / Death',
    guidelines: 'Test Identification Parade (TIP) of arrested accused. Scene fingerprint lifting.',
    color: {
      bg: 'bg-purple-600',
      text: 'text-purple-600',
      border: 'border-purple-300 dark:border-purple-800',
      badgeBg: 'bg-purple-100 dark:bg-purple-950',
      badgeText: 'text-purple-800 dark:text-purple-300',
      darkBadgeBg: 'bg-purple-950',
      darkBadgeText: 'text-purple-300',
      chartColor: '#9333ea',
    },
    icon: '👥',
    description: 'Dacoity & Dacoity with Murder (Sec 310, 311 BNS / Sec 395, 396 IPC)',
  },
  'Robbery / Loot': {
    id: 'Robbery / Loot',
    name: 'Robbery / Loot',
    hindiName: 'लूट / राहजनी',
    category: 'Property & Economic',
    isMajorHead: true,
    bnsSections: ['Section 309', '309(4)', '309(6)', '311', '312'],
    ipcSections: ['Section 390', '392', '393', '394 IPC'],
    remandTrack: '90-Day Track (Up to 10 Yrs / 14 Yrs on highway)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Up to 10 Years / 14 Years on Highway',
    guidelines: 'CCTV footage preservation within 24h. Mobile CDR tower dump analysis.',
    color: {
      bg: 'bg-violet-600',
      text: 'text-violet-600',
      border: 'border-violet-300 dark:border-violet-800',
      badgeBg: 'bg-violet-100 dark:bg-violet-950',
      badgeText: 'text-violet-800 dark:text-violet-300',
      darkBadgeBg: 'bg-violet-950',
      darkBadgeText: 'text-violet-300',
      chartColor: '#7c3aed',
    },
    icon: '💰',
    description: 'Robbery & Aggravated Highway Robbery (Sec 309 BNS / Sec 392 IPC)',
  },
  'Extortion / Rangdari': {
    id: 'Extortion / Rangdari',
    name: 'Extortion / Rangdari',
    hindiName: 'रंगदारी / जबरन वसूली',
    category: 'Property & Economic',
    isMajorHead: true,
    bnsSections: ['Section 308(2)', '308(4)', '308(5)', '308(6)'],
    ipcSections: ['Section 384', '386', '387', '388', '389 IPC'],
    remandTrack: '• 308(2): 60-Day Track (up to 7 Yrs)\n• 308(5)/(6): 90-Day Track (up to 10 Yrs)',
    forensicSceneVisit: '• 308(2): Not Mandatory\n• 308(5)/(6): Mandatory (≥ 7 Yrs)',
    isForensicMandatory: true,
    punishmentTerm: '3 to 10 Years Imprisonment',
    guidelines: 'Voice recording FSL verification. Bank account / UPI transactions freeze.',
    color: {
      bg: 'bg-orange-600',
      text: 'text-orange-600',
      border: 'border-orange-300 dark:border-orange-800',
      badgeBg: 'bg-orange-100 dark:bg-orange-950',
      badgeText: 'text-orange-800 dark:text-orange-300',
      darkBadgeBg: 'bg-orange-950',
      darkBadgeText: 'text-orange-300',
      chartColor: '#ea580c',
    },
    icon: '📞',
    description: 'Extortion & Threat for Rangdari (Sec 308 BNS / Sec 384-387 IPC)',
  },
  'Snatching': {
    id: 'Snatching',
    name: 'Snatching',
    hindiName: 'झपटमारी (चेन / मोबाइल)',
    category: 'Property & Economic',
    isMajorHead: false,
    bnsSections: ['Section 304(1)', '304(2)'],
    ipcSections: ['No separate IPC section (Sec. 379 / 356 IPC)'],
    remandTrack: '60-Day Track (Up to 3 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 3 Years',
    color: {
      bg: 'bg-amber-500',
      text: 'text-amber-500',
      border: 'border-amber-300 dark:border-amber-800',
      badgeBg: 'bg-amber-100 dark:bg-amber-950',
      badgeText: 'text-amber-800 dark:text-amber-300',
      darkBadgeBg: 'bg-amber-950',
      darkBadgeText: 'text-amber-300',
      chartColor: '#f59e0b',
    },
    icon: '🏃',
    description: 'Snatching of chain, purse, mobile (Sec 304(1)/(2) BNS)',
  },
  'Theft': {
    id: 'Theft',
    name: 'Theft',
    hindiName: 'चोरी (सामान्य व गृह चोरी)',
    category: 'Property & Economic',
    isMajorHead: true,
    bnsSections: ['Section 303(2)', '305', '306'],
    ipcSections: ['Section 379', '380', '381', '382 IPC'],
    remandTrack: '• 303(2): 60-Day Track (up to 3 Yrs)\n• 305: 60-Day Track (up to 7 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 3 to 7 Years',
    guidelines: 'Stolen vehicle / property recovery memo. Chasis & engine verification via VAHAN.',
    color: {
      bg: 'bg-yellow-600',
      text: 'text-yellow-600',
      border: 'border-yellow-300 dark:border-yellow-800',
      badgeBg: 'bg-yellow-100 dark:bg-yellow-950',
      badgeText: 'text-yellow-800 dark:text-yellow-300',
      darkBadgeBg: 'bg-yellow-950',
      darkBadgeText: 'text-yellow-300',
      chartColor: '#ca8a04',
    },
    icon: '🔓',
    description: 'Theft & Dwelling House Theft (Sec 303(2), 305 BNS / Sec 379, 380 IPC)',
  },
  'Nocturnal Burglary / House-Breaking': {
    id: 'Nocturnal Burglary / House-Breaking',
    name: 'Nocturnal Burglary / House-Breaking',
    hindiName: 'रात्रि गृहभेदन / नकाबजनी',
    category: 'Property & Economic',
    isMajorHead: false,
    bnsSections: ['Section 331(3)', '331(4)'],
    ipcSections: ['Section 456', '457', '458 IPC'],
    remandTrack: '• 331(4) (to commit theft): 90-Day Track (May extend to 14 Yrs)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Up to 14 Years',
    color: {
      bg: 'bg-slate-800',
      text: 'text-slate-800 dark:text-slate-200',
      border: 'border-slate-500 dark:border-slate-700',
      badgeBg: 'bg-slate-200 dark:bg-slate-800',
      badgeText: 'text-slate-900 dark:text-slate-200',
      darkBadgeBg: 'bg-slate-800',
      darkBadgeText: 'text-slate-200',
      chartColor: '#334155',
    },
    icon: '🏚️',
    description: 'House-breaking by night to commit offence (Sec 331(3)/(4) BNS / Sec 457 IPC)',
  },
  'Stolen Property': {
    id: 'Stolen Property',
    name: 'Stolen Property',
    hindiName: 'चोरी की संपत्ति प्राप्त करना',
    category: 'Property & Economic',
    isMajorHead: false,
    bnsSections: ['Section 317(1)', '317(2)', '317(4)'],
    ipcSections: ['Section 411', '412', '413', '414 IPC'],
    remandTrack: '• 317(2): 60-Day Track (up to 3 Yrs)\n• 317(4): 90-Day Track (Life / up to 10 Yrs)',
    forensicSceneVisit: '• 317(2): Not Mandatory\n• 317(4): Mandatory',
    isForensicMandatory: false,
    punishmentTerm: '3 Years to Life',
    color: {
      bg: 'bg-amber-700',
      text: 'text-amber-700',
      border: 'border-amber-400 dark:border-amber-800',
      badgeBg: 'bg-amber-100 dark:bg-amber-950',
      badgeText: 'text-amber-900 dark:text-amber-200',
      darkBadgeBg: 'bg-amber-950',
      darkBadgeText: 'text-amber-200',
      chartColor: '#b45309',
    },
    icon: '📦',
    description: 'Dishonestly Receiving Stolen Property (Sec 317 BNS / Sec 411 IPC)',
  },
  'Kidnapping / Abduction': {
    id: 'Kidnapping / Abduction',
    name: 'Kidnapping / Abduction',
    hindiName: 'अपहरण / व्यपहरण',
    category: 'Heinous & Violent',
    isMajorHead: true,
    bnsSections: ['Sections 137(2)', '138', '139', '140', '140(2)'],
    ipcSections: ['Sections 363', '364', '364A', '365 IPC'],
    remandTrack: '• 137(2): 60-Day Track (up to 7 Yrs)\n• 140(2) (Ransom): 90-Day Track (Death / Life)',
    forensicSceneVisit: '• 137(2): Not Mandatory\n• 140: Mandatory (≥ 7 Yrs)',
    isForensicMandatory: true,
    punishmentTerm: '7 Years to Death / Life Imprisonment',
    guidelines: 'Immediate victim recovery SOP. CDR tracking, surveillance, 164 BNSS statement.',
    color: {
      bg: 'bg-indigo-600',
      text: 'text-indigo-600',
      border: 'border-indigo-300 dark:border-indigo-800',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-950',
      badgeText: 'text-indigo-800 dark:text-indigo-300',
      darkBadgeBg: 'bg-indigo-950',
      darkBadgeText: 'text-indigo-300',
      chartColor: '#4f46e5',
    },
    icon: '🚨',
    description: 'Kidnapping for ransom / abduction (Sec 137, 140 BNS / Sec 363, 364A IPC)',
  },
  'Dowry Death': {
    id: 'Dowry Death',
    name: 'Dowry Death',
    hindiName: 'दहेज हत्या',
    category: 'Women & Children',
    isMajorHead: false,
    bnsSections: ['Section 80', '80(2)'],
    ipcSections: ['Section 304B IPC'],
    remandTrack: '90-Day Track (Min. 7 Yrs up to Life)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Min. 7 Years to Life Imprisonment',
    color: {
      bg: 'bg-pink-600',
      text: 'text-pink-600',
      border: 'border-pink-300 dark:border-pink-800',
      badgeBg: 'bg-pink-100 dark:bg-pink-950',
      badgeText: 'text-pink-800 dark:text-pink-300',
      darkBadgeBg: 'bg-pink-950',
      darkBadgeText: 'text-pink-300',
      chartColor: '#db2777',
    },
    icon: '💔',
    description: 'Dowry Death within 7 years of marriage (Sec 80 BNS / Sec 304B IPC)',
  },
  'Sec 69 BNS (Sexual Deceit)': {
    id: 'Sec 69 BNS (Sexual Deceit)',
    name: 'Sexual Deceit (Marriage Promise)',
    hindiName: 'शादी का झांसा देकर यौन संबंध',
    category: 'Women & Children',
    isMajorHead: false,
    bnsSections: ['Section 69'],
    ipcSections: ['New substantive offence (Previously charged under Sec. 376(1) IPC via deceit)'],
    remandTrack: '90-Day Track (May extend to 10 Yrs)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: 'Up to 10 Years + Fine',
    color: {
      bg: 'bg-rose-700',
      text: 'text-rose-700',
      border: 'border-rose-400 dark:border-rose-800',
      badgeBg: 'bg-rose-100 dark:bg-rose-950',
      badgeText: 'text-rose-900 dark:text-rose-200',
      darkBadgeBg: 'bg-rose-950',
      darkBadgeText: 'text-rose-200',
      chartColor: '#be123c',
    },
    icon: '💍',
    description: 'Sexual intercourse on false promise of employment or marriage (Sec 69 BNS)',
  },
  'Rape': {
    id: 'Rape',
    name: 'Rape / Gang Rape',
    hindiName: 'दुष्कर्म / सामूहिक बलात्कार',
    category: 'Women & Children',
    isMajorHead: false,
    bnsSections: ['Section 64(1)', '64(2)', '70(1)', '70(2)'],
    ipcSections: ['Section 376(1)', '376(2)', '376D IPC'],
    remandTrack: '90-Day Track (10 Yrs to Life / Death for Gang Rape)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: '10 Years to Life / Death',
    color: {
      bg: 'bg-fuchsia-700',
      text: 'text-fuchsia-700',
      border: 'border-fuchsia-400 dark:border-fuchsia-800',
      badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-950',
      badgeText: 'text-fuchsia-900 dark:text-fuchsia-200',
      darkBadgeBg: 'bg-fuchsia-950',
      darkBadgeText: 'text-fuchsia-200',
      chartColor: '#a21caf',
    },
    icon: '🛡️',
    description: 'Rape & Gang Rape (Sec 64, 70 BNS / Sec 376 IPC)',
  },
  'POCSO Act': {
    id: 'POCSO Act',
    name: 'POCSO Act',
    hindiName: 'पॉक्सो एक्ट (लैंगिक अपराधों से बालकों का संरक्षण)',
    category: 'Women & Children',
    isMajorHead: true,
    isSpecialLocalLaw: true,
    bnsSections: ['POCSO Act 2012', 'Sec 65(1), 66 BNS'],
    ipcSections: ['Sec 4, 6, 8, 10, 12 POCSO Act'],
    sllProvisions: ['Protection of Children from Sexual Offences (POCSO) Act 2012'],
    lawKeywords: ['pocso', 'pocso act', 'protection of children', 'posco', 'child sexual', 'lanhghik apradh', 'nabalik se dushkarm'],
    remandTrack: '90-Day Track (20 Yrs to Life / Death)',
    forensicSceneVisit: 'Mandatory (DNA / Medical Sampling Required)',
    isForensicMandatory: true,
    punishmentTerm: '20 Years to Life / Death',
    guidelines: 'Immediate medical examination within 24h. Sec 164 statement before Magistrate. No disclosure of identity.',
    color: {
      bg: 'bg-cyan-600',
      text: 'text-cyan-600',
      border: 'border-cyan-300 dark:border-cyan-800',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-950',
      badgeText: 'text-cyan-800 dark:text-cyan-300',
      darkBadgeBg: 'bg-cyan-950',
      darkBadgeText: 'text-cyan-300',
      chartColor: '#0891b2',
    },
    icon: '👧',
    description: 'POCSO Act 2012 - Child Sexual Abuse & Aggravated Sexual Assault',
  },
  'Molestation / Outraging Modesty': {
    id: 'Molestation / Outraging Modesty',
    name: 'Molestation / Stalking',
    hindiName: 'छेड़खानी / शीलभंग / पीछा करना',
    category: 'Women & Children',
    isMajorHead: false,
    bnsSections: ['Sections 74', '75', '76', '78', '79'],
    ipcSections: ['Sections 354', '354A', '354B', '354D', '509 IPC'],
    remandTrack: '60-Day Track (Sentences range from 1 to 7 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: '1 to 7 Years',
    color: {
      bg: 'bg-teal-600',
      text: 'text-teal-600',
      border: 'border-teal-300 dark:border-teal-800',
      badgeBg: 'bg-teal-100 dark:bg-teal-950',
      badgeText: 'text-teal-800 dark:text-teal-300',
      darkBadgeBg: 'bg-teal-950',
      darkBadgeText: 'text-teal-300',
      chartColor: '#0d9488',
    },
    icon: '🛑',
    description: 'Assault to outrage modesty, disrobing, stalking (Sec 74-79 BNS / Sec 354 IPC)',
  },
  'Cruelty by Husband (85 BNS / 498A)': {
    id: 'Cruelty by Husband (85 BNS / 498A)',
    name: 'Cruelty by Husband / In-laws',
    hindiName: 'ससुराल में प्रताड़ना (दहेज उत्पीड़न)',
    category: 'Women & Children',
    isMajorHead: false,
    bnsSections: ['Section 85', '86'],
    ipcSections: ['Section 498A IPC'],
    remandTrack: '60-Day Track (Up to 3 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 3 Years + Fine',
    color: {
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-300 dark:border-emerald-800',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      darkBadgeBg: 'bg-emerald-950',
      darkBadgeText: 'text-emerald-300',
      chartColor: '#059669',
    },
    icon: '🏠',
    description: 'Cruelty by Husband or Relatives (Sec 85 BNS / Sec 498A IPC)',
  },
  'Hit-and-Run / Rash Driving Fatalities': {
    id: 'Hit-and-Run / Rash Driving Fatalities',
    name: 'Hit-and-Run / Rash Driving',
    hindiName: 'सड़क दुर्घटना एवं हिट-एंड-रन',
    category: 'Cyber & General',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sections 106(1)', '106(2)', '281'],
    ipcSections: ['Sections 279', '304A IPC'],
    sllProvisions: ['Motor Vehicles (MV) Act 1988'],
    lawKeywords: ['hit and run', 'hit-and-run', 'rash driving', 'sarak durghatna', 'durghatna me mrityu', 'gaadi se thakkar', 'fleeing scene', 'accident fatal', 'motor vehicle', 'mv act', 'm.v. act'],
    remandTrack: '• 106(1): 60-Day Track (up to 5 Yrs)\n• 106(2) (Fleeing scene): 90-Day Track (up to 10 Yrs)',
    forensicSceneVisit: '• 106(1): Not Mandatory\n• 106(2): Mandatory (≥ 7 Yrs)',
    isForensicMandatory: true,
    punishmentTerm: '5 to 10 Years',
    color: {
      bg: 'bg-red-800',
      text: 'text-red-800',
      border: 'border-red-400 dark:border-red-800',
      badgeBg: 'bg-red-100 dark:bg-red-950',
      badgeText: 'text-red-900 dark:text-red-200',
      darkBadgeBg: 'bg-red-950',
      darkBadgeText: 'text-red-200',
      chartColor: '#991b1b',
    },
    icon: '🚗',
    description: 'Causing death by rash and negligent driving & Hit-and-Run (Sec 106 BNS / 304A IPC)',
  },
  'Arms Act': {
    id: 'Arms Act',
    name: 'Arms Act',
    hindiName: 'आर्म्स एक्ट (अवैध हथियार / गोलीबारी)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: true,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 25, 26, 27 Arms Act 1959'],
    ipcSections: ['Sec 25(1-b)a, 26, 27, 35 Arms Act'],
    sllProvisions: ['Arms Act 1959', 'Arms Rules 2016'],
    lawKeywords: [
      'arms',
      'arms act',
      'shastra',
      'firearm',
      'weapon',
      'tamancha',
      'katta',
      'pistol',
      'revolver',
      'rifle',
      'gun',
      'cartridge',
      'kartoot',
      'kartoos',
      'golibari',
      'goli chala',
      'deshi katta',
      'munger made',
      'ammunition'
    ],
    remandTrack: '90-Day Track (7 Yrs to Life under 25(1AA)/27)',
    forensicSceneVisit: 'Mandatory (Armorer / Ballistics Verification)',
    isForensicMandatory: true,
    punishmentTerm: '7 Years to Life Imprisonment',
    guidelines: 'Armorer report on weapon functionality within 7 days. Ballistics FSL test for empty cartridges.',
    color: {
      bg: 'bg-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-400 dark:border-slate-700',
      badgeBg: 'bg-slate-200 dark:bg-slate-800',
      badgeText: 'text-slate-900 dark:text-slate-200',
      darkBadgeBg: 'bg-slate-800',
      darkBadgeText: 'text-slate-200',
      chartColor: '#475569',
    },
    icon: '🔫',
    description: 'Arms Act 1959 (Sec 25, 26, 27) - Illegal Firearms & Ammunition',
  },
  'Bihar Prohibition & Excise Act (Liquor)': {
    id: 'Bihar Prohibition & Excise Act (Liquor)',
    name: 'Bihar Prohibition & Excise Act (Liquor)',
    hindiName: 'बिहार मद्यनिषेध एवं उत्पाद अधिनियम (शराब)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: true,
    isSpecialLocalLaw: true,
    bnsSections: ['Bihar Prohibition & Excise Act 2016 (Amended 2022)'],
    ipcSections: ['Sec 30(a), 37, 41, 56 Bihar Prohibition Act'],
    sllProvisions: ['Bihar Prohibition & Excise Act 2016', 'Excise Rules'],
    lawKeywords: [
      'excise',
      'prohibition',
      'liquor',
      'sharab',
      'madhyanishedh',
      'madhya nishedh',
      'daru',
      'bhatti',
      'taari',
      'chullu',
      'alcohol',
      'desi sharab',
      'videshi sharab',
      'rajsat',
      'bihar prohibition'
    ],
    remandTrack: '60 / 90-Day Track (Commercial consignment: 90-Day)',
    forensicSceneVisit: 'Mandatory (Chemical / Excise Lab Sample)',
    isForensicMandatory: true,
    punishmentTerm: '5 to 10 Years + Vehicle Confiscation (Rajsat)',
    guidelines: 'Chemical examination report within 15 days. Vehicle confiscation proposal to District Magistrate.',
    color: {
      bg: 'bg-amber-800',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-500 dark:border-amber-700',
      badgeBg: 'bg-amber-100 dark:bg-amber-950',
      badgeText: 'text-amber-900 dark:text-amber-200',
      darkBadgeBg: 'bg-amber-950',
      darkBadgeText: 'text-amber-200',
      chartColor: '#92400e',
    },
    icon: '🍾',
    description: 'Bihar Prohibition & Excise Act 2016 - Illegal Liquor Trade, Manufacturing & Smuggling',
  },
  'SC/ST Act': {
    id: 'SC/ST Act',
    name: 'SC/ST Act',
    hindiName: 'अनुसूचित जाति/जनजाति अत्याचार निवारण',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: true,
    isSpecialLocalLaw: true,
    bnsSections: ['SC/ST POA Act 1989 (Amended 2018)'],
    ipcSections: ['Sec 3(1)(r), 3(1)(s), 3(2)(v) POA Act'],
    sllProvisions: ['Scheduled Castes & Scheduled Tribes (POA) Act 1989'],
    lawKeywords: [
      'sc/st',
      'sc / st',
      'sc st',
      'sc-st',
      'poa act',
      'atrocities',
      'harijan',
      'dalit',
      'jaatisuchak',
      'jaati suchak',
      'atrocity'
    ],
    remandTrack: '60 / 90-Day Track (Offence specific)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years for heinous offences)',
    isForensicMandatory: true,
    punishmentTerm: '6 Months to Life Imprisonment',
    guidelines: 'Supervision strictly by SDPO rank officer. Victim compensation proposal within 7 days.',
    color: {
      bg: 'bg-amber-700',
      text: 'text-amber-700',
      border: 'border-amber-400 dark:border-amber-800',
      badgeBg: 'bg-amber-100 dark:bg-amber-950',
      badgeText: 'text-amber-900 dark:text-amber-200',
      darkBadgeBg: 'bg-amber-950',
      darkBadgeText: 'text-amber-200',
      chartColor: '#b45309',
    },
    icon: '⚖️',
    description: 'Scheduled Castes & Scheduled Tribes (POA) Act 1989 - Monitored by SDPO',
  },
  'NDPS Act': {
    id: 'NDPS Act',
    name: 'NDPS Act',
    hindiName: 'मादक पदार्थ (एनडीपीएस एक्ट)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: true,
    isSpecialLocalLaw: true,
    bnsSections: ['NDPS Act 1985'],
    ipcSections: ['Sec 8/20, 8/21, 8/22, 27A NDPS Act'],
    sllProvisions: ['Narcotic Drugs and Psychotropic Substances Act 1985'],
    lawKeywords: [
      'ndps',
      'ndps act',
      'narcotic',
      'psychotropic',
      'ganja',
      'bhang',
      'charas',
      'afeem',
      'afim',
      'opium',
      'smack',
      'heroin',
      'brown sugar',
      'drug'
    ],
    remandTrack: '90-Day / 180-Day Special Track (Commercial Qty)',
    forensicSceneVisit: 'Mandatory (Chemical / Lab Sampling Required)',
    isForensicMandatory: true,
    punishmentTerm: '10 to 20 Years Rigorous Imprisonment',
    guidelines: 'Search & seizure compliance under Sec 50 NDPS Act. Magistrate sampling within 48h.',
    color: {
      bg: 'bg-emerald-700',
      text: 'text-emerald-700',
      border: 'border-emerald-400 dark:border-emerald-800',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
      badgeText: 'text-emerald-900 dark:text-emerald-200',
      darkBadgeBg: 'bg-emerald-950',
      darkBadgeText: 'text-emerald-200',
      chartColor: '#047857',
    },
    icon: '💊',
    description: 'Narcotic Drugs & Psychotropic Substances Act 1985 (Ganja / Heroin / Smack / Pills)',
  },
  'Awaidh Khanan (Illegal Mining)': {
    id: 'Awaidh Khanan (Illegal Mining)',
    name: 'Awaidh Khanan (Illegal Mining)',
    hindiName: 'अवैध खनन एवं परिवहन (MMDR / बालू)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 21 MMDR Act & Sec 303(2) BNS', 'Bihar Minerals Rules'],
    ipcSections: ['Sec 379/411 IPC + 21 MMDR Act'],
    sllProvisions: ['Mines and Minerals (Development and Regulation) Act 1957', 'Bihar Minerals Rules 2019'],
    lawKeywords: [
      'mining',
      'mmdr',
      'khanan',
      'balu',
      'sand mining',
      'gitti khanan',
      'illegal mining',
      'mineral',
      'balu khanan',
      'tractor balu',
      'jcb khanan',
      'khanan adhiniyam'
    ],
    remandTrack: '60-Day Track (Up to 5 Yrs)',
    forensicSceneVisit: 'Not Mandatory (Physical Measurement / GPS Geo-tagging)',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 5 Years + Heavy Penalty & Vehicle Seizure',
    color: {
      bg: 'bg-stone-600',
      text: 'text-stone-600 dark:text-stone-300',
      border: 'border-stone-400 dark:border-stone-700',
      badgeBg: 'bg-stone-200 dark:bg-stone-800',
      badgeText: 'text-stone-900 dark:text-stone-200',
      darkBadgeBg: 'bg-stone-800',
      darkBadgeText: 'text-stone-200',
      chartColor: '#57534e',
    },
    icon: '⛏️',
    description: 'Illegal Sand/Stone Mining & Transport (Sec 21 MMDR Act / Bihar Minor Mineral Rules / SLL)',
  },
  'Explosive Substances Act': {
    id: 'Explosive Substances Act',
    name: 'Explosive Substances Act',
    hindiName: 'विस्फोटक पदार्थ अधिनियम',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 3, 4, 5 Explosive Substances Act', '288 BNS'],
    ipcSections: ['Sec 3, 4, 5 Explosive Substances Act', '286 IPC'],
    sllProvisions: ['Explosive Substances Act 1908'],
    lawKeywords: ['explosive', 'bomb', 'visphotak', 'blast', 'dynamite', 'detonator', 'patakha', 'visfotak'],
    remandTrack: '90-Day Track (10 Yrs to Life / Death)',
    forensicSceneVisit: 'Mandatory (Bomb Disposal & Forensic Team)',
    isForensicMandatory: true,
    punishmentTerm: '10 Years to Life / Death',
    color: {
      bg: 'bg-orange-700',
      text: 'text-orange-700',
      border: 'border-orange-400 dark:border-orange-800',
      badgeBg: 'bg-orange-100 dark:bg-orange-950',
      badgeText: 'text-orange-900 dark:text-orange-200',
      darkBadgeBg: 'bg-orange-950',
      darkBadgeText: 'text-orange-200',
      chartColor: '#c2410c',
    },
    icon: '💣',
    description: 'Explosive Substances Act 1908 (Sec 3, 4, 5 / Sec 288 BNS)',
  },
  'Public Gambling Act': {
    id: 'Public Gambling Act',
    name: 'Public Gambling Act',
    hindiName: 'सार्वजनिक जुआ अधिनियम (जुआ / सट्टा)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 3/4 Public Gambling Act', '318 BNS'],
    ipcSections: ['Sec 3, 4 Public Gambling Act 1867'],
    sllProvisions: ['Public Gambling Act 1867', 'Bihar Gambling Rules'],
    lawKeywords: ['gambling', 'public gambling', 'jua', 'satta', 'taash', 'teen patti', 'juaa', 'gambling act'],
    remandTrack: '60-Day Track (Less than 3 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Fine / Up to 1 Year',
    color: {
      bg: 'bg-indigo-700',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-400 dark:border-indigo-800',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-950',
      badgeText: 'text-indigo-900 dark:text-indigo-200',
      darkBadgeBg: 'bg-indigo-950',
      darkBadgeText: 'text-indigo-200',
      chartColor: '#4338ca',
    },
    icon: '🎲',
    description: 'Public Gambling Act 1867 (Jua, Satta, Gambling Dens)',
  },
  'Electric Energy Theft': {
    id: 'Electric Energy Theft',
    name: 'Electric Energy Theft (Electricity Act)',
    hindiName: 'विद्युत ऊर्जा चोरी (बिजली अधिनियम)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 135 Electricity Act 2003', '303(2) BNS'],
    ipcSections: ['Sec 135, 138 Electricity Act'],
    sllProvisions: ['Electricity Act 2003'],
    lawKeywords: ['electricity', 'electricity act', 'vidyut', 'bijli', 'bijli chori', 'electric energy', 'meter tampering', 'vidyut adhiniyam'],
    remandTrack: '60-Day Track (Up to 3 Yrs / 5 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 3 to 5 Years + Fine',
    color: {
      bg: 'bg-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-300 dark:border-blue-800',
      badgeBg: 'bg-blue-100 dark:bg-blue-950',
      badgeText: 'text-blue-800 dark:text-blue-300',
      darkBadgeBg: 'bg-blue-950',
      darkBadgeText: 'text-blue-300',
      chartColor: '#2563eb',
    },
    icon: '⚡',
    description: 'Theft of Electricity & Meter Tampering (Sec 135 Electricity Act 2003)',
  },
  'Essential Commodities Act': {
    id: 'Essential Commodities Act',
    name: 'Essential Commodities Act',
    hindiName: 'आवश्यक वस्तु अधिनियम (7 EC Act)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 7 EC Act 1955'],
    ipcSections: ['Sec 7 EC Act', 'EC Act 1955'],
    sllProvisions: ['Essential Commodities Act 1955'],
    lawKeywords: ['essential commodities', 'ec act', 'pds', 'ration', 'kala bazari', 'fertilizer black marketing', 'khad kala bazari', 'anaj chori'],
    remandTrack: '60-Day Track (Up to 7 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 7 Years',
    color: {
      bg: 'bg-lime-600',
      text: 'text-lime-600',
      border: 'border-lime-300 dark:border-lime-800',
      badgeBg: 'bg-lime-100 dark:bg-lime-950',
      badgeText: 'text-lime-800 dark:text-lime-300',
      darkBadgeBg: 'bg-lime-950',
      darkBadgeText: 'text-lime-300',
      chartColor: '#65a30d',
    },
    icon: '🌾',
    description: 'Essential Commodities Act 1955 (Sec 7 EC Act - PDS / Ration / Fertilizer black marketing)',
  },
  'IT Act / Cyber Crime': {
    id: 'IT Act / Cyber Crime',
    name: 'IT Act / Cyber Crime',
    hindiName: 'आईटी एक्ट / साइबर अपराध',
    category: 'Cyber & General',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 66, 66C, 66D IT Act', '318(4) BNS'],
    ipcSections: ['Sec 66 IT Act', '419/420 IPC'],
    sllProvisions: ['Information Technology Act 2000'],
    lawKeywords: ['it act', 'information technology', 'cyber', 'online fraud', 'phishing', 'otp fraud', 'cyber crime', 'hacking', 'financial cyber'],
    remandTrack: '60-Day / 90-Day Track',
    forensicSceneVisit: 'Digital Forensic Analysis Required',
    isForensicMandatory: true,
    punishmentTerm: '3 to 7 Years',
    color: {
      bg: 'bg-blue-700',
      text: 'text-blue-700',
      border: 'border-blue-400 dark:border-blue-800',
      badgeBg: 'bg-blue-100 dark:bg-blue-950',
      badgeText: 'text-blue-900 dark:text-blue-200',
      darkBadgeBg: 'bg-blue-950',
      darkBadgeText: 'text-blue-200',
      chartColor: '#1d4ed8',
    },
    icon: '💻',
    description: 'Information Technology Act 2000 (Sec 66, 66C, 66D IT Act - Cyber Fraud / Online Identity Theft)',
  },
  'Dowry Prohibition Act': {
    id: 'Dowry Prohibition Act',
    name: 'Dowry Prohibition Act',
    hindiName: 'दहेज प्रतिषेध अधिनियम (DP Act)',
    category: 'Women & Children',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 3/4 DP Act 1961'],
    ipcSections: ['Sec 3/4 DP Act'],
    sllProvisions: ['Dowry Prohibition Act 1961'],
    lawKeywords: ['dp act', 'dowry prohibition', 'dahej pratishedh'],
    remandTrack: '60-Day Track (Up to 5 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 5 Years',
    color: {
      bg: 'bg-pink-500',
      text: 'text-pink-500',
      border: 'border-pink-300 dark:border-pink-800',
      badgeBg: 'bg-pink-100 dark:bg-pink-950',
      badgeText: 'text-pink-800 dark:text-pink-300',
      darkBadgeBg: 'bg-pink-950',
      darkBadgeText: 'text-pink-300',
      chartColor: '#ec4899',
    },
    icon: '💍',
    description: 'Dowry Prohibition Act 1961 (Sec 3/4 DP Act)',
  },
  'Immoral Traffic (ITPA) Act': {
    id: 'Immoral Traffic (ITPA) Act',
    name: 'Immoral Traffic (ITPA)',
    hindiName: 'अनैतिक देह व्यापार निवारण (ITPA)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 143 BNS + Sec 3/4/5 ITPA'],
    ipcSections: ['Sec 370 IPC + ITPA 1956'],
    sllProvisions: ['Immoral Traffic (Prevention) Act 1956'],
    lawKeywords: ['itpa', 'immoral traffic', 'human trafficking', 'deha vyapar', 'veshyavritti', 'manav taskari'],
    remandTrack: '90-Day Track (7 Yrs to Life / Death for trafficking)',
    forensicSceneVisit: 'Mandatory (≥ 7 Years)',
    isForensicMandatory: true,
    punishmentTerm: '7 Years to Life',
    color: {
      bg: 'bg-red-600',
      text: 'text-red-600',
      border: 'border-red-300 dark:border-red-800',
      badgeBg: 'bg-red-100 dark:bg-red-950',
      badgeText: 'text-red-800 dark:text-red-300',
      darkBadgeBg: 'bg-red-950',
      darkBadgeText: 'text-red-300',
      chartColor: '#dc2626',
    },
    icon: '🚫',
    description: 'Immoral Traffic (Prevention) Act 1956 & Human Trafficking (Sec 143 BNS)',
  },
  'Child Labour Act': {
    id: 'Child Labour Act',
    name: 'Child Labour Act',
    hindiName: 'बाल श्रम (प्रतिषेध एवं विनियमन) अधिनियम',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 95 BNS + Child Labour Act', '75/79 JJ Act'],
    ipcSections: ['Child Labour Act 1986', '75/79 JJ Act'],
    sllProvisions: ['Child and Adolescent Labour Act 1986', 'Juvenile Justice Act 2015'],
    lawKeywords: ['child labour', 'bal shram', 'jj act', 'juvenile justice'],
    remandTrack: '60-Day Track (Up to 3-5 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 3 to 5 Years',
    color: {
      bg: 'bg-sky-600',
      text: 'text-sky-600',
      border: 'border-sky-300 dark:border-sky-800',
      badgeBg: 'bg-sky-100 dark:bg-sky-950',
      badgeText: 'text-sky-800 dark:text-sky-300',
      darkBadgeBg: 'bg-sky-950',
      darkBadgeText: 'text-sky-300',
      chartColor: '#0284c7',
    },
    icon: '🧒',
    description: 'Child & Adolescent Labour Act & Juvenile Justice Act (Sec 95 BNS)',
  },
  'Wildlife Protection Act': {
    id: 'Wildlife Protection Act',
    name: 'Wildlife Protection Act',
    hindiName: 'वन्यजीव संरक्षण अधिनियम (शिखार / वन अपराध)',
    category: 'Special & Local Laws (SLL)',
    isMajorHead: false,
    isSpecialLocalLaw: true,
    bnsSections: ['Sec 51 Wildlife Protection Act 1972'],
    ipcSections: ['Sec 9, 39, 51 Wildlife Protection Act'],
    sllProvisions: ['Wild Life (Protection) Act 1972', 'Indian Forest Act'],
    lawKeywords: ['wildlife', 'forest act', 'vanya jeev', 'shikar', 'jangal', 'wild animal'],
    remandTrack: '60-Day Track (3 to 7 Yrs)',
    forensicSceneVisit: 'Mandatory (Forensic Wildlife Lab)',
    isForensicMandatory: true,
    punishmentTerm: '3 to 7 Years Rigorous Imprisonment',
    color: {
      bg: 'bg-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-500 dark:border-emerald-700',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950',
      badgeText: 'text-emerald-900 dark:text-emerald-200',
      darkBadgeBg: 'bg-emerald-950',
      darkBadgeText: 'text-emerald-200',
      chartColor: '#065f46',
    },
    icon: '🐅',
    description: 'Wild Life (Protection) Act 1972 - Illegal Poaching, Smuggling of Wildlife Articles',
  },
  'Forgery / Cheating (318, 319 BNS)': {
    id: 'Forgery / Cheating (318, 319 BNS)',
    name: 'Forgery & Cheating',
    hindiName: 'धोखाधड़ी / कूटकरण (जालसाजी)',
    category: 'Property & Economic',
    isMajorHead: false,
    bnsSections: ['Section 318(4)', '319', '336', '338'],
    ipcSections: ['Section 419', '420', '467', '468', '471 IPC'],
    remandTrack: '• 318(4): 60-Day Track (up to 7 Yrs)\n• 338 (Valuable security): 90-Day Track (Life / 10 Yrs)',
    forensicSceneVisit: '• 318(4): Not Mandatory\n• 338: Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 7 Years to Life',
    color: {
      bg: 'bg-cyan-700',
      text: 'text-cyan-700',
      border: 'border-cyan-400 dark:border-cyan-800',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-950',
      badgeText: 'text-cyan-900 dark:text-cyan-200',
      darkBadgeBg: 'bg-cyan-950',
      darkBadgeText: 'text-cyan-200',
      chartColor: '#0e7490',
    },
    icon: '📑',
    description: 'Cheating, Dishonest Inducement & Document Forgery (Sec 318(4), 338 BNS / Sec 420, 467 IPC)',
  },
  'Aarthik Gaban (316 BNS / CBT)': {
    id: 'Aarthik Gaban (316 BNS / CBT)',
    name: 'Criminal Breach of Trust / Gaban',
    hindiName: 'अमानत में खयानत / गबन (CBT)',
    category: 'Property & Economic',
    isMajorHead: false,
    bnsSections: ['Section 316(2)', '316(5)'],
    ipcSections: ['Section 406', '409 IPC'],
    remandTrack: '• 316(2): 60-Day Track (up to 5 Yrs)\n• 316(5) (Public Servant): 90-Day Track (Life / 10 Yrs)',
    forensicSceneVisit: '• 316(2): Not Mandatory\n• 316(5): Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Up to 5 Years to Life',
    color: {
      bg: 'bg-indigo-800',
      text: 'text-indigo-800',
      border: 'border-indigo-400 dark:border-indigo-800',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-950',
      badgeText: 'text-indigo-900 dark:text-indigo-200',
      darkBadgeBg: 'bg-indigo-950',
      darkBadgeText: 'text-indigo-200',
      chartColor: '#3730a3',
    },
    icon: '💼',
    description: 'Criminal Breach of Trust by Public Servant or Banker (Sec 316(5) BNS / Sec 409 IPC)',
  },
  'Other / General IPC & BNS': {
    id: 'Other / General IPC & BNS',
    name: 'Other / General IPC & BNS',
    hindiName: 'अन्य सामान्य अपराध / विधि व्यवस्था',
    category: 'Cyber & General',
    isMajorHead: false,
    bnsSections: ['Sec 189, 190, 115(2), 126, 351, 352 BNS'],
    ipcSections: ['Sec 147, 148, 323, 341, 504, 506 IPC'],
    remandTrack: '60-Day Track (Less than 7 Yrs)',
    forensicSceneVisit: 'Not Mandatory',
    isForensicMandatory: false,
    punishmentTerm: 'Less than 7 Years',
    color: {
      bg: 'bg-slate-500',
      text: 'text-slate-500',
      border: 'border-slate-300 dark:border-slate-700',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-800 dark:text-slate-300',
      darkBadgeBg: 'bg-slate-800',
      darkBadgeText: 'text-slate-300',
      chartColor: '#64748b',
    },
    icon: '⚖️',
    description: 'General IPC/BNS sections: Rioting, simple hurt, wrongful restraint, criminal intimidation',
  },
};

const STATUTORY_STORAGE_KEY = 'sdpo_statutory_reference_matrix_v3';

/**
 * Retrieves the live, dynamically editable statutory matrix from LocalStorage or defaults
 */
export function getDynamicCrimeHeadsConfig(): Record<string, CrimeHeadMeta> {
  if (typeof window === 'undefined') return { ...DEFAULT_CRIME_HEADS_CONFIG };
  try {
    const raw = localStorage.getItem(STATUTORY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CRIME_HEADS_CONFIG };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      return { ...DEFAULT_CRIME_HEADS_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse statutory matrix from storage', e);
  }
  return { ...DEFAULT_CRIME_HEADS_CONFIG };
}

/**
 * Saves a custom statutory configuration to LocalStorage and triggers sync event
 */
export function saveCustomStatutoryConfig(newConfig: Record<string, CrimeHeadMeta>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STATUTORY_STORAGE_KEY, JSON.stringify(newConfig));
    CRIME_HEADS_CONFIG = newConfig;
    window.dispatchEvent(new CustomEvent('sdpo-statutory-matrix-updated', { detail: newConfig }));
  }
}

/**
 * Adds or updates a single statutory entry
 */
export function upsertStatutoryEntry(entry: CrimeHeadMeta): Record<string, CrimeHeadMeta> {
  const current = getDynamicCrimeHeadsConfig();
  const updated = {
    ...current,
    [entry.name]: {
      ...entry,
      id: entry.name as CrimeHead,
      isEditable: true,
      isCustom: true,
    },
  };
  saveCustomStatutoryConfig(updated);
  return updated;
}

/**
 * Deletes a statutory entry
 */
export function deleteStatutoryEntry(entryName: string): Record<string, CrimeHeadMeta> {
  const current = getDynamicCrimeHeadsConfig();
  const updated = { ...current };
  delete updated[entryName];
  saveCustomStatutoryConfig(updated);
  return updated;
}

/**
 * Resets statutory reference matrix to Bihar Police Standard Defaults
 */
export function resetStatutoryConfigToDefault(): Record<string, CrimeHeadMeta> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STATUTORY_STORAGE_KEY);
    CRIME_HEADS_CONFIG = { ...DEFAULT_CRIME_HEADS_CONFIG };
    window.dispatchEvent(new CustomEvent('sdpo-statutory-matrix-updated', { detail: DEFAULT_CRIME_HEADS_CONFIG }));
  }
  return { ...DEFAULT_CRIME_HEADS_CONFIG };
}

export let CRIME_HEADS_CONFIG: Record<string, CrimeHeadMeta> = getDynamicCrimeHeadsConfig();

export const ALL_CRIME_HEADS: CrimeHead[] = Object.keys(DEFAULT_CRIME_HEADS_CONFIG) as CrimeHead[];

export const MAJOR_CRIME_HEADS: CrimeHead[] = [
  'Theft',
  'Robbery / Loot',
  'Murder',
  'Extortion / Rangdari',
  'Dacoity',
  'POCSO Act',
  'SC/ST Act',
  'Kidnapping / Abduction',
  'Arms Act',
  'Bihar Prohibition & Excise Act (Liquor)',
];

/**
 * Helper: Extract full searchable text from a case
 */
export function getCaseSearchableText(c: Partial<FIRCase>): string {
  const sec = (c.sections || '').toLowerCase();
  const po = (c.placeOfOccurrence || '').toLowerCase();
  const comp = (c.complainantName || '').toLowerCase();
  const acc = ((c as any).accusedDetails || (c as any).accusedName || '').toLowerCase();
  const supNote = ((c as any).sdpoSupervisionNote || '').toLowerCase();
  const ciNote = ((c as any).ciSupervisionNote || '').toLowerCase();
  const progNote = ((c as any).psProgressRemarks || '').toLowerCase();
  const rawHead = ((c as any).crimeHead || '').toLowerCase();
  return `${sec} ${po} ${comp} ${acc} ${supNote} ${ciNote} ${progNote} ${rawHead}`;
}

/**
 * Dynamic Multi-Crime and Special Laws (SLL) Rule Matcher:
 * Checks whether a case matches a specific crime head.
 * - Prioritizes explicit `crimeHeads` array / `crimeHead` fields.
 * - Dynamic / automatic classification accurately handles SLL & IPC/BNS without cross-matching
 *   (e.g., Selecting 'Murder' will NEVER match 'Attempt to Murder' or 'Theft').
 */
export function doesCaseMatchCrimeHead(
  c: Partial<FIRCase>,
  headName: string,
  configOverride?: Record<string, CrimeHeadMeta>
): boolean {
  if (!headName) return false;
  const config = configOverride || getDynamicCrimeHeadsConfig();
  const target = headName.toLowerCase().trim();

  // 1. Direct match on assigned crimeHeads array
  if (Array.isArray(c.crimeHeads) && c.crimeHeads.length > 0) {
    if (c.crimeHeads.some((h) => h && h.toLowerCase().trim() === target)) {
      return true;
    }
  }

  // 2. Direct match on assigned crimeHead field (handles comma/semicolon-separated strings as well)
  if (c.crimeHead && typeof c.crimeHead === 'string' && c.crimeHead.trim()) {
    if (c.crimeHead.toLowerCase().trim() === target) {
      return true;
    }
    const parts = c.crimeHead.split(/[,;&]/).map((p) => p.trim().toLowerCase());
    if (parts.includes(target)) {
      return true;
    }
  }

  // 3. Match against detected crime heads for this case
  const allHeads = getCaseCrimeHeads(c, config);
  return allHeads.some((h) => h.toLowerCase().trim() === target);
}

/**
 * Intelligent Rule-Based Crime Head Classifier
 * Parses sections, SLL law names/keywords, and flags to determine primary crime head
 */
export function classifyCrimeHead(
  c: Partial<FIRCase>,
  configOverride?: Record<string, CrimeHeadMeta>
): CrimeHead {
  const config = configOverride || getDynamicCrimeHeadsConfig();
  const sec = (c.sections || '').toLowerCase();
  const po = (c.placeOfOccurrence || '').toLowerCase();
  const comp = (c.complainantName || '').toLowerCase();
  const supNote = ((c as any).sdpoSupervisionNote || '').toLowerCase();
  const ciNote = ((c as any).ciSupervisionNote || '').toLowerCase();
  const combined = `${sec} ${po} ${comp} ${supNote} ${ciNote}`;

  const hasPattern = (patterns: (string | RegExp)[]): boolean => {
    return patterns.some((p) => {
      if (typeof p === 'string') {
        return combined.includes(p.toLowerCase());
      }
      return p.test(combined);
    });
  };

  // 1. Special & Local Laws (SLL) matched primarily by NAME & KEYWORDS
  if (
    c.isArmsCase ||
    hasPattern([
      'arms act',
      'shastra adhiniyam',
      'tamancha',
      'desi katta',
      'pistol',
      'revolver',
      'firearm',
      'cartridge',
      'kartoot',
      'kartoos',
      'golibari',
      'goli chalana',
    ])
  ) {
    if (
      !hasPattern([
        /\b302\b/i,
        /\b103\b/i,
        /\b307\b/i,
        /\b109\b/i,
        /\b395\b/i,
        /\b310\b/i,
        /\b392\b/i,
        /\b309\b/i,
        'murder',
        'attempt to murder',
        'dacoity',
        'loot',
      ])
    ) {
      return 'Arms Act';
    }
  }

  if (
    c.isLiquorCase ||
    hasPattern([
      'bihar prohibition',
      'excise act',
      'madhyanishedh',
      'madhya nishedh',
      'sharab',
      'daru',
      'desi sharab',
      'videshi sharab',
      'liquor',
      'chullu',
      'rajsat',
    ])
  ) {
    return 'Bihar Prohibition & Excise Act (Liquor)';
  }

  // 2. Mob Lynching (Sec 103(2) BNS)
  if (
    hasPattern([
      /\b103\s*\(\s*2\s*\)/i,
      /\b103\(2\)\b/i,
      'mob lynching',
      'bheed dwara hatya',
      'lynching',
    ])
  ) {
    return 'Mob Lynching';
  }

  // 3. Murder (Sec 302 IPC / Sec 103, 103(1) BNS)
  if (
    hasPattern([
      /\b302\s*ipc\b/i,
      /\b302\b/i,
      /\b103\s*\(\s*1\s*\)/i,
      /\b103\(1\)\b/i,
      /\b103\s*bns\b/i,
      /\b103\s*\/\s*3\s*\(\s*5\s*\)/i,
      'murder',
      'hatya',
      'katl',
      'killing',
    ]) &&
    !hasPattern([
      /\b307\b/i,
      /\b109\b/i,
      /\b303\s*\(\s*2\s*\)/i,
      /\b303\(2\)\b/i,
      /\b303\s*bns\b/i,
      /\b303\b/i,
      /\b305\b/i,
      'attempt',
      'prayas',
      'dowry death',
      '304b',
      'theft',
      'chori',
    ])
  ) {
    return 'Murder';
  }

  // 4. Attempt to Murder (Sec 307 IPC / Sec 109 BNS & subsections)
  if (
    hasPattern([
      /\b307\b/i,
      /\b307\s*ipc\b/i,
      /\b109\s*\(\s*[12]\s*\)/i,
      /\b109\(1\)\b/i,
      /\b109\(2\)\b/i,
      /\b109\s*bns\b/i,
      /\b109\s*\/\s*3\s*\(\s*5\s*\)/i,
      /\b109\s*\/\s*61\b/i,
      /\b109\s*\/\s*115\b/i,
      /\bu\/s\s*109\b/i,
      'attempt to murder',
      'attempt of murder',
      'hatya ka prayas',
      'jaanlewa',
      'pranghatak',
      'firing',
    ])
  ) {
    return 'Attempt to Murder';
  }

  // 5. Dowry Death (Sec 304B IPC / Sec 80 BNS)
  if (
    hasPattern([
      /\b304\s*b\b/i,
      /\b304b\b/i,
      /\b80\s*\(\s*[12]\s*\)/i,
      /\b80\s*bns\b/i,
      'dowry death',
      'dahej hatya',
      'dahej mrityu',
    ])
  ) {
    return 'Dowry Death';
  }

  // 6. Culpable Homicide (Sec 304 IPC / Sec 105 BNS)
  if (
    hasPattern([
      /\b304\s*ipc\b/i,
      /\b105\s*\(\s*[12]\s*\)/i,
      /\b105\s*bns\b/i,
      'culpable homicide',
      'gair iradatan hatya',
    ]) &&
    !hasPattern([/\b304\s*b\b/i, /\b304b\b/i, /\b304\s*bns\b/i, 'snatching'])
  ) {
    return 'Culpable Homicide';
  }

  // 7. Dacoity (Sec 395 IPC / Sec 310, 311 BNS)
  if (
    hasPattern([
      /\b395\b/i,
      /\b396\b/i,
      /\b397\b/i,
      /\b398\b/i,
      /\b310\s*\(\s*2\s*\)/i,
      /\b310\(2\)\b/i,
      /\b310\s*bns\b/i,
      /\b311\b/i,
      'dacoity',
      'dakaiti',
    ])
  ) {
    return 'Dacoity';
  }

  // 8. Robbery / Loot (Sec 392 IPC / Sec 309 BNS)
  if (
    hasPattern([
      /\b392\b/i,
      /\b393\b/i,
      /\b394\b/i,
      /\b309\s*\(\s*[1-6]\s*\)/i,
      /\b309\(4\)\b/i,
      /\b309\s*bns\b/i,
      'robbery',
      'loot',
      'lootpaat',
      'rahjani',
    ]) &&
    !hasPattern([/\b395\b/i, /\b310\b/i, 'dacoity'])
  ) {
    return 'Robbery / Loot';
  }

  // 9. Extortion / Rangdari (Sec 384 IPC / Sec 308 BNS)
  if (
    hasPattern([
      /\b384\b/i,
      /\b386\b/i,
      /\b387\b/i,
      /\b308\s*\(\s*[1-6]\s*\)/i,
      /\b308\(2\)\b/i,
      /\b308\(5\)\b/i,
      /\b308\s*bns\b/i,
      'extortion',
      'rangdari',
      'levy',
      'jabaran vasooli',
    ])
  ) {
    return 'Extortion / Rangdari';
  }

  // 10. POCSO Act
  if (
    hasPattern([
      'pocso',
      'pocso act',
      'protection of children',
      'child abuse',
      'nabalik se dushkarm',
    ])
  ) {
    return 'POCSO Act';
  }

  // 11. Rape & Gang Rape (Sec 376 IPC / Sec 64, 70 BNS)
  if (
    hasPattern([
      /\b376\b/i,
      /\b376\s*d\b/i,
      /\b64\s*\(\s*[12]\s*\)/i,
      /\b70\s*\(\s*[12]\s*\)/i,
      'rape',
      'gang rape',
      'balatkar',
      'dushkarm',
    ]) &&
    !hasPattern([/\b69\s*bns\b/i, 'shadi ka jhansha'])
  ) {
    return 'Rape';
  }

  // 12. Sec 69 BNS
  if (hasPattern([/\b69\s*bns\b/i, 'shadi ka jhansha', 'marriage promise', 'deceitful sexual'])) {
    return 'Sec 69 BNS (Sexual Deceit)';
  }

  // 13. Kidnapping / Abduction (Sec 363-366 IPC / Sec 137, 140 BNS)
  if (
    c.isVictimRecoveryCase ||
    hasPattern([
      /\b363\b/i,
      /\b364\b/i,
      /\b364a\b/i,
      /\b365\b/i,
      /\b137\s*\(\s*[12]\s*\)/i,
      /\b140\s*\(\s*[12]\s*\)/i,
      'kidnapping',
      'abduction',
      'apaharan',
      'kidnap',
      'missing girl',
    ])
  ) {
    return 'Kidnapping / Abduction';
  }

  // 14. SC/ST Act
  if (hasPattern(['sc/st', 'sc st', 'sc-st', 'poa act', 'harijan', 'dalit', 'jaatisuchak'])) {
    return 'SC/ST Act';
  }

  // 15. NDPS Act
  if (c.isNdpsCase || hasPattern(['ndps', 'ganja', 'heroin', 'smack', 'charas', 'afim', 'narcotic'])) {
    return 'NDPS Act';
  }

  // 16. Mining Act
  if (hasPattern(['mmdr', 'mining act', 'khanan', 'balu khanan', 'sand mining', 'illegal mining'])) {
    return 'Awaidh Khanan (Illegal Mining)';
  }

  // 17. Cruelty by Husband (Sec 85 BNS / Sec 498A IPC)
  if (hasPattern([/\b498\s*a\b/i, /\b85\s*bns\b/i, 'cruelty by husband', 'dahej pratadna'])) {
    return 'Cruelty by Husband (85 BNS / 498A)';
  }

  // 18. Molestation (Sec 354 IPC / Sec 74-79 BNS)
  if (hasPattern([/\b354\b/i, /\b74\s*bns\b/i, /\b75\s*bns\b/i, 'molestation', 'chhedkhani', 'stalking'])) {
    return 'Molestation / Outraging Modesty';
  }

  // 19. Hit and Run
  if (hasPattern([/\b106\s*\(\s*[12]\s*\)/i, /\b304\s*a\b/i, 'hit and run', 'rash driving', 'mv act'])) {
    return 'Hit-and-Run / Rash Driving Fatalities';
  }

  // 20. Snatching (Sec 304 BNS)
  if (hasPattern([/\b304\s*bns\b/i, 'snatching', 'chain snatching', 'mobile snatching', 'jhapatmari'])) {
    return 'Snatching';
  }

  // 21. Stolen Property (Sec 411 IPC / Sec 317 BNS)
  if (hasPattern([/\b411\b/i, /\b317\s*\(\s*[1-4]\s*\)/i, 'stolen property', 'chori ka saman']) && !hasPattern([/\b379\b/i, /\b303\b/i])) {
    return 'Stolen Property';
  }

  // 22. Nocturnal Burglary
  if (hasPattern([/\b331\s*\(\s*[34]\s*\)/i, /\b457\b/i, 'burglary', 'grihbhedan', 'nakabjani'])) {
    return 'Nocturnal Burglary / House-Breaking';
  }

  // 23. Theft (Sec 379 IPC / Sec 303(2), 305 BNS)
  if (hasPattern([/\b379\b/i, /\b380\b/i, /\b303\s*\(\s*[12]\s*\)/i, /\b303\(2\)\b/i, /\b303\s*bns\b/i, /\b305\b/i, 'theft', 'chori'])) {
    return 'Theft';
  }

  // 24. Forgery & Cheating
  if (hasPattern([/\b420\b/i, /\b318\s*\(\s*[1-4]\s*\)/i, /\b318\(4\)\b/i, 'cheating', 'forgery', 'dhokhagadi'])) {
    return 'Forgery / Cheating (318, 319 BNS)';
  }

  // 25. Check custom statutory entries
  for (const [key, meta] of Object.entries(config)) {
    if (meta.isCustom && meta.lawKeywords && meta.lawKeywords.length > 0) {
      for (const kw of meta.lawKeywords) {
        if (kw && combined.includes(kw.toLowerCase().trim())) {
          return key as CrimeHead;
        }
      }
    }
  }

  // Fallback
  if (c.crimeHead && config[c.crimeHead] && c.crimeHead !== 'Other / General IPC & BNS') {
    return c.crimeHead as CrimeHead;
  }

  return 'Other / General IPC & BNS';
}

/**
 * Multi-Crime Classifier:
 * A single case can involve multiple crime heads (e.g., both 'Arms Act' and 'Attempt to Murder',
 * 'Murder' and 'Arms Act', 'Robbery / Loot' and 'Arms Act', 'Rape' and 'POCSO Act', etc.).
 * Evaluates all statutory heads and returns ALL matching heads.
 */
export function classifyAllCrimeHeads(
  c: Partial<FIRCase>,
  configOverride?: Record<string, CrimeHeadMeta>
): CrimeHead[] {
  const config = configOverride || getDynamicCrimeHeadsConfig();
  const matchedHeads = new Set<string>();

  const sec = (c.sections || '').toLowerCase();
  const po = (c.placeOfOccurrence || '').toLowerCase();
  const comp = (c.complainantName || '').toLowerCase();
  const supNote = ((c as any).sdpoSupervisionNote || '').toLowerCase();
  const ciNote = ((c as any).ciSupervisionNote || '').toLowerCase();
  const progNote = ((c as any).psProgressRemarks || '').toLowerCase();
  const combined = `${sec} ${po} ${comp} ${supNote} ${ciNote} ${progNote}`;

  const hasPattern = (patterns: (string | RegExp)[]): boolean => {
    return patterns.some((p) => {
      if (typeof p === 'string') {
        return combined.includes(p.toLowerCase());
      }
      return p.test(combined);
    });
  };

  // 1. Arms Act
  if (
    c.isArmsCase ||
    hasPattern([
      'arms act',
      'shastra',
      'tamancha',
      'desi katta',
      'deshi katta',
      'pistol',
      'revolver',
      'firearm',
      'cartridge',
      'kartoot',
      'kartoos',
      'golibari',
      'goli chala',
      'goli chalana',
      'firing',
      'ammo',
      'ammunition',
      /\b25\s*\(\s*1\s*\)/i,
      /\b27\s*arms\b/i,
      /\b25\s*arms\b/i,
      /\b30\s*arms\b/i,
      /\b25\s*\/\s*27\b/i,
      /\b27\s*\/\s*35\b/i,
      /\b25\s*\/\s*26\b/i,
      /\barms\b/i,
    ])
  ) {
    matchedHeads.add('Arms Act');
  }

  // 2. Bihar Prohibition & Excise Act (Liquor)
  if (
    c.isLiquorCase ||
    hasPattern([
      'bihar prohibition',
      'excise',
      'madhyanishedh',
      'madhya nishedh',
      'sharab',
      'daru',
      'desi sharab',
      'videshi sharab',
      'liquor',
      'chullu',
      'rajsat',
      'mahua',
      'bhatti',
      'taari',
      /\b30\s*\(\s*a\s*\)/i,
      /\b30\s*\(\s*b\s*\)/i,
      /\b37\s*\(\s*b\s*\)/i,
    ])
  ) {
    matchedHeads.add('Bihar Prohibition & Excise Act (Liquor)');
  }

  // 3. Mob Lynching
  if (
    hasPattern([
      /\b103\s*\(\s*2\s*\)/i,
      /\b103\(2\)\b/i,
      'mob lynching',
      'bheed dwara hatya',
      'lynching',
    ])
  ) {
    matchedHeads.add('Mob Lynching');
  }

  // 4. Attempt to Murder (Sec 307 IPC / Sec 109 BNS)
  if (
    hasPattern([
      /\b307\b/i,
      /\b307\s*ipc\b/i,
      /\b109\s*\(\s*[12]\s*\)/i,
      /\b109\(1\)\b/i,
      /\b109\(2\)\b/i,
      /\b109\s*bns\b/i,
      /\b109\s*\/\s*3\s*\(\s*5\s*\)/i,
      /\b109\s*\/\s*61\b/i,
      /\b109\s*\/\s*115\b/i,
      /\bu\/s\s*109\b/i,
      'attempt to murder',
      'attempt of murder',
      'hatya ka prayas',
      'jaanlewa',
      'pranghatak',
    ])
  ) {
    matchedHeads.add('Attempt to Murder');
  }

  // 5. Murder (Sec 302 IPC / Sec 103(1) BNS)
  const isExplicitAttempt = hasPattern([
    /\b307\b/i,
    /\b307\s*ipc\b/i,
    /\b109\s*\(\s*[12]\s*\)/i,
    /\b109\(1\)\b/i,
    /\b109\(2\)\b/i,
    /\b109\s*bns\b/i,
    /\bu\/s\s*109\b/i,
    'attempt to murder',
    'attempt of murder',
    'hatya ka prayas',
    'jaanlewa',
    'pranghatak',
  ]);
  const hasExplicitMurderSection = hasPattern([
    /\b302\s*ipc\b/i,
    /\b302\b/i,
    /\b103\s*\(\s*1\s*\)/i,
    /\b103\(1\)\b/i,
    /\b103\s*bns\b/i,
    /\b103\s*\/\s*3\s*\(\s*5\s*\)/i,
  ]);

  if (
    (hasExplicitMurderSection || (!isExplicitAttempt && hasPattern([/\bmurder\b/i, /\bhatya\b/i, /\bkatl\b/i, /\bkilling\b/i]))) &&
    !hasPattern([
      /\b303\s*\(\s*2\s*\)/i,
      /\b303\(2\)\b/i,
      /\b303\s*bns\b/i,
      /\b304\s*b\b/i,
      /\b304b\b/i,
      /\b80\s*bns\b/i,
      'dowry death',
      'dahej hatya',
      'dahej mrityu',
      'theft',
      'chori',
    ])
  ) {
    if (hasExplicitMurderSection || !isExplicitAttempt) {
      matchedHeads.add('Murder');
    }
  }

  // 6. Dowry Death
  if (
    hasPattern([
      /\b304\s*b\b/i,
      /\b304b\b/i,
      /\b80\s*\(\s*[12]\s*\)/i,
      /\b80\s*bns\b/i,
      'dowry death',
      'dahej hatya',
      'dahej mrityu',
    ])
  ) {
    matchedHeads.add('Dowry Death');
  }

  // 7. Culpable Homicide
  if (
    hasPattern([
      /\b304\s*ipc\b/i,
      /\b105\s*\(\s*[12]\s*\)/i,
      /\b105\s*bns\b/i,
      'culpable homicide',
      'gair iradatan hatya',
    ]) &&
    !hasPattern([/\b304\s*b\b/i, /\b304b\b/i, /\b304\s*bns\b/i, 'snatching'])
  ) {
    matchedHeads.add('Culpable Homicide');
  }

  // 8. Dacoity
  if (
    hasPattern([
      /\b395\b/i,
      /\b396\b/i,
      /\b397\b/i,
      /\b398\b/i,
      /\b310\s*\(\s*2\s*\)/i,
      /\b310\(2\)\b/i,
      /\b310\s*bns\b/i,
      /\b311\b/i,
      /\b312\b/i,
      /\b313\b/i,
      'dacoity',
      'dakaiti',
    ])
  ) {
    matchedHeads.add('Dacoity');
  }

  // 9. Robbery / Loot
  if (
    hasPattern([
      /\b390\b/i,
      /\b392\b/i,
      /\b393\b/i,
      /\b394\b/i,
      /\b309\s*\(\s*[1-6]\s*\)/i,
      /\b309\(4\)\b/i,
      /\b309\s*bns\b/i,
      'robbery',
      'loot',
      'lootpaat',
      'rahjani',
    ])
  ) {
    matchedHeads.add('Robbery / Loot');
  }

  // 10. Extortion / Rangdari
  if (
    hasPattern([
      /\b384\b/i,
      /\b385\b/i,
      /\b386\b/i,
      /\b387\b/i,
      /\b388\b/i,
      /\b389\b/i,
      /\b308\s*\(\s*[1-6]\s*\)/i,
      /\b308\(2\)\b/i,
      /\b308\(5\)\b/i,
      /\b308\s*bns\b/i,
      'extortion',
      'rangdari',
      'levy',
      'jabaran vasooli',
    ])
  ) {
    matchedHeads.add('Extortion / Rangdari');
  }

  // 11. POCSO Act
  if (
    hasPattern([
      'pocso',
      'pocso act',
      'posco',
      'protection of children',
      'child abuse',
      'nabalik se dushkarm',
      /\b4\s*pocso\b/i,
      /\b6\s*pocso\b/i,
      /\b8\s*pocso\b/i,
      /\b10\s*pocso\b/i,
      /\b12\s*pocso\b/i,
    ])
  ) {
    matchedHeads.add('POCSO Act');
  }

  // 12. Rape & Gang Rape
  if (
    hasPattern([
      /\b376\b/i,
      /\b376\s*[a-d]\b/i,
      /\b64\s*\(\s*[12]\s*\)/i,
      /\b70\s*\(\s*[12]\s*\)/i,
      'rape',
      'gang rape',
      'balatkar',
      'dushkarm',
    ]) &&
    !hasPattern([/\b69\s*bns\b/i, 'shadi ka jhansha'])
  ) {
    matchedHeads.add('Rape');
  }

  // 13. Sec 69 BNS (Sexual Deceit)
  if (hasPattern([/\b69\s*bns\b/i, 'shadi ka jhansha', 'marriage promise', 'deceitful sexual'])) {
    matchedHeads.add('Sec 69 BNS (Sexual Deceit)');
  }

  // 14. Kidnapping / Abduction
  if (
    c.isVictimRecoveryCase ||
    hasPattern([
      /\b363\b/i,
      /\b364\b/i,
      /\b364a\b/i,
      /\b365\b/i,
      /\b366\b/i,
      /\b137\s*\(\s*[12]\s*\)/i,
      /\b140\s*\(\s*[12]\s*\)/i,
      'kidnapping',
      'abduction',
      'apaharan',
      'kidnap',
      'missing girl',
    ])
  ) {
    matchedHeads.add('Kidnapping / Abduction');
  }

  // 15. SC/ST Act
  if (hasPattern(['sc/st', 'sc st', 'sc-st', 'poa act', 'harijan', 'dalit', 'jaatisuchak', 'atrocity', 'atrocities'])) {
    matchedHeads.add('SC/ST Act');
  }

  // 16. NDPS Act
  if (c.isNdpsCase || hasPattern(['ndps', 'ganja', 'heroin', 'smack', 'charas', 'afim', 'afeem', 'narcotic', 'psychotropic'])) {
    matchedHeads.add('NDPS Act');
  }

  // 17. Mining Act
  if (hasPattern(['mmdr', 'mining act', 'khanan', 'balu khanan', 'sand mining', 'illegal mining', 'mineral', 'gitti'])) {
    matchedHeads.add('Awaidh Khanan (Illegal Mining)');
  }

  // 18. Cruelty by Husband
  if (hasPattern([/\b498\s*a\b/i, /\b498a\b/i, /\b85\s*bns\b/i, /\b86\s*bns\b/i, 'cruelty by husband', 'dahej pratadna', 'stridhan'])) {
    matchedHeads.add('Cruelty by Husband (85 BNS / 498A)');
  }

  // 19. Molestation
  if (hasPattern([/\b354\b/i, /\b354\s*[a-d]\b/i, /\b74\s*bns\b/i, /\b75\s*bns\b/i, /\b78\s*bns\b/i, 'molestation', 'chhedkhani', 'stalking', 'outraging modesty'])) {
    matchedHeads.add('Molestation / Outraging Modesty');
  }

  // 20. Dowry Prohibition Act
  if (hasPattern(['dp act', 'dowry prohibition', 'dahej pratishedh', /\b3\s*dp\b/i, /\b4\s*dp\b/i])) {
    matchedHeads.add('Dowry Prohibition Act');
  }

  // 21. Hit and Run / Rash Driving
  if (hasPattern([/\b106\s*\(\s*[12]\s*\)/i, /\b304\s*a\b/i, /\b279\b/i, /\b281\b/i, 'hit and run', 'rash driving', 'mv act', 'm.v. act'])) {
    matchedHeads.add('Hit-and-Run / Rash Driving Fatalities');
  }

  // 22. Snatching
  if (hasPattern([/\b304\s*bns\b/i, /\b304\s*\(\s*[12]\s*\)\s*bns\b/i, 'snatching', 'chain snatching', 'mobile snatching', 'jhapatmari'])) {
    matchedHeads.add('Snatching');
  }

  // 23. Stolen Property
  if (hasPattern([/\b411\b/i, /\b412\b/i, /\b413\b/i, /\b414\b/i, /\b317\s*\(\s*[1-4]\s*\)/i, 'stolen property', 'chori ka saman']) && !hasPattern([/\b379\b/i, /\b303\b/i])) {
    matchedHeads.add('Stolen Property');
  }

  // 24. Nocturnal Burglary
  if (hasPattern([/\b331\s*\(\s*[34]\s*\)/i, /\b456\b/i, /\b457\b/i, /\b458\b/i, 'burglary', 'grihbhedan', 'nakabjani', 'house-breaking'])) {
    matchedHeads.add('Nocturnal Burglary / House-Breaking');
  }

  // 25. Theft
  if (hasPattern([/\b379\b/i, /\b380\b/i, /\b381\b/i, /\b382\b/i, /\b303\s*\(\s*[12]\s*\)/i, /\b303\(2\)\b/i, /\b303\s*bns\b/i, /\b305\b/i, 'theft', 'chori'])) {
    matchedHeads.add('Theft');
  }

  // 26. Forgery & Cheating
  if (hasPattern([/\b420\b/i, /\b467\b/i, /\b468\b/i, /\b471\b/i, /\b318\s*\(\s*[1-4]\s*\)/i, /\b318\(4\)\b/i, /\b319\b/i, 'cheating', 'forgery', 'dhokhagadi', 'fraud'])) {
    matchedHeads.add('Forgery / Cheating (318, 319 BNS)');
  }

  // 27. Electric Energy Theft
  if (hasPattern(['electricity', 'electricity act', 'vidyut', 'bijli chori', 'meter tampering', /\b135\s*electricity\b/i])) {
    matchedHeads.add('Electric Energy Theft');
  }

  // 28. Explosive Substances Act
  if (hasPattern(['explosive', 'bomb', 'visphotak', 'visfotak', 'blast', 'dynamite', 'detonator'])) {
    matchedHeads.add('Explosive Substances Act');
  }

  // 29. Essential Commodities Act
  if (hasPattern(['essential commodities', 'ec act', 'pds', 'ration', 'kala bazari', 'khad kala bazari'])) {
    matchedHeads.add('Essential Commodities Act');
  }

  // 30. IT Act / Cyber Crime
  if (hasPattern(['it act', 'cyber', 'online fraud', 'phishing', 'otp fraud', 'cyber crime', 'hacking'])) {
    matchedHeads.add('IT Act / Cyber Crime');
  }

  // 31. Public Gambling Act
  if (hasPattern([/\bgambling\b/i, /\bpublic\s*gambling\b/i, /\bjua\b/i, /\bjuaa\b/i, /\bjuari\b/i, /\bsatta\b/i, /\btaash\b/i, /\bteen\s*patti\b/i, /\bgambling\s*act\b/i])) {
    matchedHeads.add('Public Gambling Act');
  }

  // 32. Immoral Traffic (ITPA) Act
  if (hasPattern(['itpa', 'immoral traffic', 'human trafficking', 'deha vyapar', 'veshyavritti'])) {
    matchedHeads.add('Immoral Traffic (ITPA) Act');
  }

  // 33. Child Labour Act
  if (hasPattern(['child labour', 'bal shram', 'jj act', 'juvenile justice'])) {
    matchedHeads.add('Child Labour Act');
  }

  // 34. Wildlife Protection Act
  if (hasPattern(['wildlife', 'forest act', 'vanya jeev', 'shikar'])) {
    matchedHeads.add('Wildlife Protection Act');
  }

  // Helper for word-boundary matching on law keywords
  const matchKeywordBoundary = (text: string, kw: string): boolean => {
    if (!kw || !text) return false;
    const clean = kw.trim();
    if (!clean) return false;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:[^a-zA-Z0-9]|$)`, 'i');
    return pattern.test(text);
  };

  // Check all other dynamic/custom statutory entries
  for (const [key, meta] of Object.entries(config)) {
    if (!matchedHeads.has(key)) {
      if (meta.lawKeywords && meta.lawKeywords.length > 0) {
        for (const kw of meta.lawKeywords) {
          if (kw && matchKeywordBoundary(combined, kw)) {
            matchedHeads.add(key);
            break;
          }
        }
      }
    }
  }

  const result = Array.from(matchedHeads) as CrimeHead[];
  if (result.length === 0) {
    return ['Other / General IPC & BNS'];
  }
  return result;
}

/**
 * Gets all effective crime heads for a case.
 * Checks explicit `crimeHeads` array, parsed `crimeHead` string, or runs multi-classifier.
 */
export function getCaseCrimeHeads(
  c: Partial<FIRCase>,
  configOverride?: Record<string, CrimeHeadMeta>
): CrimeHead[] {
  const config = configOverride || getDynamicCrimeHeadsConfig();

  // If case has explicit crimeHeads array
  if (Array.isArray(c.crimeHeads) && c.crimeHeads.length > 0) {
    const list = c.crimeHeads
      .map((h) => (typeof h === 'string' ? h.trim() : ''))
      .filter((h) => Boolean(h));
    if (list.length > 0) return Array.from(new Set(list)) as CrimeHead[];
  }

  // If case has comma/semicolon/slash separated crimeHead string
  if (c.crimeHead && typeof c.crimeHead === 'string') {
    if (c.crimeHead.includes(',') || c.crimeHead.includes(';') || c.crimeHead.includes(' & ')) {
      const parts = c.crimeHead
        .split(/[,;&]/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        return Array.from(new Set(parts)) as CrimeHead[];
      }
    }
  }

  // Run auto-classifier to detect all matching heads
  const detected = classifyAllCrimeHeads(c, config);

  // If a single crimeHead was manually assigned that differs from the detected ones, include it first
  if (c.crimeHead && typeof c.crimeHead === 'string' && c.crimeHead.trim()) {
    const manualHead = c.crimeHead.trim();
    if (!detected.includes(manualHead as CrimeHead)) {
      return [manualHead as CrimeHead, ...detected.filter((h) => h !== 'Other / General IPC & BNS')];
    }
  }

  return detected;
}

/**
 * Auto-classifies a list of FIR cases with multi-crime heads support
 */
export function autoSortAllCasesCrimeHeads(cases: FIRCase[]): {
  updatedCases: FIRCase[];
  counts: Record<string, number>;
  modifiedCount: number;
} {
  let modifiedCount = 0;
  const counts: Record<string, number> = {};
  const config = getDynamicCrimeHeadsConfig();
  Object.keys(config).forEach((h) => (counts[h] = 0));

  const updatedCases = cases.map((c) => {
    const allHeads = classifyAllCrimeHeads(c, config);
    const primaryHead = allHeads[0] || 'Other / General IPC & BNS';
    allHeads.forEach((h) => {
      counts[h] = (counts[h] || 0) + 1;
    });

    const isDifferent =
      c.crimeHead !== primaryHead ||
      !c.crimeHeads ||
      JSON.stringify(c.crimeHeads) !== JSON.stringify(allHeads);

    if (isDifferent) {
      modifiedCount++;
      return {
        ...c,
        crimeHead: primaryHead,
        crimeHeads: allHeads,
      };
    }
    return c;
  });

  return { updatedCases, counts, modifiedCount };
}
