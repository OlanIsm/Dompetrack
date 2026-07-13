# PRD & Design System — Personal Expense Tracker
**Owner:** Olan (Insan Maulana)
**Type:** Personal PWA (installable on iPhone via Add to Home Screen)
**Version:** 1.0
**Date:** 13 Juli 2026

---

## 1. Overview

Aplikasi pencatatan pengeluaran & pemasukan pribadi, dengan kategorisasi manual (bukan auto-AI) dan AI insight bulanan untuk membantu mengenali pola *mindless spending*. Diakses via PWA di iPhone tanpa perlu Apple Developer Program.

### 1.1 Problem Statement
Olan menerima uang jajan bulanan tapi tidak punya visibility jelas ke mana uang itu pergi — terutama pengeluaran impulsif di kategori hobi (contoh: koleksi Hot Wheels). Tidak ada tools existing yang cukup personal, cepat diinput, dan punya insight yang actionable tanpa ribet.

### 1.2 Goals
- Input transaksi dalam < 10 detik dari buka app sampai tersimpan.
- Visibility jelas: sisa saldo bulan ini vs uang jajan.
- Insight AI yang *actionable*, bukan generic — spesifik ke kategori & tren.
- Full gratis untuk deploy & pemakaian personal (1 user).

### 1.3 Non-Goals (v1)
- Multi-user / sharing.
- Auto-kategorisasi via AI (user pilih manual).
- Bank/e-wallet integration otomatis (input manual only).
- Budgeting/goal-setting kompleks (bisa jadi v2).

---

## 2. User

Single user: Olan. Login sederhana (email/password atau magic link) hanya untuk proteksi data pribadi, bukan multi-tenant system.

---

## 3. Information Architecture

4 tab navigasi utama (bottom nav, iOS-style):

| Tab | Icon (Lucide) | Fungsi |
|---|---|---|
| Home | `house` | Dashboard ringkasan + AI insight |
| Add | `plus-circle` (biasanya ditonjolkan sebagai center button) | Input transaksi baru |
| Laporan | `bar-chart-3` | Detail & analytics mendalam |
| Settings | `settings` | Profil, login/logout, preferensi |

---

## 4. Feature Specs

### 4.1 Home (Dashboard)

**Komponen:**
1. **Header greeting** — "Halo, Olan" + tanggal hari ini.
2. **Balance Summary Card** (hero card, gradient accent)
   - Total pemasukan bulan ini (uang jajan)
   - Total pengeluaran bulan ini
   - Sisa saldo
   - Progress bar visual (% uang jajan terpakai)
3. **Category Breakdown** — mini donut/bar chart 4 kategori (Makanan, Kebutuhan Primer, Hobi, Other) dengan persentase.
4. **AI Insight Card**
   - Generated 1x per bulan (atau on-demand refresh)
   - Format: observasi + komparasi + saran singkat
   - Contoh: *"Pengeluaran Hobi bulan ini Rp420rb, naik 65% dari rata-rata 3 bulan terakhir (Rp255rb). Sebagian besar dari transaksi bertag 'hotwheels'. Coba set limit Rp250rb bulan depan?"*
   - Input ke LLM: aggregat data (SUM per kategori per bulan, growth %) + note transaksi teks bebas — **bukan** raw transaction dump, biar hemat token & akurat.
5. **Recent Transactions** — 5 item terakhir, tap → detail/edit.

**User Story:**
> Sebagai Olan, saat buka app saya langsung tahu sisa uang jajan saya dan apakah ada kebiasaan belanja yang perlu saya waspadai, tanpa harus scroll atau tap apa pun.

---

### 4.2 Add (Input Transaksi)

**Komponen:**
1. **Segmented toggle**: Pengeluaran / Pemasukan (default: Pengeluaran)
2. **Amount input** — besar, di tengah, numeric keypad langsung muncul (kalkulator-style UX)
3. **Category chips** (hanya muncul jika mode Pengeluaran):
   - Makanan, Kebutuhan Primer, Hobi, Other
   - Single-select, visual jelas kategori aktif (bukan dropdown)
4. **Note field** — opsional, teks bebas (ini yang jadi konteks AI insight nanti)
5. **Date picker** — default hari ini, editable untuk input telat
6. **Kondisi khusus Pemasukan**: label otomatis "Uang Jajan Bulanan", tanpa kategori chip
7. **Save button** — sticky di bawah, full width

**Validasi:**
- Amount wajib > 0
- Kategori wajib dipilih jika mode Pengeluaran
- Note dan tanggal opsional (tanggal default = hari ini)

---

### 4.3 Laporan (Reports)

**Komponen:**
1. **Month selector** — swipe atau dropdown (bulan-tahun)
2. **Trend chart** — line/bar chart pengeluaran harian dalam bulan terpilih
3. **Category breakdown detail** — list per kategori dengan subtotal & jumlah transaksi, expandable ke daftar transaksi individual
4. **Month-over-month comparison** — badge naik/turun % vs bulan sebelumnya, per kategori dan total
5. **Full transaction list** — searchable, filterable by kategori/tanggal, swipe-to-edit/delete
6. **Export** — tombol export CSV (opsional v1, bisa v1.1)

---

### 4.4 Settings

