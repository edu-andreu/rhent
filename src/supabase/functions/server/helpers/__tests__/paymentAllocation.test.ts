import { allocatePaymentToItems } from "../paymentAllocation.ts";

describe("allocatePaymentToItems", () => {
  it("returns empty array for no items", () => {
    expect(allocatePaymentToItems(1000, [])).toEqual([]);
  });

  it("allocates full amount to single item when payment <= subtotal", () => {
    const result = allocatePaymentToItems(500, [{ id: "a", subtotal: 1000 }]);
    expect(result).toEqual([{ rentalItemId: "a", amount: 500 }]);
  });

  it("caps at item subtotal for single item", () => {
    const result = allocatePaymentToItems(1500, [{ id: "a", subtotal: 1000 }]);
    expect(result).toEqual([{ rentalItemId: "a", amount: 1000 }]);
  });

  it("fills items in order using waterfall allocation", () => {
    const items = [
      { id: "a", subtotal: 300 },
      { id: "b", subtotal: 500 },
      { id: "c", subtotal: 200 },
    ];
    const result = allocatePaymentToItems(600, items);
    expect(result).toEqual([
      { rentalItemId: "a", amount: 300 },
      { rentalItemId: "b", amount: 300 },
      { rentalItemId: "c", amount: 0 },
    ]);
  });

  it("last item absorbs rounding remainder", () => {
    const items = [
      { id: "a", subtotal: 100 },
      { id: "b", subtotal: 100 },
    ];
    const result = allocatePaymentToItems(100.01, items);
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100.01);
  });

  it("handles exact total allocation", () => {
    const items = [
      { id: "a", subtotal: 400 },
      { id: "b", subtotal: 600 },
    ];
    const result = allocatePaymentToItems(1000, items);
    expect(result).toEqual([
      { rentalItemId: "a", amount: 400 },
      { rentalItemId: "b", amount: 600 },
    ]);
  });

  it("handles zero payment", () => {
    const items = [
      { id: "a", subtotal: 500 },
      { id: "b", subtotal: 300 },
    ];
    const result = allocatePaymentToItems(0, items);
    expect(result).toEqual([
      { rentalItemId: "a", amount: 0 },
      { rentalItemId: "b", amount: 0 },
    ]);
  });

  it("handles fractional amounts correctly", () => {
    const result = allocatePaymentToItems(33.33, [
      { id: "a", subtotal: 20 },
      { id: "b", subtotal: 20 },
    ]);
    expect(result[0].amount).toBe(20);
    expect(result[1].amount).toBe(13.33);
  });
});
