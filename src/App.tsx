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
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Trash2
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
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'month' | 'all'>('month');
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const [currentTab, setCurrentTab] = useState<'home' | 'add' | 'laporan' | 'settings'>('home');
  
  // Authentication states
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(() => {
    const saved = localStorage.getItem('dompetrack_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
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
    };
  };

  const fetchData = async () => {
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
      let txsData = [];
      if (filterType === 'month') {
        txsData = await api.transactions.getAll(selectedMonth, selectedYear);
      } else {
        txsData = await api.transactions.getAll();
      }
      
      const formatted = txsData.map(formatTxForFrontend);
      setTransactions(formatted);
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

  const fetchAiInsight = async () => {
    if (!currentUser) return;
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
  }, [transactions, currentUser, selectedMonth, selectedYear, filterType]);

  // Home notification panel state
  const [showNotifications, setShowNotifications] = useState(false);

  // Settings states
  const [notifEnabled, setNotifEnabled] = useState(true);

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

  // Effect to load data
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, selectedMonth, selectedYear, filterType]);

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

  // Grouped transactions by day (For Report tab)
  const groupedTransactionsByDay = useMemo(() => {
    const groups: { [date: string]: { txs: Transaction[]; total: number } } = {};
    
    // Sort transactions newest to oldest
    const sorted = [...periodTransactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    sorted.forEach(tx => {
      if (tx.type === 'EXPENSE') {
        if (!groups[tx.date]) {
          groups[tx.date] = { txs: [], total: 0 };
        }
        groups[tx.date].txs.push(tx);
        groups[tx.date].total += tx.amount;
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
      let selectedCatId = txCategory;
      if (txType === 'INCOME') {
        const incomeCat = categories.find(c => c.name.toLowerCase().includes('lainnya')) || categories[0];
        selectedCatId = incomeCat?.id;
      }

      if (!selectedCatId) {
        throw new Error('Kategori tidak valid');
      }

      await api.transactions.create({
        type: txType,
        amount: amountVal,
        description: txNote.trim() || (txType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
        categoryId: selectedCatId,
        date: txDate,
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
      }, 1200);
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

                  <a href="#forgot" className="auth-forgot-link" onClick={(e) => { e.preventDefault(); alert('Hubungi admin untuk reset password (olan@dompetrack.com / password123 atau buat akun baru)'); }}>
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
            ) : (
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

          {/* Toast Notification for Success Action */}
          {showSuccessToast && (
            <div className="toast-success" style={{
              position: 'absolute',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#34D399',
              color: '#0A0A0F',
              padding: '10px 20px',
              borderRadius: '99px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 999,
              boxShadow: '0 4px 15px rgba(52, 211, 153, 0.4)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <Check size={16} strokeWidth={3} />
              Transaksi Disimpan!
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
              <>
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
                <div className="balance-card">
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
                    <div className="ai-insight-card">
                      <div className="ai-icon-container">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                        </svg>
                      </div>
                      <div className="ai-content">
                        <span className="ai-tag">AI INSIGHT</span>
                        <p className="ai-text">
                          {aiLoading ? (
                            <span style={{ opacity: 0.6 }}>Menganalisis data keuangan Anda...</span>
                          ) : (
                            aiInsight || "Mulai catat transaksi untuk mendapatkan analisis keuangan pintar dari AI."
                          )}
                        </p>
                      </div>
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
              </>
            )}

            {/* 2. ADD TRANSACTION SCREEN */}
            {currentTab === 'add' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                
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
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
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
                      <span className="trend-amount">{formatRupiah(stats.expense || 4250000)}</span>
                    </div>
                    {/* Trend Badge */}
                    <div className="badge danger">
                      <TrendingUp size={12} />
                      <span>+12%</span>
                    </div>
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
                      
                      {/* Gradient background fill */}
                      <path 
                        d="M 10 100 C 60 100, 80 25, 130 55 C 180 85, 220 15, 270 35 C 310 55, 330 100, 362 45 L 362 120 L 10 120 Z" 
                        fill="url(#chartLineGrad)"
                      />
                      
                      {/* Wavy stroke line */}
                      <path 
                        d="M 10 100 C 60 100, 80 25, 130 55 C 180 85, 220 15, 270 35 C 310 55, 330 100, 362 45" 
                        stroke="#7C6FFF" 
                        strokeWidth="3.5" 
                        fill="none" 
                        strokeLinecap="round"
                      />

                      {/* Sparkles / Dot points on Peaks */}
                      <circle cx="100" cy="53" r="4" fill="#a49cff" />
                      <circle cx="240" cy="22" r="5" fill="#7C6FFF" stroke="#FFFFFF" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Top Categories breakdown list */}
                <div className="top-cats-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="section-title">Top Categories</span>
                    <button className="see-all-btn">SEE ALL</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Item 1: Makanan & Minuman */}
                    <div className="top-cat-item">
                      <div className="top-cat-left">
                        <div className="top-cat-icon-box" style={{ color: '#7C6FFF' }}>
                          <Utensils size={18} />
                        </div>
                        <div className="top-cat-text">
                          <span className="top-cat-name">Makanan & Minuman</span>
                          <span className="top-cat-count">{stats.counts.Food} Transactions</span>
                        </div>
                      </div>
                      <div className="top-cat-right">
                        <span className="top-cat-value">{formatRupiah(stats.isDemo ? 1250000 : stats.categorySums.Food)}</span>
                        <span className="top-cat-badge green">-5.2% vs prev</span>
                      </div>
                    </div>

                    {/* Item 2: Belanja */}
                    <div className="top-cat-item">
                      <div className="top-cat-left">
                        <div className="top-cat-icon-box" style={{ color: '#FBBF24' }}>
                          <ShoppingBag size={18} />
                        </div>
                        <div className="top-cat-text">
                          <span className="top-cat-name">Belanja</span>
                          <span className="top-cat-count">{stats.counts.Essentials} Transactions</span>
                        </div>
                      </div>
                      <div className="top-cat-right">
                        <span className="top-cat-value">{formatRupiah(stats.isDemo ? 980000 : stats.categorySums.Essentials)}</span>
                        <span className="top-cat-badge red">+18.4% vs prev</span>
                      </div>
                    </div>

                    {/* Item 3: Transportasi */}
                    <div className="top-cat-item">
                      <div className="top-cat-left">
                        <div className="top-cat-icon-box" style={{ color: '#a49cff' }}>
                          <Car size={18} />
                        </div>
                        <div className="top-cat-text">
                          <span className="top-cat-name">Transportasi</span>
                          <span className="top-cat-count">{stats.counts.Other} Transactions</span>
                        </div>
                      </div>
                      <div className="top-cat-right">
                        <span className="top-cat-value">{formatRupiah(stats.isDemo ? 450000 : stats.categorySums.Other)}</span>
                        <span className="top-cat-badge green">-1.2% vs prev</span>
                      </div>
                    </div>
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
                          <span className="history-total">TOTAL: -{formatRupiah(group.total)}</span>
                        </div>

                        <div className="transactions-list">
                          {group.txs.map(tx => (
                            <div className="transaction-item" key={tx.id}>
                              <div className="tx-left">
                                <div className="tx-icon-wrapper">
                                  {getIcon(tx.category, tx.note)}
                                </div>
                                <div className="tx-details">
                                  <span className="tx-name">{tx.note}</span>
                                  <span className="tx-time">
                                    {tx.time} • {tx.category === 'Food' ? 'Food & Drink' : tx.category === 'Essentials' ? 'Shopping' : tx.category === 'Hobby' ? 'Hobbies' : 'Transport'}
                                  </span>
                                </div>
                              </div>
                              <span className="tx-amount expense">
                                -{formatRupiah(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {Object.keys(groupedTransactionsByDay).length === 0 && (
                    <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                      Tidak ada riwayat pengeluaran di bulan ini.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* 4. SETTINGS SCREEN */}
            {currentTab === 'settings' && (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
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
                    <div className="settings-item">
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
                    <div className="settings-item">
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
                      setCurrentUser(null);
                      localStorage.removeItem('dompetrack_user');
                      setCurrentTab('home');
                      setAuthScreen('login');
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

          {/* iOS Home Indicator Bar simulator */}
          <div className="home-indicator"></div>

        </div>
      </div>
    </div>
  );
}

export default App;
