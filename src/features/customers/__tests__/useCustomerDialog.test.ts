import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCustomerDialog } from "../useCustomerDialog";
import { Customer, CartItem } from "../../../types";

describe("useCustomerDialog", () => {
  const mockCustomer: Customer = {
    id: "customer-1",
    name: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
    createdAt: new Date(),
  };

  const mockCartItem: CartItem = {
    id: "cart-1",
    type: "rental",
    dress: {
      id: "dress-1",
      name: "Test Dress",
      description: "Test",
      size: "M",
      colors: ["red"],
      pricePerDay: 10000,
      imageUrl: "https://example.com/dress.jpg",
      category: "Formal",
      available: true,
    },
    amount: 10000,
  };

  const mockOnCustomerAdded = vi.fn().mockResolvedValue(true);
  const mockOnCustomerUpdated = vi.fn().mockResolvedValue(true);
  const mockOnOpenCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with closed dialog and no selected customer", () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    expect(result.current.showAddCustomerDialog).toBe(false);
    expect(result.current.customerToEdit).toBe(null);
  });

  it("should open add dialog when handleAddNewCustomer is called", () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    act(() => {
      result.current.handleAddNewCustomer();
    });

    expect(result.current.showAddCustomerDialog).toBe(true);
    expect(result.current.customerToEdit).toBe(null);
  });

  it("should open edit dialog with customer when handleEditCustomer is called", () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    act(() => {
      result.current.handleEditCustomer(mockCustomer);
    });

    expect(result.current.showAddCustomerDialog).toBe(true);
    expect(result.current.customerToEdit).toEqual(mockCustomer);
  });

  it("should call onCustomerAdded when adding a new customer", async () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    const newCustomer = {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "987-654-3210",
    };

    await act(async () => {
      await result.current.handleAddCustomer(newCustomer);
    });

    expect(mockOnCustomerAdded).toHaveBeenCalledWith(newCustomer);
    expect(mockOnCustomerUpdated).not.toHaveBeenCalled();
    expect(result.current.showAddCustomerDialog).toBe(false);
    expect(result.current.customerToEdit).toBe(null);
  });

  it("should call onCustomerUpdated when editing an existing customer", async () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    act(() => {
      result.current.handleEditCustomer(mockCustomer);
    });

    const updatedCustomer = {
      name: "John Updated",
      email: "john.updated@example.com",
      phone: "111-222-3333",
    };

    await act(async () => {
      await result.current.handleAddCustomer(updatedCustomer);
    });

    expect(mockOnCustomerUpdated).toHaveBeenCalledWith("customer-1", updatedCustomer);
    expect(mockOnCustomerAdded).not.toHaveBeenCalled();
    expect(result.current.showAddCustomerDialog).toBe(false);
    expect(result.current.customerToEdit).toBe(null);
  });

  it("should open checkout when closing dialog after adding customer with cart items", async () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [mockCartItem],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    const newCustomer = {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "987-654-3210",
    };

    await act(async () => {
      await result.current.handleAddCustomer(newCustomer);
    });

    expect(mockOnOpenCheckout).toHaveBeenCalledTimes(1);
  });

  it("should not open checkout when closing dialog after editing customer", async () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [mockCartItem],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    act(() => {
      result.current.handleEditCustomer(mockCustomer);
    });

    const updatedCustomer = {
      name: "John Updated",
      email: "john.updated@example.com",
      phone: "111-222-3333",
    };

    await act(async () => {
      await result.current.handleAddCustomer(updatedCustomer);
    });

    expect(mockOnOpenCheckout).not.toHaveBeenCalled();
  });

  it("should open checkout when closing dialog without editing if cart has items", () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [mockCartItem],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    act(() => {
      result.current.handleAddNewCustomer();
    });

    act(() => {
      result.current.closeDialog();
    });

    expect(mockOnOpenCheckout).toHaveBeenCalledTimes(1);
  });

  it("should not open checkout when closing dialog if cart is empty", () => {
    const { result } = renderHook(() =>
      useCustomerDialog({
        onCustomerAdded: mockOnCustomerAdded,
        onCustomerUpdated: mockOnCustomerUpdated,
        cartItems: [],
        onOpenCheckout: mockOnOpenCheckout,
      })
    );

    act(() => {
      result.current.handleAddNewCustomer();
    });

    act(() => {
      result.current.closeDialog();
    });

    expect(mockOnOpenCheckout).not.toHaveBeenCalled();
  });
});
