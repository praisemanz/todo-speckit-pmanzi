import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../models/index.js";
import authConfig from "../config/auth.config.js";
import logger from "../config/logger.js";

const User = db.user;
const Session = db.session;

const SALT_ROUNDS = 10;
const SESSION_TTL_SECONDS = 86400;
const MIN_PASSWORD_LENGTH = 8;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const sessionPayload = (user, token) => ({
  userId: user.id,
  username: user.username,
  email: user.email,
  fName: user.fName,
  lName: user.lName,
  role: user.role,
  token,
});

const issueSession = async (user) => {
  const token = jwt.sign({ id: user.id }, authConfig.secret, {
    expiresIn: SESSION_TTL_SECONDS,
  });

  await Session.create({
    token,
    email: user.email,
    expirationDate: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    userId: user.id,
  });

  return token;
};

const exports = {};

exports.register = async (req, res) => {
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .send({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }

  try {
    if (await User.findOne({ where: { username } })) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    if (await User.findOne({ where: { email } })) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    const user = await User.create({
      fName,
      lName,
      email,
      username,
      password: bcrypt.hashSync(password, SALT_ROUNDS),
    });

    const token = await issueSession(user);

    return res.status(201).send(sessionPayload(user, token));
  } catch (err) {
    logger.error(`Registration failed: ${err.message}`);
    return res.status(500).send({ message: "Could not create the account." });
  }
};

exports.login = async (req, res) => {
  const username = clean(req.body.username).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username) {
    return res.status(400).send({ message: "Username is required." });
  }

  if (!password) {
    return res.status(400).send({ message: "Password is required." });
  }

  try {
    const user = await User.unscoped().findOne({ where: { username } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).send({ message: "Invalid username or password." });
    }

    const activeSession = await Session.findOne({
      where: {
        userId: user.id,
        token: { [Op.ne]: "" },
        expirationDate: { [Op.gt]: new Date() },
      },
    });

    const token = activeSession ? activeSession.token : await issueSession(user);

    return res.send(sessionPayload(user, token));
  } catch (err) {
    logger.error(`Login failed: ${err.message}`);
    return res.status(500).send({ message: "Could not sign in." });
  }
};

exports.logout = async (req, res) => {
  try {
    req.session.token = "";
    await req.session.save();

    return res.send({ message: "Signed out." });
  } catch (err) {
    logger.error(`Logout failed: ${err.message}`);
    return res.status(500).send({ message: "Could not sign out." });
  }
};

export default exports;
