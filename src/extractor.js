const R = require('ramda');
const {
  REGISTER,
  CHANGE_CURRENT,
  REGISTER_X_QUEUE,
  GIVEUP_X_QUEUE,
  FINISH,
  Q,
  QX,
  QS,
  S,
  REGISTER_MASTER,
  HELP,
  CANCEL_USER_CURRENT_QUEUE,
  CANCEL_USER_X_QUEUE,
  FINISH_USER_CURRENT_QUEUE,
  FINISH_USER_X_QUEUE,
  REGISTER_USER_X_QUEUE,
  DELETE_USER,
  WATERMETER,
} = require('./constants/actions');

module.exports = {
  // member cmd
  [REGISTER]: (text) => !R.isNil(text.match(/^註冊$/)),
  [CHANGE_CURRENT]: (text) => {
    const [, x] = (text.match(/^到([1-5])王$/) || text.match(/^([1-5])王上線$/) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [REGISTER_X_QUEUE]: (text) => {
    const [, x] = (text.match(/^(?:排|報)([1-5])王$/) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [GIVEUP_X_QUEUE]: (text) => {
    const [, x] = (text.match(/^棄([1-5])王$/) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [FINISH]: (text) => !R.isNil(text.match(/^完刀$/)),
  [Q]: (text) => !R.isNil(text.match(/^Q$/i)),
  [QX]: (text) => {
    const [, x] = (text.match(/^Q([1-5])$/i) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [QS]: (text) => !R.isNil(text.match(/^Qs$/i)),
  [S]: (text) => !R.isNil(text.match(/^S$/i)),
  [REGISTER_MASTER]: (text) => !R.isNil(text.match(/^I am Master!$/i)),
  [HELP]: (text) => !R.isNil(text.match(/^help$/i)),

  // master cmd
  [CANCEL_USER_CURRENT_QUEUE]: (text) => {
    const [, displayName] = (text.match(/^取消 @([^1-5]+)$/) || []);
    return displayName
      ? { displayName: R.trim(displayName) }
      : false;
  },
  [CANCEL_USER_X_QUEUE]: (text) => {
    const [, displayName, x] = (text.match(/^取消 @([^1-5]+)([1-5])王$/) || []);
    return displayName
      ? { displayName: R.trim(displayName), x: ~~x - 1 }
      : false;
  },
  [FINISH_USER_CURRENT_QUEUE]: (text) => {
    const [, displayName] = (text.match(/^@([^完刀]+) 完刀$/) || []);
    return displayName
      ? { displayName: R.trim(displayName) }
      : false;
  },
  [FINISH_USER_X_QUEUE]: (text) => {
    const [, displayName, x] = (text.match(/^@([^1-5]+)([1-5])王完刀$/) || []);
    return displayName
      ? { displayName: R.trim(displayName), x: ~~x - 1 }
      : false;
  },
  [REGISTER_USER_X_QUEUE]: (text) => {
    const [, displayName, x] = (text.match(/^@([^排報]+)(?:排|報)([1-5])王$/) || []);
    return displayName
      ? { displayName: R.trim(displayName), x: ~~x - 1 }
      : false;
  },
  [DELETE_USER]: (text) => {
    const [, displayName] = (text.match(/^註銷 @([^@]+)$/) || []);
    return displayName
      ? { displayName: R.trim(displayName) }
      : false;
  },
  [WATERMETER]: (text) => !R.isNil(text.match(/^查水錶$/i)),
};
