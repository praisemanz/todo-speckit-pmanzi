/**
 * Feature 4 — User Profile Management
 * Spec: features/feature-4-user-profile-management.md
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
} from "./helpers.js";

beforeEach(syncTestDatabase);
afterAll(closeTestDatabase);

const validProfile = (overrides = {}) => ({
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  ...overrides,
});

const updateProfile = (session, body) =>
  request(app)
    .put(`/todo/users/${session.userId}`)
    .set("Authorization", bearer(session))
    .send(body);

describe("Feature 4 — Profile API", () => {
  describe("US-4.2 — Edit profile", () => {
    it("User fetches their own profile", async () => {
      const session = await registeredSession();

      const response = await request(app)
        .get(`/todo/users/${session.userId}`)
        .set("Authorization", bearer(session));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: session.userId,
        fName: "Jane",
        lName: "Doe",
        email: "jane@example.com",
        username: "jdoe",
        role: "worker",
      });
      expect(response.body.password).toBeUndefined();
    });

    it("User saves profile changes", async () => {
      const session = await registeredSession();

      const response = await updateProfile(
        session,
        validProfile({ fName: "Janet", username: "JANET", email: "janet@example.com" })
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        fName: "Janet",
        username: "janet",
        email: "janet@example.com",
      });
      expect(response.body.password).toBeUndefined();

      const stored = await db.user.unscoped().findByPk(session.userId);
      expect(stored.fName).toBe("Janet");
      expect(stored.username).toBe("janet");
    });

    it("leaves the password unchanged when the update omits it", async () => {
      const session = await registeredSession();
      const before = await db.user.unscoped().findByPk(session.userId);

      await updateProfile(session, validProfile({ fName: "Janet" }));

      const after = await db.user.unscoped().findByPk(session.userId);
      expect(after.password).toBe(before.password);
    });

    it("hashes a new password when one is supplied", async () => {
      const session = await registeredSession();
      const before = await db.user.unscoped().findByPk(session.userId);

      const response = await updateProfile(
        session,
        validProfile({ password: "brand-new-password" })
      );

      expect(response.status).toBe(200);

      const after = await db.user.unscoped().findByPk(session.userId);
      expect(after.password).not.toBe(before.password);
      expect(after.password).not.toBe("brand-new-password");
      expect(after.password.startsWith("$2")).toBe(true);
    });

    it("User attempts to fetch another user's profile", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();

      const response = await request(app)
        .get(`/todo/users/${userB.userId}`)
        .set("Authorization", bearer(userA));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`User with id=${userB.userId} not found.`);
    });

    it("User attempts to update another user's profile", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();

      const response = await request(app)
        .put(`/todo/users/${userB.userId}`)
        .set("Authorization", bearer(userA))
        .send(validProfile({ fName: "Hijacked", username: "hijacked" }));

      expect(response.status).toBe(404);
      expect(response.body.message).toBe(`User with id=${userB.userId} not found.`);
      expect((await db.user.findByPk(userB.userId)).fName).toBe("Bob");
    });

    it("Unauthenticated profile API request", async () => {
      const response = await request(app).get("/todo/users/1");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });

    it("Unauthenticated profile update API request", async () => {
      const response = await request(app).put("/todo/users/1").send(validProfile());

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });

    it("Profile update rejects a password that is too short", async () => {
      const session = await registeredSession();

      const response = await updateProfile(session, validProfile({ password: "short" }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password must be at least 8 characters.");
    });

    it("Profile update rejects missing required fields", async () => {
      const session = await registeredSession();

      const response = await updateProfile(session, validProfile({ fName: "   " }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("First name is required.");
      expect((await db.user.findByPk(session.userId)).fName).toBe("Jane");
    });

    it("Profile update rejects a duplicate username", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();

      const response = await updateProfile(userA, validProfile({ username: "bsmith" }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Username is already taken.");
      expect((await db.user.findByPk(userB.userId)).username).toBe("bsmith");
    });

    it("Profile update rejects a duplicate email", async () => {
      const userA = await registeredSession();
      const userB = await otherRegisteredSession();

      const response = await updateProfile(userA, validProfile({ email: "bsmith@example.com" }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email is already registered.");
      expect((await db.user.findByPk(userB.userId)).email).toBe("bsmith@example.com");
    });
  });
});
