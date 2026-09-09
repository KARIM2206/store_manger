# مدير المخزن (Store Manager) — نظام إدارة المخزون والمبيعات المحلي

تطبيق سطح مكتب (Desktop App) احترافي، متكامل وسريع، مصمم خصيصاً للشركات والمخازن والمحلات التجارية في السوق المصري (تجارة السيراميك، الأدوات الصحية، مواد البناء، قطع الغيار، الأدوات والعدد، الأجهزة، والأنشطة التي لا تعتمد على تواريخ الصلاحية).

التطبيق يعمل **Offline بنسبة 100%** محلياً بدون الحاجة إلى أي اتصال بالإنترنت أو خوادم خارجية.

---

## 🌟 أبرز المميزات

1. **تصميم محلي بالكامل (Offline-First):**
   - يعمل محلياً بالكامل عبر قاعدة بيانات **SQLite** مدمجة.
   - تشفير كلمات المرور باستخدام **Argon2id** و Rust backend.
   - لا يتطلب أي خادم خارجي أو إنترنت بعد التثبيت.

2. **واجهة مستخدم عربية بالكامل (RTL ERP Design):**
   - دعم كامل للغة العربية من اليمين إلى اليسار (RTL).
   - خطوط واضحة وقابلة للقراءة (Cairo & IBM Plex Sans Arabic).
   - تصميم نظيف ومريح للعين (Clean Enterprise SaaS) بدون تدرجات لونية مبهرجة.
   - دعم كامل للوضع الفاتح (Light Mode) والوضع الداكن (Dark Mode).

3. **سجل حركات المخزون الدقيق (Stock Ledger Architecture):**
   - لا يتم تعديل رصيد أي منتج يدوياً أو عشوائياً.
   - كل حركة مسجلة ذرياً (`PURCHASE`، `SALE`، `ADJUSTMENT_IN`، `ADJUSTMENT_OUT`، إلخ) مع السبب والتاريخ والمستخدم.
   - منع البيع بالسالب تلقائياً، مع خيار إداري لتفعيله عند الحاجة.

4. **نظام الموديولات القابل للتخصيص (Feature Registry):**
   - إمكانية تشغيل أو إيقاف الميزات حسب احتياج النشاط من خلال معالج الإعداد أو شاشة الإعدادات:
     - المشتريات (Purchases)
     - الموردين (Suppliers)
     - العملاء والبيع الآجل (Customers)
     - المصروفات وصافي الأرباح (Expenses)
     - الباركود وطباعة الملصقات (Barcode)
     - التقارير المتقدمة (Reports)
     - إدارة المستخدمين والصلاحيات (Users & RBAC)
     - سجل النشاط (Audit Logs)
     - الإشعارات وتنبيهات المخزون (Notifications)

5. **شاشة البيع السريع ونقطة البيع (POS):**
   - بحث سريع بالاسم، الكود، أو الباركود.
   - سلة مبيعات تفاعلية مع حساب فوري للخصم والضريبة والإجمالي.
   - دعم الدفع النقدي أو الآجل (حساب العميل).
   - طباعة فواتير فورية متوافقة مع الطابعات الحرارية والـ A4/A5.

6. **إدارة متقدمة للنسخ الاحتياطي (Backup & Restore):**
   - أخذ نسخة احتياطية فورية لقاعدة البيانات بضغطة زر.
   - استرجاع آمن مع أخذ لقطة أمان احتياطية تلقائية (Safety Snapshot) قبل الاسترجاع لمنع فقدان البيانات.

---

## 🛠️ البنية التقنية (Tech Stack)

- **Desktop Framework:** [Tauri 2](https://v2.tauri.app/) (Rust Backend)
- **Frontend:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) Architecture
- **Database:** SQLite عبر `tauri-plugin-sql`
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **Forms & Validation:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)

---

## 📁 هيكلية المشروع (Architecture)

