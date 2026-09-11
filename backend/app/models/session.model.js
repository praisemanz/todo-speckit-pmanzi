export default (sequelize, Sequelize) => {
  const Session = sequelize.define("session", {
    token: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    expirationDate: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  return Session;
};
