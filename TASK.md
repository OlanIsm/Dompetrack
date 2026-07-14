# Dompetrack Project Checklist

This document tracks the progress of the Dompetrack expense tracker web application based on the PRD requirements.

## 1. General Infrastructure & Setup
- [x] Split repository into dedicated `frontend/` and `backend/` directories
- [x] Configure backend NestJS API and Database connections (Prisma + Supabase PostgreSQL)
- [x] Setup environment configurations (`.env`)
- [x] Create root-level convenience scripts (`start.bat` & `start.ps1`) to run both servers concurrently

## 2. Feature Implementation Status

### 2.1 Tab 1: Home (Dashboard)
- [x] Header greeting: "Halo, Olan" with the current date
- [x] Balance Summary Card (Glassmorphic Hero Card with gradient styling)
  - [x] Total Income (Pemasukan) indicator
  - [x] Total Expense (Pengeluaran) indicator
  - [x] Remaining Balance (Sisa Saldo)
  - [x] Progress bar indicator showing percentage of income spent
- [x] Category Breakdown Card (collapsible accordion style showing real-time transaction aggregates)
- [x] AI Insight Card:
  - [x] Automatic text generation based on monthly transactions
  - [x] Manual trigger for refresh (`RefreshCw` button) to query LLM on-demand
- [x] Recent Transactions (shows the last 5 transactions, clickable to edit)

### 2.2 Tab 2: Add (Input Transaction)
- [x] Segmented toggle: Pemasukan (Income) / Pengeluaran (Expense)
- [x] Large numeric amount input
- [x] Category Chips selection (hobi, makanan, kebutuhan primer, other)
- [x] Note input field (contextual tagging for AI insight)
- [x] Date selector (default to current date)
- [x] Real-time timestamp recording (combining selected date with current system time on save/update)
- [x] Validation rules (amounts > 0, category required for Expense, nullable for Income)
- [x] Fixed "Uang Jajan Bulanan" behavior when transaction type is Pemasukan

### 2.3 Tab 3: Laporan (Reports)
- [x] Month Selector (dropdown menu to toggle active month and year)
- [x] Trend Chart:
  - [x] SVG wave trend line representing daily transaction frequency and amount
  - [x] Peak spending day highlighted with interactive tooltip indicator
- [x] Month-over-Month (MoM) comparison statistics (calculates percentage change per category)
- [x] Category breakdown detail list (expandable sections grouping transaction lists)
- [x] Chronologically grouped Transaction History list
- [x] Edit and Delete functionality integrated directly on list item clicks

### 2.4 Tab 4: Settings
- [x] Profile card (avatar placeholder, username, email)
- [x] Session management (Logout logic resetting local state and auth token)
- [x] UI Toggle controls (Notification simulation switcher)
- [x] Version information tags

## 3. Tech Stack & Integration Specs
- [x] Database schema defined with nullable `categoryId` for Pemasukan transactions
- [x] Database migration applied securely via `npx prisma db push`
- [x] NestJS API endpoints updated to validate optional category relationships
- [x] Frontend React states synced to reload statistics after any CRUD mutation
