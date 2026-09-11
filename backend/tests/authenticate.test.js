/**
 * Feature 1 — User Authentication & Session Management
 * Spec: features/feature-1-user-auth.md
 *
 * `POST /todo/logout` is the only authenticated endpoint in Feature 1, so it stands
 * in for the protected route the US-1.3 scenarios describe. Feature 2 adds
 * `GET /todo/lists` coverage for per-user list isolation.
 */
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, closeTestDatabase, registerUser, expireSession } from "./helpers.js";

const PROTECTED_ROUTE = "/todo/logout";

beforeEach(syncTestDatabase);
afterAll(closeTestDatabase);

describe("Feature 1 — Session authentication", () => {
  describe("US-1.3 — Stay signed in across page loads", () => {
    it("API request includes session token", async () => {
      const { body } = await registerUser();

      const withoutHeader = await request(app).post(PROTECTED_ROUTE);
      expect(withoutHeader.status).toBe(401);

      const withHeader = await request(app)
        .post(PROTECTED_ROUTE)
        .set("Authorization", `Bearer ${body.token}`);
      expect(withHeader.status).toBe(200);
    });

    it("Protected API request succeeds with a valid session", async () => {
      const userA = await registerUser();
      const userB = await registerUser({
        username: "bsmith",
        email: "bsmith@example.com",
      });

      const response = await request(app)
        .post(PROTECTED_ROUTE)
        .set("Authorization", `Bearer ${userA.body.token}`);

      expect(response.status).toBe(200);

      // The session token resolves to exactly one owner (FR-008), so user B's
      // data is never reachable with user A's token.
      const sessionA = await db.session.findOne({ where: { email: userA.body.email } });
      expect(sessionA.userId).toBe(userA.body.userId);
      expect(sessionA.userId).not.toBe(userB.body.userId);
    });

    it("Expired or invalid session token", async () => {
      const { body } = await registerUser();
      await expireSession(body.token);

      const expired = await request(app)
        .post(PROTECTED_ROUTE)
        .set("Authorization", `Bearer ${body.token}`);
      expect(expired.status).toBe(401);
      expect(expired.body.message).toMatch(/Unauthorized/i);

      const revoked = await request(app)
        .post(PROTECTED_ROUTE)
        .set("Authorization", "Bearer not-a-real-token");
      expect(revoked.status).toBe(401);
      expect(revoked.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-1.5 — Block unauthenticated access", () => {
    it("Unauthenticated user accesses a protected route", async () => {
      const response = await request(app).post(PROTECTED_ROUTE);

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });
});
