import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { isAdminNetworkAllowed } from "../utils/network";

function authenticate(allowPasswordChange: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autenticado. Falta el token." });
    }

    try {
      const payload = verifyToken(header.slice("Bearer ".length));
      if (payload.pwdChange && !allowPasswordChange) {
        return res.status(403).json({
          error: "Debes cambiar tu contraseña antes de continuar.",
          code: "PASSWORD_CHANGE_REQUIRED",
        });
      }
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ error: "Token inválido o expirado." });
    }
  };
}

/** Sesión completa. Una sesión restringida por cambio de contraseña pendiente NO pasa. */
export const requireAuth = authenticate(false);

/** Acepta también la sesión restringida (solo para /auth/me y /auth/change-password). */
export const requireAuthAllowPasswordChange = authenticate(true);

/** El panel administrativo solo se puede usar desde las IPs de ADMIN_ALLOWED_IPS. */
function requireAdminNetwork(req: Request, res: Response): boolean {
  if (isAdminNetworkAllowed(req)) return true;
  res.status(403).json({
    error: "El panel administrativo solo está disponible desde las redes autorizadas.",
    code: "ADMIN_NETWORK_RESTRICTED",
  });
  return false;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    return res.status(403).json({ error: "Requiere permisos de administrador." });
  }
  if (!requireAdminNetwork(req, res)) return;
  return next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ error: "Requiere permisos de super administrador." });
  }
  if (!requireAdminNetwork(req, res)) return;
  return next();
}
