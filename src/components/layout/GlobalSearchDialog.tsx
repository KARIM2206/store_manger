// ==========================================================
// src/components/layout/GlobalSearchDialog.tsx
// شاشة البحث الشامل السريع (Ctrl + K)
// ==========================================================

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Users, ArrowRight, X } from "lucide-react";
import { productRepository } from "@/database/repositories/productRepository";
import { customerRepository } from "@/database/repositories/customerRepository";
import { ProductRow, CustomerRow } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (open) {
      setQuery("");
      productRepository.getAll().then(setProducts).catch(console.error);
      customerRepository.getAll().then(setCustomers).catch(console.error);
    }
  }, [open]);

  if (!open) return null;

  const trimmed = query.trim().toLowerCase();

  const filteredProducts = trimmed
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          (p.sku && p.sku.toLowerCase().includes(trimmed)) ||
          (p.barcode && p.barcode.includes(trimmed))
      )
    : [];

  const filteredCustomers = trimmed
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          (c.phone && c.phone.includes(trimmed))
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 animate-in fade-in-0">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-xl rounded-lg border border-border bg-card p-4 shadow-xl text-right z-10 animate-in zoom-in-95">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب للبحث عن منتج، كود، باركود، أو عميل..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none text-right"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="mt-3 max-h-80 overflow-y-auto space-y-3">
          {!query && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              ابحث بالاسم، الكود (SKU)، الباركود، أو رقم هاتف العميل.
            </div>
          )}

          {query && filteredProducts.length === 0 && filteredCustomers.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              لا توجد نتائج مطابقة لـ "{query}"
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1">
                المنتجات ({filteredProducts.length})
              </div>
              <div className="space-y-1">
                {filteredProducts.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/products?id=${p.id}`);
                    }}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          كود: {p.sku || "بدون"} | المخزون: {p.current_stock}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(p.selling_price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredCustomers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1">
                العملاء ({filteredCustomers.length})
              </div>
              <div className="space-y-1">
                {filteredCustomers.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/customers?id=${c.id}`);
                    }}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-info" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone || "بدون هاتف"}</p>
                      </div>
                    </div>
                    {c.balance > 0 && (
                      <span className="text-xs text-danger font-semibold">
                        مديونية: {formatCurrency(c.balance)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-border flex justify-between items-center text-[11px] text-muted-foreground">
          <span>اضغط Esc للإغلاق</span>
          <div className="flex items-center gap-1">
            <span>انتقال سريع</span>
            <ArrowRight className="h-3 w-3 rotate-180" />
          </div>
        </div>
      </div>
    </div>
  );
}
