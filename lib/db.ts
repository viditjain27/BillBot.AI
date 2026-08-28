import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Database types
export interface DbUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  last_active_at: string;
}

export interface DbSession {
  id: string;
  user_email: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  session_id: string;
  role: "user" | "bot";
  content: string;
  type: "text" | "bill-summary";
  bill_data: string | null;
  created_at: string;
}

export interface DbBill {
  id: string;
  session_id: string;
  message_id: string;
  user_email: string | null;
  file_name: string;
  file_type: string;
  provider: string;
  total_charged: number;
  insurance_covered: number;
  patient_balance: number;
  currency_symbol: string;
  parsed_data: string;
  raw_response: string;
  created_at: string;
}

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const dbPath = path.join(dataDir, "billbot.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create basic tables first
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Patient',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    title TEXT NOT NULL DEFAULT 'New Consultation',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'bot')),
    content TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'bill-summary')),
    bill_data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    user_email TEXT,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'Medical Provider',
    total_charged REAL NOT NULL DEFAULT 0.0,
    insurance_covered REAL NOT NULL DEFAULT 0.0,
    patient_balance REAL NOT NULL DEFAULT 0.0,
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    parsed_data TEXT NOT NULL DEFAULT '{}',
    raw_response TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );
`);

// Migration for existing tables if columns are missing
try {
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!sessionColumns.some((c) => c.name === "user_email")) {
    db.exec("ALTER TABLE sessions ADD COLUMN user_email TEXT");
  }
  if (!sessionColumns.some((c) => c.name === "title")) {
    db.exec("ALTER TABLE sessions ADD COLUMN title TEXT NOT NULL DEFAULT 'New Consultation'");
  }

  const billColumns = db.prepare("PRAGMA table_info(bills)").all() as Array<{ name: string }>;
  if (!billColumns.some((c) => c.name === "user_email")) {
    db.exec("ALTER TABLE bills ADD COLUMN user_email TEXT");
  }
  if (!billColumns.some((c) => c.name === "provider")) {
    db.exec("ALTER TABLE bills ADD COLUMN provider TEXT NOT NULL DEFAULT 'Medical Provider'");
  }
  if (!billColumns.some((c) => c.name === "total_charged")) {
    db.exec("ALTER TABLE bills ADD COLUMN total_charged REAL NOT NULL DEFAULT 0.0");
  }
  if (!billColumns.some((c) => c.name === "insurance_covered")) {
    db.exec("ALTER TABLE bills ADD COLUMN insurance_covered REAL NOT NULL DEFAULT 0.0");
  }
  if (!billColumns.some((c) => c.name === "patient_balance")) {
    db.exec("ALTER TABLE bills ADD COLUMN patient_balance REAL NOT NULL DEFAULT 0.0");
  }
  if (!billColumns.some((c) => c.name === "currency_symbol")) {
    db.exec("ALTER TABLE bills ADD COLUMN currency_symbol TEXT NOT NULL DEFAULT '₹'");
  }
} catch (e) {
  console.warn("Migration warning:", e);
}

// Create indexes safely after columns are guaranteed to exist
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_email);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);
    CREATE INDEX IF NOT EXISTS idx_bills_user ON bills(user_email);
  `);
} catch (e) {
  console.warn("Index warning:", e);
}

// ===== User helpers =====

export function upsertUser(email: string, name?: string): DbUser {
  const normalizedEmail = email.trim().toLowerCase();
  const userName = name || normalizedEmail.split("@")[0];
  const now = new Date().toISOString();

  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as DbUser | undefined;
  if (existing) {
    db.prepare("UPDATE users SET name = ?, last_active_at = ? WHERE email = ?").run(
      userName,
      now,
      normalizedEmail
    );
    return { ...existing, name: userName, last_active_at: now };
  }

  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, created_at, last_active_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, normalizedEmail, userName, now, now);

  return { id, email: normalizedEmail, name: userName, created_at: now, last_active_at: now };
}

// ===== Session helpers =====

