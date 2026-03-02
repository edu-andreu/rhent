import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAddDressForm } from "../useAddDressForm";

const mockGetFunction = vi.fn();
const mockPostFunction = vi.fn();
const mockPutFunction = vi.fn();
vi.mock("../../../../shared/api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  postFunction: (url: string, body?: unknown) => mockPostFunction(url, body),
  putFunction: (url: string, body?: unknown) => mockPutFunction(url, body),
}));
vi.mock("../../../../shared/config/env", () => ({
  buildStorageUrl: (bucket: string, path: string) => `https://storage.example.com/${bucket}/${path}`,
}));
vi.mock("../../../../shared/utils/errorHandler", () => ({
  handleApiError: vi.fn(),
}));

describe("useAddDressForm", () => {
  const onAdd = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFunction.mockImplementation((url: string) => {
      const key = url === "categories" ? "categories" : url === "subcategories" ? "subcategories" : url === "brands" ? "brands" : url === "sizes" ? "sizes" : url === "names" ? "names" : url === "statuses" ? "statuses" : null;
      return Promise.resolve(key ? { [key]: [] } : {});
    });
  });

  it("should initialize with default form state", () => {
    const { result } = renderHook(() =>
      useAddDressForm({
        open: false,
        onAdd,
        onClose,
      })
    );
    expect(result.current.formData.name).toBe("");
    expect(result.current.formData.categoryId).toBe("");
    expect(result.current.addMode).toBe("variant");
    expect(result.current.saleType).toBe("rent");
    expect(result.current.loading).toBe(false);
  });

  it("should fetch lists when open", async () => {
    mockGetFunction.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useAddDressForm({
        open: true,
        onAdd,
        onClose,
      })
    );

    await waitFor(() => {
      expect(mockGetFunction).toHaveBeenCalled();
    });
    expect(result.current.categories).toEqual([]);
    expect(result.current.brands).toEqual([]);
  });
});
