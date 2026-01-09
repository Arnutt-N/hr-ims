# HR-IMS Codebase Analysis
**Last Updated:** 2026-01-09T13:48:22+07:00

## Overview
HR-IMS (Human Resource & Inventory Management System) is a web application designed to manage inventory, asset requests, and personnel within a hierarchical organization structure (Thai government style).

## Architecture
The project follows a standard client-server architecture but is structured as a monorepo:
- **Frontend**: Located at the project root (`/`). Built with Vite + React.
- **Backend**: Located in `/backend`. Built with Node.js + Express.

## Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **HTTP Client**: Likely Axios or Fetch (encapsulated in `services/api.js`)
- **Routing**: Custom conditional rendering in `App.jsx` (No React Router visible in `package.json` or `App.jsx`).

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database ORM**: Prisma
- **Database**: SQLite (`dev.db`)
- **Validation**: Zod
- **Security**: Helmet, CORS, BCrypt, JWT

## Database Schema (Prisma)
The database schema (`backend/prisma/schema.prisma`) is rich and supports complex relationships:

1.  **Core Modules**:
    - `User`: System users with roles (admin, hr, user).
    - `InventoryItem`: Assets/items with status and tracking.
    - `Request`: Borrow/Withdraw/Return workflows.
    - `History`: Audit log of actions.
    - `Notification`: User alerts.

2.  **Organization Structure**:
    - Hierarchical: `Ministry` -> `Department` -> `Division` -> `WorkGroup1` -> `WorkGroup2`.
    - Geographic: `Region` -> `InspectionZone` -> `Province` -> `CustomProvinceZone`.

3.  **Personnel Management**:
    - `Personnel`: Detailed employee records linked to organization units.
    - Support Tables: `PersonnelType`, `NamePrefix`, `PositionCategory`, `PositionLevel`.

## Application Logic

### Frontend (`src/App.jsx`)
- **State Management**: Local state (`useState`) in `App.jsx` passed down as props.
- **Navigation**: Sidebar-driven tab switching (`dashboard`, `inventory`, `requests`, etc.).
- **Authentication**: Currently contains mock logic (`handleLogin` accepted hardcoded credentials) but points to a real API structure.
- **Data Fetching**: `fetchData` function aggregation calls to `api` services on load.

### Backend (`backend/src/index.ts`)
- **Routes**:
    - `/api/auth`: Authentication
    - `/api/inventory`: Item management
    - `/api/requests`: Request processing
    - `/api/users`: User management
    - `/api/history`, `/api/settings`, `/api/assets`
- **Middleware**: Helmet, CORS, JSON parsing.

## Key Observations & Recommendations
1.  **Routing**: The frontend uses conditional rendering for views. As the app grows, migrating to `react-router-dom` is recommended for better URL management and lazy loading.
2.  **State Management**: Prop drilling is evident in `App.jsx`. Context API or a state management library (Zustand/Redux) would simplify data flow.
3.  **Authentication**: The frontend has mock login logic mixed with real API calls. This needs to be fully integrated with the backend JWT auth.
4.  **Database**: SQLite is good for dev, but for production with this complex schema, PostgreSQL or MySQL might be better suited.
