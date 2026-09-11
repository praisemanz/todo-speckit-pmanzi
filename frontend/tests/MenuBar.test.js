/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { h, nextTick } from "vue";
import { VApp } from "vuetify/components";
import MenuBar from "../src/components/MenuBar.vue";
import authServices from "../src/services/authServices.js";
import userServices from "../src/services/userServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

vi.mock("../src/services/userServices.js", () => ({
  default: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const SESSION = {
  userId: 42,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
  token: "jwt-token",
};

const PROFILE = {
  id: 42,
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  role: "worker",
};

/** VAppBar needs a VApp layout ancestor. */
const Host = { render: () => h(VApp, null, { default: () => h(MenuBar) }) };

let active = null;

const overlay = () => new DOMWrapper(document.body);

/** Overlay open/close plus a router navigation needs a few microtask drains. */
const settle = async () => {
  for (let round = 0; round < 3; round += 1) {
    await flushPromises();
    await nextTick();
  }
};

/** jsdom never runs the overlay leave transition, so assert on state, not the DOM. */
const isEditDialogOpen = (wrapper) => wrapper.findComponent(MenuBar).vm.editDialog;

/** The logout redirect is fired from inside the click handler, so wait for it to land. */
const waitForRoute = (router, name) =>
  vi.waitFor(() => {
    expect(router.currentRoute.value.name).toBe(name);
  });

const mountMenuBar = async () => {
  active = await mountWithPlugins(Host, { router: await createTestRouter("/") });
  await settle();
  return active;
};

const clickButton = async (scope, label) => {
  const button = scope.findAll("button").find((node) => node.text().trim() === label);
  expect(button, `expected a button labelled "${label}"`).toBeTruthy();

  await button.trigger("click");
  await settle();
};

const openDropdown = async (wrapper) => {
  await wrapper.find('[aria-label="Profile"]').trigger("click");
  await settle();
};

const openEditDialog = async (wrapper) => {
  await openDropdown(wrapper);
  await clickButton(overlay(), "Edit Profile");
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Utils.setStore("user", SESSION);
  userServices.getUser.mockResolvedValue({ data: PROFILE });
  authServices.logoutUser.mockResolvedValue({ data: { message: "Signed out." } });
});

afterEach(() => {
  active?.wrapper.unmount();
  active = null;
});

describe("Feature 4 — MenuBar profile", () => {
  describe("US-4.1 — View profile from the menu bar", () => {
    it("User opens the profile dropdown from the menu bar", async () => {
      const { wrapper } = await mountMenuBar();
      await openDropdown(wrapper);

      const dropdown = overlay().text();
      expect(dropdown).toContain("Jane Doe");
      expect(dropdown).toContain("jdoe");
      expect(dropdown).toContain("jane@example.com");
      expect(dropdown).toContain("Edit Profile");
      expect(dropdown).toContain("Log out");
    });
  });

  describe("US-4.4 — Single logout entry point", () => {
    it("Menu bar does not show Sign out", async () => {
      const { wrapper } = await mountMenuBar();

      expect(wrapper.text()).not.toContain("Sign out");
      expect(wrapper.find('[aria-label="Profile"]').exists()).toBe(true);
    });
  });

  describe("US-4.2 — Edit profile", () => {
    it("User opens the edit profile dialog", async () => {
      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      expect(userServices.getUser).toHaveBeenCalledWith(42);
      expect(overlay().find('input[name="profileFName"]').element.value).toBe("Jane");
      expect(overlay().find('input[name="profileLName"]').element.value).toBe("Doe");
      expect(overlay().find('input[name="profileEmail"]').element.value).toBe(
        "jane@example.com"
      );
      expect(overlay().find('input[name="profileUsername"]').element.value).toBe("jdoe");
    });

    it("User cancels the edit profile dialog", async () => {
      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      await overlay().find('input[name="profileFName"]').setValue("Changed");
      await clickButton(overlay(), "Cancel");

      expect(userServices.updateUser).not.toHaveBeenCalled();
      expect(isEditDialogOpen(wrapper)).toBe(false);
      expect(Utils.getStore("user")).toEqual(SESSION);
    });

    it("User saves profile changes", async () => {
      userServices.updateUser.mockResolvedValue({
        data: { ...PROFILE, fName: "Janet", email: "janet@example.com" },
      });

      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      await overlay().find('input[name="profileFName"]').setValue("Janet");
      await overlay().find('input[name="profileEmail"]').setValue("janet@example.com");
      await clickButton(overlay(), "Save");

      expect(userServices.updateUser).toHaveBeenCalledWith(42, {
        fName: "Janet",
        lName: "Doe",
        email: "janet@example.com",
        username: "jdoe",
      });

      const stored = Utils.getStore("user");
      expect(stored.fName).toBe("Janet");
      expect(stored.email).toBe("janet@example.com");
      expect(stored.token).toBe("jwt-token");

      const dropdown = overlay().text();
      expect(dropdown).toContain("Janet Doe");
      expect(dropdown).toContain("janet@example.com");
    });

    it("User saves profile with invalid email format", async () => {
      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      await overlay().find('input[name="profileEmail"]').setValue("notanemail");
      await clickButton(overlay(), "Save");

      expect(overlay().text()).toContain("Enter a valid email address.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
    });

    it("User saves profile with mismatched passwords", async () => {
      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      await overlay().find('input[name="profilePassword"]').setValue("newpassword123");
      await overlay().find('input[name="profileConfirmPassword"]').setValue("different123");
      await clickButton(overlay(), "Save");

      expect(overlay().text()).toContain("Passwords do not match.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
    });

    it("User saves profile with a password that is too short", async () => {
      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      await overlay().find('input[name="profilePassword"]').setValue("short");
      await overlay().find('input[name="profileConfirmPassword"]').setValue("short");
      await clickButton(overlay(), "Save");

      expect(overlay().text()).toContain("Password must be at least 8 characters.");
      expect(userServices.updateUser).not.toHaveBeenCalled();
    });

    it("Profile update API returns an error", async () => {
      userServices.updateUser.mockRejectedValue({
        response: { status: 400, data: { message: "Username is already taken." } },
      });

      const { wrapper } = await mountMenuBar();
      await openEditDialog(wrapper);

      await overlay().find('input[name="profileUsername"]').setValue("bsmith");
      await clickButton(overlay(), "Save");

      expect(overlay().find(".v-alert").text()).toContain("Username is already taken.");
      expect(isEditDialogOpen(wrapper)).toBe(true);
    });
  });

  describe("US-4.3 — Log out from profile", () => {
    it("User logs out from the profile dropdown", async () => {
      const { wrapper, router } = await mountMenuBar();
      await openDropdown(wrapper);

      await clickButton(overlay(), "Log out");

      expect(authServices.logoutUser).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem("user")).toBeNull();
      await waitForRoute(router, "login");
    });
  });
});
