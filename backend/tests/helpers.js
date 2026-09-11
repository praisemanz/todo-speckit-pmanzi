import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";

/** Sync schema for tests. MySQL refuses to drop parent tables while FKs point at them. */
export const syncTestDatabase = async () => {
  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  await db.sequelize.sync({ force: true });
  await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
};

export const closeTestDatabase = async () => {
  await db.sequelize.close();
};

export const validRegistration = (overrides = {}) => ({
  fName: "Jane",
  lName: "Doe",
  email: "jane@example.com",
  username: "jdoe",
  password: "password123",
  ...overrides,
});

export const registerUser = (overrides = {}) =>
  request(app).post("/todo/register").send(validRegistration(overrides));

export const loginUser = (credentials) => request(app).post("/todo/login").send(credentials);

/** Register a user and return the session payload the API issued. */
export const registeredSession = async (overrides = {}) => {
  const response = await registerUser(overrides);
  return response.body;
};

/** A second registered account, for cross-user isolation checks. */
export const otherRegisteredSession = () =>
  registeredSession({
    fName: "Bob",
    lName: "Smith",
    email: "bsmith@example.com",
    username: "bsmith",
  });

export const bearer = (session) => `Bearer ${session.token}`;

export const createList = (session, name) =>
  request(app).post("/todo/lists").set("Authorization", bearer(session)).send({ name });

export const createTodo = (session, listId, title) =>
  request(app)
    .post(`/todo/lists/${listId}/todos`)
    .set("Authorization", bearer(session))
    .send({ title });

/** Move a user's stored session into the past so it reads as expired. */
export const expireSession = async (token) => {
  await db.session.update(
    { expirationDate: new Date(Date.now() - 1000) },
    { where: { token } }
  );
};
