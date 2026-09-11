/**
 * Feature 2 — Todo List Management
 * Spec: features/feature-2-todo-list-management.md
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
} from "./helpers.js";

beforeEach(syncTestDatabase);
afterAll(closeTestDatabase);

describe("Feature 2 — Lists API", () => {
  describe("US-2.1 — Create todo lists", () => {
    it("User creates a new list", async () => {
      const session = await registeredSession();

      const response = await createList(session, "Groceries");

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ name: "Groceries", userId: session.userId });
      expect(response.body.id).toEqual(expect.any(Number));
    });

    it("User creates a list with an empty name", async () => {
      const session = await registeredSession();

      const response = await createList(session, "   ");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("List name is required.");
      expect(await db.list.count()).toBe(0);
    });

    it("User creates a list with a name that is too long", async () => {
      const session = await registeredSession();

      const response = await createList(session, "a".repeat(101));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("List name must be 100 characters or fewer.");
      expect(await db.list.count()).toBe(0);
    });

    it("trims surrounding whitespace from the saved name", async () => {
      const session = await registeredSession();

      const response = await createList(session, "  Groceries  ");

      expect(response.body.name).toBe("Groceries");
    });
  });

  describe("US-2.2 — View my lists", () => {
    it("Dashboard loads with existing lists", async () => {
      const session = await registeredSession();
      await createList(session, "Work");
      await createList(session, "Personal");

      const response = await request(app)
        .get("/todo/lists")
        .set("Authorization", bearer(session));

      expect(response.status).toBe(200);
      expect(response.body.map((list) => list.name)).toEqual(["Personal", "Work"]);
    });

    it("User cannot see another user's lists", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      await createList(userA, "Work");
      await createList(userB, "Secret Project");

      const response = await request(app).get("/todo/lists").set("Authorization", bearer(userA));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe("Work");
      expect(response.body.map((list) => list.name)).not.toContain("Secret Project");
    });
  });

  describe("US-2.4 — Rename and delete lists", () => {
    it("User renames a list", async () => {
      const session = await registeredSession();
      const { body: list } = await createList(session, "Groceries");

      const response = await request(app)
        .put(`/todo/lists/${list.id}`)
        .set("Authorization", bearer(session))
        .send({ name: "Shopping" });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Shopping");
      expect((await db.list.findByPk(list.id)).name).toBe("Shopping");
    });

    it("User deletes a list", async () => {
      const session = await registeredSession();
      const { body: list } = await createList(session, "Groceries");

      const response = await request(app)
        .delete(`/todo/lists/${list.id}`)
        .set("Authorization", bearer(session));

      expect(response.status).toBe(200);
      expect(await db.list.findByPk(list.id)).toBeNull();
    });

    it("rejects a rename that empties the list name", async () => {
      const session = await registeredSession();
      const { body: list } = await createList(session, "Groceries");

      const response = await request(app)
        .put(`/todo/lists/${list.id}`)
        .set("Authorization", bearer(session))
        .send({ name: "  " });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("List name is required.");
      expect((await db.list.findByPk(list.id)).name).toBe("Groceries");
    });
  });

  describe("US-2.5 — Private lists only", () => {
    it("User attempts to rename another user's list", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listB } = await createList(userB, "Secret Project");

      const response = await request(app)
        .put(`/todo/lists/${listB.id}`)
        .set("Authorization", bearer(userA))
        .send({ name: "Hijacked" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.id} not found.`);
      expect((await db.list.findByPk(listB.id)).name).toBe("Secret Project");
    });

    it("User attempts to delete another user's list", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();
      const { body: listB } = await createList(userB, "Secret Project");

      const response = await request(app)
        .delete(`/todo/lists/${listB.id}`)
        .set("Authorization", bearer(userA));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`List with id=${listB.id} not found.`);
      expect(await db.list.findByPk(listB.id)).not.toBeNull();
    });

    it("Client cannot assign a list to another user on create", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();

      const response = await request(app)
        .post("/todo/lists")
        .set("Authorization", bearer(userA))
        .send({ name: "Groceries", userId: userB.userId });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(userA.userId);
      expect((await db.list.findByPk(response.body.id)).userId).toBe(userA.userId);
    });

    it("Unauthenticated API request to lists", async () => {
      const response = await request(app).get("/todo/lists");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });
});
