# Project: Smart Real Estate & Rental Platform

## 1. System Identity & Goals
A premium, startup-grade platform for property sales and rentals.
- **Core Pillars:** Trust (GPS Verification), Efficiency (FIFO Queues), and Scalability (Relational DB).
- **User Roles:** Admin, Property Owner, Customer/Tenant.

## 2. Tech Stack (Finalized)
- **Frontend:** React (Vite), Tailwind CSS, Shadcn UI (Radix Primitives).
- **Backend:** Express.js, Node.js.
- **Database:** Supabase (PostgreSQL) managed via **Prisma ORM**.
- **Authentication:** Supabase Auth (Email OTP).
- **Storage:** Supabase Storage (Images & Videos).
- **Key Libraries:** `exifreader` (GPS Verification), `zod` (Validation), `lucide-react` (Icons).

## 3. Database Architecture (Traditional Relational)
Use a **Base + Extension** model to avoid `NULL` bloat and ensure data integrity.

- **Core Table:** `Property` (Common fields: Title, Price, Location, Type, OwnerId).
- **Extension Tables (1:1 Relation):**
  - `ApartmentDetails`: Rooms, Bathrooms, Floor, Balcony.
  - `HostelDetails`: Gender, Sharing, WiFi, Food, Curfew.
  - `LandDetails`: Size, Road Access, Usage.
  - `CommercialDetails`: Shop Type, Floor Area, Security Deposit.
- **Other Tables:** `Users`, `BookingQueue` (FIFO), `Messages`, `Wishlist`, `Notifications`.

## 4. Core Features & "Vibe" Logic
- **Discovery:** Advanced search/filter by city, area, and specialized details (e.g., sharing type).
- **Trust System:** Strict GPS verification. Backend must use `exifreader` to reject images without valid metadata or those marked as screenshots.
- **Booking:** FIFO (First-In, First-Out) queue system. Position tracking for tenants; Accept/Reject for owners.
- **Chat:** Property-specific messaging history.
- **Admin:** Fraud monitoring, user banning, and manual property verification.

## 5. Development Guidelines (Rules for AI)
1. **Foundation First:** Always ensure the Prisma schema and API route exist before building the UI.
2. **Shadcn Standard:** Use Shadcn components for all UI elements. Keep design minimalist, high-contrast, and responsive.
3. **Type Safety:** Use Zod schemas for every API request/response. Keep them in a shared directory if possible.
4. **Iterative Polish:** Build the "Walking Skeleton" (CRUD) first, then layer on the complex logic (GPS, FIFO).
5. **No Hallucinations:** Refer to the local `docs/` folder for specific logic before guessing.

## 6. Implementation Roadmap
- **Sprint 1:** Project Init, Supabase/Prisma Setup, Email OTP Auth.
- **Sprint 2:** Property CRUD with Relational Tables + Dynamic Shadcn Forms.
- **Sprint 3:** GPS Verification Logic & Media Uploads.
- **Sprint 4:** FIFO Queue Booking System & Notifications.
- **Sprint 5:** Real-time Chat & Admin Dashboards.
- **Sprint 6:** Final Polish & Performance Optimization.