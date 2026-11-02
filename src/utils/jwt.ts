import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AuthTokenPayload } from "../types";

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

/** Token de sesión. Rechaza los tokens de desafío 2FA para que no sirvan como sesión. */
export function verifyToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret) as unknown as AuthTokenPayload & { purpose?: string };
  if (payload.purpose) {
    throw new Error("Token no válido como sesión.");
  }
  return payload;
}

/** Token corto que prueba que el usuario ya pasó correo+contraseña y le falta el código 2FA. */
export function signChallengeToken(userId: number): string {
  return jwt.sign({ sub: userId, purpose: "2fa" }, env.jwtSecret, {
    expiresIn: `${env.twoFactor.ttlMinutes}m`,
  } as SignOptions);
}

export function verifyChallengeToken(token: string): number {
  const payload = jwt.verify(token, env.jwtSecret) as unknown as { sub: number; purpose?: string };
  if (payload.purpose !== "2fa") {
    throw new Error("Token de verificación inválido.");
  }
  return payload.sub;
}
