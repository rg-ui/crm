"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DEFAULT_USER_ID, DEFAULT_USER_NAME, DEFAULT_USER_ROLE } from '@/lib/constants';
import { Settings as SettingsIcon, MessageSquare, Code, Calendar, Database, CheckCircle, RefreshCw, Box, Target, Download, Upload, Trash, Edit3, X, TrendingUp, TrendingDown, Plug, Sun } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type Workspace = {
  id: string;
  name: string;
  description?: string;
  color: string;
};

type Profile = {
  id: string;
  full_name: string;
  role_title?: string;
  skills?: string[];
};

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  config: Record<string, string>;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  workspace_id?: string;
};

const CATEGORIES = [
  'Software', 'Infrastructure', 'Marketing', 'Office', 'Travel', 'Legal', 'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  Software: '#C6F432',
  Infrastructure: '#10b981',
  Marketing: '#3b82f6',
  Office: '#8b5cf6',
  Travel: '#ef4444',
  Legal: '#ec4899',
  Other: '#64748b',
};

type Tab = 'workspaces' | 'profile' | 'integrations' | 'expenses';

const TABS: { key: Tab; label: string }[] = [
  { key: 'workspaces', label: 'Workspaces' },
  { key: 'profile', label: 'Profile' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'expenses', label: 'Expenses' },
];

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--surface-border)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: 'white',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const EXPENSE_FIELD_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid var(--surface-border)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: 'white',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

