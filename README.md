# EnoFlow

**Open-source Progressive Web App (PWA) for wine tourism lead capture, visitor flows, and tasting management.**

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Why EnoFlow?

Small and mid-sized wineries often rely on spreadsheets, generic form builders, or expensive closed-source hospitality suites to manage cellar-door visitors and enotourism leads.

**EnoFlow** provides an open, self-hostable TypeScript foundation tailored to wine tourism operations — giving wineries and developers full ownership of visitor data, multi-tenant isolation, and mobile-first workflows out of the box.

## Key Features

- **Multi-Tenant Architecture:** Isolate data cleanly across multiple wineries, properties, or tasting rooms within a single deployment.
- **Omnichannel Lead Capture & Tracking:** Capture visitor interest across cellar-door check-ins, tasting bookings, and digital touchpoints in one unified pipeline.
- **Role-Based Access Control (RBAC):** Separate permissions for administrators, hospitality staff, and operational users.
- **Row Level Security (RLS):** Database-level tenant isolation and data integrity enforced directly in PostgreSQL via Supabase RLS policies.
- **Progressive Web App (PWA):** Mobile-friendly experience designed for hospitality teams working on tablets and phones at the winery.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend & Database:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Database Schema:** Managed via SQL migrations

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or pnpm / bun)
- A [Supabase](https://supabase.com/) project (cloud or local via Supabase CLI)

### Installation

1. **Clone the repository**

   ```bash
   git clone [https://github.com/llaparecido06-star/enoflow.git](https://github.com/llaparecido06-star/enoflow.git)
   cd enoflow
