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

// In-memory fallback stores when DATABASE_URL is not provided
const memoryUsers = new Map<string, DbUser>();
const memorySessions = new Map<string, DbSession>();
const memoryMessages: DbMessage[] = [];
const memoryBills: DbBill[] = [];
const memoryOtps = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function getNeonConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith("postgres")) return null;
  try {
    const u = new URL(dbUrl);
    const host = u.host.replace("-pooler", "");
    return {
      endpoint: `https://${host}/sql`,
      dbUrl,
    };
  } catch {
    return null;
  }
}

// Query helper for Neon Serverless over HTTP
async function queryNeon<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const config = getNeonConfig();
  if (!config) return [];

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Neon-Connection-String": config.dbUrl,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, params }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Neon DB query error: HTTP ${res.status}`);
  }

  const data = await res.json();
  return (data.rows || []) as T[];
}

// ===== User helpers =====

export async function upsertUser(email: string, name?: string): Promise<DbUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const userName = name || normalizedEmail.split("@")[0];
  const now = new Date().toISOString();

  if (getNeonConfig()) {
    const id = uuidv4();
    const rows = await queryNeon<DbUser>(
      `INSERT INTO users (id, email, name, created_at, last_active_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, last_active_at = NOW()
       RETURNING *;`,
      [id, normalizedEmail, userName]
    );
    if (rows[0]) return rows[0];
  }

  // Fallback in-memory
  const existing = memoryUsers.get(normalizedEmail);
  if (existing) {
    const updated: DbUser = { ...existing, name: userName, last_active_at: now };
    memoryUsers.set(normalizedEmail, updated);
    return updated;
  }
  const newUser: DbUser = { id: uuidv4(), email: normalizedEmail, name: userName, created_at: now, last_active_at: now };
  memoryUsers.set(normalizedEmail, newUser);
  return newUser;
}

export async function getUser(email: string): Promise<DbUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (getNeonConfig()) {
    const rows = await queryNeon<DbUser>(
      `SELECT * FROM users WHERE email = $1 LIMIT 1;`,
      [normalizedEmail]
    );
    return rows[0] || null;
  }

  return memoryUsers.get(normalizedEmail) || null;
}

// ===== Session helpers =====

export async function createSession(userEmail?: string, title?: string): Promise<DbSession> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const sessionTitle = title || "New Query";
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  if (getNeonConfig()) {
    const rows = await queryNeon<DbSession>(
      `INSERT INTO sessions (id, user_email, title, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *;`,
      [id, normalizedEmail, sessionTitle]
    );
    if (normalizedEmail) {
      await upsertUser(normalizedEmail);
    }
    if (rows[0]) return rows[0];
  }

  const newSession: DbSession = { id, user_email: normalizedEmail, title: sessionTitle, created_at: now, updated_at: now };
  memorySessions.set(id, newSession);
  if (normalizedEmail) {
    await upsertUser(normalizedEmail);
  }
  return newSession;
}

export async function getSession(id: string): Promise<DbSession | null> {
  if (getNeonConfig()) {
    const rows = await queryNeon<DbSession>(
      `SELECT * FROM sessions WHERE id = $1 LIMIT 1;`,
      [id]
    );
    return rows[0] || null;
  }

  return memorySessions.get(id) || null;
}

export async function getUserSessions(
  userEmail: string
): Promise<Array<DbSession & { message_count: number; has_bill: number }>> {
  const normalizedEmail = userEmail.trim().toLowerCase();

  if (getNeonConfig()) {
    const rows = await queryNeon<DbSession & { message_count: string; has_bill: string }>(
      `SELECT s.*,
              COUNT(m.id)::int as message_count,
              COUNT(b.id)::int as has_bill
       FROM sessions s
       LEFT JOIN messages m ON s.id = m.session_id
       LEFT JOIN bills b ON s.id = b.session_id
       WHERE s.user_email = $1
       GROUP BY s.id
       ORDER BY s.updated_at DESC;`,
      [normalizedEmail]
    );
    return rows.map((r) => ({
      ...r,
      message_count: Number(r.message_count || 0),
      has_bill: Number(r.has_bill || 0),
    }));
  }

  const userSessions = Array.from(memorySessions.values())
    .filter((s) => s.user_email === normalizedEmail)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return userSessions.map((sess) => {
    const messageCount = memoryMessages.filter((m) => m.session_id === sess.id).length;
    const hasBill = memoryBills.some((b) => b.session_id === sess.id) ? 1 : 0;
    return {
      ...sess,
      message_count: messageCount,
      has_bill: hasBill,
    };
  });
}

