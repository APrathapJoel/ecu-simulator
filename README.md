# 🚗 ECU Simulator & Vehicle Tracking System

A full-fidelity, real-time vehicle monitoring and tracking dashboard. This project simulates Engine Control Unit (ECU) data and provides a comprehensive web interface for real-time telemetry, diagnostics, and geographic tracking.

![ECU Dashboard](https://img.shields.io/badge/Status-Live-success)
![Technology](https://img.shields.io/badge/Tech-React%20%7C%20Express%20%7C%20MongoDB-blue)

## ✨ Key Features

### 🛠 Engine Simulation
- **Real-Time Telemetry**: Live integer-based readings for RPM, Speed, Engine Load, and Battery Voltage.
- **Dynamic Displacement**: Interactive simulation that adjusts engine vitals based on driving logic.
- **DTC Diagnostics**: Support for Diagnostic Trouble Codes (DTCs) with mechanic-view logs.

### 🗺 Vehicle Tracking
- **Live Trajectory**: Interactive Leaflet maps tracking vehicle movement in real-time.
- **Path Visualization**: Animated "trail" polyline showing the vehicle's historical path.
- **Origin Calibration**: Browser Geolocation integration to sync the simulation with your real-world coordinates.

### 🔐 Enterprise Security
- **Persistent Auth**: Secure session management using MongoDB Atlas.
- **Rate Limiting**: Protection against brute-force authentication and registration attempts.
- **CORS Recovery**: Production-grade cross-origin cookie support for reliable cloud access.

## 🚀 Tech Stack

- **Frontend**: React (Vite), TypeScript, TailwindCSS, Framer Motion, Leaflet.
- **Backend**: Node.js, Express 5, Mongoose, Zod.
- **Libraries**: Monorepo structure via `pnpm` workspaces, automated API generation with Orval.
- **Deployment**: Render (Cloud Web Services), MongoDB Atlas.

## 📦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/APrathapJoel/ecu-simulator.git

# Install dependencies
pnpm install
```

### 3. Environment Setup
Create a `.env` file in the root directory (or set in Render):
```env
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
DASHBOARD_URL=your-frontend-hostname.onrender.com
```

### 4. Run Locally
```bash
# Start backend and frontend in parallel
pnpm run dev
```

## 🛠 Project Structure
```
├── artifacts/
│   ├── api-server/         # Express Backend
│   └── ecu-dashboard/      # React Frontend
├── lib/
│   ├── api-spec/           # OpenAPI Contracts
│   ├── db/                 # Mongoose Schemas & Connection
│   └── api-zod/            # Shared Validation Logic
└── render.yaml             # Cloud Deployment Blueprint
```

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

---
*Built with ❤️ for intelligent vehicle monitoring.*
