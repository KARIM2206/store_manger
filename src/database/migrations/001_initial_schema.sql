-- ==========================================================
-- 001_initial_schema.sql
-- نظام إدارة المخزون والمبيعات - الهيكل الأساسي لقاعدة البيانات
-- ==========================================================

PRAGMA foreign_keys = ON;

-- 1. جدول الإعدادات العامة
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. جدول المميزات (Feature Registry)
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    description_ar TEXT,
    is_core INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. جدول الأدوار (Roles)
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    description_ar TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. جدول الصلاحيات (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    code TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. جدول ربط الأدوار بالصلاحيات (Role Permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_code TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_code),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
);

-- 6. جدول المستخدمين (Users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_id TEXT NOT NULL,
    phone TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 7. جدول التصنيفات (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. جدول الوحدات (Units)
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. جدول المنتجات (Products)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    category_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0.0,
    selling_price REAL NOT NULL DEFAULT 0.0,
    minimum_stock REAL NOT NULL DEFAULT 5.0,
    maximum_stock REAL,
    current_stock REAL NOT NULL DEFAULT 0.0,
    description TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

-- 10. جدول سجل حركة المخزون (Stock Movement Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL, -- PURCHASE, SALE, ADJUSTMENT_IN, ADJUSTMENT_OUT, RETURN_IN, RETURN_OUT
    quantity REAL NOT NULL,
    before_quantity REAL NOT NULL,
    after_quantity REAL NOT NULL,
    reason TEXT,
    reference_type TEXT, -- SALE, PURCHASE, ADJUSTMENT, MANUAL
    reference_id TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 11. جدول الموردين (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    second_phone TEXT,
    address TEXT,
    email TEXT,
    balance REAL NOT NULL DEFAULT 0.0, -- رصيد المورد (موجب يعني له، سالب يعني عليه)
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. جدول معاملات الموردين (Supplier Transactions)
CREATE TABLE IF NOT EXISTS supplier_transactions (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    type TEXT NOT NULL, -- PURCHASE_INVOICE, PAYMENT, RETURN
    amount REAL NOT NULL,
    before_balance REAL NOT NULL,
    after_balance REAL NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 13. جدول العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    balance REAL NOT NULL DEFAULT 0.0, -- رصيد العميل (موجب يعني عليه، سالب يعني له)
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. جدول معاملات العملاء (Customer Transactions)
CREATE TABLE IF NOT EXISTS customer_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    type TEXT NOT NULL, -- SALE_INVOICE, PAYMENT, RETURN
    amount REAL NOT NULL,
    before_balance REAL NOT NULL,
    after_balance REAL NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 15. جدول المبيعات (Sales)
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    user_id TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0.0,
    discount REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    payment_type TEXT NOT NULL DEFAULT 'CASH', -- CASH, CREDIT, PARTIAL
    paid_amount REAL NOT NULL DEFAULT 0.0,
    remaining_amount REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 16. جدول عناصر الفاتورة (Sale Items)
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    purchase_cost REAL NOT NULL DEFAULT 0.0,
    discount REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 17. جدول المشتريات (Purchases)
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT,
    user_id TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0.0,
    discount REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    payment_type TEXT NOT NULL DEFAULT 'CASH', -- CASH, CREDIT, PARTIAL
    paid_amount REAL NOT NULL DEFAULT 0.0,
    remaining_amount REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 18. جدول عناصر المشتريات (Purchase Items)
CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 19. جدول تصنيفات المصروفات (Expense Categories)
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. جدول المصروفات (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 21. جدول الإشعارات (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- LOW_STOCK, OUT_OF_STOCK, OPERATION, BACKUP, SYSTEM
    is_read INTEGER NOT NULL DEFAULT 0,
    reference_type TEXT,
    reference_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 22. جدول سجل النشاط (Activity Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL, -- LOGIN, LOGOUT, CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT, CREATE_SALE, CANCEL_SALE, CREATE_PURCHASE, ADJUST_STOCK, CREATE_USER, UPDATE_SETTINGS, BACKUP, RESTORE
    entity_type TEXT,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 23. جدول سجل النسخ الاحتياطي (Backups)
CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    backup_type TEXT NOT NULL, -- MANUAL, AUTOMATIC, SAFETY
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- INDEXES للبحث السريع والأداء الفائق
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_type ON stock_movements(type);

CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

CREATE INDEX IF NOT EXISTS idx_cust_trans_customer ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_supp_trans_supplier ON supplier_transactions(supplier_id);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
