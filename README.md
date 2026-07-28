<div align="center">

# ClassScheduler

### Smart Class Scheduling for Students and Educators

A clean, intuitive timetable management platform built with Next.js and Supabase — create, organize, and share class schedules without the spreadsheet nightmare.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%26%20Auth-green?logo=supabase)](https://supabase.com/)

[Live Demo](#) · [Report Bug](https://github.com/AravDakshZen/ClassScheduler/issues) · [Request Feature](https://github.com/AravDakshZen/ClassScheduler/issues)

</div>

---

## What is ClassScheduler?

ClassScheduler is a web-based timetable and class schedule management tool for students and educators. Managing a semester's worth of classes across multiple subjects, rooms, and instructors is painful in spreadsheets and nearly impossible on paper.

ClassScheduler gives you a structured, visual, and shareable interface to plan schedules, avoid conflicts, and stay on top of your academic calendar — all backed by a real-time database.

---

## Features

- **Visual Weekly Timetable** — drag-and-drop or form-based schedule builder with a clear week view
- **Conflict Detection** — automatically flags time slot clashes before you confirm a booking
- **Multi-Role Support** — works for individual students, class coordinators, and faculty
- **Subject & Faculty Management** — add subjects, assign instructors, set room numbers
- **Real-Time Sync** — schedule changes reflect instantly for everyone with access (powered by Supabase Realtime)
- **Shareable Schedules** — generate a shareable link for your timetable
- **Export Options** — download your schedule as PDF or image
- **Auth & Accounts** — secure sign-in with email or OAuth
- **Mobile Responsive** — view your timetable on any device

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Typescript (App Router) |
| Backend | Next.js API Routes / Server Actions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

```bash
# Clone the repository
git clone https://github.com/AravDakshZen/ClassScheduler.git
cd ClassScheduler

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Database Setup

Run the SQL migrations in `/supabase/migrations` to create the required tables:

```bash
npx supabase db push
```

Or apply them manually via the Supabase SQL editor in your project dashboard.

---

## How It Works

1. **Create an account** and set up your profile
2. **Add subjects** — name, subject code, room no., instructor, and credit hours
3. **Build your timetable** — assign subjects to time slots and rooms
4. **Invite others** — share your schedule via link
5. **Stay in sync** — any update is reflected in real time for all viewers

---

## Screenshots

> Add screenshots of the timetable view, schedule builder, and conflict alerts here.

---

## Contributing

Contributions are welcome! Please fork the repo and open a pull request.

```bash
git checkout -b feature/your-feature-name
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

---

<div align="center">

Built with 🤍 for students and instiutions by [Aravindakshan](https://github.com/AravDakshZen)

</div>
