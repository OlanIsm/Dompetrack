import { useState, useEffect, useMemo, useRef } from 'react';
import {
  House,
  PlusCircle,
  BarChart3,
  Settings as SettingsIcon,
  Bell,
  ChevronRight,
  ChevronLeft,
  Utensils,
  ShoppingBag,
  Gamepad2,
  MoreHorizontal,
  LogOut,
  ArrowLeft,
  Calendar,
  FileText,
  Check,
  Coffee,
  Car,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';
import './App.css';
import { api } from './api';

// ---------------- DATA TYPES ----------------
interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  note: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  categoryObj?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  rawDate?: string;
}

// Indonesian month names helper
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_DAYS = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

// Initial mock transactions removed for full Supabase dynamic integration

function App() {
  // ---------------- STATE ----------------
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [paginationInfo, setPaginationInfo] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'month' | 'all'>('month');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmountStr, setEditAmountStr] = useState<string>('0');
  const [editType, setEditType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<'home' | 'add' | 'laporan' | 'settings'>('home');

  // Authentication states
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(() => {
    const saved = localStorage.getItem('dompetrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'forgot'>('login');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Helper to format backend transaction to frontend format
  const formatTxForFrontend = (tx: any): Transaction => {
    const d = new Date(tx.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      category: tx.category?.name || 'Other',
      note: tx.description || (tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
      date: dateStr,
      time: timeStr,
      categoryObj: tx.category,
      rawDate: tx.date,
    };
  };

  const fetchData = async (pageToFetch = currentPage) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // 1. Fetch categories
      const cats = await api.categories.getAll();
      setCategories(cats);
      if (cats.length > 0) {
        // If current selected category is not in the loaded list, pick the first one
        if (!cats.some(c => c.id === txCategory)) {
          setTxCategory(cats[0].id);
        }
      }

      // 2. Fetch transactions based on filterType
      let responseData;
      if (filterType === 'month') {
        responseData = await api.transactions.getAll(selectedMonth, selectedYear, pageToFetch);
      } else {
        responseData = await api.transactions.getAll(undefined, undefined, pageToFetch);
      }

      const formatted = responseData.transactions.map(formatTxForFrontend);
      setTransactions(formatted);
      setPaginationInfo(responseData.pagination);

      // 3. Fetch previous month's transactions
      let prevMonth = selectedMonth - 1;
      let prevYear = selectedYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      const prevTxsResponse = await api.transactions.getAll(prevMonth, prevYear, 1, 100);
      const formattedPrev = prevTxsResponse.transactions.map(formatTxForFrontend);
      setPrevMonthTransactions(formattedPrev);
    } catch (err) {
      console.error("Gagal mengambil data dari API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Email dan password harus diisi');
      return;
    }
    setIsLoading(true);
    setAuthError('');
    try {
      const data = await api.auth.login(authEmail, authPassword);
      setCurrentUser(data.user);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Email atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authEmail || !authPassword || !authConfirmPassword) {
      setAuthError('Semua field wajib diisi');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Konfirmasi password tidak cocok');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password minimal 6 karakter');
      return;
    }
    if (!agreeTerms) {
      setAuthError('Anda harus menyetujui Syarat & Ketentuan');
      return;
    }
    setIsLoading(true);
    setAuthError('');
    try {
      const data = await api.auth.register(authName, authEmail, authPassword);
      setCurrentUser(data.user);
      setAuthName('');
      setAuthEmail('');
      setAuthPassword('');
      setAuthConfirmPassword('');
      setAgreeTerms(false);
    } catch (err: any) {
      setAuthError(err.message || 'Registrasi gagal, silakan coba lagi');
    } finally {
      setIsLoading(false);
    }
  };

  // Date states
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // Default to current month
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear()); // Default to current year

  const [aiConsent, setAiConsent] = useState<boolean>(() => {
    const email = currentUser?.email || 'guest';
    const saved = localStorage.getItem(`${email}_ai_consent`);
    return saved === 'true';
  });

  useEffect(() => {
    if (currentUser) {
      const email = currentUser.email;
      const saved = localStorage.getItem(`${email}_ai_consent`);
      setAiConsent(saved === 'true');
    }
  }, [currentUser]);

  const handleToggleAiConsent = (val: boolean) => {
    setAiConsent(val);
    if (currentUser) {
      localStorage.setItem(`${currentUser.email}_ai_consent`, String(val));
    }
  };

  const fetchAiInsight = async () => {
    if (!currentUser) return;
    if (!aiConsent) {
      setAiInsight("AI Insight dinonaktifkan. Silakan aktifkan persetujuan pemrosesan AI di atas atau melalui Pengaturan.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.transactions.getAiInsight(
        filterType === 'month' ? selectedMonth : undefined,
        filterType === 'month' ? selectedYear : undefined
      );
      setAiInsight(res.insight);
    } catch (err) {
      console.error("Gagal mengambil AI Insight:", err);
      setAiInsight("Gagal memuat saran AI. Pastikan server aktif.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAiInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, currentUser, selectedMonth, selectedYear, filterType, aiConsent]);

  // Home notification panel state
  const [showNotifications, setShowNotifications] = useState(false);

  // Settings states
  const [notifEnabled, setNotifEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('dompetrack_notif_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('dompetrack_notif_enabled', String(notifEnabled));
  }, [notifEnabled]);


  const [showCategoryPreviewModal, setShowCategoryPreviewModal] = useState(false);

  const handleExportCSV = async () => {
    setIsLoading(true);
    try {
      const res = await api.transactions.getAll(undefined, undefined, 1, 100000);
      const txs = res.transactions;

      if (!txs || txs.length === 0) {
        alert('Tidak ada transaksi untuk diekspor');
        return;
      }

      const headers = ['ID', 'Type', 'Amount', 'Category', 'Description', 'Date'];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          str = `"${str}"`;
        }
        return str;
      };

      const rows = txs.map((tx: any) => [
        escapeCSV(tx.id),
        escapeCSV(tx.type),
        escapeCSV(tx.amount),
        escapeCSV(tx.category?.name || 'Other'),
        escapeCSV(tx.description || ''),
        escapeCSV(tx.date)
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dompetrack_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Gagal mengekspor data:', err);
      alert('Gagal mengekspor data transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  // Form State for Add Transaction
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [txAmountStr, setTxAmountStr] = useState<string>('0');
  const [txCategory, setTxCategory] = useState<string>(''); // Will hold Category ID
  const [txNote, setTxNote] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }); // Default date for input
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Effect to load data when filters change (resets page to 1)
  useEffect(() => {
    if (currentUser) {
      setCurrentPage(1);
      fetchData(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, selectedMonth, selectedYear, filterType]);

  // Effect to load data when page changes
  useEffect(() => {
    if (currentUser && currentPage !== 1) {
      fetchData(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Effect to listen to logout event from API
  useEffect(() => {
    const handleLogoutEvent = () => {
      setCurrentUser(null);
      setCurrentTab('home');
      setAuthScreen('login');
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  // Sync date view based on active tab
  useEffect(() => {
    const today = new Date();
    if (currentTab === 'home') {
      setSelectedMonth(today.getMonth());
      setSelectedYear(today.getFullYear());
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setTxDate(`${yyyy}-${mm}-${dd}`);
    } else if (currentTab === 'laporan') {
      setSelectedMonth(today.getMonth());
      setSelectedYear(today.getFullYear());
    } else if (currentTab === 'add') {
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setTxDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [currentTab]);

  // ---------------- UTILITIES ----------------
  // Helper to format currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  // Helper to check if date matches selected month and year
  const isTransactionInSelectedPeriod = (tx: Transaction, month: number, year: number) => {
    const txDateObj = new Date(tx.date);
    return txDateObj.getMonth() === month && txDateObj.getFullYear() === year;
  };
  // ---------------- COMPUTED PROPERTIES ----------------
  // Filtered transactions for selected period
  const periodTransactions = useMemo(() => {
    if (filterType === 'all') {
      return transactions;
    }
    return transactions.filter(tx => isTransactionInSelectedPeriod(tx, selectedMonth, selectedYear));
  }, [transactions, selectedMonth, selectedYear, filterType]);

  // Statistics for selected period
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;

    periodTransactions.forEach(tx => {
      if (tx.type === 'INCOME') {
        income += tx.amount;
      } else {
        expense += tx.amount;
      }
    });

    const balance = income - expense;
    // Cap progress percent at 100
    const percentUsed = income > 0 ? Math.min(Math.round((expense / income) * 100), 100) : 0;

    // Category distributions
    let foodSum = 0;
    let essentialsSum = 0;
    let hobbySum = 0;
    let otherSum = 0;

    periodTransactions.forEach(tx => {
      if (tx.type === 'EXPENSE') {
        const catName = tx.category.toLowerCase();
        if (catName.includes('makan') || catName.includes('food')) foodSum += tx.amount;
        else if (catName.includes('primer') || catName.includes('essential') || catName.includes('belanja')) essentialsSum += tx.amount;
        else if (catName.includes('hobi') || catName.includes('hobby') || catName.includes('game')) hobbySum += tx.amount;
        else otherSum += tx.amount;
      }
    });

    const totalExpense = foodSum + essentialsSum + hobbySum + otherSum;

    // Category transaction count (For Report tab)
    const counts = { Food: 0, Essentials: 0, Hobby: 0, Other: 0 };
    periodTransactions.forEach(tx => {
      if (tx.type === 'EXPENSE') {
        const catName = tx.category.toLowerCase();
        if (catName.includes('makan') || catName.includes('food')) counts.Food++;
        else if (catName.includes('primer') || catName.includes('essential') || catName.includes('belanja')) counts.Essentials++;
        else if (catName.includes('hobi') || catName.includes('hobby') || catName.includes('game')) counts.Hobby++;
        else counts.Other++;
      }
    });

    // Only use mock counts if the user has no transactions at all (Demo mode)
    const isDemo = transactions.length === 0;
    const displayCounts = {
      Food: isDemo && selectedMonth === 6 && selectedYear === 2026 && filterType === 'month' ? 12 : counts.Food,
      Essentials: isDemo && selectedMonth === 6 && selectedYear === 2026 && filterType === 'month' ? 8 : counts.Essentials,
      Other: isDemo && selectedMonth === 6 && selectedYear === 2026 && filterType === 'month' ? 24 : counts.Other,
      Hobby: counts.Hobby
    };

    return {
      income,
      expense,
      balance,
      percentUsed,
      categorySums: {
        Food: foodSum,
        Essentials: essentialsSum,
        Hobby: hobbySum,
        Other: otherSum
      },
      categoryPercents: totalExpense > 0 ? {
        Food: Math.round((foodSum / totalExpense) * 100),
        Essentials: Math.round((essentialsSum / totalExpense) * 100),
        Hobby: Math.round((hobbySum / totalExpense) * 100),
        Other: Math.round((otherSum / totalExpense) * 100)
      } : { Food: 0, Essentials: 0, Hobby: 0, Other: 0 },
      counts: displayCounts,
      isDemo
    };
  }, [transactions, periodTransactions, selectedMonth, selectedYear, filterType]);

  const cardTheme = useMemo(() => {
    if (stats.balance < 0) {
      return {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.9) 50%, rgba(69, 10, 10, 0.95) 100%)',
        boxShadow: '0 12px 24px -10px rgba(239, 68, 68, 0.45)',
        status: 'danger'
      };
    }
    if (stats.income > 0 && stats.balance <= stats.income * 0.2) {
      return {
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95) 0%, rgba(217, 119, 6, 0.9) 50%, rgba(120, 53, 4, 0.95) 100%)',
        boxShadow: '0 12px 24px -10px rgba(245, 158, 11, 0.45)',
        status: 'warning'
      };
    }
    return {
      background: 'var(--gradient-card)',
      boxShadow: '0 12px 24px -10px rgba(109, 95, 253, 0.4)',
      status: 'normal'
    };
  }, [stats.balance, stats.income]);

  const isCritical = stats.balance < 0;


  const categoryMom = useMemo(() => {
    const currentSums = stats.categorySums;

    // Calculate previous month's sums
    let prevFoodSum = 0;
    let prevEssentialsSum = 0;
    let prevHobbySum = 0;
    let prevOtherSum = 0;

    prevMonthTransactions.forEach(tx => {
      if (tx.type === 'EXPENSE') {
        const catName = tx.category.toLowerCase();
        if (catName.includes('makan') || catName.includes('food')) prevFoodSum += tx.amount;
        else if (catName.includes('primer') || catName.includes('essential') || catName.includes('belanja')) prevEssentialsSum += tx.amount;
        else if (catName.includes('hobi') || catName.includes('hobby') || catName.includes('game')) prevHobbySum += tx.amount;
        else prevOtherSum += tx.amount;
      }
    });

    const prevSums = {
      Food: prevFoodSum,
      Essentials: prevEssentialsSum,
      Hobby: prevHobbySum,
      Other: prevOtherSum
    };

    const prevTotal = prevFoodSum + prevEssentialsSum + prevHobbySum + prevOtherSum;
    const currentTotal = stats.expense;

    const getPercentageChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = ((curr - prev) / prev) * 100;
      const sign = diff >= 0 ? '+' : '';
      return `${sign}${diff.toFixed(1)}%`;
    };

    return {
      Food: getPercentageChange(currentSums.Food, prevSums.Food),
      Essentials: getPercentageChange(currentSums.Essentials, prevSums.Essentials),
      Hobby: getPercentageChange(currentSums.Hobby, prevSums.Hobby),
      Other: getPercentageChange(currentSums.Other, prevSums.Other),
      Total: getPercentageChange(currentTotal, prevTotal),
      isTotalUp: currentTotal >= prevTotal
    };
  }, [stats, prevMonthTransactions]);

  const trendData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailySpending = Array(daysInMonth).fill(0);
    periodTransactions.forEach(tx => {
      if (tx.type === 'EXPENSE') {
        const d = new Date(tx.date).getDate();
        if (d >= 1 && d <= daysInMonth) {
          dailySpending[d - 1] += tx.amount;
        }
      }
    });

    const maxDaily = Math.max(...dailySpending, 10000);
    const points = dailySpending.map((amount, idx) => {
      const x = 10 + (idx / (daysInMonth - 1)) * 352;
      const y = 110 - (amount / maxDaily) * 90;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const fillPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} 120 L ${points[0].x.toFixed(1)} 120 Z` : '';
    const maxDayIdx = maxDaily > 0 ? dailySpending.indexOf(Math.max(...dailySpending)) : 0;
    const maxPoint = points[maxDayIdx];

    return {
      linePath,
      fillPath,
      maxPoint,
      hasSpending: Math.max(...dailySpending) > 0
    };
  }, [periodTransactions, selectedMonth, selectedYear]);

  // Grouped transactions by day (For Report tab)
  const groupedTransactionsByDay = useMemo(() => {
    const groups: { [date: string]: { txs: Transaction[]; totalExpense: number; totalIncome: number } } = {};

    // Sort transactions newest to oldest
    const sorted = [...periodTransactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    sorted.forEach(tx => {
      if (!groups[tx.date]) {
        groups[tx.date] = { txs: [], totalExpense: 0, totalIncome: 0 };
      }
      groups[tx.date].txs.push(tx);
      if (tx.type === 'EXPENSE') {
        groups[tx.date].totalExpense += tx.amount;
      } else {
        groups[tx.date].totalIncome += tx.amount;
      }
    });

    return groups;
  }, [periodTransactions]);

  // Determine icon to render based on category/name
  const getIcon = (categoryName: string, note: string) => {
    const normalizedNote = note.toLowerCase();
    if (normalizedNote.includes('kopi') || normalizedNote.includes('sushi') || normalizedNote.includes('makan') || normalizedNote.includes('food') || normalizedNote.includes('sbucks')) {
      return <Coffee className="icon" />;
    }
    if (normalizedNote.includes('gojek') || normalizedNote.includes('grab') || normalizedNote.includes('ride') || normalizedNote.includes('taxi') || normalizedNote.includes('car') || normalizedNote.includes('bensin') || normalizedNote.includes('tol')) {
      return <Car className="icon" />;
    }
    if (normalizedNote.includes('freelance') || normalizedNote.includes('salary') || normalizedNote.includes('gaji') || normalizedNote.includes('payout')) {
      return <Briefcase className="icon" />;
    }

    const category = categoryName.toLowerCase();
    if (category.includes('makan') || category.includes('food')) {
      return <Utensils className="icon" />;
    }
    if (category.includes('primer') || category.includes('essential') || category.includes('belanja')) {
      return <ShoppingBag className="icon" />;
    }
    if (category.includes('hobi') || category.includes('hobby') || category.includes('game')) {
      return <Gamepad2 className="icon" />;
    }
    return <MoreHorizontal className="icon" />;
  };

  // ---------------- ACTIONS ----------------
  const changeMonth = (direction: 'next' | 'prev') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    }
  };

  // Keyboard Press Handler
  const handleNumpadPress = (val: string) => {
    if (val === 'back') {
      setTxAmountStr(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
    } else {
      setTxAmountStr(prev => {
        if (prev === '0') return val;
        // Limit to 10 digits to prevent overflow
        if (prev.length >= 10) return prev;
        return prev + val;
      });
    }
  };

  // Save Transaction
  const handleSaveTransaction = async () => {
    const amountVal = parseInt(txAmountStr, 10);
    if (isNaN(amountVal) || amountVal <= 0) return;

    setIsLoading(true);
    try {
      if (txType === 'EXPENSE' && !txCategory) {
        throw new Error('Kategori wajib dipilih untuk pengeluaran');
      }

      const today = new Date();
      const [year, month, day] = txDate.split('-').map(Number);
      const combinedDate = new Date(year, month - 1, day, today.getHours(), today.getMinutes(), today.getSeconds());

      await api.transactions.create({
        type: txType,
        amount: amountVal,
        description: txNote.trim() || (txType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
        categoryId: txType === 'EXPENSE' ? txCategory : undefined,
        date: combinedDate.toISOString(),
      });

      await fetchData();

      // Clear Form
      setTxAmountStr('0');
      setTxNote('');

      // Show Toast Animation
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        // Auto redirect to home
        setCurrentTab('home');
      }, 1800);
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Hapus transaksi ini?')) return;
    setIsLoading(true);
    try {
      await api.transactions.delete(id);
      await fetchData();
    } catch (err: any) {
      alert('Gagal menghapus transaksi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditAmountStr(tx.amount.toString());
    setEditType(tx.type);
    setEditCategory(tx.categoryObj?.id || '');
    setEditNote(tx.note);
    setEditDate(tx.date);
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    const amountVal = parseInt(editAmountStr, 10);
    if (isNaN(amountVal) || amountVal <= 0) return;

    setIsLoading(true);
    try {
      if (editType === 'EXPENSE' && !editCategory) {
        throw new Error('Kategori wajib dipilih untuk pengeluaran');
      }

      const today = new Date();
      const [year, month, day] = editDate.split('-').map(Number);
      const originalDateObj = editingTransaction.rawDate ? new Date(editingTransaction.rawDate) : null;

      let combinedDate: Date;
      if (originalDateObj &&
          originalDateObj.getFullYear() === year &&
          originalDateObj.getMonth() === month - 1 &&
          originalDateObj.getDate() === day) {
        // Date did not change, preserve original time
        combinedDate = originalDateObj;
      } else {
        // Date changed, combine new date with current time
        combinedDate = new Date(year, month - 1, day, today.getHours(), today.getMinutes(), today.getSeconds());
      }

      await api.transactions.update(editingTransaction.id, {
        type: editType,
        amount: amountVal,
        description: editNote.trim() || (editType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
        categoryId: editType === 'EXPENSE' ? editCategory : undefined,
        date: combinedDate.toISOString(),
      });

      await fetchData();
      setEditingTransaction(null);
    } catch (err: any) {
      alert('Gagal memperbarui transaksi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date helper for Group headers (e.g. "TODAY, 14 JULI")
  const formatGroupHeaderDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    const day = dateObj.getDate();
    const month = INDO_MONTHS[dateObj.getMonth()].toUpperCase();

    // Check if it matches today or yesterday
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const compareDate = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (compareDate(dateObj, today)) {
      return `TODAY, ${day} ${month}`;
    } else if (compareDate(dateObj, yesterday)) {
      return `YESTERDAY, ${day} ${month}`;
    }

    // Default formatting
    const dayOfWeek = INDO_DAYS[dateObj.getDay()].toUpperCase();
    return `${dayOfWeek}, ${day} ${month}`;
  };

  // Format date helper for Home Screen Header ("Kamis, 24 Oktober 2024")
  const formatGreetingDate = () => {
    const today = new Date();
    if (selectedMonth === today.getMonth() && selectedYear === today.getFullYear()) {
      const dayName = INDO_DAYS[today.getDay()];
      const monthName = INDO_MONTHS[today.getMonth()];
      return `${dayName}, ${today.getDate()} ${monthName} ${today.getFullYear()}`;
    }
    // If selected period is Oct 2024, show screenshot date
    if (selectedMonth === 9 && selectedYear === 2024) {
      return 'Kamis, 24 Oktober 2024';
    }
    // Otherwise show selected month/year base
    return `${INDO_DAYS[4]}, 14 ${INDO_MONTHS[selectedMonth]} ${selectedYear}`;
  };

  return (
    <div className="app-simulator-container">
      <div className="device-frame">
        {/* Notch Area */}
        <div className="device-notch"></div>

        {/* Device screen */}
        <div className="app-screen">
          {!currentUser ? (
            authScreen === 'login' ? (
              /* LOGIN SCREEN */
              <div className="auth-container fade-in">
                <div className="auth-header">
                  <div className="auth-logo-container" style={{ background: 'none' }}>
                    <img src="/Dompetrack.png" alt="Dompetrack Logo" className="auth-logo" />
                  </div>
                  <h1 className="auth-title">Selamat Datang</h1>
                  <p className="auth-subtitle">Silakan masuk untuk mulai mengelola keuangan Anda secara cerdas</p>
                </div>

                <form className="auth-form" onSubmit={handleLogin}>
                  {authError && <div className="auth-error">{authError}</div>}

                  <div className="auth-input-group">
                    <label className="auth-input-label">EMAIL</label>
                    <div className="auth-input-wrapper">
                      <Mail className="auth-input-icon" size={16} />
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="contoh@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">PASSWORD</label>
                    <div className="auth-input-wrapper">
                      <Lock className="auth-input-icon" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-eye-icon"
                        onClick={() => setShowPassword(prev => !prev)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <a
                    href="#forgot"
                    className="auth-forgot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthScreen('forgot');
                      setForgotEmailSent(false);
                      setAuthError('');
                    }}
                  >
                    Lupa Password?
                  </a>

                  <button type="submit" className="auth-btn">
                    Masuk ke Akun
                  </button>
                </form>

                <div className="auth-footer">
                  Belum punya akun?{' '}
                  <button className="auth-footer-link" onClick={() => { setAuthScreen('signup'); setAuthError(''); setAuthEmail(''); setAuthPassword(''); }}>
                    Daftar Sekarang
                  </button>
                </div>
              </div>
            ) : authScreen === 'signup' ? (
              /* SIGN UP SCREEN */
              <div className="auth-container fade-in">
                <div className="auth-header">
                  <div className="auth-logo-container" style={{ background: 'none' }}>
                    <img src="/Dompetrack.png" alt="Dompetrack Logo" className="auth-logo" />
                  </div>
                  <h1 className="auth-title">Buat Akun</h1>
                  <p className="auth-subtitle">Kelola pengeluaran harian dan bulanan dengan lebih presisi</p>
                </div>

                <form className="auth-form" onSubmit={handleSignUp}>
                  {authError && <div className="auth-error">{authError}</div>}

                  <div className="auth-input-group">
                    <label className="auth-input-label">NAMA LENGKAP</label>
                    <div className="auth-input-wrapper">
                      <User className="auth-input-icon" size={16} />
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="Nama Anda"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">EMAIL</label>
                    <div className="auth-input-wrapper">
                      <Mail className="auth-input-icon" size={16} />
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="contoh@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">PASSWORD</label>
                    <div className="auth-input-wrapper">
                      <Lock className="auth-input-icon" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="Minimal 6 karakter"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="auth-eye-icon"
                        onClick={() => setShowPassword(prev => !prev)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label className="auth-input-label">KONFIRMASI PASSWORD</label>
                    <div className="auth-input-wrapper">
                      <Lock className="auth-input-icon" size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="auth-input"
                        placeholder="Ulangi password"
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-checkbox-row">
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      className="auth-checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <label htmlFor="terms-checkbox" className="auth-checkbox-label">
                      Saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi Dompetrack
                    </label>
                  </div>

                  <button type="submit" className="auth-btn">
                    Daftar Akun Baru
                  </button>
                </form>

                <div className="auth-footer">
                  Sudah punya akun?{' '}
                  <button className="auth-footer-link" onClick={() => { setAuthScreen('login'); setAuthError(''); setAuthEmail(''); setAuthPassword(''); }}>
                    Masuk Di Sini
                  </button>
                </div>
              </div>
            ) : (
              /* FORGOT PASSWORD SCREEN */
              <div className="auth-container fade-in">
                <div className="auth-header">
                  <div className="auth-logo-container" style={{ background: 'none' }}>
                    <img src="/Dompetrack.png" alt="Dompetrack Logo" className="auth-logo" />
                  </div>
                  <h1 className="auth-title">Pulihkan Kata Sandi</h1>
                  <p className="auth-subtitle">Masukkan alamat email terdaftar Anda untuk memulihkan akses akun</p>
                </div>

                {forgotEmailSent ? (
                  <div className="auth-success-card" style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{ color: '#10B981', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                      Permintaan Terkirim
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
                      Instruksi pemulihan telah dikirim ke email Anda. Silakan hubungi administrator sistem jika Anda tidak menerima email tersebut.
                    </p>
                  </div>
                ) : (
                  <form
                    className="auth-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!authEmail) {
                        setAuthError('Email wajib diisi');
                        return;
                      }
                      setForgotEmailSent(true);
                      setAuthError('');
                    }}
                  >
                    {authError && <div className="auth-error">{authError}</div>}

                    <div className="auth-input-group">
                      <label className="auth-input-label">EMAIL</label>
                      <div className="auth-input-wrapper">
                        <Mail className="auth-input-icon" size={16} />
                        <input
                          type="email"
                          className="auth-input"
                          placeholder="contoh@email.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="auth-btn">
                      Kirim Tautan Pemulihan
                    </button>
                  </form>
                )}

                <div className="auth-footer">
                  Sudah ingat kata sandi?{' '}
                  <button className="auth-footer-link" onClick={() => { setAuthScreen('login'); setAuthError(''); setAuthEmail(''); setForgotEmailSent(false); }}>
                    Masuk Di Sini
                  </button>
                </div>
              </div>
            )
          ) : (
            <>
              {/* Header (Top Navigation Area) */}
              <header className="app-header">
            {currentTab === 'add' ? (
              <div className="add-header" style={{ width: '100%', borderBottom: 'none', padding: 0 }}>
                <button className="back-btn" onClick={() => setCurrentTab('home')}>
                  <ArrowLeft size={20} />
                </button>
                <div className="header-title-center">Dompetrack</div>
                <button className="bell-btn" onClick={() => setShowNotifications(prev => !prev)}>
                  <Bell size={20} />
                  <div className="bell-badge"></div>
                </button>
              </div>
            ) : (
              <>
                <div className="app-header-left">
                  <div className="app-logo-bg" style={{ background: 'none' }}>
                    <img src="/Dompetrack.png" alt="Dompetrack Logo" className="app-logo-img" />
                  </div>
                  <span className="app-title">Dompetrack</span>
                </div>
                <div className="app-header-right">
                  <button className="bell-btn" onClick={() => setShowNotifications(prev => !prev)}>
                    <Bell size={20} />
                    <div className="bell-badge"></div>
                  </button>
                </div>
              </>
            )}
          </header>

          {/* Success Overlay Popup */}
          {showSuccessToast && (
            <div className="success-overlay">
              <div className="success-popup">
                <div className="success-circle">
                  <Check size={40} strokeWidth={3} className="success-check-icon" />
                </div>
                <p className="success-text">Transaksi Disimpan!</p>
              </div>
            </div>
          )}

          {/* Custom Notification Dropdown */}
          {showNotifications && (
            <div className="notifications-panel" style={{
              position: 'absolute',
              top: '96px',
              left: '16px',
              right: '16px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              zIndex: 100,
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>Pemberitahuan</span>
                <button style={{ fontSize: '11px', color: 'var(--primary)' }} onClick={() => setShowNotifications(false)}>Tutup</button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <strong>AI Analisis Baru:</strong> {aiLoading ? "Menganalisis..." : (aiInsight || "Belum ada analisis baru.")}
                </div>
                <div>
                  <strong>Sistem:</strong> Pengingat harian aktif. Jangan lupa mencatat transaksi hari ini!
                </div>
              </div>
            </div>
          )}

          {/* MAIN PAGE RENDERER */}
          <div className="screen-content">

            {/* 1. HOME SCREEN */}
            {currentTab === 'home' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                {/* Greeting Section & Period Toggle */}
                <div className="greeting-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <div className="greeting-title">Halo, {currentUser?.name || 'Olan'}</div>
                    <div className="greeting-date">{formatGreetingDate()}</div>
                  </div>

                  <div className="filter-toggle-container" style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '2px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <button
                      className={`filter-toggle-btn ${filterType === 'month' ? 'active' : ''}`}
                      onClick={() => setFilterType('month')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        background: filterType === 'month' ? 'var(--primary)' : 'transparent',
                        color: filterType === 'month' ? '#000000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Bulan Ini
                    </button>
                    <button
                      className={`filter-toggle-btn ${filterType === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterType('all')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        background: filterType === 'all' ? 'var(--primary)' : 'transparent',
                        color: filterType === 'all' ? '#000000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Semua
                    </button>
                  </div>
                </div>

                {/* Hero Balance Card */}
                <div
                  className="balance-card"
                  style={{
                    background: cardTheme.background,
                    boxShadow: cardTheme.boxShadow
                  }}
                >
                  <div className="balance-label">BALANCE SISA</div>
                  <div className="balance-amount">{formatRupiah(stats.balance)}</div>

                  <div className="income-expense-row">
                    <div className="ie-item">
                      <div className="ie-label">INCOME</div>
                      <div className="ie-value" style={{ color: '#ffffff' }}>
                        {formatRupiah(stats.income)}
                      </div>
                    </div>
                    <div className="ie-item">
                      <div className="ie-label">EXPENSE</div>
                      <div className="ie-value" style={{ color: '#ffffff' }}>
                        {formatRupiah(stats.expense)}
                      </div>
                    </div>
                  </div>

                  <div className="progress-section">
                    <div className="progress-labels">
                      <span>Monthly Allowance</span>
                      <span>{stats.percentUsed}% Used</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${stats.percentUsed}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Main Content Areas or Empty State */}
                {periodTransactions.length === 0 ? (
                  <div className="empty-state-card" style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    padding: '40px 24px',
                    textAlign: 'center',
                    margin: '20px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                  }}>
                    <div className="empty-state-icon-container" style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '20px',
                      background: 'rgba(124, 111, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      marginBottom: '8px'
                    }}>
                      <TrendingUp size={32} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Belum Ada Transaksi</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '240px', lineHeight: '1.5' }}>
                      Catatan keuangan Anda masih kosong. Mulai catat untuk melacak arus kas Anda.
                    </p>
                    <div className="empty-state-actions" style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                      <button
                        onClick={() => { setTxType('INCOME'); setCurrentTab('add'); }}
                        style={{
                          flex: 1,
                           padding: '12px',
                           borderRadius: '12px',
                           background: 'rgba(255, 255, 255, 0.05)',
                           border: '1px solid rgba(255, 255, 255, 0.1)',
                           color: '#ffffff',
                           fontWeight: 600,
                           fontSize: '13px',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease'
                        }}
                      >
                        + Pemasukan
                      </button>
                      <button
                        onClick={() => { setTxType('EXPENSE'); setCurrentTab('add'); }}
                        style={{
                          flex: 1,
                           padding: '12px',
                           borderRadius: '12px',
                           background: 'var(--primary)',
                           border: 'none',
                           color: '#000000',
                           fontWeight: 600,
                           fontSize: '13px',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease'
                        }}
                      >
                        + Pengeluaran
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Alokasi Dana Section */}
                    <div className="section-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="section-header">
                        <span className="section-title">Alokasi Dana</span>
                        <span className="section-link" onClick={() => setCurrentTab('laporan')}>
                          <ChevronRight size={16} />
                        </span>
                      </div>

                      <div className="allocation-card">
                        <div className="allocation-bar">
                          <div className="alloc-seg" style={{ width: `${stats.categoryPercents.Food}%`, backgroundColor: '#7C6FFF' }}></div>
                          <div className="alloc-seg" style={{ width: `${stats.categoryPercents.Essentials}%`, backgroundColor: '#a49cff' }}></div>
                          <div className="alloc-seg" style={{ width: `${stats.categoryPercents.Hobby}%`, backgroundColor: '#FBBF24' }}></div>
                          <div className="alloc-seg" style={{ width: `${stats.categoryPercents.Other}%`, backgroundColor: '#5C5C6E' }}></div>
                        </div>

                        <div className="alloc-legend">
                          <div className="legend-item">
                            <div className="dot" style={{ backgroundColor: '#7C6FFF' }}></div>
                            <span>Makanan ({stats.categoryPercents.Food}%)</span>
                          </div>
                          <div className="legend-item">
                            <div className="dot" style={{ backgroundColor: '#a49cff' }}></div>
                            <span>Primer ({stats.categoryPercents.Essentials}%)</span>
                          </div>
                          <div className="legend-item">
                            <div className="dot" style={{ backgroundColor: '#FBBF24' }}></div>
                            <span>Hobi ({stats.categoryPercents.Hobby}%)</span>
                          </div>
                          <div className="legend-item">
                            <div className="dot" style={{ backgroundColor: '#5C5C6E' }}></div>
                            <span>Lainnya ({stats.categoryPercents.Other}%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Insight Card */}
                    <div
                      className="ai-insight-card"
                      style={{
                        position: 'relative',
                        borderLeft: isCritical ? '4px solid var(--danger)' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div
                          className="ai-icon-container"
                          style={{
                            background: isCritical ? 'rgba(239, 68, 68, 0.1)' : undefined,
                            color: isCritical ? 'var(--danger)' : undefined
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                          </svg>
                        </div>
                        <div className="ai-content" style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span
                              className="ai-tag"
                              style={{
                                color: isCritical ? 'var(--danger)' : undefined
                              }}
                            >
                              AI INSIGHT
                            </span>
                            {aiConsent && (
                              <button
                                onClick={fetchAiInsight}
                                disabled={aiLoading}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: isCritical ? 'var(--danger)' : 'var(--primary)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '2px'
                                }}
                                title="Refresh Insight"
                              >
                                <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
                              </button>
                            )}
                          </div>
                          <p className="ai-text">
                            {aiLoading ? (
                              <span style={{ opacity: 0.6 }}>Menganalisis data keuangan Anda...</span>
                            ) : (
                              aiInsight || "Mulai catat transaksi untuk mendapatkan analisis keuangan pintar dari AI."
                            )}
                          </p>
                        </div>
                      </div>

                      {!aiConsent ? (
                        <div className="ai-consent-banner" style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '12px',
                          padding: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            AI Insight menggunakan Google Gemini. Data transaksi dienkripsi saat transit untuk proses analisis keuangan Anda.
                          </span>
                          <button
                            onClick={() => handleToggleAiConsent(true)}
                            style={{
                              background: 'var(--primary)',
                              color: '#000000',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              width: 'max-content',
                              alignSelf: 'flex-start',
                              transition: 'all 0.2s'
                            }}
                          >
                            Aktifkan AI Insight
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          paddingTop: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <span style={{ flex: 1, lineHeight: '1.3' }}>AI Insight menggunakan Google Gemini. Data transaksi dienkripsi saat transit untuk analisis keuangan Anda.</span>
                          <button
                            onClick={() => handleToggleAiConsent(false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '10px',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 600
                            }}
                          >
                            Nonaktifkan
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Recent Transactions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="transactions-header">
                        <span className="section-title">Recent Transactions</span>
                        <button className="see-all-btn" onClick={() => setCurrentTab('laporan')}>SEE ALL</button>
                      </div>

                      <div className="transactions-list">
                        {periodTransactions.slice(0, 5).map((tx) => (
                          <div className="transaction-item" key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="tx-left">
                              <div className="tx-icon-wrapper">
                                {getIcon(tx.category, tx.note)}
                              </div>
                              <div className="tx-details">
                                <span className="tx-name">{tx.note}</span>
                                <span className="tx-time">
                                  {tx.date} • {tx.time}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span className={`tx-amount ${tx.type === 'EXPENSE' ? 'expense' : 'income'}`}>
                                {tx.type === 'EXPENSE' ? '-' : '+'}{formatRupiah(tx.amount)}
                              </span>
                              <button
                                className="delete-tx-btn"
                                onClick={() => handleDeleteTransaction(tx.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'rgba(239, 68, 68, 0.6)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2. ADD TRANSACTION SCREEN */}
            {currentTab === 'add' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', width: '100%' }}>

                {/* Segmented Toggle: Pengeluaran / Pemasukan */}
                <div className="toggle-container">
                  <button
                    className={`toggle-btn ${txType === 'EXPENSE' ? 'active' : ''}`}
                    onClick={() => setTxType('EXPENSE')}
                  >
                    Pengeluaran
                  </button>
                  <button
                    className={`toggle-btn ${txType === 'INCOME' ? 'active' : ''}`}
                    onClick={() => setTxType('INCOME')}
                  >
                    Pemasukan
                  </button>
                </div>

                {/* Amount Display */}
                <div className="nominal-section">
                  <span className="nominal-label">JUMLAH NOMINAL</span>
                  <div className="nominal-display">
                    <span className="nominal-currency">Rp</span>
                    <span className="nominal-value">{parseInt(txAmountStr, 10).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Category Chips (Only for Expense) */}
                {txType === 'EXPENSE' && (
                  <div className="categories-section">
                    <span className="cat-section-label">KATEGORI</span>
                    <div className="categories-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {categories.map((cat) => {
                        const isSelected = txCategory === cat.id;
                        let iconEl = null;
                        const catNameLower = cat.name ? cat.name.toLowerCase() : '';
                        const catIconStr = cat.icon ? cat.icon : '';
                        if (catNameLower.includes('makan') || catNameLower.includes('food') || catIconStr === '🍔') {
                          iconEl = <Utensils size={16} />;
                        } else if (catNameLower.includes('primer') || catNameLower.includes('essential') || catNameLower.includes('belanja') || catIconStr === '🏠') {
                          iconEl = <ShoppingBag size={16} />;
                        } else if (catNameLower.includes('hobi') || catNameLower.includes('hobby') || catNameLower.includes('game') || catIconStr === '🎮') {
                          iconEl = <Gamepad2 size={16} />;
                        } else {
                          iconEl = <MoreHorizontal size={16} />;
                        }

                        return (
                          <button
                            key={cat.id}
                            className={`category-chip ${isSelected ? 'active' : ''}`}
                            onClick={() => setTxCategory(cat.id)}
                            style={{
                              borderColor: isSelected ? cat.color : 'rgba(255,255,255,0.08)',
                              color: isSelected ? '#000000' : 'var(--text-secondary)',
                              background: isSelected ? cat.color : 'rgba(255,255,255,0.02)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              borderRadius: '99px',
                              border: '1px solid',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {iconEl}
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Notes Input Field */}
                <div className="input-group">
                  <FileText className="input-icon" size={18} />
                  <input
                    type="text"
                    className="text-input"
                    placeholder="What's this for?"
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                  />
                </div>

                {/* Date Picker Input */}
                <div
                  className="input-group"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  onClick={() => {
                    if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
                      dateInputRef.current.showPicker();
                    }
                  }}
                >
                  <Calendar className="input-icon" size={18} style={{ color: '#FFFFFF' }} />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* Numerical Keypad Custom */}
                <div className="numpad-grid">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      className="numpad-key"
                      onClick={() => handleNumpadPress(num)}
                    >
                      {num}
                    </button>
                  ))}

                  {/* Decimal / Dot (representing comma or multiplier in Rupiah app, we make it decimal or empty) */}
                  <button className="numpad-key" style={{ fontSize: '20px' }} onClick={() => handleNumpadPress('000')}>
                    .000
                  </button>

                  <button className="numpad-key" onClick={() => handleNumpadPress('0')}>
                    0
                  </button>

                  <button
                    className="numpad-key"
                    onClick={() => handleNumpadPress('back')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0 -2-2z" />
                      <line x1="18" y1="9" x2="12" y2="15" />
                      <line x1="12" y1="9" x2="18" y2="15" />
                    </svg>
                  </button>
                </div>

                {/* Save Button Container */}
                <div className="save-button-container">
                  <button
                    className="save-btn"
                    onClick={handleSaveTransaction}
                    disabled={parseInt(txAmountStr, 10) <= 0}
                  >
                    Simpan Transaksi
                  </button>
                </div>

              </div>
            )}

            {/* 3. REPORTS (LAPORAN) SCREEN */}
            {currentTab === 'laporan' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>

                {/* Month Navigator bar */}
                <div className="reports-header-nav">
                  <button className="month-nav-btn" onClick={() => changeMonth('prev')}>
                    <ChevronLeft size={16} />
                  </button>

                  <div className="month-label-container">
                    <span className="month-label-name">{INDO_MONTHS[selectedMonth]} {selectedYear}</span>
                    <span className="month-label-sub">MONTHLY OVERVIEW</span>
                  </div>

                  <button className="month-nav-btn" onClick={() => changeMonth('next')}>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Daily Spending Trend Card */}
                <div className="trend-card">
                  <div className="trend-info-row">
                    <div className="trend-amount-section">
                      <span className="trend-title">Daily Spending Trend</span>
                      <span className="trend-amount">{formatRupiah(stats.expense)}</span>
                    </div>
                    {/* Trend Badge */}
                    {trendData.hasSpending && (
                      <div className={`badge ${categoryMom.isTotalUp ? 'danger' : 'success'}`}>
                        {categoryMom.isTotalUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        <span>{categoryMom.Total}</span>
                      </div>
                    )}
                  </div>

                  {/* SVG Wavy Line Chart */}
                  <div className="chart-container">
                    <svg width="100%" height="100%" viewBox="0 0 372 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartLineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C6FFF" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#7C6FFF" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {trendData.hasSpending ? (
                        <>
                          {/* Gradient background fill */}
                          <path
                            d={trendData.fillPath}
                            fill="url(#chartLineGrad)"
                          />

                          {/* Wavy stroke line */}
                          <path
                            d={trendData.linePath}
                            stroke="#7C6FFF"
                            strokeWidth="3.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Max day highlight point */}
                          {trendData.maxPoint && (
                            <circle
                              cx={trendData.maxPoint.x}
                              cy={trendData.maxPoint.y}
                              r="5"
                              fill="#7C6FFF"
                              stroke="#FFFFFF"
                              strokeWidth="1.5"
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {/* Flat line when no spending */}
                          <line
                            x1="10"
                            y1="110"
                            x2="362"
                            y2="110"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                          <text
                            x="186"
                            y="65"
                            fill="var(--text-muted)"
                            fontSize="12"
                            textAnchor="middle"
                          >
                            Tidak ada data pengeluaran
                          </text>
                        </>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Top Categories breakdown list */}
                <div className="top-cats-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="section-title">Top Categories</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {categories.map((cat) => {
                      const isFood = cat.name.toLowerCase().includes('makan') || cat.name.toLowerCase().includes('food');
                      const isEssentials = cat.name.toLowerCase().includes('primer') || cat.name.toLowerCase().includes('essential') || cat.name.toLowerCase().includes('belanja');
                      const isHobby = cat.name.toLowerCase().includes('hobi') || cat.name.toLowerCase().includes('hobby') || cat.name.toLowerCase().includes('game');

                      const key = isFood ? 'Food' : isEssentials ? 'Essentials' : isHobby ? 'Hobby' : 'Other';
                      const count = stats.counts[key] || 0;
                      const sum = stats.categorySums[key] || 0;
                      const momStr = categoryMom[key] || '0%';
                      const isMomUp = momStr.startsWith('+');
                      const isExpanded = expandedCategory === cat.id;

                      // Filter transactions of this category
                      const catTransactions = periodTransactions.filter(tx =>
                        tx.type === 'EXPENSE' && (tx.categoryObj?.id === cat.id || (!tx.categoryObj && cat.name === 'Lainnya'))
                      );

                      return (
                        <div key={cat.id} className="expandable-category-card">
                          <div
                            className="top-cat-item"
                            style={{ cursor: 'pointer', borderBottom: 'none' }}
                            onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                          >
                            <div className="top-cat-left">
                              <div className="top-cat-icon-box" style={{ color: cat.color }}>
                                {getIcon(cat.name, '')}
                              </div>
                              <div className="top-cat-text">
                                <span className="top-cat-name">{cat.name}</span>
                                <span className="top-cat-count">{count} Transactions</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div className="top-cat-right">
                                <span className="top-cat-value">{formatRupiah(sum)}</span>
                                <span className={`top-cat-badge ${isMomUp ? 'red' : 'green'}`}>{momStr} vs prev</span>
                              </div>
                              <ChevronRight
                                size={16}
                                style={{
                                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                                  transition: 'transform 0.2s',
                                  color: 'var(--text-secondary)'
                                }}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="category-expanded-list slide-down">
                              {catTransactions.map(tx => (
                                <div
                                  key={tx.id}
                                  className="category-expanded-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(tx);
                                  }}
                                >
                                  <div className="expanded-item-left">
                                    <span className="expanded-item-note">{tx.note}</span>
                                    <span className="expanded-item-date">{tx.date} • {tx.time}</span>
                                  </div>
                                  <span className="expanded-item-amount">-{formatRupiah(tx.amount)}</span>
                                </div>
                              ))}
                              {catTransactions.length === 0 && (
                                <div className="expanded-item-empty">Tidak ada transaksi di kategori ini.</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transaction History chronological grouped */}
                <div className="history-section">
                  <span className="history-section-title">Transactions History</span>

                  {Object.keys(groupedTransactionsByDay).map(dateKey => {
                    const group = groupedTransactionsByDay[dateKey];
                    return (
                      <div className="history-group" key={dateKey}>
                        <div className="history-group-header">
                          <span className="history-date">{formatGroupHeaderDate(dateKey)}</span>
                          <span className="history-total">
                            {group.totalIncome > 0 && group.totalExpense > 0 ? (
                              <>
                                <span className="income" style={{ color: 'var(--success)' }}>+{formatRupiah(group.totalIncome)}</span>
                                <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
                                <span className="expense" style={{ color: 'var(--danger)' }}>-{formatRupiah(group.totalExpense)}</span>
                              </>
                            ) : group.totalIncome > 0 ? (
                              <span className="income" style={{ color: 'var(--success)' }}>+{formatRupiah(group.totalIncome)}</span>
                            ) : (
                              <span className="expense" style={{ color: 'var(--danger)' }}>-{formatRupiah(group.totalExpense)}</span>
                            )}
                          </span>
                        </div>

                        <div className="transactions-list">
                          {group.txs.map(tx => (
                            <div
                              className="transaction-item"
                              key={tx.id}
                              onClick={() => startEditing(tx)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="tx-left">
                                <div className="tx-icon-wrapper">
                                  {getIcon(tx.category, tx.note)}
                                </div>
                                <div className="tx-details">
                                  <span className="tx-name">{tx.note}</span>
                                  <span className="tx-time">
                                    {tx.time} • {tx.category}
                                  </span>
                                </div>
                              </div>
                              <span className={`tx-amount ${tx.type === 'EXPENSE' ? 'expense' : 'income'}`}>
                                {tx.type === 'EXPENSE' ? '-' : '+'}{formatRupiah(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(groupedTransactionsByDay).length === 0 && (
                    <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                      Tidak ada riwayat transaksi di bulan ini.
                    </div>
                  )}
                </div>

                {paginationInfo && paginationInfo.totalPages > 1 && (
                  <div className="pagination-container" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '20px',
                    padding: '10px 0'
                  }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: currentPage === 1 ? 'var(--text-muted)' : '#ffffff',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Page {paginationInfo.page} of {paginationInfo.totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.totalPages))}
                      disabled={currentPage === paginationInfo.totalPages}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: currentPage === paginationInfo.totalPages ? 'var(--text-muted)' : '#ffffff',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: currentPage === paginationInfo.totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* 4. SETTINGS SCREEN */}
            {currentTab === 'settings' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>

                {/* Profile Card */}
                <div className="profile-card">
                  <div className="profile-left">
                    <div className="profile-avatar-container">
                      <img className="profile-avatar" src="/olan-avatar.png" alt="Olan" />
                      <div className="profile-edit-badge">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="profile-details">
                      <span className="profile-name">{currentUser?.name || 'Olan'}</span>
                      <span className="profile-email">{currentUser?.email || 'olan@example.com'}</span>
                    </div>
                  </div>
                  <ChevronRight className="profile-chevron" size={18} />
                </div>

                {/* Account Settings group */}
                <div className="settings-section">
                  <span className="settings-section-title">Account</span>
                  <div className="settings-group">

                    {/* Notifications */}
                    <div className="settings-item">
                      <div className="settings-item-left">
                        <Bell className="settings-item-icon" size={18} />
                        <span className="settings-item-label">Notifications</span>
                      </div>
                      <div className="settings-item-right">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={notifEnabled}
                            onChange={(e) => setNotifEnabled(e.target.checked)}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>

                    {/* Category management */}
                    <div className="settings-item" style={{ cursor: 'pointer' }} onClick={() => setShowCategoryPreviewModal(true)}>
                      <div className="settings-item-left">
                        <svg className="settings-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="9" rx="1" />
                          <rect x="14" y="3" width="7" height="5" rx="1" />
                          <rect x="14" y="12" width="7" height="9" rx="1" />
                          <rect x="3" y="16" width="7" height="5" rx="1" />
                        </svg>
                        <span className="settings-item-label">Category management</span>
                      </div>
                      <div className="settings-item-right">
                        <ChevronRight className="profile-chevron" size={16} />
                      </div>
                    </div>

                    {/* Export data */}
                    <div className="settings-item" style={{ cursor: 'pointer' }} onClick={handleExportCSV}>
                      <div className="settings-item-left">
                        <svg className="settings-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span className="settings-item-label">Export data</span>
                      </div>
                      <div className="settings-item-right">
                        <ChevronRight className="profile-chevron" size={16} />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Session Settings Group */}
                <div className="settings-section">
                  <span className="settings-section-title">Session</span>
                  <div className="settings-group">

                    {/* Logout button */}
                    <div className="settings-item logout-item" onClick={() => {
                      api.auth.logout();
                    }}>
                      <div className="settings-item-left">
                        <LogOut className="logout-icon" size={18} />
                        <span className="settings-item-label logout-label">Log out</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Version and Infrastructure tag */}
                <div className="settings-footer">
                  <span className="app-version">App Version 2.4.0 (Build 82)</span>
                  <span className="app-infra-tag">Managed Financial Infrastructure</span>
                </div>

              </div>
            )}

          </div>

          {/* Tab Bar Navigation (Bottom Nav) */}
          <nav className="app-nav">
            <button
              className={`nav-item ${currentTab === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentTab('home')}
            >
              <House />
              <span>Home</span>
            </button>

            <button
              className={`nav-item ${currentTab === 'add' ? 'active' : ''}`}
              onClick={() => setCurrentTab('add')}
            >
              <PlusCircle />
              <span>Add</span>
            </button>

            <button
              className={`nav-item ${currentTab === 'laporan' ? 'active' : ''}`}
              onClick={() => setCurrentTab('laporan')}
            >
              <BarChart3 />
              <span>Laporan</span>
            </button>

            <button
              className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentTab('settings')}
            >
              <SettingsIcon />
              <span>Settings</span>
            </button>
          </nav>
            </>
          )}

          {/* Premium Loading Spinner Overlay */}
          {isLoading && (
            <div className="loading-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(10, 10, 15, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              gap: '12px'
            }}>
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(124, 111, 255, 0.1)',
                borderTop: '3px solid var(--primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Memuat...</span>
            </div>
          )}

          {/* Edit Transaction Modal / Bottom Sheet */}
          {editingTransaction && (
            <div className="edit-modal-overlay" onClick={() => setEditingTransaction(null)}>
              <div className="edit-modal-container slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="edit-modal-header">
                  <div className="drag-handle"></div>
                  <div className="header-title-row">
                    <span className="modal-title">Edit Transaksi</span>
                    <button
                      className="delete-btn-icon"
                      onClick={() => {
                        handleDeleteTransaction(editingTransaction.id);
                        setEditingTransaction(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        borderRadius: '50%',
                        transition: 'background 0.2s'
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="edit-modal-body">
                  {/* Amount Display */}
                  <div className="edit-amount-display">
                    <span className="currency-symbol">Rp</span>
                    <input
                      type="number"
                      className="edit-amount-input"
                      value={editAmountStr}
                      onChange={(e) => setEditAmountStr(e.target.value)}
                    />
                  </div>

                  {/* Transaction Type Select */}
                  <div className="edit-type-selector">
                    <button
                      className={`type-btn income ${editType === 'INCOME' ? 'active' : ''}`}
                      onClick={() => setEditType('INCOME')}
                    >
                      Pemasukan
                    </button>
                    <button
                      className={`type-btn expense ${editType === 'EXPENSE' ? 'active' : ''}`}
                      onClick={() => setEditType('EXPENSE')}
                    >
                      Pengeluaran
                    </button>
                  </div>

                  {/* Note Input */}
                  <div className="edit-input-group">
                    <span className="input-label">Catatan</span>
                    <input
                      type="text"
                      className="edit-text-input"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Masukkan catatan..."
                    />
                  </div>

                  {/* Date Input */}
                  <div className="edit-input-group">
                    <span className="input-label">Tanggal</span>
                    <input
                      type="date"
                      className="edit-text-input"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </div>

                  {/* Category Select (Only if EXPENSE) */}
                  {editType === 'EXPENSE' && (
                    <div className="edit-input-group">
                      <span className="input-label">Kategori</span>
                      <select
                        className="edit-select-input"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="modal-actions-row">
                    <button className="cancel-btn" onClick={() => setEditingTransaction(null)}>Batal</button>
                    <button className="save-btn" onClick={handleUpdateTransaction}>Simpan</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category Preview Modal */}
          {showCategoryPreviewModal && (
            <div className="edit-modal-overlay" onClick={() => setShowCategoryPreviewModal(false)}>
              <div className="edit-modal-container slide-up" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '70vh' }}>
                <div className="edit-modal-header">
                  <div className="drag-handle"></div>
                  <div className="header-title-row">
                    <span className="modal-title">Daftar Kategori</span>
                    <button className="cancel-btn" onClick={() => setShowCategoryPreviewModal(false)} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>Tutup</button>
                  </div>
                </div>

                <div className="edit-modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(70vh - 120px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                    Daftar kategori transaksi aktif untuk akun Anda. Kategori default tidak dapat diubah.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {categories.map(cat => (
                      <div key={cat.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: cat.color || 'var(--primary)'
                          }}>
                            {getIcon(cat.name, '')}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{cat.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                          Bawaan
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iOS Home Indicator Bar simulator */}
          <div className="home-indicator"></div>


        </div>
      </div>
    </div>
  );
}

export default App;
