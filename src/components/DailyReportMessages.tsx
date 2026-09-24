import React, { useState, useMemo } from 'react';
import { UserMessage, UserAccount, UserRole, PoliceStationName } from '../types';
import {
  Mail,
  Send,
  Trash2,
  CheckCheck,
  Clock,
  AlertCircle,
  User,
  Shield,
  Search,
  MessageSquare,
  Building2,
  Inbox,
  ArrowUpRight,
  CheckSquare,
  Square,
  Users,
  Radio,
  Sparkles,
  X,
  ChevronRight,
  ShieldAlert,
  BellRing,
  Filter,
} from 'lucide-react';
import { formatReadableDate } from '../utils/helpers';
import { INITIAL_USER_ACCOUNTS } from '../data/mockData';

interface DailyReportMessagesProps {
  messages: UserMessage[];
  currentUserAccount: UserAccount | null;
  currentRole: UserRole;
  userAccounts: UserAccount[];
  onSendMessage: (msg: Omit<UserMessage, 'id' | 'createdAt'>) => void;
  onDeleteMessage?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  isReadOnly?: boolean;
}

export const DailyReportMessages: React.FC<DailyReportMessagesProps> = ({
  messages,
  currentUserAccount,
  currentRole,
  userAccounts,
  onSendMessage,
  onDeleteMessage,
  onMarkAsRead,
  isReadOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [sendMode, setSendMode] = useState<'custom' | 'all' | 'shos' | 'supervisory' | 'operators'>('custom');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [stationFilter, setStationFilter] = useState<string>('ALL');

  const [subject, setSubject] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'Directive'>('Routine');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const currentUserId = currentUserAccount?.userId || currentRole;
  const currentUserName = currentUserAccount?.officerName || currentRole;

  // Combine userAccounts with initial defaults so all registered officers are always available
  const effectiveUserAccounts = useMemo(() => {
    const list = userAccounts && userAccounts.length > 0 ? userAccounts : INITIAL_USER_ACCOUNTS;
    // Deduplicate by userId
    const map = new Map<string, UserAccount>();
    list.forEach((u) => {
      if (u.isActive !== false) {
        map.set(u.userId.toLowerCase(), u);
      }
    });
    return Array.from(map.values());
  }, [userAccounts]);

  // Quick Preset Categories
  const shoUserIds = useMemo(
    () =>
      effectiveUserAccounts
        .filter((u) => u.rank.includes('SHO') || u.role.startsWith('PS_'))
        .map((u) => u.userId),
    [effectiveUserAccounts]
  );

  const supervisoryUserIds = useMemo(
    () =>
      effectiveUserAccounts
        .filter((u) => u.role === 'SDPO' || u.role === 'CI' || u.permissionLevel === 'ADMIN')
        .map((u) => u.userId),
    [effectiveUserAccounts]
  );

  const operatorUserIds = useMemo(
    () =>
      effectiveUserAccounts
        .filter((u) => u.permissionLevel === 'OPERATOR' || u.rank.includes('Operator'))
        .map((u) => u.userId),
    [effectiveUserAccounts]
  );

  const distinctStations = useMemo(() => {
    const set = new Set<string>();
    effectiveUserAccounts.forEach((u) => {
      if (u.policeStation && u.policeStation !== 'District HQ' && u.policeStation !== 'Subdivision HQ') {
        set.add(u.policeStation);
      }
    });
    return ['ALL', 'HQ', ...Array.from(set)];
  }, [effectiveUserAccounts]);

  // Filter registered users for search/selection
  const filteredUsers = useMemo(() => {
    return effectiveUserAccounts.filter((u) => {
      // Exclude self from selection
      if (u.userId.toLowerCase() === currentUserId.toLowerCase()) return false;

      if (stationFilter !== 'ALL') {
        if (stationFilter === 'HQ' && u.policeStation !== 'Subdivision HQ' && u.role !== 'SDPO' && u.role !== 'CI') {
          return false;
        } else if (stationFilter !== 'HQ' && u.policeStation !== stationFilter) {
          return false;
        }
      }

      if (!userSearchQuery.trim()) return true;
      const q = userSearchQuery.toLowerCase().trim();
      return (
        u.officerName.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.rank.toLowerCase().includes(q) ||
        u.policeStation.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });
  }, [effectiveUserAccounts, userSearchQuery, stationFilter, currentUserId]);

  // Handle Preset Mode switches
  const handleSelectMode = (mode: 'custom' | 'all' | 'shos' | 'supervisory' | 'operators') => {
    setSendMode(mode);
    if (mode === 'all') {
      setSelectedUserIds([]);
    } else if (mode === 'shos') {
      setSelectedUserIds(shoUserIds.filter((id) => id.toLowerCase() !== currentUserId.toLowerCase()));
    } else if (mode === 'supervisory') {
      setSelectedUserIds(supervisoryUserIds.filter((id) => id.toLowerCase() !== currentUserId.toLowerCase()));
    } else if (mode === 'operators') {
      setSelectedUserIds(operatorUserIds.filter((id) => id.toLowerCase() !== currentUserId.toLowerCase()));
    }
  };

  const handleToggleUser = (userId: string) => {
    setSendMode('custom');
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    setSendMode('custom');
    const filteredIds = filteredUsers.map((u) => u.userId);
    setSelectedUserIds((prev) => {
      const combined = new Set([...prev, ...filteredIds]);
      return Array.from(combined);
    });
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
    setSendMode('custom');
  };

  const isUserRecipient = (m: UserMessage) => {
    if (m.recipientUserId === 'ALL') return true;
    if (m.recipientUserId === currentUserId || m.recipientUserId === currentRole) return true;
    if (m.recipientUserIds && (m.recipientUserIds.includes(currentUserId) || m.recipientUserIds.includes(currentRole))) return true;
    if (m.recipientUserId) {
      const tokens = m.recipientUserId.split(',').map((s) => s.trim().toLowerCase());
      if (tokens.some((t) => t === currentUserId.toLowerCase() || t === currentRole.toLowerCase() || t === 'all')) {
        return true;
      }
    }
    return false;
  };

  // Filter messages for Inbox (addressed to current user or ALL)
  const inboxMessages = messages.filter((m) => isUserRecipient(m));

  // Filter messages for Sent
  const sentMessages = messages.filter((m) => {
    return m.senderUserId === currentUserId || m.senderRole === currentRole;
  });

  const unreadInboxCount = inboxMessages.filter(
    (m) => !m.readBy?.includes(currentUserId)
  ).length;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !messageText.trim()) return;

    let targetRecipientUserId = 'ALL';
    let targetRecipientUserIds: string[] = [];
    let recipientDisplayName = 'All Registered Stations & Desks';

    if (sendMode === 'all') {
      targetRecipientUserId = 'ALL';
      targetRecipientUserIds = effectiveUserAccounts.map((u) => u.userId);
      recipientDisplayName = '📢 Broadcast to All Desks';
    } else {
      if (selectedUserIds.length === 0) {
        alert('Please select at least one registered officer recipient.');
        return;
      }

      targetRecipientUserIds = selectedUserIds;
      targetRecipientUserId = selectedUserIds.join(', ');

      const matchedNames = selectedUserIds.map((id) => {
        const u = effectiveUserAccounts.find((acc) => acc.userId.toLowerCase() === id.toLowerCase());
        return u ? `${u.officerName} (${u.role})` : id;
      });

      if (matchedNames.length === 1) {
        recipientDisplayName = matchedNames[0];
      } else {
        recipientDisplayName = `${matchedNames.slice(0, 2).join(', ')}${
          matchedNames.length > 2 ? ` +${matchedNames.length - 2} more (${matchedNames.length} Officers)` : ` (${matchedNames.length} Officers)`
        }`;
      }
    }

    onSendMessage({
      senderUserId: currentUserId,
      senderName: currentUserName,
      senderRole: currentRole,
      recipientUserId: targetRecipientUserId,
      recipientUserIds: targetRecipientUserIds,
      recipientName: recipientDisplayName,
      subject: subject.trim(),
      messageText: messageText.trim(),
      priority,
      readBy: [currentUserId],
    });

    setSubject('');
    setMessageText('');
    setPriority('Routine');
    setSelectedUserIds([]);
    setSendMode('custom');
    setActiveTab('sent');
  };

  const applyTemplate = (title: string, body: string, prio: 'Routine' | 'Urgent' | 'Directive') => {
    setSubject(title);
    setMessageText(body);
    setPriority(prio);
  };

  const displayedList = activeTab === 'inbox' ? inboxMessages : sentMessages;
  const filteredList = displayedList.filter((m) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    return (
      (m.subject || '').toLowerCase().includes(q) ||
      (m.messageText || '').toLowerCase().includes(q) ||
      (m.senderName || '').toLowerCase().includes(q) ||
      (m.recipientName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              Subdivision Inter-Desk Messages & Directives
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                Multi-User Dispatch
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Send operational directives, case dispatches, and notes to any one or multiple registered officers
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
              activeTab === 'inbox'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox</span>
            {unreadInboxCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-black">
                {unreadInboxCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Sent ({sentMessages.length})</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Message</span>
            </button>
          )}
        </div>
      </div>

      {/* Compose View */}
      {activeTab === 'compose' && (
        <form onSubmit={handleSend} className="p-5 space-y-5 text-xs">
          
          {/* Section 1: Recipient Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Select Recipient(s) — Send to One or More Registered Officers *
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectMode('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    sendMode === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Radio className="w-3 h-3" />
                  <span>Broadcast All Desks</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('shos')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    sendMode === 'shos'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>All SHOs ({shoUserIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('supervisory')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    sendMode === 'supervisory'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Supervisory Officers</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectMode('operators')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    sendMode === 'operators'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Desk Operators</span>
                </button>
              </div>
            </div>

            {/* Broadcast Notice or Multi-User Checkbox Matrix */}
            {sendMode === 'all' ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-900 dark:text-blue-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-bold">
                    Transmitting to ALL ({effectiveUserAccounts.length}) registered police stations, supervisory desks, and duty officers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectMode('custom')}
                  className="text-xs font-bold underline hover:text-blue-700 dark:hover:text-blue-200 cursor-pointer"
                >
                  Switch to Specific Officers
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search & Station Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search officer name, rank, station, or User ID..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  {/* PS Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    {distinctStations.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStationFilter(st)}
                        className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                          stationFilter === st
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'ALL' ? 'All PS' : st === 'HQ' ? 'Subdivision HQ' : `${st} PS`}
                      </button>
                    ))}
                  </div>

                  {/* Selection Bulk Actions */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Select All ({filteredUsers.length})</span>
                    </button>
                    {selectedUserIds.length > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Selected Users Chips Summary */}
                {selectedUserIds.length > 0 && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mr-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {selectedUserIds.length} Selected Recipient{selectedUserIds.length > 1 ? 's' : ''}:
                    </span>
                    {selectedUserIds.map((id) => {
                      const u = effectiveUserAccounts.find((acc) => acc.userId.toLowerCase() === id.toLowerCase());
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full text-[10px] font-bold"
                        >
                          <span>{u?.officerName || id}</span>
                          <span className="text-[9px] opacity-75 font-mono">({u?.role || id})</span>
                          <button
                            type="button"
                            onClick={() => handleToggleUser(id)}
                            className="text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Registered Officers Checkbox Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-900">
                  {filteredUsers.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-slate-400 text-xs font-semibold">
                      No registered officers found matching search filters.
                    </div>
                  ) : (
                    filteredUsers.map((acc) => {
                      const isSelected = selectedUserIds.includes(acc.userId);
                      const isSDPOorCI = acc.role === 'SDPO' || acc.role === 'CI';
                      const isSHO = acc.rank.includes('SHO') || acc.role.startsWith('PS_');

                      return (
                        <div
                          key={acc.id}
                          onClick={() => handleToggleUser(acc.userId)}
                          className={`p-2.5 rounded-lg border transition cursor-pointer flex items-start gap-2.5 select-none ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-xs'
                              : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="pt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-slate-900 dark:text-white truncate text-[11px]">
                                {acc.officerName}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1 py-0.2 rounded border ${
                                  isSDPOorCI
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : isSHO
                                    ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {acc.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {acc.rank} • {acc.policeStation}
                            </div>
                            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                              ID: {acc.userId}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Template Directives */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Directive Templates:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'URGENT: Strict Vehicle & Border Area Checking',
                    'All SHOs and duty officers are directed to conduct intensive vehicle checking and special nakabandi across all boundary access points. Report compliance report by 20:00 hrs.',
                    'Directive'
                  )
                }
                className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-bold hover:bg-rose-100 transition cursor-pointer"
              >
                🚨 Special Nakabandi Directive
              </button>
              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    'Daily Crime Report & GD Entry Verification',
                    'Ensure all FIRs registered today, duty rosters (OD/Gasti), and arrest entries are correctly updated in the Subdivision portal without delay.',
                    'Urgent'
                  )
                }
                className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition cursor-pointer"
              >
                📋 Daily Report Compliance
              </button>
              <button
                type="button"
                onClick={() =>
                  applyTemplate(
                    '60/90 Days Investigation Deadline Review',
                    'Review all cases approaching 60/90 days statutory chargesheet deadline. Expedite viscera, post-mortem, and forensic reports.',
                    'Routine'
                  )
                }
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition cursor-pointer"
              >
                🔍 Deadline Review Directive
              </button>
            </div>
          </div>

          {/* Section 2: Message Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject / Topic *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Immediate checking of vehicles on SH-22 border"
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'Routine' | 'Urgent' | 'Directive')}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="Routine">Routine Operational Note</option>
                <option value="Urgent">Urgent Inter-Station Directive</option>
                <option value="Directive">Directive / Flash Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Message Body *
            </label>
            <textarea
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Enter instructions, dispatch remarks, or briefing details..."
              required
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500">
              {sendMode === 'all'
                ? '📢 Transmitting broadcast to all registered subdivision users.'
                : `👥 Ready to dispatch to ${selectedUserIds.length} selected officer(s).`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sendMode !== 'all' && selectedUserIds.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {sendMode === 'all'
                    ? 'Broadcast Message'
                    : `Send to ${selectedUserIds.length} Officer${selectedUserIds.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Inbox & Sent List View */}
      {activeTab !== 'compose' && (
        <div className="p-4 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search messages by subject, officer, station, or message content..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-bold text-xs">
                {activeTab === 'inbox' ? 'No messages in your inbox' : 'No sent messages recorded'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredList.map((msg) => {
                const isUnread = !msg.readBy?.includes(currentUserId);
                const isSender = msg.senderUserId === currentUserId;

                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border transition space-y-2 ${
                      isUnread
                        ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {msg.priority === 'Directive' && (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] tracking-wider uppercase animate-pulse">
                            Directive
                          </span>
                        )}
                        {msg.priority === 'Urgent' && (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px] tracking-wider uppercase">
                            Urgent
                          </span>
                        )}
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                          {msg.subject}
                        </h4>
                      </div>

                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatReadableDate(msg.createdAt || '')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {msg.messageText}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          From: <strong className="text-slate-800 dark:text-slate-200">{msg.senderName}</strong> ({msg.senderRole})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          To: <strong className="text-blue-700 dark:text-blue-300">{msg.recipientName}</strong>
                          {msg.recipientUserIds && msg.recipientUserIds.length > 1 && (
                            <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded text-[9px] font-bold">
                              {msg.recipientUserIds.length} Recipients
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnread && onMarkAsRead && (
                          <button
                            onClick={() => onMarkAsRead(msg.id)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Mark Read</span>
                          </button>
                        )}

                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              setSelectedUserIds([msg.senderUserId]);
                              setSendMode('custom');
                              setSubject(`Re: ${msg.subject}`);
                              setActiveTab('compose');
                            }}
                            className="text-slate-600 hover:text-slate-900 dark:text-slate-300 font-bold cursor-pointer"
                          >
                            Reply
                          </button>
                        )}

                        {!isReadOnly && (isSender || currentRole === 'SDPO') && onDeleteMessage && (
                          <button
                            onClick={() => onDeleteMessage(msg.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
