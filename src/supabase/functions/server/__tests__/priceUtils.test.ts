import { roundToNearestThousand } from "../priceUtils.ts";

describe("roundToNearestThousand", () => {
  it("rounds down below midpoint", () => {
    expect(roundToNearestThousand(1234)).toBe(1000);
    expect(roundToNearestThousand(1499)).toBe(1000);
  });

  it("rounds up at midpoint", () => {
    expect(roundToNearestThousand(500)).toBe(1000);
    expect(roundToNearestThousand(1500)).toBe(2000);
  });

  it("rounds up above midpoint", () => {
    expect(roundToNearestThousand(1567)).toBe(2000);
    expect(roundToNearestThousand(1999)).toBe(2000);
  });

  it("returns 0 for 0", () => {
    expect(roundToNearestThousand(0)).toBe(0);
  });

  it("handles exact thousands", () => {
    expect(roundToNearestThousand(3000)).toBe(3000);
  });

  it("handles negative numbers", () => {
    expect(roundToNearestThousand(-1234)).toBe(-1000);
    expect(roundToNearestThousand(-1567)).toBe(-2000);
  });
});
