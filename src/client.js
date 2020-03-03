require('dotenv').config();
const { Client } = require('@line/bot-sdk');

const {
  SECRET,
  ACCESS_TOKEN,
} = process.env;

const config = {
  channelSecret: SECRET,
  channelAccessToken: ACCESS_TOKEN,
};

module.exports = {
  client: new Client(config),
  config,
};
