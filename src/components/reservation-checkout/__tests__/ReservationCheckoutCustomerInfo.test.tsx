import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationCheckoutCustomerInfo } from "../ReservationCheckoutCustomerInfo";

describe("ReservationCheckoutCustomerInfo", () => {
  it("should render Customer label", () => {
    render(<ReservationCheckoutCustomerInfo customer={null} />);
    expect(screen.getByText("Customer")).toBeInTheDocument();
  });

  it("should show 'No customer associated' when customer is null", () => {
    render(<ReservationCheckoutCustomerInfo customer={null} />);
    expect(screen.getByText("No customer associated")).toBeInTheDocument();
  });

  it("should show customer name when customer is provided", () => {
    render(
      <ReservationCheckoutCustomerInfo
        customer={{ name: "Jane Doe" }}
      />
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("should show customer phone when provided", () => {
    render(
      <ReservationCheckoutCustomerInfo
        customer={{ name: "Jane Doe", phone: "+54 11 1234-5678" }}
      />
    );
    expect(screen.getByText("+54 11 1234-5678")).toBeInTheDocument();
  });

  it("should not show phone section when phone is not provided", () => {
    render(
      <ReservationCheckoutCustomerInfo
        customer={{ name: "Jane Doe" }}
      />
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText(/\+54/)).not.toBeInTheDocument();
  });
});
