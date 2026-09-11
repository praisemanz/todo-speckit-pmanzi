export default (sequelize, Sequelize) => {
  const List = sequelize.define("list", {
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
  });

  return List;
};
