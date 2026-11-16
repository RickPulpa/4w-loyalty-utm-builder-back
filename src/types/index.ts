export type FieldLevel = "campaign" | "adset" | "ad";

export type FieldType = "select" | "multi_select" | "chip_select" | "month" | "age_range";

export interface CategoryRow {
  id: number;
  level: FieldLevel;
  key: string;
  label: string;
  is_required: boolean;
  field_type: FieldType;
  depends_on_key: string | null;
  depends_on_value_label: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogValueRow {
  id: number;
  category_id: number;
  label: string;
  abbreviation: string;
  region_scope: "LIMA" | "PROVINCIAS" | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type UserRole = "super_admin" | "admin" | "editor";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  must_change_password: boolean;
  password_changed_at: string | null;
  failed_attempts: number;
  locked_at: string | null;
  created_at: string;
}

export interface AuthTokenPayload {
  sub: number;
  username: string;
  role: UserRow["role"];
  /** true = sesión restringida: solo puede cambiar su contraseña (primer ingreso o contraseña vencida). */
  pwdChange?: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
