import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReservationCheckoutItemDetails } from "../ReservationCheckoutItemDetails";

const formatCurrency = (n: number) => `$${n}`;

const defaultItem = {
  name: "Evening Gown",
  sku: "SKU-001",
  size: "M",
  colors: ["Red", "Black"],
  imageUrl: "",
  unitPrice: 15000,
  startDate: "2026-02-17",
  endDate: "2026-02-20",
};

const noop = () => {};
const noopNum = (_n: number) => {};
const noopStr = (_s: string) => {};

const defaultExtraDaysProps = {
  showExtraDaysSection: false,
  applicableExtraDays: 0,
  extraDaysAmount: 0,
  extraDaysCount: 0,
  extraDayRate: 0,
  originalExtraDaysCount: 0,
  tempExtraDaysValue: "",
  onShowExtraDaysSection: noop,
  onTempExtraDaysValueChange: noopStr,
  onApplyExtraDays: noopNum,
  onCancelExtraDays: noop,
  onEditExtraDays: noop,
};

const defaultCancellationFeeProps = {
  cancellationFeeAmount: 0,
  originalCancellationFeeAmount: 0,
  showCancellationFeeSection: false,
  tempCancellationFeeValue: "",
  onCancellationFeeTempValueChange: noopStr,
  onApplyCancellationFee: noopNum,
  onRemoveCancellationFee: noop,
  onEditCancellationFee: noop,
  onCancelCancellationFeeEdit: noop,
};

function renderComponent(overrides: Record<string, any> = {}) {
  const props = {
    item: defaultItem,
    formatCurrency,
    ...defaultExtraDaysProps,
    ...defaultCancellationFeeProps,
    ...overrides,
  };
  return render(<ReservationCheckoutItemDetails {...props} />);
}

describe("ReservationCheckoutItemDetails", () => {
  it("should render Reservation Item heading", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: /reservation item/i })).toBeInTheDocument();
  });

  it("should display item name", () => {
    renderComponent();
    expect(screen.getByText("Evening Gown")).toBeInTheDocument();
  });

  it("should display formatted price", () => {
    renderComponent();
    expect(screen.getByText("$15000")).toBeInTheDocument();
  });

  it("should display size badge", () => {
    renderComponent();
    expect(screen.getByText("Size M")).toBeInTheDocument();
  });

  it("should display color badges", () => {
    renderComponent();
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Black")).toBeInTheDocument();
  });

  it("should display date range with Reserved label", () => {
    renderComponent();
    expect(screen.getByText(/Reserved:/)).toBeInTheDocument();
  });

  describe("Cancellation fee", () => {
    it("should not show cancellation fee section when amount is 0", () => {
      renderComponent({ cancellationFeeAmount: 0 });
      expect(screen.queryByText(/cancellation fee/i)).not.toBeInTheDocument();
    });

    it("should show cancellation fee with amount in display mode", () => {
      renderComponent({ cancellationFeeAmount: 10500, originalCancellationFeeAmount: 10500 });
      expect(screen.getByText(/cancellation fee/i)).toBeInTheDocument();
      expect(screen.getByText("+$10500")).toBeInTheDocument();
    });

    it("should show edit button in display mode that triggers edit callback", () => {
      const onEdit = vi.fn();
      renderComponent({
        cancellationFeeAmount: 10500,
        originalCancellationFeeAmount: 10500,
        onEditCancellationFee: onEdit,
      });
      const editButton = screen.getByTitle("Edit cancellation fee");
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalled();
    });

    it("should show editing form when showCancellationFeeSection is true", () => {
      renderComponent({
        cancellationFeeAmount: 10500,
        originalCancellationFeeAmount: 10500,
        showCancellationFeeSection: true,
        tempCancellationFeeValue: "10500",
      });
      expect(screen.getByText(/edit cancellation fee/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fee amount/i)).toBeInTheDocument();
    });

    it("should include cancellation fee in item total", () => {
      renderComponent({ cancellationFeeAmount: 5000, originalCancellationFeeAmount: 5000 });
      expect(screen.getByText("$20000")).toBeInTheDocument();
    });

    it("should call onRemoveCancellationFee when Remove is clicked in edit mode", () => {
      const onRemove = vi.fn();
      renderComponent({
        cancellationFeeAmount: 10500,
        originalCancellationFeeAmount: 10500,
        showCancellationFeeSection: true,
        tempCancellationFeeValue: "10500",
        onRemoveCancellationFee: onRemove,
      });
      fireEvent.click(screen.getByText("Remove"));
      expect(onRemove).toHaveBeenCalled();
    });

    it("should call onApplyCancellationFee with parsed amount when Apply is clicked", () => {
      const onApply = vi.fn();
      renderComponent({
        cancellationFeeAmount: 10500,
        originalCancellationFeeAmount: 10500,
        showCancellationFeeSection: true,
        tempCancellationFeeValue: "8000",
        onApplyCancellationFee: onApply,
      });
      fireEvent.click(screen.getByText("Apply"));
      expect(onApply).toHaveBeenCalledWith(8000);
    });
  });
});