export function createSession(userEmail?: string, title?: string): DbSession {
  const id = uuidv4();
  const now = new Date().toISOString();
  const sessionTitle = title || "New Query";
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  db.prepare(
    "INSERT INTO sessions (id, user_email, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, normalizedEmail, sessionTitle, now, now);

  if (normalizedEmail) {
    upsertUser(normalizedEmail);
  }

  return { id, user_email: normalizedEmail, title: sessionTitle, created_at: now, updated_at: now };
}

export function getSession(id: string): DbSession | undefined {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as DbSession | undefined;
}

export function getUserSessions(userEmail: string): Array<DbSession & { message_count: number; has_bill: number }> {
  const normalizedEmail = userEmail.trim().toLowerCase();
  return db
    .prepare(`
      SELECT s.*, 
             COUNT(DISTINCT m.id) as message_count,
             COUNT(DISTINCT b.id) as has_bill
      FROM sessions s
      LEFT JOIN messages m ON s.id = m.session_id
      LEFT JOIN bills b ON s.id = b.session_id
      WHERE s.user_email = ?
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `)
    .all(normalizedEmail) as Array<DbSession & { message_count: number; has_bill: number }>;
}

export function updateSessionTitle(id: string, title: string): void {
  db.prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?").run(
    title,
    new Date().toISOString(),
    id
  );
}

export function deleteSession(id: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function touchSession(id: string, newTitle?: string): void {
  const now = new Date().toISOString();
  if (newTitle) {
    db.prepare("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?").run(newTitle, now, id);
  } else {
    db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, id);
  }
}

// ===== Message helpers =====

export function addMessage(
  sessionId: string,
  role: "user" | "bot",
  content: string,
  type: "text" | "bill-summary" = "text",
  billData: object | null = null
): DbMessage {
  const id = uuidv4();
  const now = new Date().toISOString();
  const billDataStr = billData ? JSON.stringify(billData) : null;

  db.prepare(
    "INSERT INTO messages (id, session_id, role, content, type, bill_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, sessionId, role, content, type, billDataStr, now);

  // If this is the first user question, update session title automatically
  if (role === "user" && content && !content.startsWith("📎")) {
    const session = getSession(sessionId);
    if (session && (session.title === "New Query" || session.title === "New Consultation" || !session.title)) {
      const cleanTitle = content.slice(0, 38).trim() + (content.length > 38 ? "..." : "");
      touchSession(sessionId, cleanTitle);
    } else {
      touchSession(sessionId);
    }
  } else {
    touchSession(sessionId);
  }

  return {
    id,
    session_id: sessionId,
    role,
    content,
    type,
    bill_data: billDataStr,
    created_at: now,
  };
}

export function getMessages(sessionId: string): DbMessage[] {
  return db
    .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC")
    .all(sessionId) as DbMessage[];
}

// ===== Bill / Report helpers =====

export function saveBill(
  sessionId: string,
  messageId: string,
  fileName: string,
  fileType: string,
  parsedData: Record<string, unknown>,
  rawResponse: string,
  userEmail?: string | null
): DbBill {
  const id = uuidv4();
  const now = new Date().toISOString();

  const provider = String(parsedData.provider || "Medical Provider");
  const totalCharged = Number(parsedData.totalCharged || 0);
  const insuranceCovered = Number(parsedData.insuranceCovered || 0);
  const patientBalance = Number(parsedData.patientBalance || 0);
  const currencySymbol = String(parsedData.currencySymbol || "₹");
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  db.prepare(`
    INSERT INTO bills (
      id, session_id, message_id, user_email, file_name, file_type, 
      provider, total_charged, insurance_covered, patient_balance, 
      currency_symbol, parsed_data, raw_response, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    sessionId,
    messageId,
    normalizedEmail,
    fileName,
    fileType,
    provider,
    totalCharged,
    insuranceCovered,
    patientBalance,
    currencySymbol,
    JSON.stringify(parsedData),
    rawResponse,
    now
  );

  // Update session title to the provider name
  const title = `${provider} (${currencySymbol}${patientBalance.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
  touchSession(sessionId, title);

  return {
    id,
    session_id: sessionId,
    message_id: messageId,
    user_email: normalizedEmail,
    file_name: fileName,
    file_type: fileType,
    provider,
    total_charged: totalCharged,
    insurance_covered: insuranceCovered,
    patient_balance: patientBalance,
    currency_symbol: currencySymbol,
    parsed_data: JSON.stringify(parsedData),
    raw_response: rawResponse,
    created_at: now,
  };
}

export function getUserReports(userEmail: string): DbBill[] {
  const normalizedEmail = userEmail.trim().toLowerCase();
  return db
    .prepare("SELECT * FROM bills WHERE user_email = ? ORDER BY created_at DESC")
    .all(normalizedEmail) as DbBill[];
}

export default db;
