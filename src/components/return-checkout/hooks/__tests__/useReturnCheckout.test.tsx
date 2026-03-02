import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useReturnCheckout } from "../useReturnCheckout";

const mockGetFunction = vi.fn();
const mockPostFunction = vi.fn();
vi.mock("../../../../shared/api/client", () => ({
  getFunction: (url: string) => mockGetFunction(url),
  postFunction: (url: string, body: unknown) => mockPostFunction(url, body),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number, public data?: unknown) {
      super(message);
      this.name = "ApiError";
    }
  },
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));
vi.mock("../../../../shared/hooks/useHolidays", () => ({
  useHolidays: () => ({ holidays: [] }),
}));
vi.mock("../../../../shared/hooks/useConfiguration", () => ({
  useConfiguration: () => ({
    config: { rentalDays: 3, extraDaysPrice: 75 },
  }),
}));

describe("useReturnCheckout", () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have null returnDetails and loading false when closed", () => {
    const { result } = renderHook(() =>
      useReturnCheckout({
        open: false,
        rentalItemId: null,
        onConfirm,
        onClose,
      })
    );
    expect(result.current.returnDetails).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should fetch return details when open and rentalItemId set", async () => {
    const mockDetails = {
      rentalItemId: "ri-1",
      rentalId: "r-1",
      itemId: "i-1",
      item: {
        name: "Dress",
        sku: "SKU",
        category: "Formal",
        subcategory: "Gown",
        brand: "B",
        size: "M",
        colors: ["red"],
        description: "",
        imageUrl: "",
        unitPrice: 10000,
        startDate: "2026-02-17",
        endDate: "2026-02-20",
      },
      customer: { id: "c-1", name: "Customer", phone: "", email: "" },
      financials: {
        rentalSubtotal: 10000,
        extraDaysTotal: 0,
        discountAmount: 0,
        lateFeesTotal: 0,
        depositsTotal: 0,
        grandTotal: 10000,
        paymentsTotal: 0,
        balanceDue: 10000,
        itemCount: 1,
        discountPercent: 0,
      },
      lateFeeConfig: {
        lateDaysPricePct: 10,
        configRentalDays: 3,
        standardDayPrice: 3333,
        lateDayRate: 333,
        suggestedLateDays: 0,
        suggestedLateFee: 0,
        existingLateDays: 0,
        existingLateFee: 0,
      },
      extraDaysInfo: {
        extraDaysCount: 0,
        extraDaysAmount: 0,
        extraDaysPricePct: 75,
        rentalPeriodDays: 3,
        basePrice: 10000,
      },
      itemFinancials: {
        subtotal: 10000,
        extraDaysAmount: 0,
        lateFee: 0,
        discountAmount: 0,
        grandTotal: 10000,
        paymentsTotal: 0,
        balanceDue: 10000,
      },
      orderItems: [],
    };

    mockGetFunction.mockImplementation((url: string) => {
      if (url.includes("return-details")) return Promise.resolve(mockDetails);
      if (url === "payment-methods") return Promise.resolve({ paymentMethods: [] });
      if (url === "drawer/current") return Promise.resolve({ drawer: null });
      if (url.includes("customers/")) return Promise.resolve({ customer: { credit_balance: "0" } });
      return Promise.resolve({});
    });

    const { result } = renderHook(() =>
      useReturnCheckout({
        open: true,
        rentalItemId: "ri-1",
        onConfirm,
        onClose,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.returnDetails).not.toBeNull();
    expect(result.current.returnDetails?.item.name).toBe("Dress");
  });
});
