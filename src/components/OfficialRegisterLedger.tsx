import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  ArrowUpDown, 
  Download, 
  Send, 
  CheckCircle, 
  Clock, 
  Search, 
  SlidersHorizontal,
  Trash2,
  Calendar,
  FileCheck2,
  UserCheck,
  Check,
  Building,
  BellRing,
  PlusCircle,
  FolderPlus
} from 'lucide-react';
import { UserAccount, PoliceStation, OfficialLetter, LetterSource, LetterType, ReminderEntry } from '../types';
import { 
  fetchOfficialLettersFromSupabase, 
  saveOfficialLetterToSupabase, 
  deleteOfficialLetterFromSupabase 
} from '../services/supabaseService';

// Default static lists
const DEFAULT_SOURCES = [
  'Police HQ',
  'Home Dept',
  'SP Office',
  'DM Office',
  'Subdivision HQ',
  'PHQ Command Cell'
];

const DEFAULT_TYPES = [
  'CPGRAMS',
  'SAHYOG',
  'NHRC',
  'BHRC',
  'CWC'
];

const INITIAL_LETTERS: OfficialLetter[] = [
  {
    id: 'letter-001',
    source: 'SP Office',
    letterType: 'CPGRAMS',
    memoNo: 'SP-MUN/4512/2026',
    receivedDate: '2026-09-10',
    replyDeadline: '2026-10-10',
    complainantName: 'Rameshwar Yadav (Illegal Land Encroachment complaint)',
    forwardedTo: ['Tarapur PS'],
    isForwarded: 'YES',
    forwardedMemoNo: 'SDPO-TAR/789/2026',
    forwardedDate: '2026-09-12',
    replyByAssigned: 'PENDING',
    replyReceived: 'PENDING',
    replySentToSource: 'PENDING',
    sourceReminders: [
      { reminderMemoNo: 'SP-REM/901/2026', reminderDate: '2026-09-20' }
    ],
    forwardedReminders: [
      { reminderMemoNo: 'SDPO-REM-TO-PS/112/2026', reminderDate: '2026-09-22' }
    ],
    createdByUnit: 'Tarapur Subdivision HQ',
    createdByRole: 'SDPO',
    createdByUser: 'sdpo.tarapur',
    district: 'Munger',
    subdivision: 'Tarapur',
    policeStation: 'Subdivision HQ'
  },
  {
    id: 'letter-002',
    source: 'Police HQ',
    letterType: 'SAHYOG',
    memoNo: 'PHQ-PAT/9012/2026',
    receivedDate: '2026-09-15',
    replyDeadline: '2026-09-29',
    complainantName: 'Rajesh Ranjan (Citizen Grievance direct report to DGP)',
    forwardedTo: ['Asarganj PS', 'Sangrampur PS'],
    isForwarded: 'YES',
    forwardedMemoNo: 'SDPO-TAR/812/2026',
    forwardedDate: '2026-09-16',
    replyByAssigned: 'YES',
    assignedReplies: [
      {
        assignedUnit: 'Asarganj PS',
        replyMemoNo: 'ASR-PS/450/2026',
        replyDate: '2026-09-20',
        submittedAt: '2026-09-20T11:00:00Z'
      },
      {
        assignedUnit: 'Sangrampur PS',
        replyMemoNo: 'SNG-PS/381/2026',
        replyDate: '2026-09-22',
        submittedAt: '2026-09-22T14:30:00Z'
      }
    ],
    replyReceived: 'YES',
    replyReceivedDate: '2026-09-23',
    replySentToSource: 'YES',
    sourceReplyMemoNo: 'SDPO-TAR/CORR-890/2026',
    sourceReplyDate: '2026-09-24',
    sourceReminders: [],
    forwardedReminders: [],
    createdByUnit: 'Tarapur Subdivision HQ',
    createdByRole: 'SDPO',
    createdByUser: 'sdpo.tarapur',
    district: 'Munger',
    subdivision: 'Tarapur',
    policeStation: 'Subdivision HQ'
  }
];

interface OfficialRegisterLedgerProps {
  availablePoliceStations: PoliceStation[];
  currentUserAccount: UserAccount | null;
  currentRole: string;
}

