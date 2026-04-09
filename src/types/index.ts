export interface Transaction {
  id?: string;
  uploadId: string;
  userId: string;
  date: string; // ISO 8601: "2024-03-15"
  amount: number; // negative = expense, positive = income
  description: string;
  category: string;
  merchant?: string;
  rawData?: Record<string, string>;
}

export type Bank = "tinkoff" | "sber" | "alfa";

export type UploadStatus = "pending" | "done" | "error";

export interface Upload {
  id: string;
  userId: string;
  fileName: string;
  bank: Bank;
  rowCount?: number;
  status: UploadStatus;
  createdAt: string;
}

export const CATEGORIES = [
  "food_groceries",
  "food_restaurants",
  "transport_public",
  "transport_taxi",
  "transport_fuel",
  "housing_utilities",
  "housing_rent",
  "health_pharmacy",
  "health_services",
  "entertainment_streaming",
  "entertainment_leisure",
  "shopping_clothes",
  "shopping_electronics",
  "shopping_other",
  "education",
  "travel",
  "transfers",
  "income",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];
