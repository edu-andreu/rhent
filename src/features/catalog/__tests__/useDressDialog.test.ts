import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDressDialog } from "../useDressDialog";
import { Dress } from "../../../types";

describe("useDressDialog", () => {
  const mockDress: Dress = {
    id: "dress-1",
    name: "Test Dress",
    description: "A test dress",
    size: "M",
    colors: ["red"],
    pricePerDay: 10000,
    imageUrl: "https://example.com/dress.jpg",
    category: "Formal",
    available: true,
  };

  const mockOnDressAdded = vi.fn();
  const mockOnDressDeleted = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with closed dialogs and no selected dress", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    expect(result.current.showAddDressDialog).toBe(false);
    expect(result.current.dressToEdit).toBe(null);
    expect(result.current.dressToDelete).toBe(null);
    expect(result.current.deleteDialogOpen).toBe(false);
  });

  it("should open add dialog when handleAddNewDress is called", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.handleAddNewDress();
    });

    expect(result.current.showAddDressDialog).toBe(true);
    expect(result.current.dressToEdit).toBe(null);
  });

  it("should open edit dialog with dress when handleEditDress is called", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.handleEditDress(mockDress);
    });

    expect(result.current.showAddDressDialog).toBe(true);
    expect(result.current.dressToEdit).toEqual(mockDress);
  });

  it("should open delete dialog when handleDeleteDress is called", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.handleDeleteDress(mockDress);
    });

    expect(result.current.deleteDialogOpen).toBe(true);
    expect(result.current.dressToDelete).toEqual(mockDress);
  });

  it("should call onDressAdded and close dialog when handleAddDress is called", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.handleAddNewDress();
    });

    expect(result.current.showAddDressDialog).toBe(true);

    act(() => {
      result.current.handleAddDress();
    });

    expect(mockOnDressAdded).toHaveBeenCalledTimes(1);
    expect(result.current.showAddDressDialog).toBe(false);
    expect(result.current.dressToEdit).toBe(null);
  });

  it("should call onDressDeleted and close dialog when confirmDeleteDress is called", async () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.handleDeleteDress(mockDress);
    });

    expect(result.current.deleteDialogOpen).toBe(true);

    await act(async () => {
      await result.current.confirmDeleteDress();
    });

    expect(mockOnDressDeleted).toHaveBeenCalledWith("dress-1");
    expect(result.current.deleteDialogOpen).toBe(false);
    expect(result.current.dressToDelete).toBe(null);
  });

  it("should not call onDressDeleted if no dress is selected", async () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    await act(async () => {
      await result.current.confirmDeleteDress();
    });

    expect(mockOnDressDeleted).not.toHaveBeenCalled();
  });

  it("should close add dialog and clear edit dress when closeAddDialog is called", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.handleEditDress(mockDress);
    });

    expect(result.current.showAddDressDialog).toBe(true);
    expect(result.current.dressToEdit).toEqual(mockDress);

    act(() => {
      result.current.closeAddDialog();
    });

    expect(result.current.showAddDressDialog).toBe(false);
    expect(result.current.dressToEdit).toBe(null);
  });

  it("should allow setting delete dialog open state", () => {
    const { result } = renderHook(() =>
      useDressDialog({
        onDressAdded: mockOnDressAdded,
        onDressDeleted: mockOnDressDeleted,
      })
    );

    act(() => {
      result.current.setDeleteDialogOpen(true);
    });

    expect(result.current.deleteDialogOpen).toBe(true);

    act(() => {
      result.current.setDeleteDialogOpen(false);
    });

    expect(result.current.deleteDialogOpen).toBe(false);
  });
});