export async function touchSession(id: string, title?: string): Promise<void> {
  if (getNeonConfig()) {
    if (title) {
      await queryNeon(
        `UPDATE sessions SET title = $2, updated_at = NOW() WHERE id = $1;`,
        [id, title]
      );
    } else {
      await queryNeon(
        `UPDATE sessions SET updated_at = NOW() WHERE id = $1;`,
        [id]
      );
    }
    return;
  }

  const sess = memorySessions.get(id);
  if (sess) {
    sess.updated_at = new Date().toISOString();
    if (title) sess.title = title;
  }
}

export async function deleteSession(id: string): Promise<void> {
  if (getNeonConfig()) {
    await queryNeon(`DELETE FROM sessions WHERE id = $1;`, [id]);
    return;
  }

  memorySessions.delete(id);
}

// ===== Messages helpers =====

export async function addMessage(
  sessionId: string,
  role: "user" | "bot",
  content: string,
  type: "text" | "bill-summary" = "text",
  billData: object | null = null
): Promise<DbMessage> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const billDataStr = billData ? JSON.stringify(billData) : null;

  if (getNeonConfig()) {
    const rows = await queryNeon<DbMessage>(
      `INSERT INTO messages (id, session_id, role, content, type, bill_data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *;`,
      [id, sessionId, role, content, type, billDataStr]
    );

    // If first user message, update title
    if (role === "user" && content && !content.startsWith("📎")) {
      const session = await getSession(sessionId);
      if (session && (session.title === "New Query" || session.title === "New Consultation" || !session.title)) {
        const cleanTitle = content.slice(0, 38).trim() + (content.length > 38 ? "..." : "");
        await touchSession(sessionId, cleanTitle);
      } else {
        await touchSession(sessionId);
      }
    } else {
      await touchSession(sessionId);
    }

    if (rows[0]) return rows[0];
  }

  const newMsg: DbMessage = {
    id,
    session_id: sessionId,
    role,
    content,
    type,
    bill_data: billDataStr,
    created_at: now,
  };
  memoryMessages.push(newMsg);

  if (role === "user" && content && !content.startsWith("📎")) {
    const session = await getSession(sessionId);
    if (session && (session.title === "New Query" || session.title === "New Consultation" || !session.title)) {
      const cleanTitle = content.slice(0, 38).trim() + (content.length > 38 ? "..." : "");
      await touchSession(sessionId, cleanTitle);
    } else {
      await touchSession(sessionId);
    }
  } else {
    await touchSession(sessionId);
  }

  return newMsg;
}

