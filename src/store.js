module.exports = {
  current: 0,
  finish: 0,
  queue: [
    // [userId1, userId2, userId3]
    [], [], [], [], [],
  ],
  // TODO: handle change displayName
  // TODO: support independent counter and queue for different group chat
  // TODO: need a db?
  watermeter: {
    // [userId]: {
    //   displayName,
    //   finish,
    // }
  },
  masterId: '',
  userIdDisplayNameMap: {
    // [userId]: displayName,
  },
  displayNameUserIdMap: {
    // [displayName]: userId,
  },
}
