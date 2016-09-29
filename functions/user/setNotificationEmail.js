'use strict';

const User = require('../../lib/dynamoose/User.js');

module.exports.handler = (event, context, cb) => {
  User.get(event.principalId).then(user => {
    user.emailAddress = event.body.emailAddress;
    return User.saveVersioned(user);
  })
  .then(user => {
    cb(null, user);
  })
  .catch(err => {
    cb(err);
  });
};