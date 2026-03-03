/**
 * Phase 6: Integration tests for Reservation Checkout dialog workflow.
 * Tests open -> load details -> display -> cancel with mocked API.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "../../../test/utils/renderWithProviders";
import { ReservationCheckoutDialog } from "../../ReservationCheckoutDialog";

const { mockGetFunction, mockPostFunction, mockToast } = vi.hoisted(() => ({
  mockGetFunction: vi.fn(),
  mockPostFunction: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../shared/api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  postFunction: (url: string, body?: unknown) => mockPostFunction(url, body),
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

const mockDetails = {
  rentalItemId: "ri-1",
  rentalId: "r-1",
  itemId: "i-1",
  item: {
    name: "Evening Gown",
    sku: "SKU-1",
    category: "Formal",
    subcategory: "Gown",
    brand: "B",
    size: "M",
    colors: ["Red"],
    description: "",
    imageUrl: "",
    unitPrice: 15000,
    startDate: "2026-02-17",
    endDate: "2026-02-20",
  },
  customer: { id: "c-1", name: "Jane Doe", phone: "+54 11 1234", email: "j@e.com" },
  financials: {
    rentalSubtotal: 15000,
    extraDaysTotal: 0,
    discountAmount: 0,
    depositsTotal: 0,
    grandTotal: 15000,
    paymentsTotal: 0,
    thisItemPaymentsTotal: 0,
    balanceDue: 15000,
    itemCount: 1,
    discountPercent: 0,
    otherItemsTotal: 0,
    otherItemsMinimum: 0,
  },
  config: { rentDownPaymentPct: 50, reservationDownPaymentPct: 30 },
  extraDaysInfo: { extraDaysCount: 0, extraDaysAmount: 0, extraDaysPricePct: 75, rentalPeriodDays: 3, basePrice: 15000 },
  orderItems: [],
};

describe("ReservationCheckoutDialog integration", () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFunction.mockImplementation((url: string) => {
      if (url.includes("checkout-details")) return Promise.resolve(mockDetails);
      if (url === "payment-methods") return Promise.resolve({ paymentMethods: [{ id: "pm-1", payment_method: "Cash", payment_user_enabled: 1 }] });
      if (url === "drawer/current") return Promise.resolve({ drawer: { status: "open" } });
      if (url.includes("customers/")) return Promise.resolve({ customer: { credit_balance: "0" } });
      if (url === "holidays") return Promise.resolve({ holidays: [] });
      if (url === "get-configuration") return Promise.resolve({ config: { rentalDays: 3, extraDaysPrice: 75 } });
      return Promise.resolve({});
    });
  });

  it("should open dialog, fetch details, and show reservation summary", async () => {
    render(
      <ReservationCheckoutDialog
        open={true}
        rentalItemId="ri-1"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Evening Gown")).toBeInTheDocument();
    });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Checkout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should call onClose when Cancel is clicked", async () => {
    render(
      <ReservationCheckoutDialog
        open={true}
        rentalItemId="ri-1"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Evening Gown")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("should show failed to load when checkout-details request fails", async () => {
    mockGetFunction.mockImplementation((url: string) => {
      if (url.includes("checkout-details")) return Promise.reject(new Error("Network error"));
      if (url === "payment-methods") return Promise.resolve({ paymentMethods: [] });
      if (url === "drawer/current") return Promise.resolve({ drawer: null });
      if (url === "holidays") return Promise.resolve({ holidays: [] });
      if (url === "get-configuration") return Promise.resolve({ config: {} });
      return Promise.resolve({});
    });

    render(
      <ReservationCheckoutDialog
        open={true}
        rentalItemId="ri-1"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load reservation details/i)).toBeInTheDocument();
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
