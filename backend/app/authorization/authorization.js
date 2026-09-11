import db from "../models/index.js";
import logger from "../config/logger.js";

const Session = db.session;
const User = db.user;
const List = db.list;
const Todo = db.todo;

const readBearerToken = (req) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
};

export const authenticate = async (req, res, next) => {
  const token = readBearerToken(req);

  if (!token) {
    return res.status(401).send({ message: "Unauthorized! No session token provided." });
  }

  try {
    const session = await Session.findOne({
      where: { token },
      include: [{ model: User }],
    });

    if (!session || !session.user) {
      return res.status(401).send({ message: "Unauthorized! Invalid session token." });
    }

    if (new Date(session.expirationDate).getTime() < Date.now()) {
      return res.status(401).send({ message: "Unauthorized! Session has expired." });
    }

    req.user = { id: session.user.id, role: session.user.role };
    req.session = session;

    return next();
  } catch (err) {
    logger.error(`Authentication failed: ${err.message}`);
    return res.status(500).send({ message: "Could not authenticate the request." });
  }
};

/** Row-level scope: a list is reachable only by the user who owns it. */
export const getAccessibleListOrNull = async (req, listId) => {
  const row = await List.findOne({ where: { id: listId, userId: req.user.id } });
  return row ?? null;
};

/** Row-level scope: a todo is reachable only by the user who owns it. */
export const getAccessibleTodoOrNull = async (req, todoId) => {
  const row = await Todo.findOne({ where: { id: todoId, userId: req.user.id } });
  return row ?? null;
};
