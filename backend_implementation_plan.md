# Backend Implementation Plan for Driver App

This document outlines the strategic plan to transition the Driver App from a mock-data prototype to a fully production-ready system with a robust backend.

## 🏗️ 1. Technology Stack Recommendation

We will use a stack that prioritizes **reliability, relational data integrity, and scalability**.

*   **Runtime**: **Node.js** (Fast, efficient, shares TypeScript with frontend).
*   **Framework**: **Express.js** (Standard, lightweight) or **NestJS** (Structured, scalable). *Recommendation: Express for speed of development.*
*   **Database**: **PostgreSQL** (Essential for relational transaction data, stock calculations, and financial accuracy).
*   **ORM**: **Prisma** (Best-in-class TypeScript support, auto-migrations).
*   **Authentication**: **JWT (JSON Web Tokens)**.
*   **File Storage**: **AWS S3** or **Supabase Storage** (For Slip photos and Mortality proofs).
*   **Hosting**: Render / Railway / DigitalOcean.

---

## 💾 2. Database Schema Design

We need 5 Core Tables to manage the business logic.

### A. Users (Drivers & Admins)
*   `id` (UUID)
*   `mobile` (Unique, Login ID)
*   `password_hash`
*   `role` (ADMIN, DRIVER)
*   `name`, `vehicle_id` (Linked Vehicle)
*   `status` (ACTIVE, BLOCKED)

### B. Customers (Shop Owners)
*   `id` (UUID)
*   `name`
*   `mobile`
*   `address`
*   `current_balance` (Decimal - Critical field)
*   `created_at`, `updated_at`

### C. Vehicles
*   `id` (UUID)
*   `registration_number`
*   `current_km` (Updated via Fuel Entry)

### D. Transactions (The "Master" Table)
This single table will store **ALL** activity to ensure stock reports are easy to generate.
*   `id` (UUID)
*   `driver_id` (FK)
*   `type` (ENUM: BUY, SELL, FUEL, PALTI, WEIGHT_LOSS, SHOP_BUY)
*   `sub_type` (MORTALITY, WASTE, etc.)
*   `amount` (Weight/Liters)
*   `rate` (Price per unit)
*   `total_amount` (Financial value)
*   `payment_cash`
*   `payment_upi`
*   `customer_id` (FK - Nullable, for Sales)
*   `vehicle_id` (FK - Nullable, for Fuel)
*   `image_url` (For proofs)
*   `gps_lat`, `gps_lng`
*   `created_at` (Timestamp)

### E. StockLogs (Optional but Recommended)
*   To track daily opening/closing stock for each driver.

---

## 🔌 3. API Architecture (Endpoints)

We will build RESTful APIs that mirror the functionality we just built in the frontend.

### Authentication
*   `POST /auth/login` - Returns JWT Token.
*   `GET /auth/me` - Returns Driver Profile & Assigned Vehicle.

### Core Operations
*   `GET /dashboard/summary` - Returns Today's Buy, Sell, Stock, Fuel (Calculated live from DB).
*   `GET /transactions/recent` - Returns last 50 transactions.

### Specific Features
*   **Buy & Shop Buy**:
    *   `POST /buy` (Record purchase, increase driver stock).
*   **Sell**:
    *   `POST /sell` (Record sale, decrease driver stock, update Customer Balance).
    *   *Critical Logic*: Database transaction must strictly ensure `Sell Amount <= Current Stock`.
*   **Customers**:
    *   `GET /customers` (List with balances).
    *   `POST /customers` (Add new).
    *   `GET /customers/:id/history` (Ledger view).
*   **Weight Loss**:
    *   `POST /weight-loss` (Decrease driver stock).
*   **Palti**:
    *   `POST /palti` (Transfer stock between drivers).

---

## 🛡️ 4. Security & Validation Rules

1.  **JWT Middleware**: Every request (except login) must comprise a valid token.
2.  **Date Locking**: Drivers cannot query data older than 7 days ( Backend enforces this in SQL queries).
3.  **Stock Guard**: The backend will recalculate "Today's Stock" before accepting any SELL request. If the frontend calculation was bypassed, the backend will reject it with `400 Bad Request`.
4.  **GPS Validation**: Reject Weight Loss entries without valid coordinates.

---

## 📈 5. Implementation Roadmap

### Step 1: Init Project
*   Initialize Node.js project.
*   Setup TypeScript & Express.
*   Connect PostgreSQL database.

### Step 2: User & Auth
*   Create User table.
*   Implement Login API.
*   Middleware for verifying tokens.

### Step 3: Master Transaction API
*   Create the `Transaction` table.
*   Implement `POST` endpoints for Buy, Sell, Fuel.
*   *Crucial*: Implement the "Stock Calculation Service" that runs in real-time.

### Step 4: Dashboard & Analytics
*   Build the `summary` endpoint that aggregates data for the Dashboard cards.

### Step 5: Frontend Integration (The Final Switch)
*   Update the React Native app's `DataService` to delete `MockData`.
*   Replace all `setTimeout` mock calls with `axios.post()` calls to the real server.

---

## 🚀 Ready to Start?
If you approve this plan, we can start immediately with **Step 1: Init Project**. We will create a separate `backend` folder alongside your `driver-app`.
