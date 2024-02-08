import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { db } from "./db.server";
import bcrypt from "bcryptjs";

export async function login(username: string, password: string) {
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) return null;

  const isEqual = await bcrypt.compare(password, user.passwordHash);

  if (!isEqual) return null;

  return { id: user.id, username: user.username };
}

export async function register(username: string, password: string) {
  return await db.user.create({
    data: { username, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, username: true },
  });
}

const { commitSession, destroySession, getSession } =
  createCookieSessionStorage({
    cookie: {
      name: "RJ_session",
      secure: process.env.NODE_ENV === "production",
      secrets: ["secret"],
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
    },
  });

export async function createUserSession(userId: string, redirectUrl: string) {
  const session = await getSession();
  session.set("userId", userId);
  return redirect(redirectUrl, {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export async function getUserSession(request: Request) {
  return await getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return null;
  }

  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);

  if (!userId) return null;

  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
}

export async function logout(request: Request) {
  const session = await getUserSession(request);

  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}