export async function getMessages(sessionId: string): Promise<DbMessage[]> {
  if (getNeonConfig()) {
    const rows = await queryNeon<DbMessage>(
      `SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC;`,
      [sessionId]
    );
    return rows;
  }

  return memoryMessages
    .filter((m) => m.session_id === sessionId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// ===== Bill helpers =====

export async function saveBill(
  sessionId: string,
  messageId: string,
  fileName: string,
  fileType: string,
  billData: Record<string, unknown>,
  rawResponse: string,
  userEmail?: string | null
): Promise<DbBill> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const provider = (billData.provider as string) || "Medical Provider";
  const totalCharged = Number(billData.totalCharged) || 0.0;
  const insuranceCovered = Number(billData.insuranceCovered) || 0.0;
  const patientBalance = Number(billData.patientBalance) || 0.0;
  const currencySymbol = (billData.currencySymbol as string) || "₹";
  const dateOfService = (billData.dateOfService as string) || null;
  const parsedDataStr = JSON.stringify(billData);
  const normalizedEmail = userEmail ? userEmail.trim().toLowerCase() : null;

  if (getNeonConfig()) {
    const rows = await queryNeon<DbBill>(
      `INSERT INTO bills (id, session_id, message_id, user_email, file_name, file_type, provider, date_of_service, currency_symbol, total_charged, insurance_covered, patient_balance, structured_data, raw_response, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *;`,
      [
        id,
        sessionId,
        messageId,
        normalizedEmail,
        fileName,
        fileType,
        provider,
        dateOfService,
        currencySymbol,
        totalCharged,
        insuranceCovered,
        patientBalance,
        parsedDataStr,
        rawResponse,
      ]
    );

    // Auto-update session title with bill provider name
    const billTitle = `📄 ${provider.slice(0, 30)}`;
    await touchSession(sessionId, billTitle);

    if (rows[0]) return rows[0];
  }

  const newBill: DbBill = {
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
    parsed_data: parsedDataStr,
    raw_response: rawResponse,
    created_at: now,
  };
  memoryBills.push(newBill);

  const billTitle = `📄 ${provider.slice(0, 30)}`;
  await touchSession(sessionId, billTitle);

  return newBill;
}

export async function getUserBills(userEmail: string): Promise<DbBill[]> {
  const normalizedEmail = userEmail.trim().toLowerCase();

  if (getNeonConfig()) {
    const rows = await queryNeon<DbBill>(
      `SELECT * FROM bills WHERE user_email = $1 ORDER BY created_at DESC;`,
      [normalizedEmail]
    );
    return rows;
  }

  return memoryBills
    .filter((b) => b.user_email === normalizedEmail)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getBillBySession(sessionId: string): Promise<DbBill | null> {
  if (getNeonConfig()) {
    const rows = await queryNeon<DbBill>(
      `SELECT * FROM bills WHERE session_id = $1 LIMIT 1;`,
      [sessionId]
    );
    return rows[0] || null;
  }

  return memoryBills.find((b) => b.session_id === sessionId) || null;
}

// ===== Persistent OTP helpers (shared across all Serverless lambdas) =====

export async function saveOtpToDb(email: string, code: string): Promise<{ otp: string; expiresAt: number }> {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

  if (getNeonConfig()) {
    const id = uuidv4();
    await queryNeon(
      `INSERT INTO otp_codes (id, email, code, expires_at, verified, created_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', false, NOW());`,
      [id, normalizedEmail, code]
    );
    return { otp: code, expiresAt };
  }

  memoryOtps.set(normalizedEmail, { code, expiresAt, attempts: 0 });
  return { otp: code, expiresAt };
}

export async function verifyOtpFromDb(
  email: string,
  providedOtp: string
): Promise<{ success: boolean; message: string; defaultName: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const usernamePart = normalizedEmail.split("@")[0] || "User";
  const defaultName = usernamePart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  if (getNeonConfig()) {
    const rows = await queryNeon<{ id: string; code: string; expires_at: string; verified: boolean }>(
      `SELECT * FROM otp_codes
       WHERE email = $1
         AND verified = false
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1;`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return {
        success: false,
        message: "No active verification code found for this email. Please request a new code.",
        defaultName,
      };
    }

    const latest = rows[0];
    if (latest.code !== providedOtp.trim()) {
      return {
        success: false,
        message: "Invalid verification code. Please check and try again.",
        defaultName,
      };
    }

    // Mark as verified
    await queryNeon(`UPDATE otp_codes SET verified = true WHERE id = $1;`, [latest.id]);

    return {
      success: true,
      message: "Verified successfully",
      defaultName,
    };
  }

  // Memory fallback
  const entry = memoryOtps.get(normalizedEmail);
  if (!entry) {
    return {
      success: false,
      message: "No active verification code found for this email. Please request a new code.",
      defaultName,
    };
  }

  if (Date.now() > entry.expiresAt) {
    memoryOtps.delete(normalizedEmail);
    return {
      success: false,
      message: "Verification code has expired. Please request a new code.",
      defaultName,
    };
  }

  if (entry.code !== providedOtp.trim()) {
    entry.attempts += 1;
    if (entry.attempts >= 5) {
      memoryOtps.delete(normalizedEmail);
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
        defaultName,
      };
    }
    return {
      success: false,
      message: "Invalid verification code. Please check and try again.",
      defaultName,
    };
  }

  memoryOtps.delete(normalizedEmail);
  return {
    success: true,
    message: "Verified successfully",
    defaultName,
  };
}
