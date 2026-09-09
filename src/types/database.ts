// ==========================================================
// src/types/database.ts
// الأنواع والنماذج الأساسية لقاعدة البيانات
// ==========================================================

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface FeatureRow {
  id: string;
  name_ar: string;
  description_ar: string | null;
  is_core: number; // 0 or 1
  is_enabled: number; // 0 or 1
  updated_at: string;
}

export interface RoleRow {
  id: string;
  name: string;
  name_ar: string;
  description_ar: string | null;
  is_system: number;
  created_at: string;
}

export interface PermissionRow {
  code: string;
  name_ar: string;
  module: string;
  created_at: string;
}

export interface RolePermissionRow {
  role_id: string;
  permission_code: string;
}

export interface UserRow {
  id: string;
  username: string;
  full_name: string;
  password_hash: string;
  role_id: string;
  phone: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface UnitRow {
  id: string;
  name: string;
  symbol: string;
  is_default: number;
  created_at: string;
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category_id: string;
  unit_id: string;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  maximum_stock: number | null;
  current_stock: number;
  description: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Joined fields for UI convenience
  category_name?: string;
  unit_name?: string;
  unit_symbol?: string;
}

export type StockMovementType =
  | "PURCHASE"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "RETURN_IN"
  | "RETURN_OUT";

export interface StockMovementRow {
  id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  user_id: string;
  created_at: string;
  product_name?: string;
  user_name?: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  phone: string;
  second_phone: string | null;
  address: string | null;
  email: string | null;
  balance: number;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierTransactionRow {
  id: string;
  supplier_id: string;
  type: "PURCHASE_INVOICE" | "PAYMENT" | "RETURN";
  amount: number;
  before_balance: number;
  after_balance: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  supplier_name?: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerTransactionRow {
  id: string;
  customer_id: string;
  type: "SALE_INVOICE" | "PAYMENT" | "RETURN";
  amount: number;
  before_balance: number;
  after_balance: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  customer_name?: string;
}

export interface SaleRow {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  user_id: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_type: "CASH" | "CREDIT" | "PARTIAL";
  paid_amount: number;
  remaining_amount: number;
  notes: string | null;
  status: "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  customer_name?: string;
  user_name?: string;
  items_count?: number;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  purchase_cost: number;
  discount: number;
  total: number;
  created_at: string;
  product_name?: string;
  unit_symbol?: string;
}

export interface PurchaseRow {
  id: string;
  invoice_number: string;
  supplier_id: string | null;
  user_id: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_type: "CASH" | "CREDIT" | "PARTIAL";
  paid_amount: number;
  remaining_amount: number;
  notes: string | null;
  status: "COMPLETED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  supplier_name?: string;
  user_name?: string;
  items_count?: number;
}

export interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
  product_name?: string;
}

export interface ExpenseCategoryRow {
  id: string;
  name: string;
  is_system: number;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  category_id: string;
  amount: number;
  date: string;
  description: string | null;
  user_id: string;
  created_at: string;
  category_name?: string;
  user_name?: string;
}

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "OPERATION" | "BACKUP" | "SYSTEM";
  is_read: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: string | null;
  created_at: string;
  user_name?: string;
}

export interface BackupRow {
  id: string;
  filename: string;
  filepath: string;
  size_bytes: number;
  backup_type: "MANUAL" | "AUTOMATIC" | "SAFETY";
  status: string;
  created_at: string;
}
