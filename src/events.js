'use strict';

const { XMLParser } = require('fast-xml-parser');

// XML parser configured for Viewtron camera output.
// Preserves attributes (needed for version detection) and handles
// mixed content nodes (text + attributes) via #text property.
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

// ==================== Lookup Tables ====================

// IPC v1.x smartType → category
const IPC_CATEGORIES = {
  VEHICE: 'lpr',
  VEHICLE: 'lpr',
  VFD: 'face',
  VFD_MATCH: 'face',
  PEA: 'intrusion',
  AOIENTRY: 'intrusion',
  AOILEAVE: 'intrusion',
  LOITER: 'intrusion',
  PVD: 'intrusion',
  VSD: 'metadata',
  PASSLINECOUNT: 'counting',
  TRAFFIC: 'counting',
};

// NVR v2.0 smartType → category
const NVR_CATEGORIES = {
  vehicle: 'lpr',
  videoFaceDetect: 'face',
  regionIntrusion: 'intrusion',
  lineCrossing: 'intrusion',
  targetCountingByLine: 'counting',
  targetCountingByArea: 'counting',
  videoMetadata: 'metadata',
};

// Human-readable alarm descriptions
const ALARM_DESCRIPTIONS = {
  // IPC v1.x
  MOTION: 'Motion Detection',
  SENSOR: 'External Sensor',
  PEA: 'Line Crossing / Intrusion',
  AVD: 'Exception Detection',
  OSC: 'Missing Object or Abandoned Object',
  CDD: 'Crowd Density Detection',
  VFD: 'Face Detection',
  VFD_MATCH: 'Face Match',
  VEHICE: 'License Plate Detection',
  VEHICLE: 'License Plate Detection',
  AOIENTRY: 'Intrusion Zone Entry',
  AOILEAVE: 'Intrusion Zone Exit',
  LOITER: 'Loitering Detection',
  PASSLINECOUNT: 'Line Crossing Target Count',
  TRAFFIC: 'Intrusion Target Count',
  FALLING: 'Falling Object Detection',
  EA: 'Motorcycle / Bicycle Detection',
  VSD: 'Video Metadata',
  PVD: 'Illegal Parking',
  // NVR v2.0
  regionIntrusion: 'Perimeter Intrusion',
  lineCrossing: 'Line Crossing',
  targetCountingByLine: 'Target Counting by Line',
  targetCountingByArea: 'Target Counting by Area',
  videoMetadata: 'Video Metadata',
  vehicle: 'License Plate Detection',
  videoFaceDetect: 'Face Detection',
};

// IPC v1.x uses numeric target type IDs
const TARGET_TYPES = { 1: 'person', 2: 'car', 4: 'motorcycle' };

// ==================== Helpers ====================

/**
 * Extract text from a fast-xml-parser value.
 * Handles both direct strings and objects with #text property.
 */
function getText(val) {
  if (val == null) return '';
  if (typeof val === 'object') {
    return String(val['#text'] || '').trim();
  }
  return String(val).trim();
}

