require('dotenv').config();

const {
  SECRET,
  ACCESS_TOKEN,
} = process.env;

const config = {
  channelSecret: SECRET,
  channelAccessToken: ACCESS_TOKEN,
};