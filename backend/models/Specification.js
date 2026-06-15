import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Specification = sequelize.define('Specification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  masterJson: {
    type: DataTypes.JSON,
    allowNull: false
  },
  approvalStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending'
  },
  srsMarkdown: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

export default Specification;
