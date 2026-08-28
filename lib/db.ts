import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Database types
export interface DbSession {
  id: string;
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
  file_name: string;
  file_type: string;
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

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
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
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    parsed_data TEXT NOT NULL DEFAULT '{}',
    raw_response TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);
`);

// ===== Session helpers =====

export function createSession(): DbSession {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)"
  ).run(id, now, now);
  return { id, created_at: now, updated_at: now };
}

export function getSession(id: string): DbSession | undefined {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
    | DbSession
    | undefined;
}

export function touchSession(id: string): void {
  db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    id
  );
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

  touchSession(sessionId);

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
    .prepare(
      "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all(sessionId) as DbMessage[];
}

// ===== Bill helpers =====

export function saveBill(
  sessionId: string,
  messageId: string,
  fileName: string,
  fileType: string,
  parsedData: object,
  rawResponse: string
): DbBill {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO bills (id, session_id, message_id, file_name, file_type, parsed_data, raw_response, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    sessionId,
    messageId,
    fileName,
    fileType,
    JSON.stringify(parsedData),
    rawResponse,
    now
  );

  return {
    id,
    session_id: sessionId,
    message_id: messageId,
    file_name: fileName,
    file_type: fileType,
    parsed_data: JSON.stringify(parsedData),
    raw_response: rawResponse,
    created_at: now,
  };
}

export function getBills(sessionId: string): DbBill[] {
  return db
    .prepare(
      "SELECT * FROM bills WHERE session_id = ? ORDER BY created_at ASC"
    )
    .all(sessionId) as DbBill[];
}

export default db;
