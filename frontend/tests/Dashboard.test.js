/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
 *
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DOMWrapper, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import Dashboard from "../src/views/Dashboard.vue";
import listServices from "../src/services/listServices.js";
import todoServices from "../src/services/todoServices.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/listServices.js", () => ({
  default: {
    getLists: vi.fn(),
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
}));

vi.mock("../src/services/todoServices.js", () => ({
  default: {
    getTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
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
  todoServices.getTodos.mockResolvedValue({ data: [] });
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

const GROCERIES = { id: 7, name: "Groceries", userId: 1 };

const openItems = async (wrapper, listName) => {
  await wrapper.find(`[aria-label="View items for ${listName}"]`).trigger("click");
  await settle();
};

describe("Feature 3 — List items dialog", () => {
  describe("US-3.2 — View tasks in a list", () => {
    it("List items dialog shows empty state", async () => {
      listServices.getLists.mockResolvedValue({ data: [{ ...GROCERIES, name: "Personal" }] });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Personal");

      expect(todoServices.getTodos).toHaveBeenCalledWith(7);
      expect(dialog().text()).toContain("No todos in this list yet.");
    });

    it("User opens items for different lists", async () => {
      listServices.getLists.mockResolvedValue({
        data: [
          { id: 1, name: "Personal", userId: 1 },
          { id: 2, name: "Work", userId: 1 },
        ],
      });
      todoServices.getTodos.mockImplementation((listId) =>
        Promise.resolve({
          data:
            listId === 1
              ? [{ id: 10, listId: 1, title: "Call mom", completed: false }]
              : [
                  { id: 11, listId: 2, title: "Email client", completed: false },
                  { id: 12, listId: 2, title: "Write report", completed: false },
                ],
        })
      );

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Personal");

      expect(dialog().text()).toContain("Call mom");
      expect(dialog().text()).not.toContain("Email client");

      await clickButton(dialog(), "Close");
      await openItems(wrapper, "Work");

      expect(dialog().text()).toContain("Email client");
      expect(dialog().text()).toContain("Write report");
      expect(dialog().text()).not.toContain("Call mom");
    });
  });

  describe("US-3.1 — Add tasks to a list", () => {
    it("Add item is only available inside the items dialog", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });

      const { wrapper } = await mountDashboard();

      expect(wrapper.text()).not.toContain("+ Add Item");
      expect(dialog().text()).not.toContain("+ Add Item");

      await openItems(wrapper, "Groceries");

      expect(dialog().text()).toContain("+ Add Item");
    });

    it("User adds a todo to a list via dialog", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });
      todoServices.getTodos
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: false }],
        });
      todoServices.createTodo.mockResolvedValue({
        data: { id: 10, listId: 7, title: "Buy milk", completed: false, userId: 1 },
      });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Groceries");
      await clickButton(dialog(), "+ Add Item");

      await dialog().find('input[name="newTodoTitle"]').setValue("Buy milk");
      await clickButton(dialog(), "Add");

      expect(todoServices.createTodo).toHaveBeenCalledWith(7, { title: "Buy milk" });
      expect(dialog().text()).toContain("Buy milk");
    });

    it("User adds a todo with an empty title", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Groceries");
      await clickButton(dialog(), "+ Add Item");

      await dialog().find('input[name="newTodoTitle"]').setValue("   ");
      await clickButton(dialog(), "Add");

      expect(dialog().text()).toContain("Todo title is required.");
      expect(todoServices.createTodo).not.toHaveBeenCalled();
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });
      todoServices.getTodos
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: false }],
        })
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: true }],
        });
      todoServices.updateTodo.mockResolvedValue({
        data: { id: 10, listId: 7, title: "Buy milk", completed: true },
      });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Groceries");

      await dialog().find('input[type="checkbox"]').setValue(true);
      await settle();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { completed: true });
      expect(dialog().find(".text-decoration-line-through").exists()).toBe(true);
    });

    it("User marks a completed todo as incomplete", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });
      todoServices.getTodos
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: true }],
        })
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: false }],
        });
      todoServices.updateTodo.mockResolvedValue({
        data: { id: 10, listId: 7, title: "Buy milk", completed: false },
      });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Groceries");

      await dialog().find('input[type="checkbox"]').setValue(false);
      await settle();

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { completed: false });
      expect(dialog().find(".text-decoration-line-through").exists()).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });
      todoServices.getTodos
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: false }],
        })
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy oat milk", completed: false }],
        });
      todoServices.updateTodo.mockResolvedValue({
        data: { id: 10, listId: 7, title: "Buy oat milk", completed: false },
      });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Groceries");

      await dialog().find('[aria-label="Edit todo"]').trigger("click");
      await settle();

      await dialog().find('input[name="editTodoTitle"]').setValue("Buy oat milk");
      await clickButton(dialog(), "Save");

      expect(todoServices.updateTodo).toHaveBeenCalledWith(10, { title: "Buy oat milk" });
      expect(dialog().text()).toContain("Buy oat milk");
    });

    it("User deletes a todo", async () => {
      listServices.getLists.mockResolvedValue({ data: [GROCERIES] });
      todoServices.getTodos
        .mockResolvedValueOnce({
          data: [{ id: 10, listId: 7, title: "Buy milk", completed: false }],
        })
        .mockResolvedValueOnce({ data: [] });
      todoServices.deleteTodo.mockResolvedValue({ data: { message: "Todo deleted." } });

      const { wrapper } = await mountDashboard();
      await openItems(wrapper, "Groceries");

      await dialog().find('[aria-label="Delete todo"]').trigger("click");
      await settle();

      await clickButton(dialog(), "Delete");

      expect(todoServices.deleteTodo).toHaveBeenCalledWith(10);
      expect(dialog().text()).toContain("No todos in this list yet.");
    });
  });
});
