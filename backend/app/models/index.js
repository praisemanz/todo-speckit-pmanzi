import { Sequelize } from "sequelize";
import sequelize from "../config/sequelizeInstance.js";
import userModel from "./user.model.js";
import sessionModel from "./session.model.js";
import listModel from "./list.model.js";
import todoModel from "./todo.model.js";

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = userModel(sequelize, Sequelize);
db.session = sessionModel(sequelize, Sequelize);
db.list = listModel(sequelize, Sequelize);
db.todo = todoModel(sequelize, Sequelize);

db.user.hasMany(db.session, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
db.session.belongsTo(db.user, { foreignKey: "userId" });

db.user.hasMany(db.list, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
db.list.belongsTo(db.user, { foreignKey: "userId" });

db.list.hasMany(db.todo, {
  foreignKey: { name: "listId", allowNull: false },
  onDelete: "CASCADE",
});
db.todo.belongsTo(db.list, { foreignKey: "listId" });

db.user.hasMany(db.todo, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
db.todo.belongsTo(db.user, { foreignKey: "userId" });

export default db;
