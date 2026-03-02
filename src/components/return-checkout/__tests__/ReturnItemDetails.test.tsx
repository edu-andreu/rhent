import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReturnItemDetails } from "../ReturnItemDetails";

const defaultItem = {
  name: "Summer Dress",
  size: "S",
  startDate: "2026-02-17",
  endDate: "2026-02-20",
  unitPrice: 8000,
};

const defaultProps = {
  item: defaultItem,
  subtotal: 8000,
  extraDays: {
    showSection: false,
    applicableDays: 0,
    amount: 0,
    count: 0,
    rate: 0,
    originalCount: 0,
    tempValue: "",
    onShow: () => {},
    onTempChange: () => {},
    onApply: () => {},
    onCancel: () => {},
  },
  lateFee: {
    applied: false,
    days: 0,
    amount: 0,
    applicableDays: 0,
    rate: 0,
    pricePct: 75,
    showSection: false,
    tempDays: "",
    onShow: () => {},
    onTempChange: () => {},
    onApply: () => {},
    onCancel: () => {},
    onEdit: () => {},
    onRemove: () => {},
    onShowConfirm: () => {},
  },
};

describe("ReturnItemDetails", () => {
  it("should render Returning Item heading", () => {
    render(<ReturnItemDetails {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /returning item/i })).toBeInTheDocument();
  });

  it("should display item name", () => {
    render(<ReturnItemDetails {...defaultProps} />);
    expect(screen.getByText("Summer Dress")).toBeInTheDocument();
  });

  it("should display size badge when size is provided", () => {
    render(<ReturnItemDetails {...defaultProps} />);
    expect(screen.getByText("Size S")).toBeInTheDocument();
  });

  it("should display rented date range", () => {
    render(<ReturnItemDetails {...defaultProps} />);
    expect(screen.getByText(/Rented:/)).toBeInTheDocument();
  });

  it("should display formatted unit price", () => {
    render(<ReturnItemDetails {...defaultProps} />);
    expect(screen.getAllByText(/8\.?000|8,?000/).length).toBeGreaterThanOrEqual(1);
  });

  it("should show late day hint when suggestedLateDays is provided and no fee applied", () => {
    render(
      <ReturnItemDetails
        {...defaultProps}
        lateFee={{
          ...defaultProps.lateFee,
          suggestedDays: 2,
          applicableDays: 2,
        }}
      />
    );
    expect(screen.getByText(/2 days late/)).toBeInTheDocument();
  });
});
