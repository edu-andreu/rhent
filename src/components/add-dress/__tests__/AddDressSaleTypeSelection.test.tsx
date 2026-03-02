import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddDressSaleTypeSelection } from "../AddDressSaleTypeSelection";

describe("AddDressSaleTypeSelection", () => {
  it("should render Sale Type label and three options", () => {
    const onSaleTypeChange = vi.fn();
    render(
      <AddDressSaleTypeSelection saleType="rent" onSaleTypeChange={onSaleTypeChange} />
    );
    expect(screen.getByText("Sale Type")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^rent$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sale \(product\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sale \(service\)/i })).toBeInTheDocument();
  });

  it("should call onSaleTypeChange with product when clicking Sale (Product)", () => {
    const onSaleTypeChange = vi.fn();
    render(
      <AddDressSaleTypeSelection saleType="rent" onSaleTypeChange={onSaleTypeChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /sale \(product\)/i }));
    expect(onSaleTypeChange).toHaveBeenCalledWith("product");
  });

  it("should call onSaleTypeChange with service when clicking Sale (Service)", () => {
    const onSaleTypeChange = vi.fn();
    render(
      <AddDressSaleTypeSelection saleType="rent" onSaleTypeChange={onSaleTypeChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /sale \(service\)/i }));
    expect(onSaleTypeChange).toHaveBeenCalledWith("service");
  });

  it("should show rent description when saleType is rent", () => {
    render(
      <AddDressSaleTypeSelection saleType="rent" onSaleTypeChange={vi.fn()} />
    );
    expect(screen.getByText(/Standard rental item/)).toBeInTheDocument();
  });
});
