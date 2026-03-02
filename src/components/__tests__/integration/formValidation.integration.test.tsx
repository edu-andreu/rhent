/**
 * Phase 6: Form validation integration tests.
 * Tests validation error states and required-field messaging in dialogs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test/utils/renderWithProviders";
import { AddDressDialog } from "../../AddDressDialog";

const { mockGetFunction, mockPostFunction, mockToast } = vi.hoisted(() => ({
  mockGetFunction: vi.fn(),
  mockPostFunction: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../shared/api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  postFunction: (url: string, body?: unknown) => mockPostFunction(url, body),
  putFunction: vi.fn(),
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Error"),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public data?: unknown
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
}));

vi.mock("sonner@2.0.3", () => ({
  toast: mockToast,
}));

vi.mock("../../../shared/config/env", () => ({
  buildStorageUrl: () => "https://storage.example.com/",
}));

const listResponse = (key: string, items: Array<Record<string, string>>) => ({ [key]: items });

describe("Form validation (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFunction.mockImplementation((url: string) => {
      if (url === "categories") return Promise.resolve(listResponse("categories", [{ id: "c1", category: "Formal" }]));
      if (url === "subcategories") return Promise.resolve(listResponse("subcategories", [{ id: "s1", subcategory: "Gown" }]));
      if (url === "brands") return Promise.resolve(listResponse("brands", [{ id: "b1", brand: "B" }]));
      if (url === "sizes") return Promise.resolve(listResponse("sizes", [{ id: "sz1", size: "M" }]));
      if (url === "names") return Promise.resolve(listResponse("names", [{ id: "n1", name: "Dress" }]));
      if (url === "statuses") return Promise.resolve(listResponse("statuses", [{ id: "loc1", location: "On" }]));
      if (url === "colors") return Promise.resolve(listResponse("colors", [{ id: "col1", color: "Red" }]));
      return Promise.resolve({});
    });
  });

  it("AddDressDialog shows toast with required field names when submit with empty form", async () => {
    render(
      <AddDressDialog open={true} onClose={vi.fn()} onAdd={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/Category|required fields|fill in/i)
      );
    });
  });

  it("AddDressDialog does not call API when validation fails", async () => {
    render(
      <AddDressDialog open={true} onClose={vi.fn()} onAdd={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });

    expect(mockPostFunction).not.toHaveBeenCalled();
  });
});
