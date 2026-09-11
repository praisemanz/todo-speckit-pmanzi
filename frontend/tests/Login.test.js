/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Login from "../src/views/Login.vue";
import authServices from "../src/services/authServices.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

const mountLogin = async () =>
  mountWithPlugins(Login, { router: await createTestRouter("/login") });

const submit = async (wrapper) => {
  await wrapper.find("form").trigger("submit.prevent");
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Feature 1 — Login view", () => {
  describe("US-1.2 — Sign in", () => {
    it("User signs in with invalid password", async () => {
      authServices.loginUser.mockRejectedValue({
        response: { status: 401, data: { message: "Invalid username or password." } },
      });

      const { wrapper } = await mountLogin();
      await wrapper.find('input[name="username"]').setValue("jdoe");
      await wrapper.find('input[name="password"]').setValue("wrong-password");
      await submit(wrapper);

      expect(authServices.loginUser).toHaveBeenCalledTimes(1);
      expect(wrapper.find(".v-alert").text()).toContain("Invalid username or password.");
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("User signs in with missing username", async () => {
      const { wrapper } = await mountLogin();
      await wrapper.find('input[name="password"]').setValue("password123");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.loginUser).not.toHaveBeenCalled();
    });

    it("User signs in with missing password", async () => {
      const { wrapper } = await mountLogin();
      await wrapper.find('input[name="username"]').setValue("jdoe");
      await submit(wrapper);

      expect(wrapper.text()).toContain("Password is required.");
      expect(authServices.loginUser).not.toHaveBeenCalled();
    });

    it("stores the session and routes home on a successful sign in", async () => {
      const payload = {
        userId: 1,
        username: "jdoe",
        email: "jane@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
        token: "jwt-token",
      };
      authServices.loginUser.mockResolvedValue({ data: payload });

      const { wrapper, router } = await mountLogin();
      await wrapper.find('input[name="username"]').setValue("jdoe");
      await wrapper.find('input[name="password"]').setValue("password123");
      await submit(wrapper);

      expect(JSON.parse(localStorage.getItem("user"))).toEqual(payload);
      expect(router.currentRoute.value.name).toBe("home");
    });
  });
});