export const OfficialRegisterLedger: React.FC<OfficialRegisterLedgerProps> = ({
  availablePoliceStations,
  currentUserAccount,
  currentRole
}) => {
  // Jurisdiction contexts
  const userRole = currentUserAccount?.role || 'SDPO';
  const userDistrict = currentUserAccount?.district || 'Munger';
  const userSubdivision = currentUserAccount?.subdivision || 'Tarapur';
  const userPS = currentUserAccount?.policeStation || 'District HQ';

  const isSP = userRole === 'SP' || userRole === 'DISTRICT_ADMIN';
  const isSDPO = userRole === 'SDPO' || userRole === 'CI';
  const isSHO = userRole === 'SHO';
  
  // Operators & Reader rights (Allow high operations just like HQ admin)
  const isOperator = userRole === 'OPERATOR' || userRole === 'READER' || (currentUserAccount?.permissionLevel as any) === 'ADMIN' || (currentUserAccount?.permissionLevel as any) === 'EDITOR' || (currentUserAccount?.permissionLevel as any) === 'operator' || (currentUserAccount?.permissionLevel as any) === 'OPERATOR';
  const canAddConfigurations = isSHO || isSDPO || isSP || isOperator || userRole === 'ADMINISTRATOR';
  const canManageCorrespondence = isSHO || isSDPO || isSP || isOperator || userRole === 'ADMINISTRATOR';

  const userUnitName = useMemo(() => {
    if (isSP) return `${userDistrict} District HQ`;
    if (isSDPO) return `${userSubdivision} Subdivision HQ`;
    if (isSHO) return `${userPS} PS`;
    return currentUserAccount?.policeStation || 'HQ Unit';
  }, [isSP, isSDPO, isSHO, userDistrict, userSubdivision, userPS, currentUserAccount]);

  const isPSLevelLogin = useMemo(() => {
    if (isSHO) return true;
    if (userPS && userPS !== 'District HQ' && userPS !== 'State Police HQ' && userPS !== 'ALL' && userPS !== 'Subdivision HQ') {
      return true;
    }
    if (isOperator && userPS && userPS !== 'District HQ' && userPS !== 'State Police HQ' && userPS !== 'ALL' && userPS !== 'Subdivision HQ') {
      return true;
    }
    return false;
  }, [isSHO, userPS, isOperator]);

  // Persistent States
  const [letters, setLetters] = useState<OfficialLetter[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_official_letters');
      return saved ? JSON.parse(saved) : INITIAL_LETTERS;
    } catch {
      return INITIAL_LETTERS;
    }
  });

  const [customSources, setCustomSources] = useState<LetterSource[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_custom_sources');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customTypes, setCustomTypes] = useState<LetterType[]>(() => {
    try {
      const saved = localStorage.getItem('sdpo_custom_types');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load letters from Supabase on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      try {
        const cloudLetters = await fetchOfficialLettersFromSupabase();
        if (cloudLetters && cloudLetters.length > 0) {
          setLetters(cloudLetters);
        }
      } catch (err) {
        console.warn('Could not load official letters from Supabase, using localStorage:', err);
      }
    };
    loadFromCloud();
  }, []);

  // Save triggers
  useEffect(() => {
    localStorage.setItem('sdpo_official_letters', JSON.stringify(letters));
    // Resiliently upsert all letters to Supabase on state change
    const syncToCloud = async () => {
      for (const letter of letters) {
        await saveOfficialLetterToSupabase(letter);
      }
    };
    syncToCloud().catch(err => console.warn('Supabase sync warning:', err));
  }, [letters]);

  useEffect(() => {
    localStorage.setItem('sdpo_custom_sources', JSON.stringify(customSources));
  }, [customSources]);

  useEffect(() => {
    localStorage.setItem('sdpo_custom_types', JSON.stringify(customTypes));
  }, [customTypes]);

  // Combine defaults with shared custom options
  const visibleSources = useMemo(() => {
    const customList = customSources.filter(src => {
      if (src.visibilityScope === 'PUBLIC') return true;
      if (src.visibilityScope === 'DISTRICT' && src.addedByUnit.includes(userDistrict)) return true;
      if (src.visibilityScope === 'SUBDIVISION' && src.addedByUnit.includes(userSubdivision)) return true;
      if (src.addedByUsername === currentUserAccount?.userId) return true;
      return false;
    }).map(src => src.name);
    return Array.from(new Set([...DEFAULT_SOURCES, ...customList]));
  }, [customSources, userDistrict, userSubdivision, currentUserAccount]);

  const visibleTypes = useMemo(() => {
    const customList = customTypes.filter(tp => {
      if (tp.visibilityScope === 'PUBLIC') return true;
      if (tp.visibilityScope === 'DISTRICT' && tp.addedByUnit.includes(userDistrict)) return true;
      if (tp.visibilityScope === 'SUBDIVISION' && tp.addedByUnit.includes(userSubdivision)) return true;
      if (tp.addedByUsername === currentUserAccount?.userId) return true;
      return false;
    }).map(t => t.name);
    return Array.from(new Set([...DEFAULT_TYPES, ...customList]));
  }, [customTypes, userDistrict, userSubdivision, currentUserAccount]);

  // Roster listing helper
  const assignableUnits = useMemo(() => {
    const list: string[] = [];
    if (isSP) {
      // SP sees all subdivisions and their police stations
      availablePoliceStations.forEach(ps => {
        if (!list.includes(`${ps.subdivisionName} Subdivision HQ`)) {
          list.push(`${ps.subdivisionName} Subdivision HQ`);
        }
        list.push(`${ps.name} PS`);
      });
    } else if (isSDPO) {
      // SDPO sees only their subdivision's stations, Subdivision HQ, and CI
      list.push('Subdivision HQ');
      list.push('Circle Inspector (CI)');
      availablePoliceStations
        .filter(ps => ps.subdivisionName.toLowerCase() === userSubdivision.toLowerCase())
        .forEach(ps => {
          list.push(`${ps.name} PS`);
        });
    } else if (isSHO) {
      list.push(`${userPS} PS`);
    } else {
      availablePoliceStations.forEach(ps => {
        list.push(`${ps.name} PS`);
      });
    }
    return list;
  }, [isSP, isSDPO, isSHO, userSubdivision, userPS, availablePoliceStations]);

  // Form modals control
  const [isAddLetterOpen, setIsAddLetterOpen] = useState(false);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isReplyReceivedModalOpen, setIsReplyReceivedModalOpen] = useState(false);
  const [isReplySentModalOpen, setIsReplySentModalOpen] = useState(false);

  // Reminder Modals Control
  const [isAddSourceReminderOpen, setIsAddSourceReminderOpen] = useState(false);
  const [isAddForwardedReminderOpen, setIsAddForwardedReminderOpen] = useState(false);

  // Focus letter item state
  const [selectedLetter, setSelectedLetter] = useState<OfficialLetter | null>(null);

  // New letter fields
  const [newSource, setNewSource] = useState(DEFAULT_SOURCES[0]);
  const [newType, setNewType] = useState(DEFAULT_TYPES[0]);
  const [newMemoNo, setNewMemoNo] = useState('');
  const [newReceivedDate, setNewReceivedDate] = useState('');
  const [newReplyDeadline, setNewReplyDeadline] = useState('');
  const [newComplainantName, setNewComplainantName] = useState('');
  const [newForwardedTo, setNewForwardedTo] = useState<string[]>([]);
  const [newForwardedMemoNo, setNewForwardedMemoNo] = useState('');
  const [newForwardedDate, setNewForwardedDate] = useState('');

  // Custom Source/Type Form Fields
  const [customSourceName, setCustomSourceName] = useState('');
  const [customSourceScope, setCustomSourceScope] = useState<'PRIVATE' | 'SUBDIVISION' | 'DISTRICT' | 'PUBLIC'>('SUBDIVISION');
  
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeScope, setCustomTypeScope] = useState<'PRIVATE' | 'SUBDIVISION' | 'DISTRICT' | 'PUBLIC'>('SUBDIVISION');

  // Action update fields
  const [actMemoNo, setActMemoNo] = useState('');
  const [actDate, setActDate] = useState('');
  const [actUnits, setActUnits] = useState<string[]>([]);

  // Automatically pre-populate modal fields when letter changes
  useEffect(() => {
    if (selectedLetter) {
      setActMemoNo(selectedLetter.forwardedMemoNo || '');
      setActDate(selectedLetter.forwardedDate || '');
      setActUnits(selectedLetter.forwardedTo || []);
    } else {
      setActMemoNo('');
      setActDate('');
      setActUnits([]);
    }
  }, [selectedLetter]);

  // Reminder Form inputs
  const [remMemoNo, setRemMemoNo] = useState('');
  const [remDate, setRemDate] = useState('');

  // Active filters
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterReceivedStart, setFilterReceivedStart] = useState('');
  const [filterReceivedEnd, setFilterReceivedEnd] = useState('');
  const [filterForwardedStart, setFilterForwardedStart] = useState('');
  const [filterForwardedEnd, setFilterForwardedEnd] = useState('');
  const [filterReplyStart, setFilterReplyStart] = useState('');
  const [filterReplyEnd, setFilterReplyEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorters
  const [sortBy, setSortBy] = useState<'receivedDate' | 'replyDeadline' | 'memoNo'>('receivedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter letters based on active filters and logged in user subdivision/station hierarchy
  const filteredAndSortedLetters = useMemo(() => {
    let result = [...letters];

    result = result.filter(letter => {
      if (userRole === 'ADMINISTRATOR') return true;

      if (isSP) {
        return letter.district.toLowerCase() === userDistrict.toLowerCase();
      }
      if (isSDPO) {
        return letter.subdivision.toLowerCase() === userSubdivision.toLowerCase();
      }
      if (isPSLevelLogin) {
        const myPsName = `${userPS} PS`;
        const isCreatedByMe = letter.policeStation.toLowerCase() === userPS.toLowerCase();
        const isForwardedToMe = letter.forwardedTo.some(u => 
          u.toLowerCase() === myPsName.toLowerCase() || 
          u.toLowerCase() === userPS.toLowerCase()
        );
        return isCreatedByMe || isForwardedToMe;
      }
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.memoNo.toLowerCase().includes(q) ||
        (l.complainantName && l.complainantName.toLowerCase().includes(q)) ||
        (l.forwardedMemoNo && l.forwardedMemoNo.toLowerCase().includes(q)) ||
        (l.sourceReplyMemoNo && l.sourceReplyMemoNo.toLowerCase().includes(q))
      );
    }

    if (filterSource !== 'ALL') {
      result = result.filter(l => l.source === filterSource);
    }
    if (filterType !== 'ALL') {
      result = result.filter(l => l.letterType === filterType);
    }

    if (filterReceivedStart) {
      result = result.filter(l => l.receivedDate >= filterReceivedStart);
    }
    if (filterReceivedEnd) {
      result = result.filter(l => l.receivedDate <= filterReceivedEnd);
    }

    if (filterForwardedStart) {
      result = result.filter(l => l.forwardedDate ? l.forwardedDate >= filterForwardedStart : false);
    }
    if (filterForwardedEnd) {
      result = result.filter(l => l.forwardedDate ? l.forwardedDate <= filterForwardedEnd : false);
    }

    if (filterReplyStart) {
      result = result.filter(l => l.sourceReplyDate ? l.sourceReplyDate >= filterReplyStart : false);
    }
    if (filterReplyEnd) {
      result = result.filter(l => l.sourceReplyDate ? l.sourceReplyDate <= filterReplyEnd : false);
    }

    result.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [letters, isSP, isSDPO, isSHO, userDistrict, userSubdivision, userPS, userRole, searchQuery, filterSource, filterType, filterReceivedStart, filterReceivedEnd, filterForwardedStart, filterForwardedEnd, filterReplyStart, filterReplyEnd, sortBy, sortOrder]);

  // Handlers for Add Letter
  const handleAddLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoNo.trim() || !newReceivedDate || !newComplainantName.trim()) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const brandNew: OfficialLetter = {
      id: `letter-${Date.now()}`,
      source: newSource,
      letterType: newType,
      memoNo: newMemoNo.trim(),
      receivedDate: newReceivedDate,
      replyDeadline: newReplyDeadline || newReceivedDate,
      complainantName: newComplainantName.trim(),
      forwardedTo: newForwardedTo,
      isForwarded: newForwardedTo.length > 0 ? 'YES' : 'PENDING',
      forwardedDate: newForwardedTo.length > 0 ? (newForwardedDate || newReceivedDate) : undefined,
      forwardedMemoNo: newForwardedTo.length > 0 ? (newForwardedMemoNo || `OUT-${newMemoNo}`) : undefined,
      replyByAssigned: 'PENDING',
      replyReceived: 'PENDING',
      replySentToSource: 'PENDING',
      sourceReminders: [],
      forwardedReminders: [],
      createdByUnit: userUnitName,
      createdByRole: userRole,
      createdByUser: currentUserAccount?.userId || 'operator',
      district: userDistrict,
      subdivision: userSubdivision,
      policeStation: userPS
    };

    setLetters(prev => [brandNew, ...prev]);
    setIsAddLetterOpen(false);
    
    // Reset Form
    setNewMemoNo('');
    setNewComplainantName('');
    setNewReplyDeadline('');
    setNewForwardedTo([]);
    setNewForwardedMemoNo('');
    setNewForwardedDate('');
  };

  // Handlers for Custom Source creation
  const handleAddCustomSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSourceName.trim()) return;

    const sourceObj: LetterSource = {
      id: `src-${Date.now()}`,
      name: customSourceName.trim(),
      addedByUnit: userUnitName,
      visibilityScope: customSourceScope,
      addedByRole: userRole,
      addedByUsername: currentUserAccount?.userId || 'unknown'
    };

    setCustomSources(prev => [...prev, sourceObj]);
    setNewSource(sourceObj.name);
    setCustomSourceName('');
    setIsAddSourceOpen(false);
  };

  // Handlers for Custom Letter Type creation
  const handleAddCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTypeName.trim()) return;

    const typeObj: LetterType = {
      id: `tp-${Date.now()}`,
      name: customTypeName.trim(),
      addedByUnit: userUnitName,
      visibilityScope: customTypeScope,
      addedByRole: userRole,
      addedByUsername: currentUserAccount?.userId || 'unknown'
    };

    setCustomTypes(prev => [...prev, typeObj]);
    setNewType(typeObj.name);
    setCustomTypeName('');
    setIsAddTypeOpen(false);
  };

  // Forwarding flow
  const handleForwardLetterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter || actUnits.length === 0) {
      alert('Please select at least one unit/PS to forward.');
      return;
    }

    setLetters(prev => prev.map(l => {
      if (l.id === selectedLetter.id) {
        return {
          ...l,
          forwardedTo: actUnits,
          isForwarded: 'YES',
          forwardedMemoNo: actMemoNo.trim() || undefined,
          forwardedDate: actDate || undefined
        };
      }
      return l;
    }));

    setIsForwardModalOpen(false);
    setSelectedLetter(null);
    setActUnits([]);
    setActMemoNo('');
    setActDate('');
  };

  // Mark Reply Received at headquarters
  // REQUIREMENT RULE SYNC: "so when HQ recd status is marked yes make Replied by Station status yes automatically. no need of add reply button"
  const handleReplyReceivedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter || !actDate) return;

    setLetters(prev => prev.map(l => {
      if (l.id === selectedLetter.id) {
        return {
          ...l,
          replyReceived: 'YES',
          replyReceivedDate: actDate,
          replyByAssigned: 'YES' // Automatically force Station Status to YES!
        };
      }
      return l;
    }));

    setIsReplyReceivedModalOpen(false);
    setSelectedLetter(null);
    setActDate('');
  };

  // Mark Reply Sent to Source
  const handleReplySentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter || !actMemoNo.trim() || !actDate) return;

    setLetters(prev => prev.map(l => {
      if (l.id === selectedLetter.id) {
        return {
          ...l,
          replySentToSource: 'YES',
          sourceReplyMemoNo: actMemoNo.trim(),
          sourceReplyDate: actDate
        };
      }
      return l;
    }));

    setIsReplySentModalOpen(false);
    setSelectedLetter(null);
    setActMemoNo('');
    setActDate('');
  };

  // Add Reminder from Source
  const handleAddSourceReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter || !remMemoNo.trim() || !remDate) return;

    setLetters(prev => prev.map(l => {
      if (l.id === selectedLetter.id) {
        const currentReminders = l.sourceReminders || [];
        return {
          ...l,
          sourceReminders: [...currentReminders, { reminderMemoNo: remMemoNo.trim(), reminderDate: remDate }]
        };
      }
      return l;
    }));

    setIsAddSourceReminderOpen(false);
    setRemMemoNo('');
    setRemDate('');
  };

  // Add Forwarded Outgoing Reminder to station
  const handleAddForwardedReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter || !remMemoNo.trim() || !remDate) return;

    setLetters(prev => prev.map(l => {
      if (l.id === selectedLetter.id) {
        const currentReminders = l.forwardedReminders || [];
        return {
          ...l,
          forwardedReminders: [...currentReminders, { reminderMemoNo: remMemoNo.trim(), reminderDate: remDate }]
        };
      }
      return l;
    }));

    setIsAddForwardedReminderOpen(false);
    setRemMemoNo('');
    setRemDate('');
  };

  // Toggle Replied by Station status (accessible to Operators and supervisors)
  const handleToggleRepliedByStation = (letterId: string) => {
    setLetters(prev => prev.map(l => {
      if (l.id === letterId) {
        const nextStatus = l.replyByAssigned === 'YES' ? 'PENDING' : 'YES';
        return {
          ...l,
          replyByAssigned: nextStatus
        };
      }
      return l;
    }));
  };

  // Delete correspondence log
  const handleDeleteLetter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this official letter entry?')) return;
    setLetters(prev => prev.filter(l => l.id !== id));
    await deleteOfficialLetterFromSupabase(id);
  };

  // Multi-unit checkbox toggler for forwarding
  const handleUnitToggle = (unit: string) => {
    setActUnits(prev => 
      prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
    );
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Source',
      'Letter Type',
      'Incoming Memo No',
      'Received Date',
      'Deadline to Reply',
      'Complainant Name',
      'Forwarded To',
      'Is Forwarded',
      'Forwarded Memo No',
      'Forwarded Date',
      'Replied by Station',
      'HQ Recd Status',
      'Reply Sent to Original Source',
      'Source Reply Memo No',
      'Source Reply Date'
    ];

    const rows = filteredAndSortedLetters.map(l => [
      l.id,
      l.source,
      l.letterType,
      l.memoNo,
      l.receivedDate,
      l.replyDeadline,
      l.complainantName.replace(/"/g, '""'),
      (l.forwardedTo || []).join('; '),
      l.isForwarded,
      l.forwardedMemoNo || '',
      l.forwardedDate || '',
      l.replyByAssigned,
      l.replyReceived,
      l.replySentToSource,
      l.sourceReplyMemoNo || '',
      l.sourceReplyDate || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bihar_Police_Official_Register_${userSubdivision}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // High-Fidelity PDF Print Export
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlTableRows = filteredAndSortedLetters.map((l, index) => {
      // Formulating reminders render
      const remindersFromSourceHtml = l.sourceReminders && l.sourceReminders.length > 0
        ? `<div style="font-size: 8px; color: #b91c1c; margin-top: 4px; border-top: 1px dashed #ef4444; padding-top: 2px;">
             <strong>Reminders Received:</strong><br/>
             ${l.sourceReminders.map(r => `• Memo: ${r.reminderMemoNo} (${r.reminderDate})`).join('<br/>')}
           </div>`
        : '';

      const forwardedRemindersHtml = l.forwardedReminders && l.forwardedReminders.length > 0
        ? `<div style="font-size: 8px; color: #4338ca; margin-top: 4px; border-top: 1px dashed #6366f1; padding-top: 2px;">
             <strong>Reminders Given:</strong><br/>
             ${l.forwardedReminders.map(r => `• Memo: ${r.reminderMemoNo} (${r.reminderDate})`).join('<br/>')}
           </div>`
        : '';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
          <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">${index + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: #1e293b; border: 1px solid #cbd5e1;">${l.source}<br/><span style="color: #2563eb; font-size: 8px; font-weight: 800;">${l.letterType}</span></td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">
            <div style="font-weight: 600;">${l.memoNo}</div>
            <div style="font-size: 8.5px; color: #64748b;">Dt: ${l.receivedDate}</div>
            ${remindersFromSourceHtml}
          </td>
          <td style="padding: 8px; color: #b91c1c; font-weight: bold; border: 1px solid #cbd5e1; font-family: monospace;">${l.replyDeadline}</td>
          <td style="padding: 8px; max-width: 250px; word-break: break-word; border: 1px solid #cbd5e1; font-weight: 500;">${l.complainantName}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">
            <div style="font-size: 9px; font-weight: bold; color: #4f46e5;">${(l.forwardedTo || []).join(', ') || 'N/A'}</div>
            ${l.forwardedMemoNo ? `<div style="font-size: 8px; color: #475569; font-family: monospace; margin-top: 2px;">Memo: ${l.forwardedMemoNo} (${l.forwardedDate})</div>` : ''}
            ${forwardedRemindersHtml}
          </td>
          <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 800; color: ${l.replyByAssigned === 'YES' ? '#15803d' : '#b45309'};">
            ${l.replyByAssigned}
          </td>
          <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 800; color: ${l.replyReceived === 'YES' ? '#1d4ed8' : '#64748b'};">
            ${l.replyReceived}
          </td>
          <td style="padding: 8px; text-align: center; border: 1px solid #cbd5e1;">
            <span style="font-weight: 800; color: ${l.replySentToSource === 'YES' ? '#0f766e' : '#be123c'};">${l.replySentToSource}</span>
            ${l.sourceReplyMemoNo ? `<div style="font-size: 8px; color: #0f766e; font-family: monospace;">Memo: ${l.sourceReplyMemoNo}<br/>Dt: ${l.sourceReplyDate}</div>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bihar Police Official Letters Register</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1e293b; background: white; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f1f5f9; color: #334155; padding: 10px; font-size: 11px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; text-transform: uppercase; }
            .header-table { width: 100%; border: none; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <table class="header-table" style="border: none;">
            <tr>
              <td style="width: 80px; vertical-align: middle; border: none;">
                <div style="font-size: 24px; font-weight: 900; background: #2563eb; color: white; width: 60px; height: 60px; line-height: 60px; text-align: center; border-radius: 50%;">BIHAR</div>
              </td>
              <td style="border: none;">
                <h1 style="margin: 0; font-size: 18px; color: #1e3a8a; font-weight: 900; letter-spacing: 0.5px;">BIHAR POLICE ADMINISTRATION</h1>
                <h2 style="margin: 3px 0 0 0; font-size: 13px; color: #475569; font-weight: 850; text-transform: uppercase;">OFFICIAL CORRESPONDENCE & COMPLAINTS REGISTER</h2>
                <div style="font-size: 10px; margin-top: 4px; color: #64748b; font-weight: 600;">
                  Office of SDPO: <strong>${userSubdivision} Subdivision, ${userDistrict}</strong> | Report Generated: ${new Date().toLocaleString()}
                </div>
              </td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 11px; border-left: 4px solid #2563eb;">
            <strong>Filter Parameters Applied:</strong> Source: <span style="color: #2563eb">${filterSource}</span> | Letter Type: <span style="color: #2563eb">${filterType}</span> | Active Entries: <strong>${filteredAndSortedLetters.length} Records</strong>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">S.No</th>
                <th style="width: 12%;">Source / Type</th>
                <th style="width: 16%;">Incoming Memo & Date</th>
                <th style="width: 10%;">Reply Deadline</th>
                <th style="width: 22%;">Complainant Name</th>
                <th style="width: 18%;">Forwarded To Station / Action No</th>
                <th style="width: 6%; text-align: center;">PS Reply</th>
                <th style="width: 6%; text-align: center;">HQ Recd</th>
                <th style="width: 6%; text-align: center;">Sent Source</th>
              </tr>
            </thead>
            <tbody>
              ${htmlTableRows}
            </tbody>
          </table>

          <div style="margin-top: 60px; text-align: right; font-size: 11px;">
            <div style="display: inline-block; border-top: 1px solid #94a3b8; width: 240px; padding-top: 6px; font-weight: bold; text-align: center;">
              Reader / Head Clerk Control Desk<br/>
              Office of SDPO ${userSubdivision}
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 text-slate-800 bg-white p-2 rounded-2xl">
      
      {/* SECTION BANNER HUD - LIGHT THEME */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-100 border border-blue-200 text-blue-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase border border-blue-200">
                  Government Correspondence Registers
                </span>
                <span className="text-[10px] font-black tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md uppercase">
                  Light Theme Std
                </span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">Official Letters Receipt & Dispatch Ledger</h1>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Tracking and logging of high-priority letters (CPGRAMS, SAHYOG, NHRC) from SP, DM, and Police HQ to subdivisional units.
              </p>
            </div>
          </div>

          {canManageCorrespondence && (
            <button
              onClick={() => setIsAddLetterOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-stretch md:self-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Register Incoming Letter</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER & CONTROL PANEL - LIGHT THEME */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Search & Correspondence Filters</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition"
              title="Download filtered dataset in CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel/CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition"
              title="Generate styled PDF layout for printing"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Print/PDF</span>
            </button>
          </div>
        </div>

        {/* Filters Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          
          {/* Query Text Search */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">Search Complainant / Memo</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memo, complainant name..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">Letter Source</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Sources</option>
              {visibleSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Letter Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">Letter Category/Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {visibleTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Sorter Option */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">Sort Correspondence</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="receivedDate">Received Date</option>
                <option value="replyDeadline">Reply Deadline</option>
                <option value="memoNo">Incoming Memo No</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title="Toggle Ascending/Descending"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Date Range - Receiving */}
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">Date Received Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterReceivedStart}
                onChange={(e) => setFilterReceivedStart(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={filterReceivedEnd}
                onChange={(e) => setFilterReceivedEnd(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Date Range - Forwarding */}
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <label className="text-[10px] uppercase font-black tracking-wider text-slate-500">Date Forwarded Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterForwardedStart}
                onChange={(e) => setFilterForwardedStart(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                type="date"
                value={filterForwardedEnd}
                onChange={(e) => setFilterForwardedEnd(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

        </div>

        {/* Clear Filters Helper */}
        {(filterSource !== 'ALL' || filterType !== 'ALL' || searchQuery || filterReceivedStart || filterReceivedEnd || filterForwardedStart || filterForwardedEnd || filterReplyStart || filterReplyEnd) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFilterSource('ALL');
                setFilterType('ALL');
                setSearchQuery('');
                setFilterReceivedStart('');
                setFilterReceivedEnd('');
                setFilterForwardedStart('');
                setFilterForwardedEnd('');
                setFilterReplyStart('');
                setFilterReplyEnd('');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              Reset All Active Filters
            </button>
          </div>
        )}
      </div>

      {/* REGISTERS TABULAR VIEW CONTAINER - LIGHT THEME */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>Registered Correspondence Records ({filteredAndSortedLetters.length})</span>
          </div>
        </div>

        {filteredAndSortedLetters.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No matching letters found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters, date ranges, or search query.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-wider bg-slate-50/50">
                  <th className="p-4 text-center border-r border-slate-100">S.No</th>
                  <th className="p-4">Source & Type</th>
                  <th className="p-4">Incoming Memo / Date / Reminders</th>
                  <th className="p-4">Deadline</th>
                  <th className="p-4 max-w-xs">Complainant Name</th>
                  {!isPSLevelLogin && <th className="p-4">Forwarded To / Outgoing Details / Reminders</th>}
                  {isPSLevelLogin && <th className="p-4">Remarks (Orig. Source & Memo)</th>}
                  <th className="p-4 text-center">Replied by Station</th>
                  <th className="p-4 text-center">HQ Recd Status</th>
                  <th className="p-4 text-center font-bold">Reply Sent to Source</th>
                  {canManageCorrespondence && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredAndSortedLetters.map((letter, index) => {
                  const deadlinePassed = new Date(letter.replyDeadline).getTime() < Date.now() && letter.replySentToSource !== 'YES';
                  
                  return (
                    <tr key={letter.id} className="hover:bg-slate-50/50 transition-all">
                      
                      {/* Serial S.No */}
                      <td className="p-4 text-center text-slate-400 font-mono font-bold border-r border-slate-100 bg-slate-50/10">
                        {index + 1}
                      </td>

                      {/* Source & Type */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 text-xs text-wrap break-all max-w-[150px]">
                          {isPSLevelLogin ? (letter.createdByUnit || 'Subdivision HQ') : letter.source}
                        </div>
                        <div className="text-[10px] text-blue-600 font-black tracking-widest mt-0.5">{letter.letterType}</div>
                      </td>

                      {/* Incoming Memo & Reminders Received */}
                      <td className="p-4 space-y-1">
                        <div>
                          <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 inline-block text-[10px] text-wrap break-all">
                            {isPSLevelLogin ? (letter.forwardedMemoNo || letter.memoNo) : letter.memoNo}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> Received: {isPSLevelLogin ? (letter.forwardedDate || letter.receivedDate) : letter.receivedDate}
                        </div>

                        {/* Reminders List from Source */}
                        {!isPSLevelLogin && letter.sourceReminders && letter.sourceReminders.length > 0 && (
                          <div className="mt-2 p-1.5 bg-rose-50 border border-rose-100 rounded-lg space-y-1">
                            <div className="text-[8px] uppercase font-black text-rose-700 flex items-center gap-1">
                              <BellRing className="w-2.5 h-2.5" /> Reminders Received ({letter.sourceReminders.length})
                            </div>
                            {letter.sourceReminders.map((rem, i) => (
                              <div key={i} className="text-[9px] text-rose-600 font-mono">
                                • {rem.reminderMemoNo} <span className="text-[8px] text-slate-400">({rem.reminderDate})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="p-4">
                        <div className={`font-semibold font-mono flex items-center gap-1.5 ${deadlinePassed ? 'text-rose-600 animate-pulse font-extrabold' : 'text-amber-600'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{letter.replyDeadline}</span>
                        </div>
                        {deadlinePassed && (
                          <div className="text-[8px] uppercase font-black text-rose-600 mt-0.5">OVERDUE RESPONSE</div>
                        )}
                      </td>

                      {/* Complainant Name (replaces subject matter) */}
                      <td className="p-4 max-w-xs">
                        <p className="text-slate-900 font-bold text-[11px]" title={letter.complainantName}>
                          {letter.complainantName}
                        </p>
                      </td>

                      {/* Forwarded To, Custom Forward Memo & Reminders Issued */}
                      {/* Remarks Column for PS Level Login */}
                      {isPSLevelLogin && (
                        <td className="p-4 space-y-1 text-slate-600 font-medium">
                          <div>
                            <span className="font-bold text-slate-800">Orig. Source:</span> {letter.source}
                          </div>
                          <div className="font-mono text-[10px]">
                            <span className="font-bold text-slate-800">Orig. Memo:</span> {letter.memoNo}
                          </div>
                        </td>
                      )}

                      {/* Forwarded To, Custom Forward Memo & Reminders Issued (Supervisory only) */}
                      {!isPSLevelLogin && (
                        <td className="p-4 space-y-2">
                          {letter.isForwarded === 'YES' ? (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {letter.forwardedTo.map(unit => (
                                  <span key={unit} className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[9px] rounded-sm">
                                    {unit}
                                  </span>
                                ))}
                              </div>
                              {letter.forwardedMemoNo && (
                                <div className="p-1 bg-slate-50 border border-slate-200 rounded-md font-mono text-[9px] text-slate-600">
                                  <span className="font-extrabold text-slate-800">Fwd Memo:</span> {letter.forwardedMemoNo} <span className="text-[8px] text-slate-400">({letter.forwardedDate})</span>
                                </div>
                              )}

                              {/* Issued Reminders list to PS */}
                              {letter.forwardedReminders && letter.forwardedReminders.length > 0 && (
                                <div className="mt-1.5 p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1">
                                  <div className="text-[8px] uppercase font-black text-indigo-700 flex items-center gap-1">
                                    <BellRing className="w-2.5 h-2.5" /> Issued Reminders ({letter.forwardedReminders.length})
                                  </div>
                                  {letter.forwardedReminders.map((rem, i) => (
                                    <div key={i} className="text-[9px] text-indigo-600 font-mono">
                                      • {rem.reminderMemoNo} <span className="text-[8px] text-slate-400">({rem.reminderDate})</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-black uppercase rounded-md border border-slate-200">
                              NOT FORWARDED
                            </span>
                          )}
                        </td>
                      )}

                      {/* Replied by Station - Managed automatically & manually */}
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          letter.replyByAssigned === 'YES' 
                            ? 'bg-emerald-100 border border-emerald-300 text-emerald-800' 
                            : 'bg-amber-100 border border-amber-300 text-amber-800'
                        }`}>
                          {letter.replyByAssigned}
                        </span>
                      </td>

                      {/* HQ Received Status */}
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          letter.replyReceived === 'YES'
                            ? 'bg-blue-100 border border-blue-300 text-blue-800'
                            : 'bg-slate-100 border border-slate-200 text-slate-400'
                        }`}>
                          {letter.replyReceived}
                        </span>
                        {letter.replyReceived === 'YES' && letter.replyReceivedDate && (
                          <div className="text-[8px] text-slate-400 font-mono mt-1">{letter.replyReceivedDate}</div>
                        )}
                      </td>

                      {/* Reply Sent to Original Source */}
                      <td className="p-4 text-center">
                        {isPSLevelLogin && (letter.replyByAssigned === 'YES' || letter.replySentToSource === 'YES') ? (
                          <span className="px-2.5 py-0.5 bg-teal-100 border border-teal-200 text-teal-800 rounded-full font-black text-[9px] uppercase">
                            Dispatched
                          </span>
                        ) : (
                          <>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                              letter.replySentToSource === 'YES'
                                ? 'bg-teal-100 border border-teal-300 text-teal-800'
                                : 'bg-rose-100 border border-rose-300 text-rose-800'
                            }`}>
                              {letter.replySentToSource === 'YES' ? 'SENT' : 'PENDING'}
                            </span>
                            {letter.replySentToSource === 'YES' && letter.sourceReplyMemoNo && (
                              <div className="text-[9px] text-teal-800 font-mono mt-1 font-semibold">
                                Memo: {letter.sourceReplyMemoNo} <span className="text-[8px] text-slate-400">({letter.sourceReplyDate})</span>
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* Actions / Workflow update clickers */}
                      {canManageCorrespondence && (
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            
                            <div className="flex items-center gap-1">
                              {/* Toggle Replied by Station - visible in PS level login OR to any logged-in Operator */}
                              {(isPSLevelLogin || isOperator) && (
                                <button
                                  onClick={() => handleToggleRepliedByStation(letter.id)}
                                  className={`px-2 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition uppercase ${
                                    letter.replyByAssigned === 'YES'
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                  title="Toggle Replied by Station status"
                                >
                                  {letter.replyByAssigned === 'YES' ? 'PS Pending' : 'PS Replied'}
                                </button>
                              )}

                              {/* Forward / Fwd Details button - Conditional display by role / permission */}
                              {(isPSLevelLogin || isOperator) ? (
                                <button
                                  onClick={() => {
                                    setSelectedLetter(letter);
                                    setIsForwardModalOpen(true);
                                  }}
                                  className={`px-2 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition uppercase ${
                                    letter.isForwarded === 'YES'
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                  title={letter.isForwarded === 'YES' ? 'Update Forward Details (Memo/Date)' : 'Forward letter'}
                                >
                                  {letter.isForwarded === 'YES' ? 'Fwd Details' : 'Forward'}
                                </button>
                              ) : (
                                // SDPO / SP / Above Level Login: Only show Forward if pending, no Fwd Details once forwarded
                                letter.isForwarded === 'PENDING' && (
                                  <button
                                    onClick={() => {
                                      setSelectedLetter(letter);
                                      setIsForwardModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] rounded-md cursor-pointer transition uppercase"
                                    title="Forward this letter to subdivisions or stations"
                                  >
                                    Forward
                                  </button>
                                )
                              )}

                              {/* Mark Received by HQ */}
                              {!isPSLevelLogin && letter.replyReceived === 'PENDING' && (
                                <button
                                  onClick={() => {
                                    setSelectedLetter(letter);
                                    setIsReplyReceivedModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded-md cursor-pointer transition uppercase"
                                  title="Confirm receiving station reply at HQ"
                                >
                                  Recv HQ
                                </button>
                              )}

                              {/* Send to Source */}
                              {!isPSLevelLogin && letter.replySentToSource === 'PENDING' && (
                                <button
                                  onClick={() => {
                                    setSelectedLetter(letter);
                                    setIsReplySentModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[9px] rounded-md cursor-pointer transition uppercase"
                                  title="Dispatch reply to original Source"
                                >
                                  Reply Source
                                </button>
                              )}
                            </div>

                            {/* Add Reminder triggers */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <button
                                onClick={() => {
                                  setSelectedLetter(letter);
                                  setIsAddSourceReminderOpen(true);
                                }}
                                className="text-[8.5px] font-bold text-rose-600 hover:text-rose-800 underline transition"
                                title="Add an incoming reminder from source"
                              >
                                + Source Reminder
                              </button>

                              {letter.isForwarded === 'YES' && (
                                <button
                                  onClick={() => {
                                    setSelectedLetter(letter);
                                    setIsAddForwardedReminderOpen(true);
                                  }}
                                  className="text-[8.5px] font-bold text-indigo-600 hover:text-indigo-800 underline transition"
                                  title="Add an outgoing reminder issued to station"
                                >
                                  + Fwd Reminder
                                </button>
                              )}

                              {/* Delete Log */}
                              <button
                                onClick={() => handleDeleteLetter(letter.id)}
                                className="text-slate-400 hover:text-rose-600 transition"
                                title="Delete Letter Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. REGISTER NEW LETTER MODAL - LIGHT THEME */}
      {isAddLetterOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Add Incoming Correspondence Log</span>
              </h2>
              <button onClick={() => setIsAddLetterOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleAddLetter} className="p-6 space-y-4 text-xs text-slate-700">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Source Selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-slate-700">Letter Source *</label>
                    {canAddConfigurations && (
                      <button
                        type="button"
                        onClick={() => setIsAddSourceOpen(true)}
                        className="text-[9px] font-black text-blue-600 hover:text-blue-700"
                      >
                        + New Source
                      </button>
                    )}
                  </div>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {visibleSources.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Letter Type Selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold text-slate-700">Letter Type *</label>
                    {canAddConfigurations && (
                      <button
                        type="button"
                        onClick={() => setIsAddTypeOpen(true)}
                        className="text-[9px] font-black text-blue-600 hover:text-blue-700"
                      >
                        + New Type
                      </button>
                    )}
                  </div>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-blue-500"
                  >
                    {visibleTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Memo Number */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Incoming Memo Number *</label>
                <input
                  type="text"
                  required
                  value={newMemoNo}
                  onChange={(e) => setNewMemoNo(e.target.value)}
                  placeholder="e.g. SP-MUN/4512/2026 or Home-Bih/9012"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date Received */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700">Date Received *</label>
                  <input
                    type="date"
                    required
                    value={newReceivedDate}
                    onChange={(e) => setNewReceivedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Reply Deadline */}
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700">Reply Deadline (Timeframe)</label>
                  <input
                    type="date"
                    value={newReplyDeadline}
                    onChange={(e) => setNewReplyDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Complainant Name (replaces subject matter) */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Complainant Name *</label>
                <input
                  type="text"
                  required
                  value={newComplainantName}
                  onChange={(e) => setNewComplainantName(e.target.value)}
                  placeholder="e.g. Rameshwar Yadav, Smt. Kiran Devi, etc."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Optional Immediate Forwarding */}
              <div className="space-y-3 border-t border-slate-200 pt-3">
                <label className="font-extrabold text-slate-700 block mb-1">Immediate Forward To (Select Multiple)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl max-h-32 overflow-y-auto">
                  {assignableUnits.map(unit => {
                    const isChecked = newForwardedTo.includes(unit);
                    return (
                      <label key={unit} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 hover:text-slate-900">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setNewForwardedTo(prev => 
                              prev.includes(unit) ? prev.filter(u => u !== unit) : [...prev, unit]
                            );
                          }}
                          className="rounded-sm accent-blue-600"
                        />
                        <span>{unit}</span>
                      </label>
                    );
                  })}
                </div>

                {newForwardedTo.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-600 text-[11px]">Forward Memo Number</label>
                      <input
                        type="text"
                        value={newForwardedMemoNo}
                        onChange={(e) => setNewForwardedMemoNo(e.target.value)}
                        placeholder="e.g. SDPO-TAR/789/2026 (Optional)"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-600 text-[11px]">Forward Date</label>
                      <input
                        type="date"
                        value={newForwardedDate}
                        onChange={(e) => setNewForwardedDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddLetterOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Entry</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. FORWARDING ACTIONS MODAL */}
      {isForwardModalOpen && selectedLetter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Forward Correspondence
              </h2>
              <button onClick={() => setIsForwardModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleForwardLetterSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-500 font-extrabold uppercase">Complainant Target</div>
                <div className="font-extrabold text-slate-900 truncate">{selectedLetter.complainantName}</div>
                <div className="text-[10px] text-indigo-600 font-mono">Incoming Memo: {selectedLetter.memoNo}</div>
              </div>

              {/* Units selection */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Forward To (Select Multiple) *</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-xl max-h-36 overflow-y-auto">
                  {assignableUnits.map(unit => (
                    <label key={unit} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={actUnits.includes(unit)}
                        onChange={() => handleUnitToggle(unit)}
                        className="rounded-sm accent-indigo-600"
                      />
                      <span className="text-[11px] text-slate-600">{unit}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Forwarded Memo No */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Forwarded Memo Number</label>
                <input
                  type="text"
                  value={actMemoNo}
                  onChange={(e) => setActMemoNo(e.target.value)}
                  placeholder="e.g. SDPO-TAR/789/2026 (Optional)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Forwarded Date */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Date of Forwarding</label>
                <input
                  type="date"
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsForwardModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-4.5 h-4.5" />
                  <span>Forward Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. HQ RECEIVED CONFIRMATION MODAL - AUTO SET STATION STATUS TO YES */}
      {isReplyReceivedModalOpen && selectedLetter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Confirm HQ Receipt
              </h2>
              <button onClick={() => setIsReplyReceivedModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleReplyReceivedSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl space-y-1">
                <div>Confirm that official verification answers and dossiers have reached HQ and are fully cleared.</div>
                <div className="text-[10px] text-blue-600 font-bold mt-1">Rule Sync: Marking this Received will automatically mark Station Reply as "YES".</div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Date Cleared at Headquarters *</label>
                <input
                  type="date"
                  required
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReplyReceivedModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DISPATCH REPLY TO ORIGINAL SOURCE MODAL */}
      {isReplySentModalOpen && selectedLetter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Dispatch Reply to Source
              </h2>
              <button onClick={() => setIsReplySentModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleReplySentSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-500 font-extrabold uppercase">Original Letter Source</div>
                <div className="font-extrabold text-slate-900">{selectedLetter.source}</div>
              </div>

              {/* Reply dispatch memo */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Outgoing Dispatch Memo No *</label>
                <input
                  type="text"
                  required
                  value={actMemoNo}
                  onChange={(e) => setActMemoNo(e.target.value)}
                  placeholder="e.g. SDPO-TAR/CORR-890/2026"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              {/* Reply date */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Date of Dispatch *</label>
                <input
                  type="date"
                  required
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReplySentModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Dispatch Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD INCOMING REMINDER FROM SOURCE */}
      {isAddSourceReminderOpen && selectedLetter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-600" />
                <span>Add Source Reminder Link</span>
              </h3>
              <button onClick={() => setIsAddSourceReminderOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleAddSourceReminder} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-[10px]">
                Add incoming reminders issued by the source concerning original letter memo: <strong>{selectedLetter.memoNo}</strong>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Reminder Memo No *</label>
                <input
                  type="text"
                  required
                  value={remMemoNo}
                  onChange={(e) => setRemMemoNo(e.target.value)}
                  placeholder="e.g. SP-REM/901/2026"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Reminder Date *</label>
                <input
                  type="date"
                  required
                  value={remDate}
                  onChange={(e) => setRemDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddSourceReminderOpen(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
                >
                  Link Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADD OUTGOING REMINDER TO ASSIGNED PS */}
      {isAddForwardedReminderOpen && selectedLetter && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add Forwarded Reminder Issued</span>
              </h3>
              <button onClick={() => setIsAddForwardedReminderOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleAddForwardedReminder} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-[10px]">
                Add outgoing reminder memo issued from Subdivision HQ to the assigned police stations regarding: <strong>{selectedLetter.forwardedMemoNo}</strong>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Reminder Memo No *</label>
                <input
                  type="text"
                  required
                  value={remMemoNo}
                  onChange={(e) => setRemMemoNo(e.target.value)}
                  placeholder="e.g. SDPO-REM-TO-PS/112/2026"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Reminder Date *</label>
                <input
                  type="date"
                  required
                  value={remDate}
                  onChange={(e) => setRemDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddForwardedReminderOpen(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                >
                  Link Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. ADD CUSTOM SOURCE MODAL */}
      {isAddSourceOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Custom Source</span>
              </h3>
              <button onClick={() => setIsAddSourceOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleAddCustomSource} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Source Name *</label>
                <input
                  type="text"
                  required
                  value={customSourceName}
                  onChange={(e) => setCustomSourceName(e.target.value)}
                  placeholder="e.g. Excise Dept, Vigilance HQ"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Visibility Scope (Discretion) *</label>
                <select
                  value={customSourceScope}
                  onChange={(e) => setCustomSourceScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none"
                >
                  <option value="PRIVATE">Only My Unit ({userUnitName})</option>
                  <option value="SUBDIVISION">Shared with Subdivision ({userSubdivision})</option>
                  <option value="DISTRICT">Shared with Entire District ({userDistrict})</option>
                  <option value="PUBLIC">Public to All Jurisdictions</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddSourceOpen(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Add Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. ADD CUSTOM LETTER TYPE MODAL */}
      {isAddTypeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Custom Letter Type</span>
              </h3>
              <button onClick={() => setIsAddTypeOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold">✕</button>
            </div>

            <form onSubmit={handleAddCustomType} className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Type Category Name *</label>
                <input
                  type="text"
                  required
                  value={customTypeName}
                  onChange={(e) => setCustomTypeName(e.target.value)}
                  placeholder="e.g. VIP Reference, Lokayukta, High Court"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700">Visibility Scope (Discretion) *</label>
                <select
                  value={customTypeScope}
                  onChange={(e) => setCustomTypeScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none"
                >
                  <option value="PRIVATE">Only My Unit ({userUnitName})</option>
                  <option value="SUBDIVISION">Shared with Subdivision ({userSubdivision})</option>
                  <option value="DISTRICT">Shared with Entire District ({userDistrict})</option>
                  <option value="PUBLIC">Public to All Jurisdictions</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddTypeOpen(false)}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Add Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
