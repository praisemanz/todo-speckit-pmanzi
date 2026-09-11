import db from "../models/index.js";
import {
  getAccessibleListOrNull,
  getAccessibleTodoOrNull,
} from "../authorization/authorization.js";
import logger from "../config/logger.js";

const Todo = db.todo;

const MAX_TITLE_LENGTH = 255;

const cleanTitle = (value) => (typeof value === "string" ? value.trim() : "");

const titleError = (title) => {
  if (!title) {
    return "Todo title is required.";
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return `Todo title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }

  return null;
};

/** Incomplete items first, then oldest first (FR-009). */
const TODO_ORDER = [
  ["completed", "ASC"],
  ["createdAt", "ASC"],
];

const exports = {};

exports.findAllByList = async (req, res) => {
  const listId = parseInt(req.params.listId, 10);

  if (Number.isNaN(listId)) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const todos = await Todo.findAll({
      where: { listId, userId: req.user.id },
      order: TODO_ORDER,
    });

    return res.send(todos);
  } catch (err) {
    logger.error(`Could not load todos: ${err.message}`);
    return res.status(500).send({ message: "Could not load todos." });
  }
};

exports.create = async (req, res) => {
  const listId = parseInt(req.params.listId, 10);

  if (Number.isNaN(listId)) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  const title = cleanTitle(req.body.title);
  const invalid = titleError(title);

  if (invalid) {
    return res.status(400).send({ message: invalid });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    // Ownership comes from the session and the validated parent list only.
    const todo = await Todo.create({ title, listId: list.id, userId: req.user.id });

    return res.status(201).send(todo);
  } catch (err) {
    logger.error(`Could not create todo: ${err.message}`);
    return res.status(500).send({ message: "Could not create the todo." });
  }
};

exports.update = async (req, res) => {
  const todoId = parseInt(req.params.id, 10);

  if (Number.isNaN(todoId)) {
    return res.status(400).send({ message: "Invalid todo id." });
  }

  const hasTitle = req.body.title !== undefined;
  const hasCompleted = req.body.completed !== undefined;

  if (!hasTitle && !hasCompleted) {
    return res.status(400).send({ message: "Nothing to update." });
  }

  const title = cleanTitle(req.body.title);

  if (hasTitle) {
    const invalid = titleError(title);

    if (invalid) {
      return res.status(400).send({ message: invalid });
    }
  }

  if (hasCompleted && typeof req.body.completed !== "boolean") {
    return res.status(400).send({ message: "Completed must be true or false." });
  }

  try {
    const todo = await getAccessibleTodoOrNull(req, todoId);

    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${todoId} not found.` });
    }

    if (hasTitle) {
      todo.title = title;
    }

    if (hasCompleted) {
      todo.completed = req.body.completed;
    }

    await todo.save();

    return res.send(todo);
  } catch (err) {
    logger.error(`Could not update todo: ${err.message}`);
    return res.status(500).send({ message: "Could not update the todo." });
  }
};

exports.delete = async (req, res) => {
  const todoId = parseInt(req.params.id, 10);

  if (Number.isNaN(todoId)) {
    return res.status(400).send({ message: "Invalid todo id." });
  }

  try {
    const todo = await getAccessibleTodoOrNull(req, todoId);

    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${todoId} not found.` });
    }

    await todo.destroy();

    return res.send({ message: "Todo deleted." });
  } catch (err) {
    logger.error(`Could not delete todo: ${err.message}`);
    return res.status(500).send({ message: "Could not delete the todo." });
  }
};

export default exports;