function EditableTags({ tags, onChange, placeholder }: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {tags.map(tag => (
          <span key={tag} style={{
            background: 'rgba(198, 244, 50, 0.15)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(198, 244, 50, 0.3)',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {tag}
            <button
              onClick={() => removeTag(tag)}
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', lineHeight: 1, padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          placeholder={placeholder}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          style={{ ...INPUT_STYLE, flex: 1 }}
        />
        <button className="btn-secondary" onClick={addTag} style={{ padding: '10px 16px', flexShrink: 0 }}>Add</button>
      </div>
    </div>
  );
}

const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'slack', name: 'Slack', description: 'Receive standup reminders and daily summaries in Slack', icon: <MessageSquare size={20} />, connected: false, config: { webhook_url: '' } },
  { id: 'github', name: 'GitHub', description: 'Import commits and PRs for goal tracking', icon: <Code size={20} />, connected: false, config: { token: '', repo: '' } },
  { id: 'google_calendar', name: 'Google Calendar', description: 'Sync events between StartupOS and Google Calendar', icon: <Calendar size={20} />, connected: false, config: {} },
  { id: 'google_sheets', name: 'Google Sheets', description: 'Export goals, events & standups to a spreadsheet', icon: <Database size={20} />, connected: false, config: {} },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('workspaces');

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [isNewProfile, setIsNewProfile] = useState(false);

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationTestResults, setIntegrationTestResults] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetsExporting, setSheetsExporting] = useState<'idle' | 'loading' | 'done'>('idle');
  const [sheetsImporting, setSheetsImporting] = useState<'idle' | 'loading' | 'done'>('idle');
  const [sheetsResult, setSheetsResult] = useState<string | null>(null);
  const [sheetsImportForm, setSheetsImportForm] = useState({ spreadsheetId: '', range: 'Sheet1!A1:Z' });
  const [showSheetsImport, setShowSheetsImport] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Software', date: new Date().toISOString().split('T')[0], workspace_id: '' });
  const [expenseFilter, setExpenseFilter] = useState('');
  const [expenseMonth, setExpenseMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces?user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch workspaces');
      setWorkspaces(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'profile') return;
    fetchProfile();
  }, [activeTab]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileMessage('');
    try {
      const res = await fetch(`/api/profiles?id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      if (data && data.full_name) {
        setProfile(data);
        setEditName(data.full_name);
        setEditRole(data.role_title || '');
        setEditSkills(data.skills || []);
        setIsNewProfile(false);
      } else {
        setProfile(null);
        setEditName('');
        setEditRole('');
        setEditSkills([]);
        setIsNewProfile(true);
      }
    } catch {
      setProfile(null);
      setIsNewProfile(true);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('startupos_integrations');
    if (saved) {
      try { setIntegrations(JSON.parse(saved)); } catch { /* ignore */ }
    } else {
      setIntegrations(DEFAULT_INTEGRATIONS);
    }
  }, []);

  useEffect(() => {
    if (integrations.length > 0) {
      localStorage.setItem('startupos_integrations', JSON.stringify(integrations));
    }
  }, [integrations]);

  const checkGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/google/status');
      const data = await res.json();
      const isConnected = data.connected;
      setGoogleConnected(isConnected);
      setIntegrations(prev => prev.map(i =>
        (i.id === 'google_calendar' || i.id === 'google_sheets') ? { ...i, connected: isConnected } : i
      ));
    } catch {
    }
  }, []);

  useEffect(() => {
    checkGoogleStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get('integration') === 'google') {
      const status = params.get('status');
      if (status === 'connected') {
        checkGoogleStatus();
        const url = new URL(window.location.href);
        url.searchParams.delete('integration');
        url.searchParams.delete('status');
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url.toString());
      } else if (status === 'error') {
        const msg = params.get('message') || 'Connection failed';
        alert(`Google connection failed: ${decodeURIComponent(msg)}`);
        const url = new URL(window.location.href);
        url.searchParams.delete('integration');
        url.searchParams.delete('status');
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [checkGoogleStatus]);

  useEffect(() => {
    const saved = localStorage.getItem('startupos_expenses');
    if (saved) {
      try { setExpenses(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const savedBudgets = localStorage.getItem('startupos_budgets');
    if (savedBudgets) {
      try { setBudgets(JSON.parse(savedBudgets)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('startupos_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('startupos_budgets', JSON.stringify(budgets));
  }, [budgets]);

  const handleCreateWorkspace = async () => {
    const name = prompt("Enter Startup/Workspace Name:");
    if (!name || !name.trim()) return;

    const description = prompt("Enter short description:") || '';
    const colors = ['#C6F432', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, color: randomColor, owner_id: DEFAULT_USER_ID }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchWorkspaces();
    } catch (err: any) {
      alert(`Error creating workspace: ${err.message}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const method = isNewProfile ? 'POST' : 'PATCH';
      const res = await fetch('/api/profiles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: DEFAULT_USER_ID,
          full_name: editName.trim(),
          role_title: editRole.trim() || null,
          skills: editSkills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      setIsNewProfile(false);
      setProfileDirty(false);
      setProfileMessage('Profile saved successfully');
    } catch (err: any) {
      setProfileMessage(`Error: ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleIntegration = (id: string) => {
    if (id === 'google_calendar' || id === 'google_sheets') {
      if (googleConnected) {
        disconnectGoogle();
      } else {
        connectGoogle();
      }
      return;
    }
    setIntegrations(prev => prev.map(i =>
      i.id === id ? { ...i, connected: !i.connected } : i
    ));
    setIntegrationTestResults(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const connectGoogle = async () => {
    try {
      const res = await fetch('/api/integrations/google/auth');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local');
      }
    } catch (err: any) {
      alert('Failed to initiate Google connection: ' + err.message);
    }
  };

  const disconnectGoogle = async () => {
    try {
      await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      setGoogleConnected(false);
      setIntegrations(prev => prev.map(i =>
        (i.id === 'google_calendar' || i.id === 'google_sheets') ? { ...i, connected: false } : i
      ));
    } catch (err: any) {
      alert('Failed to disconnect: ' + err.message);
    }
  };

  const syncGoogleCalendar = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/integrations/google/calendar/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`✅ Synced! ${data.imported} events imported, ${data.skipped} already synced.`);
      } else {
        setSyncResult(`❌ ${data.error || 'Sync failed'}`);
      }
    } catch (err: any) {
      setSyncResult(`❌ ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const exportToSheets = async (target: string) => {
    setSheetsExporting('loading');
    setSheetsResult(null);
    try {
      const res = await fetch('/api/integrations/google/sheets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, title: `StartupOS - ${target === 'all' ? 'Full Export' : target}` }),
      });
      const data = await res.json();
      if (data.success) {
        setSheetsResult(`✅ Sheet created! <a href="${data.url}" target="_blank" style="color:var(--accent-primary);text-decoration:underline">Open in Google Sheets</a>`);
      } else {
        setSheetsResult(`❌ ${data.error || 'Export failed'}`);
      }
    } catch (err: any) {
      setSheetsResult(`❌ ${err.message}`);
    } finally {
      setSheetsExporting('idle');
    }
  };

  const importFromSheets = async () => {
    if (!sheetsImportForm.spreadsheetId.trim() || !sheetsImportForm.range.trim()) return;
    setSheetsImporting('loading');
    setSheetsResult(null);
    try {
      const res = await fetch('/api/integrations/google/sheets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: sheetsImportForm.spreadsheetId.trim(),
          range: sheetsImportForm.range.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSheetsResult(`✅ Imported ${data.imported} items (${data.skipped} skipped). Check Calendar & Goals.`);
      } else {
        setSheetsResult(`❌ ${data.error || 'Import failed'}`);
      }
    } catch (err: any) {
      setSheetsResult(`❌ ${err.message}`);
    } finally {
      setSheetsImporting('idle');
    }
  };

  const testIntegration = async (int: Integration) => {
    if (int.id === 'google_calendar') {
      syncGoogleCalendar();
      return;
    }
    if (int.id === 'google_sheets') {
      setIntegrationTestResults(prev => ({ ...prev, [int.id]: { loading: false, success: googleConnected, message: googleConnected ? '✅ Google connected' : '❌ Not connected' } }));
      return;
    }
    setIntegrationTestResults(prev => ({ ...prev, [int.id]: { loading: true } }));
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: int.id, config: int.config }),
      });
      const data = await res.json();
      setIntegrationTestResults(prev => ({ ...prev, [int.id]: { loading: false, success: data.success, message: data.message } }));
    } catch (err: any) {
      setIntegrationTestResults(prev => ({ ...prev, [int.id]: { loading: false, success: false, message: err.message } }));
    }
  };

  const updateIntegrationConfig = (id: string, key: string, value: string) => {
    setIntegrations(prev => prev.map(i =>
      i.id === id ? { ...i, config: { ...i.config, [key]: value } } : i
    ));
  };

  const markProfileDirty = () => { setProfileDirty(true); setProfileMessage(''); };

  const openAddExpense = useCallback((expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        date: expense.date,
        workspace_id: '',
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        description: '', amount: '', category: 'Software',
        date: new Date().toISOString().split('T')[0], workspace_id: '',
      });
    }
    setShowExpenseForm(true);
  }, []);

  const saveExpense = () => {
    const amount = parseFloat(expenseForm.amount);
    if (!expenseForm.description.trim() || isNaN(amount) || amount <= 0) return;

    if (editingExpense) {
      setExpenses(prev => prev.map(e =>
        e.id === editingExpense.id
          ? { ...e, description: expenseForm.description.trim(), amount, category: expenseForm.category, date: expenseForm.date }
          : e
      ));
    } else {
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        description: expenseForm.description.trim(),
        amount,
        category: expenseForm.category,
        date: expenseForm.date || new Date().toISOString().split('T')[0],
      };
      setExpenses(prev => [newExpense, ...prev]);
    }
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (expenseMonth) {
      list = list.filter(e => e.date.startsWith(expenseMonth));
    }
    if (expenseFilter) {
      const q = expenseFilter.toLowerCase();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, expenseFilter, expenseMonth]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filteredExpenses.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  const currentMonthExpenses = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return expenses.filter(e => e.date.startsWith(m));
  }, [expenses]);

  const expenseTotals = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    currentMonthExpenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      total += e.amount;
    });
    return { byCategory, total };
  }, [currentMonthExpenses]);

  const prevMonthTotal = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const pm = d.toISOString().slice(0, 7);
    return expenses.filter(e => e.date.startsWith(pm)).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const monthChange = prevMonthTotal > 0
    ? ((expenseTotals.total - prevMonthTotal) / prevMonthTotal * 100).toFixed(1)
    : null;

  const pieData = useMemo(() => {
    return CATEGORIES
      .map(c => ({ name: c, value: expenseTotals.byCategory[c] || 0 }))
      .filter(d => d.value > 0);
  }, [expenseTotals]);

  const budgetProgress = useMemo(() => {
    return CATEGORIES.map(c => ({
      category: c,
      spent: expenseTotals.byCategory[c] || 0,
      budget: budgets[c] || 0,
    }));
  }, [expenseTotals, budgets]);

  const openBudgetModal = useCallback(() => {
    const form: Record<string, string> = {};
    CATEGORIES.forEach(c => { form[c] = (budgets[c] || 0).toString(); });
    setBudgetForm(form);
    setShowBudgetModal(true);
  }, [budgets]);

  const saveBudgets = () => {
    const parsed: Record<string, number> = {};
    CATEGORIES.forEach(c => {
      const v = parseFloat(budgetForm[c]);
      parsed[c] = isNaN(v) || v < 0 ? 0 : v;
    });
    setBudgets(parsed);
    setShowBudgetModal(false);
  };

  const exportCSV = useCallback(() => {
    const headers = 'Date,Description,Category,Amount\n';
    const rows = expenses
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => `${e.date},"${e.description}",${e.category},${e.amount}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [expenses]);

  const dateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3vw, 32px)' }}>
      <header className="page-header" style={{ marginBottom: 0 }}>
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Settings <SettingsIcon size={24} /></h2>
        <p className="page-subtitle">Manage your workspaces and global preferences.</p>
      </header>

      <div className="settings-layout-grid">
        {/* Settings Navigation */}
        <div className="glass-panel settings-tab-nav" style={{ padding: 'clamp(12px, 2vw, 16px)' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                textAlign: 'left',
                padding: '12px',
                borderRadius: '8px',
                background: activeTab === tab.key ? 'var(--surface-secondary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                transition: '0.2s',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
              }}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 24px)', overflow: 'hidden' }}>
          {activeTab === 'workspaces' && (
            <>
              <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Manage Workspaces</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {loading && <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading workspaces...</div>}

                  {!loading && workspaces.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '12px 0' }}>
                      No workspaces created yet. Create one to classify your tasks and goals!
                    </div>
                  )}

                  {workspaces.map((ws, index) => (
                    <div
                      key={ws.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        paddingBottom: '14px',
                        borderBottom: index < workspaces.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: ws.color, flexShrink: 0 }}></span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.description || 'No description provided'}
                        </div>
                      </div>
                      <button className="btn-secondary" style={{ flexShrink: 0, padding: '8px 16px' }}>Manage</button>
                    </div>
                  ))}
                </div>

                <button
                  className="btn-primary"
                  onClick={handleCreateWorkspace}
                  style={{ marginTop: '20px', width: '100%' }}
                >
                  + Create New Workspace
                </button>
              </div>

              <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Supabase Connection</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Database URL</label>
                  <input
                    type="text"
                    value={process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not configured'}
                    disabled
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '10px 16px', borderRadius: '8px', color: 'var(--text-secondary)', width: '100%', cursor: 'not-allowed' }}
                  />

                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Anon Key</label>
                  <input
                    type="password"
                    value="••••••••••••••••••••••••••••••••"
                    disabled
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '10px 16px', borderRadius: '8px', color: 'var(--text-secondary)', width: '100%', cursor: 'not-allowed' }}
                  />

                  <button className="btn-primary" disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', width: 'fit-content', opacity: 0.5, cursor: 'not-allowed' }}>Connected <CheckCircle size={16} /></button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'profile' && (
            <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '20px' }}>
                {isNewProfile ? 'Create Profile' : 'Edit Profile'}
              </h3>

              {profileLoading ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading profile...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vw, 20px)' }}>
                  <div>
                    <label style={LABEL_STYLE}>Full Name *</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); markProfileDirty(); }}
                      placeholder="Your full name"
                      style={INPUT_STYLE}
                    />
                  </div>

                  <div>
                    <label style={LABEL_STYLE}>Role / Title</label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={e => { setEditRole(e.target.value); markProfileDirty(); }}
                      placeholder="e.g. Founder / Admin"
                      style={INPUT_STYLE}
                    />
                  </div>

                  <div>
                    <label style={LABEL_STYLE}>Skills</label>
                    <EditableTags
                      tags={editSkills}
                      onChange={t => { setEditSkills(t); markProfileDirty(); }}
                      placeholder="Type a skill and press Enter..."
                    />
                  </div>

                  {profileMessage && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: profileMessage.includes('✅') ? 'var(--success)' : 'var(--danger)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: profileMessage.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {profileMessage.includes('successfully') ? <CheckCircle size={16} /> : <X size={16} />}
                        {profileMessage}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-primary"
                      onClick={handleSaveProfile}
                      disabled={profileSaving || !editName.trim()}
                      style={{
                        flex: '1 1 200px',
                        padding: '12px',
                        opacity: (!editName.trim() || profileSaving) ? 0.5 : 1,
                      }}
                    >
                      {profileSaving ? 'Saving…' : isNewProfile ? 'Create Profile' : 'Save Changes'}
                    </button>
                    {!isNewProfile && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          if (profile) {
                            setEditName(profile.full_name);
                            setEditRole(profile.role_title || '');
                            setEditSkills(profile.skills || []);
                            setProfileDirty(false);
                            setProfileMessage('');
                          }
                        }}
                        disabled={!profileDirty}
                        style={{ padding: '12px 24px', opacity: profileDirty ? 1 : 0.5 }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>Connected Services</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 'clamp(16px, 3vw, 24px)' }}>Connect external tools to automate your startup workflow.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {integrations.map(int => {
                  const testResult = integrationTestResults[int.id];
                  const isGoogle = int.id === 'google_calendar' || int.id === 'google_sheets';
                  return (
                    <div
                      key={int.id}
                      style={{
                        padding: 'clamp(14px, 2vw, 20px)',
                        borderRadius: '12px',
                        background: int.connected ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${int.connected ? 'rgba(16,185,129,0.3)' : 'var(--surface-border)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: int.connected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            flexShrink: 0,
                          }}>
                            {int.icon}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {int.name}
                              {int.connected && <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>CONNECTED</span>}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{int.description}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleIntegration(int.id)}
                          style={{
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: int.connected ? 'rgba(239,68,68,0.1)' : 'rgba(255, 203, 59, 0.15)',
                            color: int.connected ? 'var(--danger)' : '#ffcb3b',
                            border: `1px solid ${int.connected ? 'rgba(239,68,68,0.3)' : 'rgba(255, 203, 59, 0.3)'}`,
                            transition: '0.2s',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          {int.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>

                      {int.id === 'google_calendar' && int.connected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                              onClick={syncGoogleCalendar}
                              disabled={syncLoading}
                              style={{
                                background: 'rgba(16,185,129,0.12)',
                                color: 'var(--success)',
                                border: '1px solid rgba(16,185,129,0.25)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity: syncLoading ? 0.6 : 1,
                              }}
                            >
                              {syncLoading ? <><RefreshCw size={14} className="animate-spin" /> Syncing...</> : <><RefreshCw size={14} /> Sync from Google Calendar</>}
                            </button>
                          </div>
                          {syncResult && (
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              background: syncResult.includes('✅') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                              border: `1px solid ${syncResult.includes('✅') ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                              color: syncResult.includes('✅') ? 'var(--success)' : 'var(--danger)',
                              lineHeight: 1.6,
                            }}
                              dangerouslySetInnerHTML={{ __html: syncResult }} />
                          )}
                        </div>
                      )}

                      {int.id === 'google_sheets' && int.connected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
                          <label style={LABEL_STYLE}>Export Data</label>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {['goals', 'events', 'standups', 'all'].map(target => (
                              <button
                                key={target}
                                onClick={() => exportToSheets(target)}
                                disabled={sheetsExporting === 'loading'}
                                style={{
                                  background: 'rgba(255, 203, 59, 0.12)',
                                  color: '#ffcb3b',
                                  border: '1px solid rgba(255, 203, 59, 0.25)',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  cursor: 'pointer',
                                  opacity: sheetsExporting === 'loading' ? 0.6 : 1,
                                }}
                              >
                                {target === 'all' ? <><Box size={14} /> All Data</> : target === 'goals' ? <><Target size={14} /> Goals</> : target === 'events' ? <><Calendar size={14} /> Events</> : <><Sun size={14} /> Standups</>}
                              </button>
                            ))}
                          </div>

                          <div style={{ marginTop: '8px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setShowSheetsImport(v => !v)}
                              className="btn-secondary"
                              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                            >
                              <Download size={16} /> Import from Sheet
                            </button>
                          </div>

                          {showSheetsImport && (
                            <div style={{
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: '10px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}>
                              <div>
                                <label style={LABEL_STYLE}>Spreadsheet ID</label>
                                <input
                                  type="text"
                                  placeholder="Paste Google Sheet ID from URL"
                                  value={sheetsImportForm.spreadsheetId}
                                  onChange={e => setSheetsImportForm(f => ({ ...f, spreadsheetId: e.target.value }))}
                                  style={INPUT_STYLE}
                                />
                              </div>
                              <div>
                                <label style={LABEL_STYLE}>Range (e.g. Sheet1!A1:Z)</label>
                                <input
                                  type="text"
                                  value={sheetsImportForm.range}
                                  onChange={e => setSheetsImportForm(f => ({ ...f, range: e.target.value }))}
                                  style={INPUT_STYLE}
                                />
                              </div>
                              <button
                                onClick={importFromSheets}
                                disabled={sheetsImporting === 'loading' || !sheetsImportForm.spreadsheetId.trim()}
                                style={{
                                  background: 'rgba(16,185,129,0.12)',
                                  color: 'var(--success)',
                                  border: '1px solid rgba(16,185,129,0.25)',
                                  padding: '10px 16px',
                                  borderRadius: '8px',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  opacity: (sheetsImporting === 'loading' || !sheetsImportForm.spreadsheetId.trim()) ? 0.5 : 1,
                                  alignSelf: 'flex-start',
                                }}
                              >
                                {sheetsImporting === 'loading' ? <><RefreshCw size={16} className="animate-spin" /> Importing...</> : <><Upload size={16} /> Import Data</>}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {!isGoogle && int.connected && Object.keys(int.config).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
                          {Object.entries(int.config).map(([key, val]) => (
                            <div key={key}>
                              <label style={LABEL_STYLE}>{key.replace(/_/g, ' ')}</label>
                              <input
                                type={key.toLowerCase().includes('key') || key.toLowerCase().includes('token') ? 'password' : 'text'}
                                value={val}
                                onChange={e => updateIntegrationConfig(int.id, key, e.target.value)}
                                placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                                style={INPUT_STYLE}
                              />
                            </div>
                          ))}

                          {testResult && !testResult.loading && (
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                              border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                              fontSize: '0.8rem',
                              color: testResult.success ? 'var(--success)' : 'var(--danger)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}>
                              <span>{testResult.success ? <CheckCircle size={16} /> : <X size={16} />}</span>
                              {testResult.message}
                            </div>
                          )}

                          <button
                            onClick={() => testIntegration(int)}
                            disabled={testResult?.loading}
                            style={{
                              background: 'rgba(255, 203, 59, 0.12)',
                              color: '#ffcb3b',
                              border: '1px solid rgba(255, 203, 59, 0.25)',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              alignSelf: 'flex-start',
                              cursor: 'pointer',
                              opacity: testResult?.loading ? 0.6 : 1,
                            }}
                          >
                            {testResult?.loading ? <><RefreshCw size={16} className="animate-spin" /> Testing...</> : <><Plug size={16} /> Test Connection</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: '12px' }}>
                <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 700, color: '#ffcb3b' }}>₹{expenseTotals.total.toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {monthChange !== null ? (
                      parseFloat(monthChange) >= 0
                        ? <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12} /> {monthChange}% from last month</span>
                        : <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={12} /> {Math.abs(parseFloat(monthChange))}% from last month</span>
                    ) : 'No previous month data'}
                  </div>
                </div>
                <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Expenses</div>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>{currentMonthExpenses.length}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Entries this month</div>
                </div>
                <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Top Category</div>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {pieData.length > 0 ? pieData.reduce((a, b) => a.value > b.value ? a : b).name : '—'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {pieData.length > 0 ? `₹${Math.max(...pieData.map(d => d.value)).toFixed(0)}` : ''}
                  </div>
                </div>
                <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)', cursor: 'pointer' }} onClick={exportCSV}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Export</div>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>CSV <Download size={20} /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Download all data</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))', gap: 'clamp(12px, 2vw, 24px)' }}>
                {/* Pie Chart */}
                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Spending Breakdown</h3>
                  {pieData.length > 0 ? (
                    <div style={{ width: '100%', height: 'clamp(180px, 30vh, 220px)' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                            {pieData.map(entry => (
                              <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#64748b'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--surface-primary)', borderColor: 'var(--surface-border)', borderRadius: '8px', color: 'white' }}
                            formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ height: 'clamp(180px, 30vh, 220px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      No data for this month
                    </div>
                  )}
                </div>

                {/* Budgets */}
                <div className="glass-card" style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Budgets</h3>
                    <button className="btn-secondary" onClick={openBudgetModal} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Set Budgets</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vw, 12px)' }}>
                    {budgetProgress.map(({ category, spent, budget }) => (
                      <div key={category}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{category}</span>
                          <span>
                            <span style={{ color: spent <= budget ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>₹{spent.toFixed(0)}</span>
                            {budget > 0 && <span style={{ color: 'var(--text-secondary)' }}> / ₹{budget.toFixed(0)}</span>}
                          </span>
                        </div>
                        {budget > 0 && (
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min((spent / budget) * 100, 100)}%`,
                              background: spent <= budget ? 'var(--success)' : 'var(--danger)',
                              borderRadius: '2px',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="month"
                  value={expenseMonth}
                  onChange={e => setExpenseMonth(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', padding: '8px 12px', borderRadius: '8px', color: 'white', fontSize: '0.82rem', fontFamily: 'inherit', minHeight: '44px' }}
                />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={expenseFilter}
                  onChange={e => setExpenseFilter(e.target.value)}
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', padding: '8px 12px', borderRadius: '8px', color: 'white', fontSize: '0.82rem', flex: 1, minWidth: '150px', fontFamily: 'inherit', minHeight: '44px' }}
                />
                <button className="btn-primary" onClick={() => openAddExpense()} style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  + Add Expense
                </button>
              </div>

              {/* Expense List */}
              <div className="glass-card" style={{ padding: 'clamp(14px, 2vw, 20px)' }}>
                {groupedExpenses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    No expenses found. Add one above!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {groupedExpenses.map(([date, items]) => (
                      <div key={date}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>{dateLabel(date)}</div>
                        {items.map(e => (
                          <div key={e.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 12px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            marginBottom: '6px', gap: '8px',
                            flexWrap: 'wrap',
                          }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span>{e.category}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <span style={{ fontWeight: 600, color: '#ffcb3b', fontSize: '0.875rem' }}>₹{e.amount.toFixed(2)}</span>
                              <button
                                onClick={() => openAddExpense(e)}
                                className="btn-ghost"
                                style={{ fontSize: '0.78rem', padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}
                                aria-label="Edit expense"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => deleteExpense(e.id)}
                                className="btn-ghost"
                                style={{ color: 'var(--danger)', fontSize: '0.78rem', padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}
                                aria-label="Delete expense"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14, 16, 21, 0.8)', backdropFilter: 'blur(8px)', padding: '16px',
            WebkitBackdropFilter: 'blur(8px)', touchAction: 'none',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowExpenseForm(false); }}
        >
          <div className="glass-panel modal-content" style={{
            width: 'min(440px, 100%)', padding: 'clamp(20px, 4vw, 32px)',
            display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-xl)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
              <button onClick={() => setShowExpenseForm(false)} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}><X size={20} /></button>
            </div>

            <div>
              <label style={LABEL_STYLE}>Description *</label>
              <input type="text" placeholder="e.g. AWS Hosting" value={expenseForm.description}
                onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                style={EXPENSE_FIELD_STYLE} autoFocus />
            </div>

            <div>
              <label style={LABEL_STYLE}>Amount (₹) *</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" value={expenseForm.amount}
                onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                style={EXPENSE_FIELD_STYLE} />
            </div>

            <div>
              <label style={LABEL_STYLE}>Category</label>
              <select value={expenseForm.category}
                onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                style={{ ...EXPENSE_FIELD_STYLE, appearance: 'none' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label style={LABEL_STYLE}>Date</label>
              <input type="date" value={expenseForm.date}
                onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
                style={{ ...EXPENSE_FIELD_STYLE, colorScheme: 'dark' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn-secondary" onClick={() => setShowExpenseForm(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button className="btn-primary" onClick={saveExpense} disabled={!expenseForm.description.trim() || !expenseForm.amount} style={{ flex: 2, padding: '12px', opacity: (!expenseForm.description.trim() || !expenseForm.amount) ? 0.5 : 1 }}>
                {editingExpense ? 'Save Changes' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14, 16, 21, 0.8)', backdropFilter: 'blur(8px)', padding: '16px',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowBudgetModal(false); }}
        >
          <div className="glass-panel modal-content" style={{
            width: 'min(440px, 100%)', padding: 'clamp(20px, 4vw, 32px)',
            display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-xl)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Set Monthly Budgets</h3>
              <button onClick={() => setShowBudgetModal(false)} className="btn-ghost" style={{ padding: '4px 8px', minWidth: 'auto', minHeight: 'auto' }}><X size={20} /></button>
            </div>

            {CATEGORIES.map(cat => (
              <div key={cat}>
                <label style={LABEL_STYLE}>{cat}</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  value={budgetForm[cat] || ''}
                  onChange={e => setBudgetForm(f => ({ ...f, [cat]: e.target.value }))}
                  style={EXPENSE_FIELD_STYLE}
                />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn-secondary" onClick={() => setShowBudgetModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button className="btn-primary" onClick={saveBudgets} style={{ flex: 2, padding: '12px' }}>Save Budgets</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}