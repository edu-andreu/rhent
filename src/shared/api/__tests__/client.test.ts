import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiError,
  getFunction,
  postFunction,
  putFunction,
  deleteFunction,
  getErrorMessage,
  functionRequest,
} from "../client";

const TEST_URL = "https://test.supabase.co/functions/v1/test-slug";
const TEST_ANON_KEY = "test-anon-key";

const mockFetch = vi.fn();

vi.mock("../../config/env", () => {
  const url = "https://test.supabase.co/functions/v1/test-slug";
  const key = "test-anon-key";
  return {
    supabaseConfig: {
      publicAnonKey: key,
      functionsBaseUrl: () => url,
    },
    buildFunctionUrl: (path: string) => {
      const normalized = path.startsWith("/") ? path.slice(1) : path;
      return `${url}/${normalized}`;
    },
  };
});

// Replace global fetch
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

describe("ApiError", () => {
  it("should extend Error and have name ApiError", () => {
    const err = new ApiError("Not found", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("Not found");
  });

  it("should have status and optional data", () => {
    const err = new ApiError("Bad request", 400, { field: "email" });
    expect(err.status).toBe(400);
    expect(err.data).toEqual({ field: "email" });
  });

  it("should work without data", () => {
    const err = new ApiError("Server error", 500);
    expect(err.data).toBeUndefined();
  });
});

describe("getErrorMessage", () => {
  it("should return Error message", () => {
    expect(getErrorMessage(new Error("Custom error"))).toBe("Custom error");
  });

  it("should return ApiError message", () => {
    expect(getErrorMessage(new ApiError("API failed", 500))).toBe("API failed");
  });

  it("should return fallback for non-Error", () => {
    expect(getErrorMessage("string")).toBe("Request failed");
    expect(getErrorMessage(123)).toBe("Request failed");
    expect(getErrorMessage(null)).toBe("Request failed");
  });

  it("should use custom fallback", () => {
    expect(getErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
  });

  it("should return fallback when Error has empty message", () => {
    expect(getErrorMessage(new Error(""))).toBe("Request failed");
  });
});

describe("functionRequest (via getFunction, postFunction, putFunction, deleteFunction)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("authorization", () => {
    it("should add Bearer token when Authorization header is missing", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await getFunction("payment-methods");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(init?.headers).toBeDefined();
      const headers = init.headers as Headers;
      expect(headers.get("Authorization")).toBe(`Bearer ${TEST_ANON_KEY}`);
    });

    it("should not overwrite existing Authorization header", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      await functionRequest("test", {
        headers: { Authorization: "Bearer custom-token" },
      });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer custom-token");
    });
  });

  describe("URL and method", () => {
    it("getFunction should call GET with correct path", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 1 }), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      const result = await getFunction<{ data: number }>("payment-methods");

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_URL}/payment-methods`,
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual({ data: 1 });
    });

    it("postFunction should call POST with body and Content-Type json", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ id: "new" }), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      const result = await postFunction<{ id: string }>("items", { name: "Dress" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_URL}/items`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Dress" }),
        })
      );
      const [, init] = mockFetch.mock.calls[0];
      expect((init?.headers as Headers).get("Content-Type")).toBe("application/json");
      expect(result).toEqual({ id: "new" });
    });

    it("putFunction should call PUT with body", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ updated: true }), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      await putFunction("items/1", { name: "Updated" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_URL}/items/1`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "Updated" }),
        })
      );
    });

    it("deleteFunction should call DELETE", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      await deleteFunction("items/1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_URL}/items/1`,
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("response parsing", () => {
    it("should return parsed JSON for application/json", async () => {
      const payload = { list: [1, 2], nested: { a: true } };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      const result = await getFunction("endpoint");

      expect(result).toEqual(payload);
    });

    it("should parse text response when not JSON", async () => {
      mockFetch.mockResolvedValue(
        new Response("plain text", { status: 200, headers: { "Content-Type": "text/plain" } })
      );

      const result = await getFunction("endpoint");

      expect(result).toBe("plain text");
    });

    it("should return null for empty text response", async () => {
      mockFetch.mockResolvedValue(
        new Response("", { status: 200, headers: { "Content-Type": "text/plain" } })
      );

      const result = await getFunction("endpoint");

      expect(result).toBe(null);
    });
  });

  describe("error handling (non-2xx)", () => {
    it("should throw ApiError with status and message from body.error", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "Resource not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      await expect(getFunction("missing")).rejects.toMatchObject({
        name: "ApiError",
        message: "Resource not found",
        status: 404,
        data: { error: "Resource not found" },
      });
    });

    it("should throw ApiError with message from text body when not JSON", async () => {
      mockFetch.mockResolvedValue(
        new Response("Server crashed", { status: 500, headers: { "Content-Type": "text/plain" } })
      );

      await expect(getFunction("endpoint")).rejects.toMatchObject({
        name: "ApiError",
        message: "Server crashed",
        status: 500,
      });
    });

    it("should throw ApiError with fallback message when body has no error string", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ code: "ERR_123" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );

      await expect(getFunction("endpoint")).rejects.toMatchObject({
        name: "ApiError",
        message: "Request failed with status 400",
        status: 400,
        data: { code: "ERR_123" },
      });
    });

    it("should throw ApiError when body.error is not a string", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 404 } }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      await expect(getFunction("endpoint")).rejects.toMatchObject({
        message: "Request failed with status 404",
        status: 404,
      });
    });
  });

  describe("body serialization", () => {
    it("should not set Content-Type or stringify for FormData body", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } })
      );
      const form = new FormData();
      form.append("file", "blob");

      await postFunction("upload", form as unknown as object);

      const [, init] = mockFetch.mock.calls[0];
      expect(init?.body).toBe(form);
      expect((init?.headers as Headers).get("Content-Type")).toBeNull();
    });

    it("should not stringify body when init.body is passed and is not plain object", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } })
      );

      await functionRequest("test", { method: "POST", body: "raw string" });

      const [, init] = mockFetch.mock.calls[0];
      expect(init?.body).toBe("raw string");
    });
  });
});
