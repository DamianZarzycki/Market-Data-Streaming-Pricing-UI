import type { Book } from "@/domain/types";
import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import type {
  BooksBookDto,
  BooksListResponse,
  CreateBookPayload,
  CreateBooksResponse,
  UpdateBookPayload,
} from "@/services/booksTypes";

function mapBookDto(dto: BooksBookDto): Book {
  return {
    book_id: dto.book_id,
    name: dto.name,
    description: dto.description ?? null,
    expected_asset_class: dto.expected_asset_class,
    is_active: Boolean(dto.is_active),
  };
}

export async function listBooks(): Promise<Book[]> {
  const data = await apiClient.get<BooksListResponse>(endpoints.books.list);
  return (data.books ?? []).map(mapBookDto);
}

export async function getBook(bookId: string): Promise<Book> {
  const data = await apiClient.get<BooksBookDto>(endpoints.books.byId(bookId));
  return mapBookDto(data);
}

export async function createBook(
  payload: CreateBookPayload,
): Promise<CreateBooksResponse> {
  return apiClient.post<CreateBooksResponse>(endpoints.books.create, payload);
}

export async function updateBook(
  bookId: string,
  payload: UpdateBookPayload,
): Promise<{ message?: string }> {
  return apiClient.put(endpoints.books.update(bookId), payload);
}

export async function deleteBook(
  bookId: string,
): Promise<{ message?: string }> {
  return apiClient.delete(endpoints.books.remove(bookId));
}