```text
Store/
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, Header, AppLayout, Guards
│   │   └── ui/              # shadcn/ui reusable components
│   ├── database/
│   │   ├── migrations/      # SQL schema migrations (001_initial_schema.sql)
│   │   ├── repositories/    # Data access layer (CRUD & atomic business operations)
│   │   ├── seed/            # Egyptian market seed data
│   │   ├── adapter.ts       # Unified SQLite IPC & browser dev adapter
│   │   └── connection.ts    # Database singleton & migration runner
│   ├── features/
│   │   ├── activity/        # سجل تدقيق النشاط (Audit Log)
│   │   ├── auth/            # تسجيل الدخول وجلسة المستخدم
│   │   ├── backup/          # النسخ الاحتياطي والاسترجاع
│   │   ├── barcode/         # توليد وطباعة ملصقات الباركود
│   │   ├── categories/      # إدارة وتصنيف المنتجات
│   │   ├── customers/       # كشف حساب ومعاملات العملاء
│   │   ├── dashboard/       # الإحصائيات والمؤشرات السريعة (KPIs)
│   │   ├── expenses/        # إدارة المصروفات وحساب صافي الأرباح
│   │   ├── inventory/       # المخزون وحركات الرصيد (Stock Ledger)
│   │   ├── notifications/   # مركز التنبيهات ونقص المخزون
│   │   ├── products/        # إدارة المنتجات والأسعار والتكلفة
│   │   ├── purchases/       # فواتير وتوريدات المشتريات
│   │   ├── reports/         # التقارير المالية والتحليلية
│   │   ├── sales/           # نقطة البيع السريعة (POS) وإصدار الفواتير
│   │   ├── settings/        # بيانات المتجر وتخصيص الميزات
│   │   ├── setup/           # معالج الإعداد الأولي للبرنامج
│   │   ├── suppliers/       # كشف حساب وسندات الموردين
│   │   └── users/           # الموظفين والأدوار والصلاحيات (RBAC)
│   ├── services/            # authService, backupService, printService
│   ├── stores/              # authStore, featureStore
│   ├── types/               # TypeScript interfaces & database models
│   ├── routes/              # React Router configuration
│   ├── App.tsx
│   └── main.tsx
└── src-tauri/
    ├── Cargo.toml           # Rust dependencies
    ├── tauri.conf.json      # Tauri application configuration
    └── src/
        ├── lib.rs           # Tauri plugins & command registration
        ├── main.rs          # Tauri entry point
        └── commands/        # Native Rust commands (Argon2id auth, SQLite backup)
```

---

## 🚀 متطلبات التشغيل والتثبيت (Prerequisites)

1. **Node.js:** الإصدار 18 أو أحدث (يُفضل LTS).
2. **Rust & Cargo:** الإصدار 1.75 أو أحدث مثبت من خلال `rustup`.
3. **Visual Studio C++ Build Tools (على Windows):**
   - تثبيت حزمة **Desktop development with C++** عبر Visual Studio Installer، أو استخدام toolchain `x86_64-pc-windows-gnu` عبر MinGW.

---

## 💻 تعليمات التشغيل والتطوير (Getting Started)

### 1. تثبيت الحزم:
```bash
npm install
```

### 2. التشغيل في وضع المعاينة والتطوير السريع (Web Dev Mode):
```bash
npm run dev
```
*يفتح النظام على: `http://localhost:1420` مع محاكاة كاملة لقاعدة البيانات والبيانات التجريبية.*

### 3. التشغيل كتطبيق Desktop محلي (Tauri Dev Mode):
```bash
npm run tauri dev
```

### 4. فحص الأكواد والتأكد من سلامة الأنواع (Type Checking):
```bash
npx tsc --noEmit
```

### 5. بناء حزمة الإنتاج (Production Build):
```bash
# بناء ملفات الواجهة
npm run build

# تجميع تطبيق سطح المكتب التنفيذي (.exe / .msi)
npm run tauri build
```

---

## 🔑 بيانات الدخول الافتراضية (Demo Account)

عند تشغيل التطبيق لأول مرة مع البيانات التجريبية:
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `Admin@123`
- **الدور:** مدير عام (صلاحيات كاملة)

---

## 🛣️ مسار التوسع المستقبلي (Roadmap)

تم بناء البنية المعمارية للنظام (Architecture) مع مراعاة التوسع المستقبلي:
- **نظام المزامنة السحابية (Cloud Sync):** طبقة الـ Repository معزولة بالكامل، مما يسمح بإضافة Sync Queue لمزامنة التغييرات المحلية مع سيرفر مركزي (PostgreSQL / Supabase / Express) في الإصدارات القادمة دون إعادة كتابة الواجهات.
- **تعدد المخازن والفروع (Multi-Branch):** الجداول الأساسية تدعم إضافة `branch_id` و `warehouse_id` بسلاسة.
- **نظام التراخيص والتفعيل (Software Licensing):** جاهز لربط فحص المفتاح الرقمي (License Key) والتحقق من صلاحية النسخة محلياً أو عبر خادم التحقق.
