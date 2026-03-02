import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedCallback } from "../useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not invoke callback immediately", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    act(() => {
      result.current("arg");
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("should invoke callback after delay", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    act(() => {
      result.current("arg");
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg");
  });

  it("should cancel previous invocation when called again before delay", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    act(() => {
      result.current("first");
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      result.current("second");
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("should use default delay of 300ms", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn));
    act(() => {
      result.current();
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should pass multiple arguments", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 100));
    act(() => {
      result.current("a", 1, true);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledWith("a", 1, true);
  });

  it("should use latest callback when callback ref updates", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useDebouncedCallback(cb, 100),
      { initialProps: { cb: fn1 } }
    );
    act(() => {
      result.current();
    });
    rerender({ cb: fn2 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
