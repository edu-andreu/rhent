import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useReturnDialog } from "../useReturnDialog";

describe("useReturnDialog", () => {
  const mockOnReturnComplete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with closed dialog and no rental item", () => {
    const { result } = renderHook(() =>
      useReturnDialog({
        onReturnComplete: mockOnReturnComplete,
      })
    );

    expect(result.current.returnDialogOpen).toBe(false);
    expect(result.current.returningRentalItemId).toBe(null);
    expect(result.current.returnDrawerError).toBe(null);
  });

  it("should open dialog and set rental item when handleReturn is called", () => {
    const { result } = renderHook(() =>
      useReturnDialog({
        onReturnComplete: mockOnReturnComplete,
      })
    );

    act(() => {
      result.current.handleReturn("rental-123");
    });

    expect(result.current.returnDialogOpen).toBe(true);
    expect(result.current.returningRentalItemId).toBe("rental-123");
  });

  it("should call onReturnComplete and close dialog when handleReturnConfirm is called", async () => {
    const { result } = renderHook(() =>
      useReturnDialog({
        onReturnComplete: mockOnReturnComplete,
      })
    );

    act(() => {
      result.current.handleReturn("rental-123");
    });

    expect(result.current.returnDialogOpen).toBe(true);

    await act(async () => {
      await result.current.handleReturnConfirm();
    });

    expect(mockOnReturnComplete).toHaveBeenCalledTimes(1);
    expect(result.current.returnDialogOpen).toBe(false);
    expect(result.current.returningRentalItemId).toBe(null);
  });

  it("should close dialog and clear rental item when closeDialog is called", () => {
    const { result } = renderHook(() =>
      useReturnDialog({
        onReturnComplete: mockOnReturnComplete,
      })
    );

    act(() => {
      result.current.handleReturn("rental-123");
    });

    expect(result.current.returnDialogOpen).toBe(true);
    expect(result.current.returningRentalItemId).toBe("rental-123");

    act(() => {
      result.current.closeDialog();
    });

    expect(result.current.returnDialogOpen).toBe(false);
    expect(result.current.returningRentalItemId).toBe(null);
  });

  it("should allow setting return drawer error", () => {
    const { result } = renderHook(() =>
      useReturnDialog({
        onReturnComplete: mockOnReturnComplete,
      })
    );

    act(() => {
      result.current.setReturnDrawerError("Drawer is open");
    });

    expect(result.current.returnDrawerError).toBe("Drawer is open");

    act(() => {
      result.current.setReturnDrawerError(null);
    });

    expect(result.current.returnDrawerError).toBe(null);
  });
});
