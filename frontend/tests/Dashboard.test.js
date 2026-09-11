/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

let active = null;

/** Vuetify teleports dialog content out of the component tree and into the body. */
const dialog = () => new DOMWrapper(document.body);

const settle = async () => {
  await flushPromises();
  await nextTick();
};

const mountDashboard = async () => {
  active = await mountWithPlugins(Dashboard, { router: await createTestRouter("/") });
  await settle();
  return active;
};

const clickButton = async (scope, label) => {
  const button = scope.findAll("button").find((node) => node.text().trim() === label);
  expect(button, `expected a button labelled "${label}"`).toBeTruthy();

  await button.trigger("click");
  await settle();
};

beforeEach(() => {
  vi.clearAllMocks();
  listServices.getLists.mockResolvedValue({ data: [] });
});

afterEach(() => {
  active?.wrapper.unmount();
  active = null;
});

describe("Feature 2 — Dashboard lists view", () => {
  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      listServices.getLists.mockResolvedValue({
        data: [
          { id: 1, name: "Personal", userId: 1 },
          { id: 2, name: "Work", userId: 1 },
        ],
      });

      const { wrapper } = await mountDashboard();

      expect(listServices.getLists).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toContain("Personal");
      expect(wrapper.text()).toContain("Work");
      expect(wrapper.findAll('[aria-label="Edit list"]')).toHaveLength(2);
      expect(wrapper.findAll('[aria-label="Delete list"]')).toHaveLength(2);
    });

    it("User has no lists", async () => {
      const { wrapper } = await mountDashboard();

      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
    });
  });

  describe("US-2.3 — Manage list rows", () => {
    it("List rows show edit and delete actions", async () => {
      listServices.getLists.mockResolvedValue({
        data: [{ id: 1, name: "Groceries", userId: 1 }],
      });

      const { wrapper } = await mountDashboard();

      expect(wrapper.find('[aria-label="Edit list"]').exists()).toBe(true);
      expect(wrapper.find('[aria-label="Delete list"]').exists()).toBe(true);
    });
  });

  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      listServices.getLists
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({ data: [{ id: 1, name: "Groceries", userId: 1 }] });
      listServices.createList.mockResolvedValue({
        data: { id: 1, name: "Groceries", userId: 1 },
      });

      const { wrapper } = await mountDashboard();
      await clickButton(wrapper, "+ New List");

      await dialog().find('input[name="newListName"]').setValue("Groceries");
      await clickButton(dialog(), "Create");

      expect(listServices.createList).toHaveBeenCalledWith({ name: "Groceries" });
      expect(wrapper.text()).toContain("Groceries");
      expect(wrapper.vm.addDialog).toBe(false);
    });

    it("User creates a list with an empty name", async () => {
      const { wrapper } = await mountDashboard();
      await clickButton(wrapper, "+ New List");

      await dialog().find('input[name="newListName"]').setValue("   ");
      await clickButton(dialog(), "Create");

      expect(dialog().text()).toContain("List name is required.");
      expect(listServices.createList).not.toHaveBeenCalled();
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      listServices.getLists
        .mockResolvedValueOnce({ data: [{ id: 7, name: "Groceries", userId: 1 }] })
        .mockResolvedValueOnce({ data: [{ id: 7, name: "Shopping", userId: 1 }] });
      listServices.updateList.mockResolvedValue({
        data: { id: 7, name: "Shopping", userId: 1 },
      });

      const { wrapper } = await mountDashboard();
      await wrapper.find('[aria-label="Edit list"]').trigger("click");
      await settle();

      await dialog().find('input[name="renameListName"]').setValue("Shopping");
      await clickButton(dialog(), "Save");

      expect(listServices.updateList).toHaveBeenCalledWith(7, { name: "Shopping" });
      expect(wrapper.text()).toContain("Shopping");
      expect(wrapper.text()).not.toContain("Groceries");
    });

    it("User deletes a list", async () => {
      listServices.getLists
        .mockResolvedValueOnce({ data: [{ id: 7, name: "Groceries", userId: 1 }] })
        .mockResolvedValueOnce({ data: [] });
      listServices.deleteList.mockResolvedValue({ data: { message: "List deleted." } });

      const { wrapper } = await mountDashboard();
      await wrapper.find('[aria-label="Delete list"]').trigger("click");
      await settle();

      await clickButton(dialog(), "Delete");

      expect(listServices.deleteList).toHaveBeenCalledWith(7);
      expect(wrapper.text()).toContain("No lists yet. Create your first list.");
    });
  });
});
