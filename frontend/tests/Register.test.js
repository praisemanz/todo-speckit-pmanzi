/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Register from "../src/views/Register.vue";
import authServices from "../src/services/authServices.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

const VALID_INPUT = {
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  password: "password123",
  confirmPassword: "password123",
};

const mountRegister = async () =>
  mountWithPlugins(Register, { router: await createTestRouter("/register") });

const fillForm = async (wrapper, overrides = {}) => {
  const values = { ...VALID_INPUT, ...overrides };

  for (const [name, value] of Object.entries(values)) {
    await wrapper.find(`input[name="${name}"]`).setValue(value);
  }
};

const submit = async (wrapper) => {
  await wrapper.find("form").trigger("submit.prevent");
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Feature 1 — Register view", () => {
  describe("US-1.1 — Registration", () => {
    it("User submits registration with invalid email format", async () => {
      const { wrapper } = await mountRegister();
      await fillForm(wrapper, { email: "notanemail" });
      await submit(wrapper);

      expect(wrapper.text()).toContain("Enter a valid email address.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with missing username", async () => {
      const { wrapper } = await mountRegister();
      await fillForm(wrapper, { username: "" });
      await submit(wrapper);

      expect(wrapper.text()).toContain("Username is required.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with password too short", async () => {
      const { wrapper } = await mountRegister();
      await fillForm(wrapper, { password: "short", confirmPassword: "short" });
      await submit(wrapper);

      expect(wrapper.text()).toContain("Password must be at least 8 characters.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User submits registration with mismatched passwords", async () => {
      const { wrapper } = await mountRegister();
      await fillForm(wrapper, { confirmPassword: "different-password" });
      await submit(wrapper);

      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(authServices.registerUser).not.toHaveBeenCalled();
    });

    it("User registers with a duplicate username", async () => {
      authServices.registerUser.mockRejectedValue({
        response: { status: 400, data: { message: "Username is already taken." } },
      });

      const { wrapper } = await mountRegister();
      await fillForm(wrapper);
      await submit(wrapper);

      expect(wrapper.find(".v-alert").text()).toContain("Username is already taken.");
      expect(localStorage.getItem("user")).toBeNull();
    });

    it("User registers with valid information", async () => {
      const payload = {
        userId: 1,
        username: "jdoe",
        email: "jane@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
        token: "jwt-token",
      };
      authServices.registerUser.mockResolvedValue({ data: payload });

      const { wrapper, router } = await mountRegister();
      await fillForm(wrapper);
      await submit(wrapper);

      expect(authServices.registerUser).toHaveBeenCalledWith({
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
        password: "password123",
      });
      expect(JSON.parse(localStorage.getItem("user"))).toEqual(payload);
      expect(router.currentRoute.value.name).toBe("home");
    });
  });
});
