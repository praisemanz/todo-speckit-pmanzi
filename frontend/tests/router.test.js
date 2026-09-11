/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import Utils from "../src/config/utils.js";

/** A fresh router per test so navigation history does not leak between cases. */
const freshRouter = async () => {
  vi.resetModules();
  const { default: router } = await import("../src/router.js");
  return router;
};

beforeEach(() => {
  localStorage.clear();
});

describe("Feature 1 — Router guards", () => {
  describe("US-1.3 — Stay signed in across page loads", () => {
    it("Signed-in user visits login page", async () => {
      Utils.setStore("user", { userId: 1, fName: "Jane", token: "jwt-token" });

      const router = await freshRouter();
      await router.push("/login");

      expect(router.currentRoute.value.name).toBe("home");
    });

    it("keeps a signed-in user on the protected home route", async () => {
      Utils.setStore("user", { userId: 1, fName: "Jane", token: "jwt-token" });

      const router = await freshRouter();
      await router.push("/");

      expect(router.currentRoute.value.name).toBe("home");
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      const router = await freshRouter();
      await router.push("/");

      expect(router.currentRoute.value.name).toBe("login");
    });
  });
});
