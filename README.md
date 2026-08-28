# BillBot AI — Patient Advisour & Medical Billing Assistance

**BillBot AI** is an intelligent, patient-first conversational AI web application designed to simplify medical bills, translate complex billing codes into plain English, audit for potential errors or surprise fees, and generate personalized dispute letters.

Powered by **Google Gemini 3.6 Flash** multimodal intelligence, BillBot AI empowers patients to understand exactly what they were charged for, what insurance covered, what they owe, and what action to take next.

---

## 🌟 Key Features

- 📄 **Multimodal Bill & EOB Parsing**: Upload medical bills or Explanation of Benefits (EOB) statements in PDF, PNG, JPEG, or WebP format. BillBot extracts provider names, dates of service, itemized charges, insurance adjustments, and patient responsibility.
- 💬 **Plain-English Medical Billing Explanations**: Translates confusing medical billing codes (such as CPT, HCPCS, SAC codes, Level 4 ER facility fees) and terminology (deductible, coinsurance, copay, out-of-pocket max) into accessible 8th-grade language.
- 🚩 **Automatic Error & Flag Detection**: Audits statements for potential billing red flags, out-of-network balance billing under the No Surprises Act, duplicate tests, and unbundled charges.
- ✉️ **Interactive Dispute Email Writer**: Generates customized, ready-to-send formal dispute emails to hospital billing departments with no placeholder brackets.
- 🎙️ **Voice-to-Text Speech Input**: Built-in speech recognition for asking questions hands-free.
- 💾 **Persistent Chat & Query History**: SQLite-backed conversation and query persistence with session management, deletion, and auto-titling.
- 🔐 **Patient Authentication**: Seamless email & OTP verification session flow with local state caching.
- ⚡ **Real-Time Streaming**: Low-latency token streaming for fluid conversational responses.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI & Components**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **AI / LLM**: [Google Gen AI SDK (`@google/genai`)](https://www.npmjs.com/package/@google/genai) — `gemini-3.6-flash`
- **Database**: [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) for lightweight, persistent local data storage
- **Language**: TypeScript

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/viditjain27/BillBot.AI.git
cd BillBot.AI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Add your Google Gemini API key:

```env
# Gemini API Key — Get yours from Google AI Studio: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # OTP generation & verification endpoints
│   │   ├── chat/          # Real-time streaming chat endpoint
│   │   ├── parse-bill/    # Multimodal image & PDF bill parser
│   │   └── sessions/      # Session CRUD & message history endpoints
│   ├── globals.css        # Global CSS design tokens
│   ├── layout.tsx         # Root layout with SEO meta tags
│   └── page.tsx           # Main application workspace & state orchestrator
├── components/
│   ├── AuthModal.tsx      # Authentication & OTP modal
│   ├── BillSummaryCard.tsx# Interactive structured bill breakdown card
│   ├── ChatWindow.tsx     # Chat messages, input bar, voice & file upload
│   ├── DisputeLetterModal.tsx # Formal dispute letter builder
│   ├── LoginPage.tsx      # Patient onboarding & login view
│   ├── MessageBubble.tsx  # Markdown message bubbles & typing indicator
│   ├── QuickReplyChips.tsx# Common medical billing prompt chips
│   ├── Sidebar.tsx        # Query history, navigation, & user profile
│   └── UploadButton.tsx   # Bill upload drag-and-drop button
├── lib/
│   ├── db.ts              # SQLite database schema and helper functions
│   ├── gemini.ts          # Gemini 3.6 Flash SDK integration & stream handlers
│   └── prompts.ts         # System prompts for billing assistance and parsing
└── public/                # Static assets & logos
```

---

## 🔒 Security & Privacy

- All sensitive keys (`.env*`) and local database files (`data/*.db`) are strictly excluded via `.gitignore`.
- Medical bills uploaded during a session are parsed securely for the active patient session and kept localized.

---

## 📜 License

MIT License.
