import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AuthTokenPayload } from "../types";

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as unknown as AuthTokenPayload;
}
