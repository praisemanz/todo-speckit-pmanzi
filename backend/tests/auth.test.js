/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  closeTestDatabase,
  registerUser,
  loginUser,
  validRegistration,
} from "./helpers.js";

beforeEach(syncTestDatabase);
afterAll(closeTestDatabase);

describe("Feature 1 — Authentication API", () => {
  describe("US-1.1 — Registration", () => {
    it("User registers with valid information", async () => {
      const response = await registerUser();

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        username: "jdoe",
        email: "jane@example.com",
        fName: "Jane",
        lName: "Doe",
        role: "worker",
      });
      expect(response.body.userId).toEqual(expect.any(Number));
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.password).toBeUndefined();

      const stored = await db.user.unscoped().findOne({ where: { username: "jdoe" } });
      expect(stored.password).not.toBe("password123");
      expect(stored.password.startsWith("$2")).toBe(true);

      const session = await db.session.findOne({ where: { userId: stored.id } });
      expect(session.token).toBe(response.body.token);
    });

    it("User submits registration with missing email", async () => {
      const response = await registerUser({ email: "" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email is required.");
      expect(await db.user.count()).toBe(0);
    });

    it("User submits registration with password too short", async () => {
      const response = await registerUser({ password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password must be at least 8 characters.");
      expect(await db.user.count()).toBe(0);
    });

    it("User registers with a duplicate username", async () => {
      await registerUser();

      const response = await registerUser({ email: "other@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Username is already taken.");
      expect(await db.user.count()).toBe(1);
    });

    it("User registers with a duplicate email", async () => {
      await registerUser();

      const response = await registerUser({ username: "someoneelse" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Email is already registered.");
      expect(await db.user.count()).toBe(1);
    });
  });

  describe("US-1.2 — Sign in", () => {
    it("User signs in with valid credentials", async () => {
      await registerUser();

      const response = await loginUser({ username: "jdoe", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        username: "jdoe",
        email: "jane@example.com",
        role: "worker",
      });
      expect(response.body.token).toEqual(expect.any(String));
      expect(response.body.password).toBeUndefined();

      const sessions = await db.session.findAll({ where: { userId: response.body.userId } });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].token).toBe(response.body.token);
    });

    it("User signs in with invalid password", async () => {
      await registerUser();

      const response = await loginUser({ username: "jdoe", password: "wrong-password" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid username or password.");
      expect(response.body.token).toBeUndefined();
    });

    it("User signs in with missing username", async () => {
      await registerUser();

      const response = await loginUser({ username: "   ", password: "password123" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Username is required.");
    });

    it("User signs in with missing password", async () => {
      await registerUser();

      const response = await loginUser({ username: "jdoe", password: "" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password is required.");
    });

    it("reuses a non-expired session instead of issuing a second token", async () => {
      const registration = await registerUser();

      const response = await loginUser({
        username: validRegistration().username,
        password: validRegistration().password,
      });

      expect(response.body.token).toBe(registration.body.token);
      expect(await db.session.count()).toBe(1);
    });
  });

  describe("US-1.4 — Sign out", () => {
    it("User signs out", async () => {
      const registration = await registerUser();
      const { token } = registration.body;

      const response = await request(app)
        .post("/todo/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);

      const session = await db.session.findOne({ where: { userId: registration.body.userId } });
      expect(session.token).toBe("");

      const replay = await request(app)
        .post("/todo/logout")
        .set("Authorization", `Bearer ${token}`);
      expect(replay.status).toBe(401);
    });
  });
});
