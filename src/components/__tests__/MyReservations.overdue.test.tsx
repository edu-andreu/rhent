import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "../../test/utils/renderWithProviders";
import { MyReservations } from "../MyReservations";
import type { Reservation } from "../../types";

vi.mock("../ReservationCheckoutDialog", () => ({
  ReservationCheckoutDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="checkout-open">checkout-open</div> : null,
}));

vi.mock("../RescheduleReservationDialog", () => ({
  RescheduleReservationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="reschedule-open">reschedule-open</div> : null,
}));

vi.mock("../CancellationConfirmationDialog", () => ({
  CancellationConfirmationDialog: () => null,
}));

vi.mock("../SwapItemDialog", () => ({
  SwapItemDialog: () => null,
}));

describe("MyReservations overdue rent guard", () => {
  const handlers = {
    onCancel: vi.fn(),
    onReschedule: vi.fn(),
    onConvertToRental: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  const baseReservation: Reservation = {
    id: "ri-1",
    dressId: "item-1",
    dressName: "Dress 1",
    dressImage: "",
    dressSize: "S",
    dressColors: [],
    dressPricePerDay: 100,
    reservationDate: new Date(),
    status: "pending",
    createdAt: new Date(),
    startDate: new Date(),
    endDate: new Date(),
    customerName: "Customer",
    sku: "SKU",
    category: "Cat",
    type: "Type",
    brand: "Brand",
    description: "Desc",
    alteration_notes: "",
  };

  it("forces reschedule before renting when overdue", () => {
    const reservations: Reservation[] = [{ ...baseReservation, isOverdue: true }];

    render(
      <MyReservations
        reservations={reservations}
        onCancel={handlers.onCancel}
        onReschedule={handlers.onReschedule}
        onConvertToRental={handlers.onConvertToRental}
        onConfirm={handlers.onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /rent/i }));
    expect(screen.getByTestId("reschedule-open")).toBeInTheDocument();
    expect(screen.queryByTestId("checkout-open")).not.toBeInTheDocument();
  });

  it("allows direct rent when not overdue", () => {
    const reservations: Reservation[] = [{ ...baseReservation, isOverdue: false }];

    render(
      <MyReservations
        reservations={reservations}
        onCancel={handlers.onCancel}
        onReschedule={handlers.onReschedule}
        onConvertToRental={handlers.onConvertToRental}
        onConfirm={handlers.onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /rent/i }));
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.getByTestId("checkout-open")).toBeInTheDocument();
    expect(screen.queryByTestId("reschedule-open")).not.toBeInTheDocument();
  });
});

