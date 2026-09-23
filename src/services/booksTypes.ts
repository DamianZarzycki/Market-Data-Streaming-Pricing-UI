import type { AssetClass } from "@/domain/types";

export interface BooksBookDto {
  book_id: string;
  name: string;
  description?: string | null;
  expected_asset_class: AssetClass;
  is_active: boolean;
}

export interface BooksListResponse {
  books: BooksBookDto[];
}

export interface CreateBookPayload {
  name: string;
  expected_asset_class: string;
  description?: string;
}

export interface UpdateBookPayload {
  name?: string;
  expected_asset_class?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateBooksResponse {
  message?: string;
  book_ids?: string[];
  error?: string;
}

export const BOOK_ASSET_CLASSES: AssetClass[] = [
  "EQUITY",
  "FX",
  "OPTION",
  "IRS",
  "BOND",
  "FUTURES",
];
