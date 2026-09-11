export default (sequelize, Sequelize) => {
  const User = sequelize.define(
    "user",
    {
      fName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      lName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "worker",
      },
    },
    {
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
      // Uniqueness is declared as named indexes, not `unique: true` attributes:
      // sync({ alter: true }) re-adds attribute-level unique indexes on every
      // boot until MySQL's 64-key-per-table limit is hit.
      indexes: [
        { name: "email", unique: true, fields: ["email"] },
        { name: "username", unique: true, fields: ["username"] },
      ],
    }
  );

  return User;
};
