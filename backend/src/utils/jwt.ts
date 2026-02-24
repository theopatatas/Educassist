// src/utils/jwt.ts
import jwt, { type JwtPayload, type SignOptions, type Secret } from "jsonwebtoken";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing in environment variables`);
  return v;
}

const ACCESS_SECRET: Secret = mustGetEnv("JWT_ACCESS_SECRET");
const REFRESH_SECRET: Secret = mustGetEnv("JWT_REFRESH_SECRET");

// ✅ Fix: cast env strings to the expiresIn type jsonwebtoken expects
const ACCESS_EXPIRES_IN =
  (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"];

const REFRESH_EXPIRES_IN =
  (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export type AccessTokenPayload = {
  sub: string;            // user id (recommended)
  role?: string;          // optional role
  tokenVersion?: number;  // optional: for invalidation
};

export function signAccessToken(payload: AccessTokenPayload) {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRES_IN };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function signRefreshToken(payload: { sub: string; tokenVersion?: number }) {
  const options: SignOptions = { expiresIn: REFRESH_EXPIRES_IN };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload & AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload & AccessTokenPayload;
}

export function verifyRefreshToken(
  token: string
): JwtPayload & { sub: string; tokenVersion?: number } {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload & { sub: string; tokenVersion?: number };
}
