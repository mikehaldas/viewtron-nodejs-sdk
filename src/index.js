'use strict';

const {
  ViewtronEvent,
  ViewtronEventClass,
  IPC_CATEGORIES,
  NVR_CATEGORIES,
  ALARM_DESCRIPTIONS,
  TARGET_TYPES,
} = require('./events');

const { ViewtronServer } = require('./server');

module.exports = {
  ViewtronEvent,
  ViewtronEventClass,
  ViewtronServer,
  IPC_CATEGORIES,
  NVR_CATEGORIES,
  ALARM_DESCRIPTIONS,
  TARGET_TYPES,
};
