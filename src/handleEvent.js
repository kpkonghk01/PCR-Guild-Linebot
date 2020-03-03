const R = require('ramda');

const ACTIONS = require('./constants/actions');
const extractor = require('./extractor');
const store = require('./store');
const cmdHandler = require('./cmdHandler');
const { client } = require('./client');

const { REGISTER } = ACTIONS;

module.exports = async (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const {
    source: {
      userId,
      groupId,
    },
  } = event;

  if (!store.userIdDisplayNameMap[userId]) {
    const {
      displayName,
      // pictureUrl,
    } = await client.getGroupMemberProfile(
      groupId,
      userId,
    );

    store.userIdDisplayNameMap[userId] = displayName;
    store.displayNameUserIdMap[displayName] = userId;

    await cmdHandler[REGISTER](userId)();
  }

  const reply = (msg) => client.replyMessage(
    event.replyToken,
    {
      type: 'text',
      text: msg,
    },
  );

  return R.reduce(
    (result, action) => result || R.pipe(
      extractor[action],
      R.ifElse(
        R.equals(false),
        R.always(null),
        cmdHandler[action](userId),
      ),
      R.unless(
        R.isNil,
        reply
      )
    )(event.message.text),
    null,
    R.values(ACTIONS)
  );
}
