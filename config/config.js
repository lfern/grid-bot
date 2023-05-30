const {logger} = require('../src/utils/logger');
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

module.exports = {
  "development": {
    "username": process.env.DEV_POSTGRES_USERNAME,
    "password": process.env.DEV_POSTGRES_PASSWORD,
    "database": process.env.DEV_POSTGRES_DB,
    "host": process.env.DEV_POSTGRES_HOSTNAME,
    "port": process.env.DEV_POSTGRES_PORT,
    "dialect": "postgres",
    logging: process.env.LOG_QUERIES ? (msg) => logger.info(msg) : false
  },
  "test": {
    "username": process.env.TEST_POSTGRES_USERNAME,
    "password": process.env.TEST_POSTGRES_PASSWORD,
    "database": process.env.TEST_POSTGRES_DB,
    "host": process.env.TEST_POSTGRES_HOSTNAME,
    "port": process.env.TEST_POSTGRES_PORT,
    "dialect": "postgres",
    logging: false
  },
  "production": {
    "username": process.env.POSTGRES_USERNAME,
    "password": process.env.POSTGRES_PASSWORD,
    "database": process.env.POSTGRES_DB,
    "host": process.env.POSTGRES_HOSTNAME,
    "port": process.env.POSTGRES_PORT,
    "dialect": "postgres",
    logging: false
  }
}