/** Normalize a value to an array. Handles xmltodict/fast-xml-parser single-item quirk. */
function asArray(val) {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

/** Extract base64 image data, filtering out placeholder values. */
function extractBase64(val) {
  const text = getText(val);
  if (!text || text.startsWith('BASE64')) return '';
  return text;
}

// ==================== Event Class ====================

class ViewtronEvent {
  constructor() {
    // Source and classification
    this.source = '';            // 'IPC' or 'NVR'
    this.category = '';          // 'lpr', 'face', 'intrusion', 'counting', 'metadata', 'traject'
    this.eventType = '';         // raw smartType code
    this.eventDescription = '';  // human-readable description

    // Device info
    this.cameraName = '';
    this.cameraIp = '';
    this.cameraMac = '';
    this.channelId = '';

    // Timing
    this.timestamp = '';

    // LPR fields
    this.plateNumber = '';
    this.plateColor = '';
    this.plateGroup = '';        // IPC: 'whiteList'/'blackList'/'temporaryList', NVR: user-defined group name
    this.carOwner = '';
    this.vehicle = null;         // { type, color, brand, model } — NVR only

    // Face fields
    this.face = null;            // { age, sex, glasses, mask } — NVR only

    // Detection fields (intrusion, counting)
    this.eventId = '';
    this.targetId = '';
    this.targetType = '';        // 'person', 'car', 'motorcycle'
    this.status = '';
    this.boundary = '';

    // Images (base64 strings — use sourceImageBytes/targetImageBytes for Buffers)
    this.sourceImage = '';
    this.targetImage = '';

    // Traject (smart tracking) targets
    this.targets = null;         // array of { targetId, targetType, rect, velocity, direction }

    // Raw XML preserved for debugging
    this.xml = '';
  }

  /** Decoded source (overview) image as a Buffer. Lazy — decoded on first access. */
  get sourceImageBytes() {
    if (!this.sourceImage) return null;
    if (this._sourceImageBytes === undefined) {
      this._sourceImageBytes = Buffer.from(this.sourceImage, 'base64');
    }
    return this._sourceImageBytes;
  }

  /** Decoded target (crop) image as a Buffer. Lazy — decoded on first access. */
  get targetImageBytes() {
    if (!this.targetImage) return null;
    if (this._targetImageBytes === undefined) {
      this._targetImageBytes = Buffer.from(this.targetImage, 'base64');
    }
    return this._targetImageBytes;
  }

  /** Whether this event contains any image data. */
  get hasImages() {
    return !!(this.sourceImage || this.targetImage);
  }
}

// ==================== IPC v1.x Parsing ====================

function parseIPC(config, xml) {
  const st = config.smartType;
  const alarmType = getText(st) || (typeof st === 'string' ? st.trim() : '');

  if (!IPC_CATEGORIES[alarmType]) return null;

  const event = new ViewtronEvent();
  event.source = 'IPC';
  event.category = IPC_CATEGORIES[alarmType];
  event.eventType = alarmType;
  event.eventDescription = ALARM_DESCRIPTIONS[alarmType] || alarmType;
  event.timestamp = getText(config.currentTime);
  event.cameraName = getText(config['deviceNo.']);
  event.xml = xml;

  // LPR — plate number and database group
  if (event.category === 'lpr' && config.listInfo) {
    const items = asArray(config.listInfo.item);
    for (const item of items) {
      if (item && item.plateNumber) {
        event.plateNumber = getText(item.plateNumber);
        event.plateGroup = getText(item.vehicleListType);
      }
    }
  }

  // Intrusion / zone entry / zone exit / loitering
  if (event.category === 'intrusion') {
    // Perimeter event info
    const perimeter = config.perimeter || config.tripwire;
    if (perimeter && perimeter.perInfo) {
      const items = asArray(perimeter.perInfo.item);
      const info = items[0];
      if (info) {
        event.eventId = getText(info.eventId);
        event.targetId = getText(info.targetId);
        event.status = getText(info.status);
      }
    }
    // Target type from listInfo
    if (config.listInfo) {
      const items = asArray(config.listInfo.item);
      const target = items[0];
      if (target && target.targetImageData) {
        const tt = getText(target.targetImageData.targetType);
        event.targetType = TARGET_TYPES[tt] || tt;
      }
    }
  }

  // Counting — target type
  if (event.category === 'counting' && config.listInfo) {
    const items = asArray(config.listInfo.item);
    const target = items[0];
    if (target && target.targetImageData) {
      const tt = getText(target.targetImageData.targetType);
      event.targetType = TARGET_TYPES[tt] || tt;
    }
  }

  parseIPCImages(config, event);
  return event;
}

function parseIPCImages(config, event) {
  // Source image from sourceDataInfo
  const src = config.sourceDataInfo;
  if (src) {
    event.sourceImage = extractBase64(src.sourceBase64Data);
  }

  const items = config.listInfo ? asArray(config.listInfo.item) : [];

  if (items.length >= 2) {
    // Two items: first is overview fallback, second is target crop
    if (!event.sourceImage) {
      const overview = items[0];
      if (overview && overview.targetImageData) {
        event.sourceImage = extractBase64(overview.targetImageData.targetBase64Data);
      }
    }
    const target = items[1];
    if (target && target.targetImageData) {
      event.targetImage = extractBase64(target.targetImageData.targetBase64Data);
    }
  } else if (items.length === 1) {
    // Single item — treat as target crop
    const item = items[0];
    if (item && item.targetImageData) {
      event.targetImage = extractBase64(item.targetImageData.targetBase64Data);
    }
  }
}

// ==================== NVR v2.0 Parsing ====================

function parseNVR(config, xml) {
  const msgType = getText(config.messageType);
  if (msgType !== 'alarmData') return null;

  const alarmType = getText(config.smartType);
  if (!NVR_CATEGORIES[alarmType]) return null;

  const event = new ViewtronEvent();
  event.source = 'NVR';
  event.category = NVR_CATEGORIES[alarmType];
  event.eventType = alarmType;
  event.eventDescription = ALARM_DESCRIPTIONS[alarmType] || alarmType;
  event.timestamp = getText(config.currentTime);

  const deviceInfo = config.deviceInfo || {};
  event.cameraName = getText(deviceInfo.deviceName);
  event.cameraIp = getText(deviceInfo.ip);
  event.cameraMac = getText(deviceInfo.mac);
  event.channelId = getText(deviceInfo.channelId);
  event.xml = xml;

  // LPR — plate, vehicle attributes, plate group
  if (event.category === 'lpr' && config.licensePlateListInfo) {
    const items = asArray(config.licensePlateListInfo.item);
    const plate = items[0];
    if (plate) {
      const attr = plate.licensePlateAttribute || {};
      event.plateNumber = getText(attr.licensePlateNumber);
      event.plateColor = getText(attr.color);

      const car = plate.carAttribute || {};
      if (getText(car.brand) || getText(car.carType)) {
        event.vehicle = {
          type: getText(car.carType),
          color: getText(car.color),
          brand: getText(car.brand),
          model: getText(car.model),
        };
      }

      const matchInfo = plate.licensePlateMatchInfo || {};
      event.plateGroup = getText(matchInfo.groupName);
      const owner = getText(matchInfo.carOwner);
      if (owner) event.carOwner = owner;
    }
  }

  // Face — attributes (NVR v2.0 has age, sex, glasses, mask)
  if (event.category === 'face' && config.faceListInfo) {
    const items = asArray(config.faceListInfo.item);
    const face = items[0];
    if (face) {
      event.face = {
        age: getText(face.age),
        sex: getText(face.sex),
        glasses: getText(face.glasses),
        mask: getText(face.mask),
      };
    }
  }

  // Intrusion / line crossing / counting — event info and target type
  if (event.category === 'intrusion' || event.category === 'counting') {
    if (config.eventInfo) {
      const items = asArray(config.eventInfo.item);
      const ev = items[0];
      if (ev) {
        event.eventId = getText(ev.eventId);
        event.targetId = getText(ev.targetId);
        event.boundary = getText(ev.boundary);
      }
    }
    if (config.targetListInfo) {
      const items = asArray(config.targetListInfo.item);
      const target = items[0];
      if (target) {
        event.targetType = getText(target.targetType);
      }
    }
  }

  parseNVRImages(config, event);
  return event;
}

function parseNVRImages(config, event) {
  // Source image
  const src = config.sourceDataInfo;
  if (src) {
    event.sourceImage = extractBase64(src.sourceBase64Data);
  }

  // Target image — check all possible list structures
  for (const listKey of ['targetListInfo', 'licensePlateListInfo', 'faceListInfo']) {
    const list = config[listKey];
    if (list) {
      const items = asArray(list.item);
      const item = items[0];
      if (item && item.targetImageData) {
        const data = extractBase64(item.targetImageData.targetBase64Data);
        if (data) {
          event.targetImage = data;
          break;
        }
      }
    }
  }
}

// ==================== Traject Parsing ====================

function parseTraject(xml) {
  let parsed;
  try {
    parsed = xmlParser.parse(xml);
  } catch (e) {
    return null;
  }

  const config = parsed.config || parsed;
  const traject = config.traject;
  if (!traject) return null;

  const event = new ViewtronEvent();
  event.category = 'traject';
  event.eventType = 'traject';
  event.eventDescription = 'Smart Tracking';
  event.xml = xml;

  const deviceInfo = config.deviceInfo || {};
  event.cameraName = getText(deviceInfo.deviceName);
  event.cameraIp = getText(deviceInfo.ip);
  event.cameraMac = getText(deviceInfo.mac);
  event.channelId = getText(deviceInfo.channelId);
  event.timestamp = getText(config.currentTime);

  // Determine source
  const version = getText(config['@_version']);
  if (version.startsWith('2')) {
    event.source = event.channelId ? `NVR-ch${event.channelId}` : 'NVR';
  } else {
    event.source = 'IPC';
  }

  // Parse individual targets
  const targets = [];
  const items = asArray(traject.item);
  for (const item of items) {
    if (!item) continue;
    const rect = item.rect || {};
    targets.push({
      targetId: getText(item.targetId),
      targetType: getText(item.targetType),
      velocity: getText(item.velocity),
      direction: getText(item.direction),
      rect: {
        x1: getText(rect.x1),
        y1: getText(rect.y1),
        x2: getText(rect.x2),
        y2: getText(rect.y2),
      },
    });
  }
  event.targets = targets;

  return event;
}

// ==================== Factory Function ====================

/**
 * Parse an HTTP POST body from a Viewtron camera or NVR.
 *
 * Returns a ViewtronEvent object for recognized events, or null for
 * keepalives, alarm status messages, and unrecognized payloads.
 *
 * Automatically detects IPC v1.x vs NVR v2.0 format.
 *
 * @param {string} postBody - Raw XML string from camera HTTP POST
 * @returns {ViewtronEvent|null}
 */
function parseEvent(postBody) {
  if (!postBody || typeof postBody !== 'string') return null;
  if (!postBody.includes('<?xml')) return null;

  // Traject — detect early via string search (high-volume, special format)
  if (postBody.includes('<traject type="list"')) {
    return parseTraject(postBody);
  }

  // Skip alarm status messages (alarm on/off with no detection data)
  if (postBody.includes('alarmStatusInfo')) return null;

  let parsed;
  try {
    parsed = xmlParser.parse(postBody);
  } catch (e) {
    return null;
  }

  const config = parsed.config;
  if (!config) return null;

  // Version detection — NVR v2.0 uses version="2.0.0", IPC uses "1.x"
  const version = String(config['@_version'] || '');

  if (version.startsWith('2')) {
    // NVR v2.0
    const msgType = getText(config.messageType);
    if (msgType === 'keepalive') return null;
    return parseNVR(config, postBody);
  } else {
    // IPC v1.x — no smartType means keepalive
    if (!config.smartType) return null;
    return parseIPC(config, postBody);
  }
}

module.exports = {
  ViewtronEvent: parseEvent,
  ViewtronEventClass: ViewtronEvent,
  IPC_CATEGORIES,
  NVR_CATEGORIES,
  ALARM_DESCRIPTIONS,
  TARGET_TYPES,
};
