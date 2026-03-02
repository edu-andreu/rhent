/**
 * Phase 6: Integration tests for Add Dress dialog workflow.
 * Tests open -> load lists -> validation -> cancel/success with mocked API.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test/utils/renderWithProviders";
import { AddDressDialog } from "../../AddDressDialog";

const { mockGetFunction, mockPostFunction, mockPutFunction, mockToast } = vi.hoisted(() => ({
  mockGetFunction: vi.fn(),
  mockPostFunction: vi.fn(),
  mockPutFunction: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../shared/api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  postFunction: (url: string, body?: unknown) => mockPostFunction(url, body),
  putFunction: (url: string, body?: unknown) => mockPutFunction(url, body),
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
  buildStorageUrl: (_: string, path: string) => `https://storage.example.com/${path}`,
}));

const listResponse = (key: string, items: Array<{ id: string; [k: string]: string }>) =>
  ({ [key]: items });

describe("AddDressDialog integration", () => {
  const onClose = vi.fn();
  const onAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFunction.mockImplementation((url: string) => {
      if (url === "categories") return Promise.resolve(listResponse("categories", [{ id: "c1", category: "Formal" }]));
      if (url === "subcategories") return Promise.resolve(listResponse("subcategories", [{ id: "s1", subcategory: "Gown" }]));
      if (url === "brands") return Promise.resolve(listResponse("brands", [{ id: "b1", brand: "Brand" }]));
      if (url === "sizes") return Promise.resolve(listResponse("sizes", [{ id: "sz1", size: "M" }]));
      if (url === "names") return Promise.resolve(listResponse("names", [{ id: "n1", name: "Dress" }]));
      if (url === "statuses") return Promise.resolve(listResponse("statuses", [{ id: "loc1", location: "On" }]));
      if (url === "colors") return Promise.resolve(listResponse("colors", [{ id: "col1", color: "Red" }]));
      return Promise.resolve({});
    });
  });

  it("should open dialog, load lists, and show form", async () => {
    render(<AddDressDialog open={true} onClose={onClose} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByText("Sale Type")).toBeInTheDocument();
    });

    expect(screen.getByText("Add New Item")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", async () => {
    render(<AddDressDialog open={true} onClose={onClose} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should show validation error when submitting empty form", async () => {
    render(<AddDressDialog open={true} onClose={onClose} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringMatching(/required fields|fill in/)
      );
    });

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("should not call onAdd when validation fails", async () => {
    render(<AddDressDialog open={true} onClose={onClose} onAdd={onAdd} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add item/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
    expect(onAdd).not.toHaveBeenCalled();
    expect(mockPostFunction).not.toHaveBeenCalled();
  });
});
