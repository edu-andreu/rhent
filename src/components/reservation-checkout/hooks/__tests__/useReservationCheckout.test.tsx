import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useReservationCheckout } from "../useReservationCheckout";

const mockGetFunction = vi.fn();
const mockPostFunction = vi.fn();
const mockToastError = vi.fn();
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
vi.mock("sonner@2.0.3", () => ({
  toast: { error: (msg: string) => mockToastError(msg) },
}));
vi.mock("../../../../shared/hooks/useHolidays", () => ({
  useHolidays: () => ({ holidays: [] }),
}));
vi.mock("../../../../shared/hooks/useConfiguration", () => ({
  useConfiguration: () => ({
    config: {
      rentalDays: 3,
      extraDaysPrice: 75,
      blockPrevDays: 4,
      blockNextDays: 1,
    },
  }),
}));

describe("useReservationCheckout", () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have null details and loading false when closed", () => {
    const { result } = renderHook(() =>
      useReservationCheckout({
        open: false,
        rentalItemId: null,
        onConfirm,
        onClose,
      })
    );
    expect(result.current.details).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should fetch details when open and rentalItemId set", async () => {
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
        depositsTotal: 0,
        grandTotal: 10000,
        paymentsTotal: 0,
        balanceDue: 10000,
        itemCount: 1,
        discountPercent: 0,
        otherItemsTotal: 0,
        otherItemsMinimum: 0,
      },
      config: { rentDownPaymentPct: 50, reservationDownPaymentPct: 30 },
      orderItems: [],
    };

    mockGetFunction.mockImplementation((url: string) => {
      if (url.includes("checkout-details")) return Promise.resolve(mockDetails);
      if (url === "payment-methods") return Promise.resolve({ paymentMethods: [] });
      if (url === "drawer/current") return Promise.resolve({ drawer: null });
      if (url.includes("customers/")) return Promise.resolve({ customer: { credit_balance: "0" } });
      return Promise.reject(new Error("Unknown URL"));
    });

    const { result } = renderHook(() =>
      useReservationCheckout({
        open: true,
        rentalItemId: "ri-1",
        onConfirm,
        onClose,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.details).not.toBeNull();
    expect(result.current.details?.item.name).toBe("Dress");
  });

  it("should set drawer alert when drawerError prop is provided", async () => {
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
        depositsTotal: 0,
        grandTotal: 10000,
        paymentsTotal: 0,
        balanceDue: 10000,
        itemCount: 1,
        discountPercent: 0,
        otherItemsTotal: 0,
        otherItemsMinimum: 0,
      },
      config: { rentDownPaymentPct: 50, reservationDownPaymentPct: 30 },
      orderItems: [],
    };
    mockGetFunction.mockImplementation((url: string) => {
      if (url.includes("checkout-details")) return Promise.resolve(mockDetails);
      if (url === "payment-methods") return Promise.resolve({ paymentMethods: [] });
      if (url === "drawer/current") return Promise.resolve({ drawer: null });
      if (url.includes("customers/")) return Promise.resolve({ customer: { credit_balance: "0" } });
      return Promise.resolve({});
    });

    const { result, rerender } = renderHook(
      ({ drawerError }) =>
        useReservationCheckout({
          open: true,
          rentalItemId: "ri-1",
          drawerError,
          onConfirm,
          onClose,
        }),
      { initialProps: { drawerError: null as string | null } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ drawerError: "Cash drawer must be open" });
    await waitFor(() => {
      expect(result.current.showDrawerAlert).toBe(true);
      expect(result.current.drawerAlertMessage).toBe("Cash drawer must be open");
    });
  });
});
