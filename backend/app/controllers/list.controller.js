import db from "../models/index.js";
import { getAccessibleListOrNull } from "../authorization/authorization.js";
import logger from "../config/logger.js";

const List = db.list;

const MAX_NAME_LENGTH = 100;

const cleanName = (value) => (typeof value === "string" ? value.trim() : "");

const nameError = (name) => {
  if (!name) {
    return "List name is required.";
  }

  if (name.length > MAX_NAME_LENGTH) {
    return `List name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  return null;
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const lists = await List.findAll({
      where: { userId: req.user.id },
      order: [["name", "ASC"]],
    });

    return res.send(lists);
  } catch (err) {
    logger.error(`Could not load lists: ${err.message}`);
    return res.status(500).send({ message: "Could not load lists." });
  }
};

exports.create = async (req, res) => {
  const name = cleanName(req.body.name);
  const invalid = nameError(name);

  if (invalid) {
    return res.status(400).send({ message: invalid });
  }

  try {
    // Ownership comes from the session only — never from the request body.
    const list = await List.create({ name, userId: req.user.id });

    return res.status(201).send(list);
  } catch (err) {
    logger.error(`Could not create list: ${err.message}`);
    return res.status(500).send({ message: "Could not create the list." });
  }
};

exports.update = async (req, res) => {
  const listId = parseInt(req.params.listId, 10);

  if (Number.isNaN(listId)) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  const name = cleanName(req.body.name);
  const invalid = nameError(name);

  if (invalid) {
    return res.status(400).send({ message: invalid });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    list.name = name;
    await list.save();

    return res.send(list);
  } catch (err) {
    logger.error(`Could not rename list: ${err.message}`);
    return res.status(500).send({ message: "Could not rename the list." });
  }
};

exports.delete = async (req, res) => {
  const listId = parseInt(req.params.listId, 10);

  if (Number.isNaN(listId)) {
    return res.status(400).send({ message: "Invalid list id." });
  }

  try {
    const list = await getAccessibleListOrNull(req, listId);

    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    await list.destroy();

    return res.send({ message: "List deleted." });
  } catch (err) {
    logger.error(`Could not delete list: ${err.message}`);
    return res.status(500).send({ message: "Could not delete the list." });
  }
};

export default exports;
