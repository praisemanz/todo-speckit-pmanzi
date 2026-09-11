import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import db from "../models/index.js";
import { getAccessibleUserOrNull } from "../authorization/authorization.js";
import logger from "../config/logger.js";

const User = db.user;

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/** Built field by field so a freshly assigned password hash can never leak. */
const profilePayload = (user) => ({
  id: user.id,
  fName: user.fName,
  lName: user.lName,
  email: user.email,
  username: user.username,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const exports = {};

exports.findOne = async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).send({ message: "Invalid user id." });
  }

  try {
    const user = await getAccessibleUserOrNull(req, userId);

    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    return res.send(profilePayload(user));
  } catch (err) {
    logger.error(`Could not load profile: ${err.message}`);
    return res.status(500).send({ message: "Could not load the profile." });
  }
};

exports.update = async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).send({ message: "Invalid user id." });
  }

  const fName = clean(req.body.fName);
  const lName = clean(req.body.lName);
  const email = clean(req.body.email);
  const username = clean(req.body.username).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!fName) {
    return res.status(400).send({ message: "First name is required." });
  }

  if (!lName) {
    return res.status(400).send({ message: "Last name is required." });
  }

  if (!email) {
    return res.status(400).send({ message: "Email is required." });
  }

  if (!username) {
    return res.status(400).send({ message: "Username is required." });
  }

  // Password is optional on update; only validate it when the client sends one.
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .send({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  try {
    const user = await getAccessibleUserOrNull(req, userId);

    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    const takenBySomeoneElse = { id: { [Op.ne]: userId } };

    if (await User.findOne({ where: { username, ...takenBySomeoneElse } })) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    if (await User.findOne({ where: { email, ...takenBySomeoneElse } })) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    user.fName = fName;
    user.lName = lName;
    user.email = email;
    user.username = username;

    if (password) {
      user.password = bcrypt.hashSync(password, SALT_ROUNDS);
    }

    await user.save();

    return res.send(profilePayload(user));
  } catch (err) {
    logger.error(`Could not update profile: ${err.message}`);
    return res.status(500).send({ message: "Could not update the profile." });
  }
};

export default exports;
