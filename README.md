# Expense Tracker

A modern, AI-powered expense tracking application built with Next.js, TypeScript, and Supabase. Features intelligent expense parsing using OpenAI's GPT models, real-time data synchronization, and a beautiful, responsive UI.

## 🚀 Tech Stack

**Frontend:** Next.js 14, TypeScript, React 18, Tailwind CSS, shadcn/ui (Radix UI), Lucide Icons, date-fns, dayjs, Sonner

**Backend & Database:** Supabase (PostgreSQL), Next.js API Routes

**AI/ML:** OpenAI API (GPT-4o-mini) for natural language expense parsing with few-shot learning

## ✨ Features

- **AI-Powered Expense Parsing**: Enter expenses in natural language (e.g., "20 rupees chips Swiggy Kerala trip by card") and let AI extract structured data
- **Manual Expense Entry**: Traditional form-based expense entry with full control
- **Real-time Dashboard**: View monthly totals and recent expenses with live updates
- **Responsive Design**: Mobile-first design with adaptive drawer UI (right sidebar on desktop, bottom sheet on mobile)
- **Comprehensive Data**: Track amount, currency, date/time, category, platform, payment method, expense type, events, and notes

## 📁 Project Structure

```
expense-tracker/
├── components/          # React components (UI, Header, QuickAdd, PreviewModal, etc.)
├── lib/                # Utilities (Supabase client, helpers)
├── pages/              # Next.js pages and API routes
│   ├── api/           # OpenAI integration endpoint
│   └── index.tsx      # Main dashboard
├── sql/               # Database schema
└── styles/            # Global CSS
```

## 🛠️ Setup

1. **Install dependencies**: `npm install`
2. **Environment variables**: Copy `env.local.example` to `.env.local` and add your Supabase and OpenAI credentials
3. **Database**: Run `sql/init.sql` in your Supabase SQL Editor
4. **Run**: `npm run dev`

## 🏗️ Architecture Highlights

- **AI Expense Parsing**: System prompt engineering with few-shot examples and fallback heuristics
- **Auth-Ready Schema**: `user_id` column prepared for future authentication with RLS support
- **Type Safety**: Full TypeScript coverage with aligned database schema
- **Component Architecture**: Modular, reusable components with Radix UI for accessibility

## 🔒 Security

- Environment variables for sensitive keys (never committed)
- Supabase RLS ready for multi-user scenarios
- API route protection for OpenAI endpoints

## 📝 Development Workflow

- Branch naming: `feature/<name>` or `fix/<name>`
- Default branch: `master`
- PR process: Create feature branch → Implement → Open PR to `master`

## 🚧 Future Enhancements

- Real-time Analytics Dashboard with Charts
- Smart Budget Tracking with Alerts
- Advanced Search & Filtering System
- AI-Powered Expense Insights

## 👨‍💻 Developer Notes

This project demonstrates modern React patterns, TypeScript best practices, API integration (OpenAI, Supabase), responsive UI/UX design, error handling, database schema design, and AI/ML integration in web applications.