**Komponen:**
1. **Profile card** — nama, avatar (opsional), email
2. **Login/Logout** action
3. **Notification preference** — toggle reminder harian jika belum input transaksi
4. **Kategori management** — placeholder v2 (custom kategori)
5. **Data export** — CSV backup
6. **App info** — versi, dsb.

---

## 5. Data Model (High-Level)

```
User
 - id, email, passwordHash, createdAt

Transaction
 - id, userId, type (INCOME | EXPENSE)
 - amount, category (nullable jika INCOME)
 - note, date, createdAt

MonthlyInsight (cache hasil AI, generate 1x/bulan)
 - id, userId, month, year
 - summaryText, generatedAt
```

**Kategori enum:** `MAKANAN`, `KEBUTUHAN_PRIMER`, `HOBI`, `OTHER`

---

## 6. Tech Stack (Rekomendasi)

| Layer | Pilihan |
|---|---|
| Frontend | Next.js (PWA config) atau React + Vite |
| Backend | NestJS + Prisma |
| Database | PostgreSQL (Supabase/Neon free tier) |
| Hosting FE | Vercel (free) |
| Hosting BE | Railway/Render free tier |
| AI Insight | Claude API atau Gemini API (low volume, sangat murah/gratis untuk 1 user) |
| Auth | Simple JWT atau Supabase Auth |

---

## 7. Success Metrics (Personal Use)

- Konsisten input transaksi harian (self-tracked streak).
- Insight AI terasa relevan (subjektif: Olan merasa "kena" minimal 1x/bulan).
- Waktu input transaksi rata-rata < 10 detik.

---

## 8. Design System

### 8.1 Design Principles
- **Dark-first**, bukan dark-mode-tempelan — base warna netral gelap, bukan hitam pekat.
- **Gradient sebagai aksen**, bukan dominan. Dipakai di: hero card, tombol utama, chart highlight. Background tetap flat/netral.
- **Minim ornamen** — hindari drop shadow berlebihan, hindari border-radius ekstrem yang generik, hindari ikon emoji.
- **Data-forward** — angka besar, hierarchy tipografi jelas, whitespace cukup.

### 8.2 Color Palette

```
Background base:      #0A0A0F  (hampir hitam, sedikit ungu-tint)
Surface/card:         #14141F
Surface elevated:     #1B1B29

Gradient accent:       linear-gradient(135deg, #6D5FFD 0%, #4A6CF7 50%, #1E1B4B 100%)
                        (ungu → biru → hampir-hitam)

Primary (ungu):        #7C6FFF
Secondary (biru):      #4A90FF

Text primary:          #F5F5F7
Text secondary:        #9797A8
Text muted:             #5C5C6E

Success (income/naik positif): #34D399
Danger (expense/naik negatif): #F87171
Warning:                #FBBF24

Border/divider:         rgba(255,255,255,0.08)
```

### 8.3 Typography

- **Font:** Inter atau Geist (fallback: -apple-system, SF Pro di iOS)
- **Scale:**
  - Display (angka saldo utama): 40–48px, semi-bold
  - H1 (judul screen): 24px, semi-bold
  - H2 (judul section/card): 16px, medium
  - Body: 14px, regular
  - Caption/label: 12px, medium, text-secondary

### 8.4 Spacing & Layout
- Base unit: 4px grid (4, 8, 12, 16, 24, 32)
- Screen padding horizontal: 20px
- Card padding: 16–20px
- Border radius: 16px (card), 12px (button/chip), 999px (pill/badge)

### 8.5 Components

**Card**
- Background `#14141F`, border 1px `rgba(255,255,255,0.08)`
- Optional subtle backdrop-blur untuk efek glass tipis (bukan berat)
- No heavy drop shadow — cukup `0 4px 20px rgba(0,0,0,0.3)` tipis

**Hero/Balance Card**
- Satu-satunya elemen yang boleh full gradient background
- Gradient arah 135deg, ungu→biru→gelap
- Angka saldo putih terang, label secondary abu terang

**Category Chip**
- Default: outline tipis, background transparan
- Active: filled dengan warna kategori atau gradient tipis, teks putih
- Icon di kiri (Lucide, stroke 1.5–2px), bukan emoji

**Button Primary**
- Gradient background (ungu→biru), teks putih, radius 12px, full-width di form
- Button Secondary: outline, transparan

**Bottom Navigation**
- Background `#0A0A0F` dengan border-top tipis
- Icon Lucide, stroke aktif lebih tebal + warna primary; icon inaktif abu muted
- Tab "Add" bisa dibuat sedikit menonjol (floating circle gradient) untuk emphasis

**Charts**
- Line/bar chart pakai warna gradient primary untuk data utama
- Grid lines sangat tipis, hampir invisible (`rgba(255,255,255,0.05)`)
- Tooltip: dark surface elevated dengan border tipis

### 8.6 Iconography
- **Library:** Lucide Icons (stroke-based, konsisten, tersedia sebagai React components: `lucide-react`)
- Stroke width: 1.5–2px
- Ukuran standar: 20px (nav), 24px (header/action), 16px (inline/label)
- **Jangan pakai emoji** di UI manapun

### 8.7 Motion
- Transisi antar tab: fade + slight slide, 200–250ms, ease-out
- Tap feedback: scale 0.97 on press
- Card entrance: fade-in + translateY(8px), staggered kalau list

