# Dompetrack

<img width="1920" height="1080" alt="mockupDompetrack" src="https://github.com/user-attachments/assets/e7065023-aef9-4528-93e0-67e231b8ca4f" />

Dompetrack is a personal finance and expense tracker web application designed for fast manual input, visual budget tracking, and intelligent spending analysis.

This repository contains the base version of the project. Further updates and features will be released soon.

## Overview

The application is built to help users manage their personal budget with clarity and efficiency. Rather than relying on automatic categorizations or complex integrations, it prioritizes rapid manual entry (taking less than 10 seconds per transaction) and provides actionable insights on spending habits.

## Architecture and Key Features

### 1. Frontend Web Client
The user interface is built as a Progressive Web App (PWA) using React, TypeScript, and Vite. The UI is designed with a premium, dark-themed aesthetic and features four main sections:
- **Home / Dashboard**: Displays the hero balance card (total income, total expense, remaining budget, and allowance usage), category breakdowns, recent transaction lists, and AI insights.
- **Add Transaction**: A quick-entry form with a toggle for income/expense, numeric input, category chips, notes, and a date selector.
- **Reports**: Visualizes daily transaction trends using interactive charts, month-over-month comparisons, and searchable/filterable lists of past records.
- **Settings**: Allows profile viewing, logout functionality, and category list verification.

### 2. Backend API Service
The backend application is built using NestJS, Prisma ORM, and PostgreSQL. It manages core resources and enforces robust business logic:
- **Authentication**: Secure registration, login, and token-based authorization.
- **Transactions & Categories**: Management of user-specific transactions and customizable/default categories.
- **AI Insights Service**: Integrates with the Google Gemini API to analyze monthly spending aggregated by category and transactions. It generates personalized recommendations for correcting inefficient financial behaviors.

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Vanilla CSS.
- **Backend**: NestJS, Prisma Client, PostgreSQL.
- **AI Integration**: Google Gemini API.

## Getting Started

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in a `.env` file (e.g. database URL, JWT secrets, Gemini API key).
4. Run migrations and seeds:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```
5. Start the development server:
   ```bash
   npm run start:dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
