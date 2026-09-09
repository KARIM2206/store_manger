// ==========================================================
// src/database/connection.ts
// مدير اتصال قاعدة البيانات والـ Migrations
// ==========================================================

import { IDatabase, QueryResult, isRunningInTauri } from "./adapter";
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_FEATURES,
  INITIAL_PERMISSIONS,
  INITIAL_PRODUCTS,
  INITIAL_ROLES,
  INITIAL_SUPPLIERS,
  INITIAL_UNITS,
} from "./seed/seedData";

class LocalStorageDatabase implements IDatabase {
  private getStorageKey(table: string): string {
    return `store_db_${table}`;
  }

  private getTableData<T>(table: string): T[] {
    const raw = localStorage.getItem(this.getStorageKey(table));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private setTableData<T>(table: string, data: T[]): void {
    localStorage.setItem(this.getStorageKey(table), JSON.stringify(data));
  }

  /**
   * Parse the VALUES clause to extract value tokens (either '?' for params or literal values).
   * Returns an array of tokens: { type: 'param' } or { type: 'literal', value: any }
   */
  private parseValuesTokens(query: string): Array<{ type: "param" } | { type: "literal"; value: any }> {
    const valuesMatch = query.match(/VALUES\s*\(([^)]+)\)/i);
    if (!valuesMatch) return [];

    const rawTokens = valuesMatch[1].split(",").map((t) => t.trim());
    return rawTokens.map((token) => {
      if (token === "?") {
        return { type: "param" as const };
      }
      // Numeric literal
      const num = Number(token);
      if (!isNaN(num) && token !== "") {
        return { type: "literal" as const, value: num };
      }
      // String literal 'value'
      const strMatch = token.match(/^'(.*)'$/);
      if (strMatch) {
        return { type: "literal" as const, value: strMatch[1] };
      }
      // SQL functions or keywords like CURRENT_TIMESTAMP
      if (/CURRENT_TIMESTAMP/i.test(token)) {
        return { type: "literal" as const, value: new Date().toISOString() };
      }
      // NULL
      if (/^NULL$/i.test(token)) {
        return { type: "literal" as const, value: null };
      }
      // Default: treat as literal string
      return { type: "literal" as const, value: token };
    });
  }

