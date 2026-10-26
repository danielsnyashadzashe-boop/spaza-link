import type { BulkRule, DocumentType, OrderStatus, StockBand, CreditHealth } from "./rules";

export type Product = {
  id: string;
  name: string;
  unit: string;
  category: string;
  price: number;
  bulkRule: BulkRule | null;
  badges: string[];
  supplier: { id: string; name: string; region: string; badges: string[] };
};

export type StockItem = {
  id: string;
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  fullCapacity: number;
  ratio: number;
  band: StockBand;
  updatedAt: string;
  product: Product | null;
};

export type ComplianceDocument = {
  id: string;
  type: DocumentType;
  label: string;
  filename: string;
  size: number;
  mime: string;
  uploadedAt: string;
};

export type Compliance = { score: number; profileComplete: boolean; documents: ComplianceDocument[] };

export type Shop = { id: string; name: string; ownerName: string; location: string; phone: string; createdAt: string };

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: { name: string; unit: string; supplierName: string; quantity: number; unitPrice: number; discount: number; lineTotal: number }[];
  timeline: { status: OrderStatus; at: string | null }[];
  payment: { status: "PAID" | "PENDING"; paidOnTime: boolean | null; paidAt: string | null } | null;
};

export type Financials = {
  monthly: { month: string; key: string; total: number; orders: number }[];
  scorecard: {
    totalSpent: number;
    totalSaved: number;
    orderCount: number;
    paymentsSettled: number;
    paymentsOnTime: number;
    paymentsPending: number;
    onTimeRate: number | null;
    activeMonths: number;
    averageMonthlySpend: number;
    creditScore: number;
    creditHealth: CreditHealth;
  };
};
