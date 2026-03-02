import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("ReservationCheckoutItemDetails", () => {
  it("should render Reservation Item heading", () => {
    render(
      <ReservationCheckoutItemDetails item={defaultItem} formatCurrency={formatCurrency} />
    );
    expect(screen.getByRole("heading", { name: /reservation item/i })).toBeInTheDocument();
  });

  it("should display item name", () => {
    render(
      <ReservationCheckoutItemDetails item={defaultItem} formatCurrency={formatCurrency} />
    );
    expect(screen.getByText("Evening Gown")).toBeInTheDocument();
  });

  it("should display formatted price", () => {
    render(
      <ReservationCheckoutItemDetails item={defaultItem} formatCurrency={formatCurrency} />
    );
    expect(screen.getByText("$15000")).toBeInTheDocument();
  });

  it("should display size badge", () => {
    render(
      <ReservationCheckoutItemDetails item={defaultItem} formatCurrency={formatCurrency} />
    );
    expect(screen.getByText("Size M")).toBeInTheDocument();
  });

  it("should display color badges", () => {
    render(
      <ReservationCheckoutItemDetails item={defaultItem} formatCurrency={formatCurrency} />
    );
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Black")).toBeInTheDocument();
  });

  it("should display date range with Reserved label", () => {
    render(
      <ReservationCheckoutItemDetails item={defaultItem} formatCurrency={formatCurrency} />
    );
    expect(screen.getByText(/Reserved:/)).toBeInTheDocument();
  });
});
