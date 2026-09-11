export type FieldLevel = "campaign" | "adset" | "ad";

export type FieldType = "select" | "multi_select" | "month" | "age_range";

export interface CategoryRow {
  id: number;
  level: FieldLevel;
  key: string;
  label: string;
  is_required: boolean;
  field_type: FieldType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogValueRow {
  id: number;
  category_id: number;
  label: string;
  abbreviation: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string | null;
  role: "admin" | "editor";
  created_at: string;
}

export interface AuthTokenPayload {
  sub: number;
  username: string;
  role: UserRow["role"];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
