# Admin Panel Implementation Plan

This document outlines the plan to build the **Admin Panel (Web Dashboard)** and extend the **Backend** to support administrative functions.

## 🏗️ 1. Architecture Update
We will add a new frontend project `admin-web` alongside the `backend` and `app` (Driver App).

*   **Driver App** (`/app`): Existing React Native app.
*   **Backend** (`/backend`): Existing Node/Express/Prisma API (Needs updates).
*   **Admin Panel** (`/admin-web`): **NEW** React + Vite Web Application.

---

## 💾 2. Backend Upgrades (Prisma Schema & APIs)
To support the Admin features, we need to update the database schema and add new API endpoints.

### A. Database Schema Updates
1.  **Transaction Types**: Add `DEBIT_NOTE`, `CREDIT_NOTE`, `SALARY`, `ADVANCE`.
2.  **Salary Table** (Optional, or just use Transactions?):
    *   Better to have a dedicated `Salary` model or use `Transaction` if strictly generic. Given the requirements (Monthly Salary, Advance, Net), a dedicated structure might be cleaner for "Salary Settings" vs "Salary Payments".
    *   *Decision*: Add `SalaryLog` table for payments and `User` field for `baseSalary`.
3.  **Debit/Credit Note**:
    *   These affect `Customer` balance but aren't necessarily physical "Sell" transactions. Use `Transaction` table with type `DEBIT`/`CREDIT`.

### B. New Admin APIs
*   `GET /admin/dashboard`: Global stats (Total Buy, Sell, Fuel, Active Drivers).
*   `GET /admin/drivers`: List all drivers with status.
*   `POST /admin/drivers`: Add/Edit/Block drivers.
*   `POST /admin/financial/debit-note`: Create Debit Note (Updates Customer Balance).
*   `POST /admin/financial/credit-note`: Create Credit Note.
*   `GET /admin/audit-logs`: View all system actions.
*   `GET /admin/fuel-logs`: View fuel with images/GPS.

---

## 🖥️ 3. Admin Panel (Web) Implementation
**Tech Stack**: React.js (Vite), Tailwind CSS, ShadcnUI (for Tables/Inputs).

### Modules to Build:
1.  **Login**: Admin only access.
2.  **Dashboard**:
    *   Cards: Today Total Buy/Sell/Stock, Active Drivers.
    *   *No Charts/Graphs as requested.*
3.  **Driver Management Grid**:
    *   Table with Search/Filter.
    *   Actions: Block, Reset Password, View History.
4.  **Transaction Master Tables**:
    *   Tabs: Buy, Sell, Shop Buy, Palti, Fuel.
    *   Filters: Date Range, Driver, Company.
    *   Export: PDF/Excel buttons.
5.  **Customer Management**:
    *   Ledger View (Table of all Debit/Credit/Sales).
    *   **Action Buttons**: "Issue Debit Note", "Issue Credit Note".
6.  **Salary Manager**:
    *   Table of Drivers with standard Salary input.
    *   "Pay Advance" / "Pay Salary" buttons.
7.  **Fuel & Weight Loss Verification**:
    *   Special view with large Image capabilities for slip verification.

---

## 🚀 4. Implementation Steps

### Step 1: Backend Updates
*   Modify `schema.prisma`.
*   Generate migrations.
*   Create `AdminController` and Routes.

### Step 2: Init Admin Web App
*   Create `admin-web` using Vite.
*   Setup Tailwind & Router.
*   Setup Auth Context (Connect to Backend Login).

### Step 3: Core Modules (Grid Views)
*   Build reusable `DataTable` component.
*   Implement Driver List & Log Views.

### Step 4: Financials & Salary
*   Implement Debit/Credit Note forms.
*   Implement Salary logic.

---

## ❓ Confirmation
Shall I proceed with **Step 1: Backend Updates** (Modifying the Schema for Debit/Credit Notes and Salary)?
