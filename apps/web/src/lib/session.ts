import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { config } from "./config";
import { PersonaRole, PersonaProfile, DEMO_PERSONAS, DEFAULT_WORKSPACE_ID } from "./personas";

export type { PersonaRole, PersonaProfile };
export { DEMO_PERSONAS, DEFAULT_WORKSPACE_ID };

const COOKIE_NAME = "hl_session";

function signPayload(payload: string): string {
  const hmac = crypto.createHmac("sha256", config.sessionSecret);
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

function verifyPayload(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = signed.slice(0, lastDot);
  const signature = signed.slice(lastDot + 1);

  const hmac = crypto.createHmac("sha256", config.sessionSecret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  try {
    if (crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))) {
      return payload;
    }
  } catch {
    return null;
  }
  return null;
}

export interface SessionData {
  persona: PersonaRole;
  workspaceId: string;
}

export async function getSession(): Promise<SessionData> {
  const cookieStore = cookies();
  const rawCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (rawCookie) {
    const verified = verifyPayload(rawCookie);
    if (verified) {
      try {
        const parsed = JSON.parse(verified) as SessionData;
        if (parsed.persona in DEMO_PERSONAS) {
          return {
            persona: parsed.persona,
            workspaceId: parsed.workspaceId || DEFAULT_WORKSPACE_ID,
          };
        }
      } catch {
        // Fallback below
      }
    }
  }

  // Default to lead for initial dev exploration
  return {
    persona: "lead",
    workspaceId: DEFAULT_WORKSPACE_ID,
  };
}

export async function setSessionCookie(persona: PersonaRole, workspaceId: string = DEFAULT_WORKSPACE_ID) {
  const cookieStore = cookies();
  let isHttps = process.env.VERCEL === "1";
  try {
    const proto = headers().get("x-forwarded-proto");
    if (proto === "https") isHttps = true;
  } catch {
    // Fallback outside request header context
  }

  const sessionData: SessionData = { persona, workspaceId };
  const signed = signPayload(JSON.stringify(sessionData));

  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
