import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Role, User } from "@prisma/client";

const cookieName = "intentguard_session";
const sessionSecret = process.env.SESSION_SECRET;

function secret() {
  if (!sessionSecret) throw new Error("SESSION_SECRET is not configured");
  return sessionSecret;
}

function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function createSession(user: Pick<User, "id">, role: Role) {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set(cookieName, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return { id: user.id, role };
}

export async function createSessionToken(user: Pick<User, "id">) {
  const token = `${randomBytes(32).toString("hex")}.${digest(user.id)}`;
  const tokenHash = digest(token);
  await db.session.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(cookieName);
}

export async function getSession(request?: Request) {
  const token = request ? request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))?.[1] : (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role };
}

export async function requireSession(request?: Request, roles?: Role[]) {
  const session = await getSession(request);
  if (!session) throw new Error("UNAUTHORIZED");
  if (roles && !roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}
