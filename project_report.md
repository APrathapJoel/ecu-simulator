# ECU Simulator & Vehicle Tracking System - Project Report

## 1. Executive Summary
The ECU Simulator & Vehicle Tracking System is a full-stack web application designed to simulate and monitor vehicle engine data and real-time location. The project provides a high-fidelity dashboard for drivers and mechanics, featuring realistic engine vital simulations, interactive mapping, and a secure authentication layer.

## 2. System Architecture
The project is built using a modern **Monorepo** structure managed by `pnpm` workspaces, ensuring clean separation of concerns and shared data contracts.

### 2.1 Backend (api-server)
- **Framework**: Node.js with Express 5.
- **Database**: MongoDB (via Mongoose) for persistent user data and session management.
- **Security**: 
    - Cookie-based authentication with `httpOnly` secure tokens.
    - Password hashing using `bcryptjs`.
    - Rate limiting on authentication endpoints (`express-rate-limit`).
    - Robust CORS configuration supporting cross-origin credentials for cloud deployment.
- **Simulation Engine**: Custom `ecuSimulator` logic that generates realistic integer-based readings for RPM, Speed, Engine Load, Battery Voltage, and precise GPS coordinates.

### 2.2 Frontend (ecu-dashboard)
- **Framework**: React with Vite and TypeScript.
- **Styling**: Vanilla CSS and TailwindCSS for a premium, dark-themed dashboard.
- **State Management**: TanStack Query (React Query) for efficient API data fetching and caching.
- **Mapping**: Leaflet and React-Leaflet for real-time vehicle trajectory and positioning.
- **Animations**: Framer Motion for smooth UI transitions and interactive elements.

### 2.3 Libraries (Shared)
- `api-spec`: OpenAPI 3.0 specification defining the contract between frontend and backend.
- `api-client-react`: Automatically generated React hooks for API consumption.
- `api-zod`: Shared Zod schemas for request/response validation.
- `db`: Shared database connection logic and Mongoose schemas.

## 3. Core Features

### 3.1 Real-Time Engine Monitoring
- **Driver View**: High-fidelity gauges showing live RPM, Speed, Load, and Battery.
- **Auto-Simulation**: Real-time displacement logic that updates engine vitals based on simulated driving conditions.
- **Mechanics View**: Detailed diagnostic trouble codes (DTCs) and engine performance logs.

### 3.2 Vehicle Tracking System
- **Interactive Map**: Dark-themed Leaflet map featuring a vehicle marker and a real-time "trail" (polyline) of the vehicle's path.
- **GPS Simulation**: Advanced movement engine with heading drift and speed-based displacement.
- **Origin Sync**: Browser Geolocation integration allows users to reset the simulation origin to their actual current location.

### 3.3 Enhanced Authentication
- **Full Auth Flow**: Secure registration, login, and session persistence.
- **Redirects**: Fixed sign-out logic ensuring immediate redirection to the login page and full cache clearing via TanStack Query.
- **Persistence**: Hybrid storage using MongoDB Atlas for production and a file-backed JSON store for local development.

## 4. Technical Stack
- **Languages**: TypeScript (Full-stack)
- **Frontend**: Vite, React, React Router (wouter), TailwindCSS, Leaflet.
- **Backend**: Express, Mongoose, Zod, Orval (API Generation).
- **Tooling**: pnpm, esbuild, pino (logging).

## 5. Deployment Info
- **Platform**: Render (Web Service for API, Static Site for Dashboard).
- **Infrastructure**: MongoDB Atlas (Cloud Database).
- **Environment Handling**: Managed via `render.yaml` with automated `VITE_API_HOST` and `DASHBOARD_URL` wiring for production-ready CORS.

## 6. Current Status & Future Roadmap
- [x] Functional ECU Simulation.
- [x] Integrated Mapping & Tracking.
- [x] Production-ready Auth & Persistence.
- [x] Successful Cloud Deployment.
- [ ] **Next**: Historical data visualization (Trends across multiple trips).
- [ ] **Next**: Real-time alerts for critical engine thresholds.
- [ ] **Next**: OBD-II real hardware integration support via WebSocket.

---
*Report generated on April 8, 2026. Successfully resolved CORS, MongoDB connection, and sign-out issues.*
