import { describe, expect, it } from "vitest";
import {
	applyRequestId,
	REQUEST_ID_HEADER,
	resolveRequestId,
} from "../src/request-id";

/**
 * The id has to be both traceable and safe to echo, and those pull in opposite
 * directions. These pin the boundary.
 */

describe("a well-formed inbound id is kept", () => {
	it("keeps a UUID", () => {
		const id = "3f0a1b2c-4d5e-6f70-8192-a3b4c5d6e7f8";
		expect(resolveRequestId(id)).toBe(id);
	});

	it("keeps hex, base64url and a caller's own prefix", () => {
		for (const id of [
			"deadbeef",
			"abc_DEF-123",
			"req_01HQZX9K2M4N6P8R0T2V4W6Y8A",
		]) {
			expect(resolveRequestId(id)).toBe(id);
		}
	});

	it("trims nothing and invents nothing — it echoes exactly", () => {
		// A proxy that assigned an id expects to find that id in its own logs.
		const id = "proxy-0000000000000001";
		expect(resolveRequestId(id)).toBe(id);
	});
});

describe("anything unparseable is replaced", () => {
	it("generates when the header is absent", () => {
		const id = resolveRequestId(null);
		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		expect(id).not.toBe(resolveRequestId(null));
	});

	it("rejects values too short to be unique", () => {
		expect(resolveRequestId("abc")).not.toBe("abc");
	});

	it("rejects values too long to store", () => {
		expect(resolveRequestId("a".repeat(129))).not.toBe("a".repeat(129));
	});

	it("rejects header-splitting and injection attempts", () => {
		// This is the reason the shape is checked at all: the value is written into a
		// response header. `\r\n` in a header is the classic response-splitting vector.
		for (const bad of [
			"abc\r\nX-Injected: 1",
			"abc\nX-Injected: 1",
			"<script>alert(1)</script>",
			"id with spaces",
			"id;semicolon",
			"",
		]) {
			expect(resolveRequestId(bad)).not.toBe(bad);
		}
	});

	it("the replacement is always valid itself", () => {
		const id = resolveRequestId("not valid!");
		expect(id).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
	});
});

describe("attach to a header set", () => {
	it("sets the header", () => {
		const headers = new Headers();
		applyRequestId(headers, "abc12345");
		expect(headers.get(REQUEST_ID_HEADER)).toBe("abc12345");
	});

	it("replaces an existing value rather than appending", () => {
		const headers = new Headers({ [REQUEST_ID_HEADER]: "old00000" });
		applyRequestId(headers, "new11111");
		expect(headers.get(REQUEST_ID_HEADER)).toBe("new11111");
	});
});
