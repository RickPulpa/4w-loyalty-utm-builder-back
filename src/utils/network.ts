import { Request } from "express";
import { env } from "../config/env";

/** Normaliza una IP: quita el prefijo IPv4-mapeado (::ffff:1.2.3.4) y pasa a minúsculas. */
function normalizeIp(ip: string): string {
  const lower = ip.trim().toLowerCase();
  return lower.startsWith("::ffff:") ? lower.slice(7) : lower;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    value = value * 256 + Number(part);
  }
  return value;
}

function matches(ip: string, rule: string): boolean {
  const [base, bitsRaw] = rule.split("/");
  const normalizedBase = normalizeIp(base);
  if (bitsRaw === undefined) return ip === normalizedBase;

  const bits = Number(bitsRaw);
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(normalizedBase);
  if (ipInt === null || baseInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((baseInt & mask) >>> 0);
}

export function clientIp(req: Request): string {
  return normalizeIp(req.ip ?? req.socket.remoteAddress ?? "");
}

/** ¿Puede esta petición usar el panel administrativo según ADMIN_ALLOWED_IPS? (sin lista = sí). */
export function isAdminNetworkAllowed(req: Request): boolean {
  if (env.adminAllowedIps.length === 0) return true;
  const ip = clientIp(req);
  return env.adminAllowedIps.some((rule) => matches(ip, rule));
}
