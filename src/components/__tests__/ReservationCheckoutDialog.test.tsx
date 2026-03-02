import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../test/utils/renderWithProviders";
import { ReservationCheckoutDialog } from "../ReservationCheckoutDialog";

const mockOnClose = vi.fn();
const mockOnConfirm = vi.fn();

vi.mock("../reservation-checkout/hooks/useReservationCheckout", () => ({
  useReservationCheckout: vi.fn(),
}));

import { useReservationCheckout } from "../reservation-checkout/hooks/useReservationCheckout";

const defaultHookReturn = {
  details: null,
  loading: false,
  processing: false,
  formatCurrency: (n: number) => `$${n}`,
  hasBalance: false,
  hasSurplus: false,
  allocatedTotal: 0,
  canConfirm: false,
  handleClose: vi.fn(),
  creditApplied: 0,
  itemBasePrice: 0,
  showExtraDaysSection: false,
  applicableExtraDays: 0,
  extraDaysAmount: 0,
  extraDaysCount: 0,
  extraDayRate: 0,
  originalExtraDaysCount: 0,
  tempExtraDaysValue: "",
  setTempExtraDaysValue: vi.fn(),
  setShowExtraDaysSection: vi.fn(),
  setExtraDaysOverride: vi.fn(),
  showDiscountSection: false,
  discountType: "percentage",
  discountValue: 0,
  discountReason: "",
  tempDiscountValue: "",
  tempDiscountReason: "",
  setShowDiscountSection: vi.fn(),
  setDiscountType: vi.fn(),
  setDiscountValue: vi.fn(),
  setTempDiscountValue: vi.fn(),
  setTempDiscountReason: vi.fn(),
  handleRemoveDiscount: vi.fn(),
  handleApplyDiscount: vi.fn(),
  handleCancelDiscount: vi.fn(),
  showSurplusSection: false,
  surplusHandling: "credit",
  refundMethodId: "",
  setSurplusHandling: vi.fn(),
  setRefundMethodId: vi.fn(),
  paymentMethods: [],
  paymentAllocations: [],
  togglePaymentMethod: vi.fn(),
  updatePaymentAmount: vi.fn(),
  balanceDue: 0,
  minimumRequired: 0,
  remainingAmount: 0,
  handleConfirm: vi.fn(),
  drawerStatus: "closed",
  showDrawerAlert: false,
  drawerAlertMessage: "",
  setShowDrawerAlert: vi.fn(),
};

describe("ReservationCheckoutDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReservationCheckout).mockReturnValue(defaultHookReturn as ReturnType<typeof useReservationCheckout>);
  });

  it("should render dialog with Checkout title when open", () => {
    render(
      <ReservationCheckoutDialog
        open={true}
        rentalItemId={null}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );
    expect(screen.getByRole("dialog", { name: /checkout/i })).toBeInTheDocument();
    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });

  it("should show loading state when hook returns loading true", () => {
    vi.mocked(useReservationCheckout).mockReturnValue({
      ...defaultHookReturn,
      loading: true,
      details: null,
    } as ReturnType<typeof useReservationCheckout>);
    render(
      <ReservationCheckoutDialog
        open={true}
        rentalItemId="ri-1"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );
    expect(screen.queryByText(/failed to load reservation details/i)).not.toBeInTheDocument();
    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });

  it("should show failed to load when details is null and not loading", () => {
    render(
      <ReservationCheckoutDialog
        open={true}
        rentalItemId="ri-1"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );
    expect(screen.getByText(/failed to load reservation details/i)).toBeInTheDocument();
  });
});