  async execute(query: string, params: any[] = []): Promise<QueryResult> {
    const trimmed = query.trim();
    const upper = trimmed.toUpperCase();

    // Simple schema / table creation detection (noop for localstorage simulation)
    if (upper.startsWith("CREATE TABLE") || upper.startsWith("CREATE INDEX") || upper.startsWith("PRAGMA")
      || upper.startsWith("BEGIN") || upper.startsWith("COMMIT") || upper.startsWith("ROLLBACK")) {
      return { rowsAffected: 0 };
    }

    // ===================== INSERT =====================
    if (upper.startsWith("INSERT INTO")) {
      const hasOnConflict = /ON\s+CONFLICT/i.test(trimmed);
      const match = trimmed.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES/i);
      if (match) {
        const table = match[1];
        const cols = match[2].split(",").map((c) => c.trim().replace(/[`"]/g, ""));

        const tokens = this.parseValuesTokens(trimmed);
        const row: any = {};
        let paramIdx = 0;

        cols.forEach((col, colIdx) => {
          const token = tokens[colIdx];
          if (!token || token.type === "param") {
            row[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
            paramIdx++;
          } else {
            row[col] = token.value;
          }
        });

        // Set default timestamps if not explicitly provided
        const now = new Date().toISOString();
        if (row.created_at === undefined) {
          row.created_at = now;
        }
        if (row.updated_at === undefined) {
          row.updated_at = now;
        }

        const current = this.getTableData<any>(table);

        if (hasOnConflict) {
          const conflictMatch = trimmed.match(/ON\s+CONFLICT\s*\((\w+)\)/i);
          const conflictCol = conflictMatch ? conflictMatch[1] : cols[0];
          const existingIdx = current.findIndex((r) => r[conflictCol] === row[conflictCol]);

          if (existingIdx >= 0) {
            const updated = { ...current[existingIdx], ...row, updated_at: now };
            current[existingIdx] = updated;
          } else {
            current.push(row);
          }
        } else {
          current.push(row);
        }

        this.setTableData(table, current);
        return { rowsAffected: 1 };
      }
    }

    // ===================== UPDATE =====================
    if (upper.startsWith("UPDATE")) {
      const match = trimmed.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
      if (match) {
        const table = match[1];
        const whereClause = match[3]?.trim();
        const current = this.getTableData<any>(table);
        let updatedCount = 0;

        const setParts = match[2].split(",").map((s) => s.trim());
        const setOps: Array<{ col: string; useParam: boolean; literalValue?: any }> = [];

        for (const part of setParts) {
          const eqIdx = part.indexOf("=");
          if (eqIdx === -1) continue;
          const col = part.substring(0, eqIdx).trim();
          const valExpr = part.substring(eqIdx + 1).trim();

          if (valExpr === "?") {
            setOps.push({ col, useParam: true });
          } else if (/CURRENT_TIMESTAMP/i.test(valExpr)) {
            setOps.push({ col, useParam: false, literalValue: new Date().toISOString() });
          } else if (/^excluded\.\w+/i.test(valExpr)) {
            setOps.push({ col, useParam: false, literalValue: undefined });
          } else {
            const num = Number(valExpr);
            if (!isNaN(num) && valExpr !== "") {
              setOps.push({ col, useParam: false, literalValue: num });
            } else {
              setOps.push({ col, useParam: false, literalValue: valExpr.replace(/^'|'$/g, "") });
            }
          }
        }

        const paramOpsCount = setOps.filter((op) => op.useParam).length;
        const idParam = params[paramOpsCount];

        const updated = current.map((row) => {
          let matches = false;
          if (!whereClause) {
            matches = true;
          } else if (whereClause.includes("?")) {
            matches = (row.id === idParam || String(row.id) === String(idParam) || row.key === idParam);
          } else {
            // Literal where clause like "is_read = 0"
            const numMatch = whereClause.match(/(?:(\w+)\.)?(\w+)\s*=\s*(\d+)/);
            if (numMatch) {
              const col = numMatch[2];
              const val = Number(numMatch[3]);
              matches = (Number(row[col]) === val);
            } else {
              matches = true;
            }
          }

          if (matches) {
            updatedCount++;
            const newRow = { ...row };
            let pIdx = 0;
            for (const op of setOps) {
              if (op.useParam) {
                newRow[op.col] = params[pIdx];
                pIdx++;
              } else if (op.literalValue !== undefined) {
                newRow[op.col] = op.literalValue;
              }
            }
            newRow.updated_at = new Date().toISOString();
            return newRow;
          }
          return row;
        });

        this.setTableData(table, updated);
        return { rowsAffected: updatedCount };
      }
    }

    // ===================== DELETE =====================
    if (upper.startsWith("DELETE FROM")) {
      const match = trimmed.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+))?$/i);
      if (match) {
        const table = match[1];
        const idParam = params[0];
        const current = this.getTableData<any>(table);
        const filtered = current.filter((row) => row.id !== idParam && String(row.id) !== String(idParam) && row.key !== idParam);
        const affected = current.length - filtered.length;
        this.setTableData(table, filtered);
        return { rowsAffected: affected };
      }
    }

    return { rowsAffected: 1 };
  }

  /**
   * Finds the index of a keyword outside of any parentheses (depth 0).
   */
  private findDepthZeroKeyword(str: string, keyword: string): number {
    let depth = 0;
    const kw = keyword.toUpperCase();
    const upper = str.toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (depth === 0) {
        if (upper.substring(i).startsWith(kw)) {
          const prev = i > 0 ? str[i - 1] : " ";
          const next = str[i + kw.length] || " ";
          if (/\s/.test(prev) && /\s/.test(next)) {
            return i;
          }
        }
      }
    }
    return -1;
  }

  async select<T>(query: string, params: any[] = []): Promise<T> {
    const trimmed = query.trim();

    // 1. Locate the top-level FROM clause (depth 0, ignoring subqueries in SELECT)
    const fromIdx = this.findDepthZeroKeyword(trimmed, "FROM");
    if (fromIdx === -1) return [] as unknown as T;

    const selectClause = trimmed.substring(0, fromIdx).trim();
    const rest = trimmed.substring(fromIdx).trim();

    // 2. Extract primary table and alias: "FROM purchases p" or "FROM users"
    const fromMatch = rest.match(/^FROM\s+(\w+)(?:\s+(\w+))?/i);
    if (!fromMatch) return [] as unknown as T;

    const table = fromMatch[1];
    const mainAlias = fromMatch[2] || "";
    let data = [...this.getTableData<any>(table)];

    // 3. JOIN simulation (LEFT JOIN and plain JOIN)
    const joinRegex = /(?:LEFT\s+)?JOIN\s+(\w+)\s+(\w+)\s+ON\s+(?:(\w+)\.)?(\w+)\s*=\s*(?:(\w+)\.)?(\w+)/gi;
    let joinMatch;
    const joinedTableData: Array<{
      joinTable: string;
      joinAlias: string;
      joinCol: string;
      sourceCol: string;
      lookupMap: Map<any, any>;
    }> = [];

    while ((joinMatch = joinRegex.exec(rest)) !== null) {
      const joinTable = joinMatch[1];
      const joinAlias = joinMatch[2];
      const leftPrefix = joinMatch[3];
      const leftCol = joinMatch[4];
      const rightPrefix = joinMatch[5];
      const rightCol = joinMatch[6];

      let joinCol = rightCol;
      let sourceCol = leftCol;

      if (leftPrefix === joinAlias || (!leftPrefix && leftCol === "id")) {
        joinCol = leftCol;
        sourceCol = rightCol;
      }

      const jData = this.getTableData<any>(joinTable);
      const lookupMap = new Map<any, any>();
      for (const jRow of jData) {
        lookupMap.set(jRow[joinCol], jRow);
      }

      joinedTableData.push({
        joinTable,
        joinAlias,
        joinCol,
        sourceCol,
        lookupMap,
      });

      // Merge joined columns into main rows
      data = data.map((row) => {
        const joinedRow = lookupMap.get(row[sourceCol]);
        if (joinedRow) {
          const merged = { ...row };
          (merged as any)[`__joined_${joinAlias}`] = joinedRow;
          for (const [key, val] of Object.entries(joinedRow)) {
            if (!(key in merged)) {
              merged[key] = val;
            }
          }
          return merged;
        }
        return row;
      });
    }

    // 4. Resolve SELECT column aliases e.g. "s.name as supplier_name", "u.full_name as user_name"
    const aliasRegex = /(?:(\w+)\.)?(\w+)\s+as\s+(\w+)/gi;
    let aliasMatch;
    const explicitAliases: Array<{ prefix?: string; source: string; alias: string }> = [];
    while ((aliasMatch = aliasRegex.exec(selectClause)) !== null) {
      if (!aliasMatch[2].toLowerCase().includes("count") && !aliasMatch[2].toLowerCase().includes("sum")) {
        explicitAliases.push({
          prefix: aliasMatch[1],
          source: aliasMatch[2],
          alias: aliasMatch[3],
        });
      }
    }

    if (explicitAliases.length > 0) {
      data = data.map((row) => {
        const newRow = { ...row };
        for (const { prefix, source, alias } of explicitAliases) {
          if (prefix && (row as any)[`__joined_${prefix}`]) {
            newRow[alias] = (row as any)[`__joined_${prefix}`][source];
          } else if (source in newRow) {
            newRow[alias] = newRow[source];
          }
        }
        return newRow;
      });
    }

    // 5. Handle correlated subqueries in SELECT list: e.g. (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as items_count
    const subqueryCountRegex = /\(\s*SELECT\s+COUNT\(\*\)\s+FROM\s+(\w+)\s+WHERE\s+(?:(\w+)\.)?(\w+)\s*=\s*(?:(\w+)\.)?(\w+)\s*\)\s+as\s+(\w+)/gi;
    let subMatch;
    while ((subMatch = subqueryCountRegex.exec(selectClause)) !== null) {
      const subTable = subMatch[1];
      const subKey = subMatch[3];
      const parentKey = subMatch[5];
      const countAlias = subMatch[6];

      const subData = this.getTableData<any>(subTable);
      const countMap = new Map<any, number>();
      for (const item of subData) {
        const k = item[subKey];
        countMap.set(k, (countMap.get(k) || 0) + 1);
      }

      data = data.map((row) => {
        const val = countMap.get(row[parentKey]) || 0;
        return { ...row, [countAlias]: val };
      });
    }

    // Clean up internal __joined_* properties
    data = data.map((row) => {
      const cleaned = { ...row };
      for (const k of Object.keys(cleaned)) {
        if (k.startsWith("__joined_")) {
          delete cleaned[k];
        }
      }
      return cleaned;
    });

    // 6. WHERE filtering (evaluated at depth 0)
    const whereIdx = this.findDepthZeroKeyword(rest, "WHERE");
    if (whereIdx !== -1) {
      const afterWhere = rest.substring(whereIdx + 5).trim();
      const endWhereMarkers = ["ORDER BY", "GROUP BY", "LIMIT"].map((kw) => {
        const idx = this.findDepthZeroKeyword(afterWhere, kw);
        return idx !== -1 ? idx : Infinity;
      });
      const endWhereIdx = Math.min(...endWhereMarkers);
      const whereClause = endWhereIdx !== Infinity ? afterWhere.substring(0, endWhereIdx).trim() : afterWhere.trim();

      const conditions = whereClause.split(/\s+AND\s+/i).map((c) => c.trim());
      let paramIdx = 0;

      for (const cond of conditions) {
        // (p.barcode = ? OR p.sku = ?)
        const orMatch = cond.match(/^\(\s*(?:(\w+)\.)?(\w+)\s*=\s*\?\s+OR\s+(?:(\w+)\.)?(\w+)\s*=\s*\?\s*\)$/i);
        if (orMatch) {
          const col1 = orMatch[2];
          const col2 = orMatch[4];
          const val1 = params[paramIdx++];
          const val2 = params[paramIdx++];
          data = data.filter((r) => r[col1] === val1 || r[col2] === val2);
          continue;
        }

        // table.col = ? or col = ?
        const eqMatch = cond.match(/^(?:(\w+)\.)?(\w+)\s*=\s*\?$/);
        if (eqMatch) {
          const col = eqMatch[2];
          const val = params[paramIdx++];
          data = data.filter((r) => r[col] === val || String(r[col]) === String(val));
          continue;
        }

        // table.col = 1 or is_active = 1
        const litNumMatch = cond.match(/^(?:(\w+)\.)?(\w+)\s*=\s*(\d+)$/);
        if (litNumMatch) {
          const col = litNumMatch[2];
          const val = Number(litNumMatch[3]);
          data = data.filter((r) => Number(r[col]) === val);
          continue;
        }

        // table.col = 'value'
        const litStrMatch = cond.match(/^(?:(\w+)\.)?(\w+)\s*=\s*'([^']*)'$/);
        if (litStrMatch) {
          const col = litStrMatch[2];
          const val = litStrMatch[3];
          data = data.filter((r) => r[col] === val || String(r[col]) === val);
          continue;
        }

        // Range with param: table.col >= ?
        const rangeMatch = cond.match(/^(?:(\w+)\.)?(\w+)\s*(>=|<=|>|<)\s*\?$/);
        if (rangeMatch) {
          const col = rangeMatch[2];
          const op = rangeMatch[3];
          const val = params[paramIdx++];
          data = data.filter((r) => {
            const rv = r[col];
            if (op === ">=") return rv >= val;
            if (op === "<=") return rv <= val;
            if (op === ">") return rv > val;
            if (op === "<") return rv < val;
            return true;
          });
          continue;
        }

        // Column to column: p.current_stock <= p.minimum_stock
        const colToColMatch = cond.match(/^(?:(\w+)\.)?(\w+)\s*(<=|>=|<|>)\s*(?:(\w+)\.)?(\w+)$/);
        if (colToColMatch) {
          const leftCol = colToColMatch[2];
          const op = colToColMatch[3];
          const rightCol = colToColMatch[5];
          data = data.filter((r) => {
            const leftVal = Number(r[leftCol]);
            const rightVal = Number(r[rightCol]);
            if (op === "<=") return leftVal <= rightVal;
            if (op === ">=") return leftVal >= rightVal;
            if (op === "<") return leftVal < rightVal;
            if (op === ">") return leftVal > rightVal;
            return true;
          });
          continue;
        }
      }
    }

    // 7. Aggregate queries without GROUP BY:
    // e.g. "SELECT COUNT(*) as count FROM users"
    const countAllMatch = selectClause.match(/SELECT\s+COUNT\(\*\)\s+as\s+(\w+)\s*$/i);
    if (countAllMatch) {
      const alias = countAllMatch[1];
      return [{ [alias]: data.length }] as unknown as T;
    }

    // e.g. "SELECT SUM(amount) as total FROM expenses"
    const sumAllMatch = selectClause.match(/SELECT\s+SUM\((\w+)\)\s+as\s+(\w+)\s*$/i);
    if (sumAllMatch) {
      const col = sumAllMatch[1];
      const alias = sumAllMatch[2];
      const total = data.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
      return [{ [alias]: total }] as unknown as T;
    }

    // 8. GROUP BY handling (e.g. top selling products, sales report performance)
    const groupIdx = this.findDepthZeroKeyword(rest, "GROUP BY");
    if (groupIdx !== -1) {
      const afterGroup = rest.substring(groupIdx + 8).trim();
      const orderIdx = this.findDepthZeroKeyword(afterGroup, "ORDER BY");
      const limitIdx = this.findDepthZeroKeyword(afterGroup, "LIMIT");
      const endGroupIdx = Math.min(orderIdx !== -1 ? orderIdx : Infinity, limitIdx !== -1 ? limitIdx : Infinity);
      const groupCols = (endGroupIdx !== Infinity ? afterGroup.substring(0, endGroupIdx) : afterGroup)
        .split(",")
        .map((c) => c.trim().replace(/^(\w+)\./, ""));

      // Group rows
      const groups = new Map<string, any[]>();
      for (const r of data) {
        const key = groupCols.map((c) => String(r[c] ?? "")).join("___");
        const existing = groups.get(key) || [];
        existing.push(r);
        groups.set(key, existing);
      }

      // Aggregate each group
      const aggregated: any[] = [];
      for (const [, groupRows] of groups.entries()) {
        const base = { ...groupRows[0] };
        // Compute total_qty / qty
        const totalQty = groupRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
        // Compute total_rev / rev
        const totalRev = groupRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
        // Compute cost
        const cost = groupRows.reduce((acc, r) => acc + (Number(r.purchase_cost || 0) * (Number(r.quantity) || 0)), 0);

        aggregated.push({
          ...base,
          total_qty: totalQty,
          qty: totalQty,
          total_rev: totalRev,
          rev: totalRev,
          cost,
        });
      }
      data = aggregated;
    }

    // 9. ORDER BY (supports multi-column sort like "ORDER BY e.date DESC, e.created_at DESC")
    const orderIdx = this.findDepthZeroKeyword(rest, "ORDER BY");
    if (orderIdx !== -1) {
      const afterOrder = rest.substring(orderIdx + 8).trim();
      const limitIdx = this.findDepthZeroKeyword(afterOrder, "LIMIT");
      const orderClause = limitIdx !== -1 ? afterOrder.substring(0, limitIdx).trim() : afterOrder.trim();

      const sortSpecs = orderClause.split(",").map((s) => {
        const parts = s.trim().split(/\s+/);
        const col = parts[0].replace(/^(\w+)\./, "");
        const dir = (parts[1] || "ASC").toUpperCase();
        return { col, dir };
      });

      data.sort((a, b) => {
        for (const { col, dir } of sortSpecs) {
          const va = a[col] ?? "";
          const vb = b[col] ?? "";
          if (va < vb) return dir === "ASC" ? -1 : 1;
          if (va > vb) return dir === "ASC" ? 1 : -1;
        }
        return 0;
      });
    }

    // 10. LIMIT
    const limitIdx = this.findDepthZeroKeyword(rest, "LIMIT");
    if (limitIdx !== -1) {
      const limitMatch = rest.substring(limitIdx).match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        data = data.slice(0, Number(limitMatch[1]));
      }
    }

    return data as unknown as T;
  }

  async transaction<T>(callback: (tx: IDatabase) => Promise<T>): Promise<T> {
    return await callback(this);
  }
}

class TauriSqlDatabase implements IDatabase {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async execute(query: string, params: any[] = []): Promise<QueryResult> {
    const res = await this.db.execute(query, params);
    return {
      rowsAffected: res.rowsAffected || 1,
      lastInsertId: res.lastInsertId,
    };
  }

  async select<T>(query: string, params: any[] = []): Promise<T> {
    return await this.db.select(query, params);
  }

  async transaction<T>(callback: (tx: IDatabase) => Promise<T>): Promise<T> {
    await this.execute("BEGIN TRANSACTION;");
    try {
      const result = await callback(this);
      await this.execute("COMMIT;");
      return result;
    } catch (error) {
      await this.execute("ROLLBACK;");
      throw error;
    }
  }
}

let dbInstance: IDatabase | null = null;

export async function getDatabase(): Promise<IDatabase> {
  if (dbInstance) return dbInstance;

  if (isRunningInTauri()) {
    try {
      // Dynamic import to prevent bundler errors when not in desktop
      const DatabaseModule = await import("@tauri-apps/plugin-sql");
      const Database = DatabaseModule.default || DatabaseModule;
      const rawDb = await Database.load("sqlite:store.db");
      dbInstance = new TauriSqlDatabase(rawDb);
      console.log("✅ متصل بقاعدة بيانات SQLite عبر Tauri Plugin");
    } catch (e) {
      console.warn("تعذر الاتصال بـ Tauri SQL Plugin، استخدام المحول المحلي:", e);
      dbInstance = new LocalStorageDatabase();
    }
  } else {
    dbInstance = new LocalStorageDatabase();
    console.log("ℹ️ يعمل في المتصفح / وضع التطوير - استخدام محاكي التخزين المحلي");
  }

  await initDatabase(dbInstance);
  return dbInstance;
}

async function createTables(db: IDatabase): Promise<void> {
  // Create all tables if they don't exist
  const statements = [
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS features (id TEXT PRIMARY KEY, name_ar TEXT NOT NULL, description_ar TEXT, is_core INTEGER NOT NULL DEFAULT 0, is_enabled INTEGER NOT NULL DEFAULT 1, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, name_ar TEXT NOT NULL, description_ar TEXT, is_system INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS permissions (code TEXT PRIMARY KEY, name_ar TEXT NOT NULL, module TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS role_permissions (role_id TEXT NOT NULL, permission_code TEXT NOT NULL, PRIMARY KEY (role_id, permission_code))`,
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, password_hash TEXT NOT NULL, role_id TEXT NOT NULL, phone TEXT, is_active INTEGER NOT NULL DEFAULT 1, last_login_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, symbol TEXT NOT NULL, is_default INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE, barcode TEXT UNIQUE, category_id TEXT NOT NULL, unit_id TEXT NOT NULL, purchase_price REAL NOT NULL DEFAULT 0.0, selling_price REAL NOT NULL DEFAULT 0.0, minimum_stock REAL NOT NULL DEFAULT 5.0, maximum_stock REAL, current_stock REAL NOT NULL DEFAULT 0.0, description TEXT, notes TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, type TEXT NOT NULL, quantity REAL NOT NULL, before_quantity REAL NOT NULL, after_quantity REAL NOT NULL, reason TEXT, reference_type TEXT, reference_id TEXT, user_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, second_phone TEXT, address TEXT, email TEXT, balance REAL NOT NULL DEFAULT 0.0, notes TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS supplier_transactions (id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, before_balance REAL NOT NULL, after_balance REAL NOT NULL, reference_type TEXT, reference_id TEXT, notes TEXT, user_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, balance REAL NOT NULL DEFAULT 0.0, notes TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS customer_transactions (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, before_balance REAL NOT NULL, after_balance REAL NOT NULL, reference_type TEXT, reference_id TEXT, notes TEXT, user_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, customer_id TEXT, user_id TEXT NOT NULL, subtotal REAL NOT NULL DEFAULT 0.0, discount REAL NOT NULL DEFAULT 0.0, total REAL NOT NULL DEFAULT 0.0, payment_type TEXT NOT NULL DEFAULT 'CASH', paid_amount REAL NOT NULL DEFAULT 0.0, remaining_amount REAL NOT NULL DEFAULT 0.0, notes TEXT, status TEXT NOT NULL DEFAULT 'COMPLETED', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sale_items (id TEXT PRIMARY KEY, sale_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL, unit_price REAL NOT NULL, purchase_cost REAL NOT NULL DEFAULT 0.0, discount REAL NOT NULL DEFAULT 0.0, total REAL NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, supplier_id TEXT, user_id TEXT NOT NULL, subtotal REAL NOT NULL DEFAULT 0.0, discount REAL NOT NULL DEFAULT 0.0, total REAL NOT NULL DEFAULT 0.0, payment_type TEXT NOT NULL DEFAULT 'CASH', paid_amount REAL NOT NULL DEFAULT 0.0, remaining_amount REAL NOT NULL DEFAULT 0.0, notes TEXT, status TEXT NOT NULL DEFAULT 'COMPLETED', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS purchase_items (id TEXT PRIMARY KEY, purchase_id TEXT NOT NULL, product_id TEXT NOT NULL, quantity REAL NOT NULL, unit_price REAL NOT NULL, discount REAL NOT NULL DEFAULT 0.0, total REAL NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS expense_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, is_system INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL, description TEXT, user_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, reference_type TEXT, reference_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, description TEXT NOT NULL, metadata TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, filename TEXT NOT NULL, filepath TEXT NOT NULL, size_bytes INTEGER NOT NULL DEFAULT 0, backup_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'SUCCESS', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`,
    `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
    `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_stock_created ON stock_movements(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number)`,
    `CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`,
  ];

  for (const stmt of statements) {
    await db.execute(stmt);
  }
}

export async function initDatabase(db: IDatabase): Promise<void> {
  // Always create tables first (IF NOT EXISTS ensures idempotency)
  await createTables(db);

  // Check if system is initialized
  try {
    const existingFeatures = await db.select<any[]>("SELECT * FROM features");
    if (existingFeatures && existingFeatures.length > 0) {
      return; // Already initialized
    }
  } catch {
    // If select fails, proceed with seeding
  }

  console.log("⚙️ جاري تهيئة جداول قاعدة البيانات والبيانات الأولية...");

  // Seed Features
  for (const feat of INITIAL_FEATURES) {
    await db.execute(
      "INSERT INTO features (id, name_ar, description_ar, is_core, is_enabled) VALUES (?, ?, ?, ?, ?)",
      [feat.id, feat.name_ar, feat.description_ar, feat.is_core, feat.is_enabled]
    );
  }

  // Seed Roles
  for (const role of INITIAL_ROLES) {
    await db.execute(
      "INSERT INTO roles (id, name, name_ar, description_ar, is_system) VALUES (?, ?, ?, ?, ?)",
      [role.id, role.name, role.name_ar, role.description_ar, role.is_system]
    );
  }

  // Seed Permissions
  for (const perm of INITIAL_PERMISSIONS) {
    await db.execute(
      "INSERT INTO permissions (code, name_ar, module) VALUES (?, ?, ?)",
      [perm.code, perm.name_ar, perm.module]
    );
    // Assign all to Manager role
    await db.execute(
      "INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)",
      ["role-manager", perm.code]
    );
  }

  // Seed Units
  for (const unit of INITIAL_UNITS) {
    await db.execute(
      "INSERT INTO units (id, name, symbol, is_default) VALUES (?, ?, ?, ?)",
      [unit.id, unit.name, unit.symbol, unit.is_default]
    );
  }

  // Seed Expense Categories
  for (const expCat of INITIAL_EXPENSE_CATEGORIES) {
    await db.execute(
      "INSERT INTO expense_categories (id, name, is_system) VALUES (?, ?, ?)",
      [expCat.id, expCat.name, expCat.is_system]
    );
  }

  // Seed Categories
  for (const cat of INITIAL_CATEGORIES) {
    await db.execute(
      "INSERT INTO categories (id, name, description, is_active) VALUES (?, ?, ?, ?)",
      [cat.id, cat.name, cat.description, cat.is_active]
    );
  }

  // Seed Suppliers
  for (const sup of INITIAL_SUPPLIERS) {
    await db.execute(
      "INSERT INTO suppliers (id, name, phone, second_phone, address, email, balance, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [sup.id, sup.name, sup.phone, sup.second_phone, sup.address, sup.email, sup.balance, sup.notes, sup.is_active]
    );
  }

  // Seed Customers
  for (const cust of INITIAL_CUSTOMERS) {
    await db.execute(
      "INSERT INTO customers (id, name, phone, address, balance, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [cust.id, cust.name, cust.phone, cust.address, cust.balance, cust.notes, cust.is_active]
    );
  }

  // Seed Products and initial Stock Movements
  for (const prod of INITIAL_PRODUCTS) {
    await db.execute(
      "INSERT INTO products (id, name, sku, barcode, category_id, unit_id, purchase_price, selling_price, minimum_stock, maximum_stock, current_stock, description, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        prod.id,
        prod.name,
        prod.sku,
        prod.barcode,
        prod.category_id,
        prod.unit_id,
        prod.purchase_price,
        prod.selling_price,
        prod.minimum_stock,
        prod.maximum_stock,
        prod.current_stock,
        prod.description,
        prod.notes,
        prod.is_active,
      ]
    );

    // Record initial stock movement
    if (prod.current_stock > 0) {
      await db.execute(
        "INSERT INTO stock_movements (id, product_id, type, quantity, before_quantity, after_quantity, reason, reference_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          `mov-init-${prod.id}`,
          prod.id,
          "ADJUSTMENT_IN",
          prod.current_stock,
          0,
          prod.current_stock,
          "رصيد أول المدة الافتتاحي",
          "INITIAL",
          "user-admin",
        ]
      );
    }
  }

  // Seed default settings
  const defaultSettings = [
    { key: "store_name", value: "مخزن ومحلات الأمل للسيراميك والأدوات" },
    { key: "business_type", value: "سيراميك وبورسلين وأدوات صحية ومواد بناء" },
    { key: "phone", value: "01001234567" },
    { key: "address", value: "القاهرة، جمهورية مصر العربية" },
    { key: "currency", value: "ج.م" },
    { key: "allow_negative_stock", value: "false" },
    { key: "allow_credit_sales", value: "true" },
    { key: "default_minimum_stock", value: "5" },
    { key: "cost_calculation_method", value: "FIFO" },
    { key: "theme", value: "light" },
  ];

  for (const s of defaultSettings) {
    await db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", [s.key, s.value]);
  }

  console.log("✨ تم إكمال التهيئة الأولية لقاعدة البيانات بنجاح");
}
