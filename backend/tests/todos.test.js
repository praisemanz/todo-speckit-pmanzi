/**
 * Feature 3 — Todo List Item Management
 * Spec: features/feature-3-todo-list-item-management.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  closeTestDatabase,
  registeredSession,
  otherRegisteredSession,
  bearer,
  createList,
  createTodo,
} from "./helpers.js";

beforeEach(syncTestDatabase);
afterAll(closeTestDatabase);

/** A signed-in owner with one list ready to receive todos. */
const ownerWithList = async (name = "Groceries") => {
  const session = await registeredSession();
  const { body: list } = await createList(session, name);
  return { session, list };
};

describe("Feature 3 — Todos API", () => {
  describe("US-3.1 — Add tasks to a list", () => {
    it("User adds a todo to a list via dialog", async () => {
      const { session, list } = await ownerWithList();

      const response = await createTodo(session, list.id, "Buy milk");

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Buy milk",
        completed: false,
        listId: list.id,
        userId: session.userId,
      });
    });

    it("User adds a todo with an empty title", async () => {
      const { session, list } = await ownerWithList();

      const response = await createTodo(session, list.id, "   ");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Todo title is required.");
      expect(await db.todo.count()).toBe(0);
    });

    it("rejects a title longer than 255 characters", async () => {
      const { session, list } = await ownerWithList();

      const response = await createTodo(session, list.id, "a".repeat(256));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Todo title must be 255 characters or fewer.");
      expect(await db.todo.count()).toBe(0);
    });
  });

  describe("US-3.2 — View tasks in a list", () => {
    it("returns todos incomplete first, then oldest first", async () => {
      const { session, list } = await ownerWithList();
      const { body: first } = await createTodo(session, list.id, "First");
      await createTodo(session, list.id, "Second");

      await request(app)
        .put(`/todo/todos/${first.id}`)
        .set("Authorization", bearer(session))
        .send({ completed: true });

      const response = await request(app)
        .get(`/todo/lists/${list.id}/todos`)
        .set("Authorization", bearer(session));

      expect(response.status).toBe(200);
      expect(response.body.map((todo) => todo.title)).toEqual(["Second", "First"]);
    });

    it("User only sees their own todos when opening items", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listA } = await createList(userA, "Work");
      const { body: listB } = await createList(userB, "Work");
      await createTodo(userA, listA.id, "My task");
      await createTodo(userB, listB.id, "Their task");

      const response = await request(app)
        .get(`/todo/lists/${listA.id}/todos`)
        .set("Authorization", bearer(userA));

      expect(response.status).toBe(200);
      expect(response.body.map((todo) => todo.title)).toEqual(["My task"]);
    });
  });

  describe("US-3.3 — Complete tasks", () => {
    it("User marks a todo as complete", async () => {
      const { session, list } = await ownerWithList();
      const { body: todo } = await createTodo(session, list.id, "Buy milk");

      const response = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set("Authorization", bearer(session))
        .send({ completed: true });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(true);
      expect((await db.todo.findByPk(todo.id)).completed).toBe(true);
    });

    it("User marks a completed todo as incomplete", async () => {
      const { session, list } = await ownerWithList();
      const { body: todo } = await createTodo(session, list.id, "Buy milk");
      await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set("Authorization", bearer(session))
        .send({ completed: true });

      const response = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set("Authorization", bearer(session))
        .send({ completed: false });

      expect(response.status).toBe(200);
      expect(response.body.completed).toBe(false);
      expect((await db.todo.findByPk(todo.id)).completed).toBe(false);
    });
  });

  describe("US-3.4 — Edit and remove tasks", () => {
    it("User edits a todo title", async () => {
      const { session, list } = await ownerWithList();
      const { body: todo } = await createTodo(session, list.id, "Buy milk");

      const response = await request(app)
        .put(`/todo/todos/${todo.id}`)
        .set("Authorization", bearer(session))
        .send({ title: "Buy oat milk" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Buy oat milk");
      expect((await db.todo.findByPk(todo.id)).title).toBe("Buy oat milk");
    });

    it("User deletes a todo", async () => {
      const { session, list } = await ownerWithList();
      const { body: todo } = await createTodo(session, list.id, "Buy milk");

      const response = await request(app)
        .delete(`/todo/todos/${todo.id}`)
        .set("Authorization", bearer(session));

      expect(response.status).toBe(200);
      expect(await db.todo.findByPk(todo.id)).toBeNull();
    });
  });

  describe("US-3.5 — Private items only", () => {
    it("User cannot read todos in another user's list", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listB } = await createList(userB, "Secret");
      await createTodo(userB, listB.id, "Hidden task");

      const response = await request(app)
        .get(`/todo/lists/${listB.id}/todos`)
        .set("Authorization", bearer(userA));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.id} not found.`);
    });

    it("User attempts to add a todo to another user's list", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listB } = await createList(userB, "Secret");

      const response = await createTodo(userA, listB.id, "Intruder task");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.id} not found.`);
      expect(await db.todo.count()).toBe(0);
    });

    it("User attempts to rename another user's todo", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listB } = await createList(userB, "Secret");
      const { body: todoB } = await createTodo(userB, listB.id, "Their task");

      const response = await request(app)
        .put(`/todo/todos/${todoB.id}`)
        .set("Authorization", bearer(userA))
        .send({ title: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`Todo with id=${todoB.id} not found.`);
      expect((await db.todo.findByPk(todoB.id)).title).toBe("Their task");
    });

    it("User attempts to delete another user's todo", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listB } = await createList(userB, "Secret");
      const { body: todoB } = await createTodo(userB, listB.id, "Their task");

      const response = await request(app)
        .delete(`/todo/todos/${todoB.id}`)
        .set("Authorization", bearer(userA));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`Todo with id=${todoB.id} not found.`);
      expect(await db.todo.findByPk(todoB.id)).not.toBeNull();
    });

    it("Client cannot assign a todo to another user on create", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listA } = await createList(userA, "Groceries");

      const response = await request(app)
        .post(`/todo/lists/${listA.id}/todos`)
        .set("Authorization", bearer(userA))
        .send({ title: "Buy milk", userId: userB.userId });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userA.userId);
      expect((await db.todo.findByPk(response.body.id)).userId).toBe(userA.userId);
    });

    it("Unauthenticated API request for todos", async () => {
      const response = await request(app).get("/todo/lists/1/todos");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-3.6 — Lists carry their items", () => {
    it("Deleting a list removes its todos", async () => {
      const { session, list } = await ownerWithList();
      await createTodo(session, list.id, "Buy milk");
      await createTodo(session, list.id, "Buy eggs");

      const response = await request(app)
        .delete(`/todo/lists/${list.id}`)
        .set("Authorization", bearer(session));

      expect(response.status).toBe(200);
      expect(await db.todo.count({ where: { listId: list.id } })).toBe(0);
    });
  });
});
