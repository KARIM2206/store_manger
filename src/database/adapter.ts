// ==========================================================
// src/database/adapter.ts
// محول قاعدة البيانات - يعمل داخل Tauri وفي بيئة التطوير
// ==========================================================

export interface QueryResult {
  rowsAffected: number;
  lastInsertId?: number;
}

export interface IDatabase {
  execute(query: string, params?: any[]): Promise<QueryResult>;
  select<T>(query: string, params?: any[]): Promise<T>;
  transaction<T>(callback: (tx: IDatabase) => Promise<T>): Promise<T>;
}

export function isRunningInTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
