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

// Plate database list names carried on a direct camera post.
const PLATE_LISTS = new Set(['whiteList', 'blackList', 'temporaryList', 'strangerList']);

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

function getAttr(val, name) {
  if (val == null || typeof val !== 'object') return '';
  const attr = val['@_' + name];
  if (attr == null) return '';
  return String(attr).trim();
}

// currentTime is seconds, milliseconds, or microseconds. The magnitude picks the unit.
function eventTimeFromRaw(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  let ms;
  if (n >= 1e14) ms = n / 1000;
  else if (n >= 1e11) ms = n;
  else ms = n * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function setTimestamp(event, raw) {
  event.timestamp = getText(raw);
  event.eventTime = eventTimeFromRaw(event.timestamp);
}

function applyPlateList(event) {
  event.plateList = PLATE_LISTS.has(event.plateGroup) ? event.plateGroup : null;
}

function applyVehicleFields(event, car) {
  if (!car) return;
  const type = getText(car.carType) || getText(car.type);
  const color = getText(car.color);
  const brand = getText(car.brand);
  const model = getText(car.model);
  if (!(type || color || brand || model)) return;
  event.vehicleType = type;
  event.vehicleColor = color;
  event.vehicleBrand = brand;
  event.vehicleModel = model;
  event.vehicle = { type, color, brand, model };
}

function parseDirection(raw) {
  const text = getText(raw).toLowerCase();
  if (text === 'approach' || text === 'away') return text;
  return null;
}

// PlateConfidence count is hundredths of a percent: 9900 = 99.00.
function parseConfidence(node) {
  const raw = getAttr(node, 'count');
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n) / 100;
}

// Case-insensitive table lookup. The returned key keeps the table's spelling
// so the category does not change.
function resolveCategoryKey(table, raw) {
  if (!raw) return null;
  if (Object.prototype.hasOwnProperty.call(table, raw)) return raw;
  const folded = raw.toLowerCase();
  for (const key of Object.keys(table)) {
    if (key.toLowerCase() === folded) return key;
  }
  return null;
}

// format is v2 for any 2.x config version, and v1 otherwise.
function applyConfigMeta(event, config) {
  const version = getText(config['@_version']);
  event.configVersion = version;
  event.format = version.startsWith('2') ? 'v2' : 'v1';
}

// ==================== Event Class ====================

class ViewtronEvent {
  constructor() {
    // Source and classification
    // 'NVR' means the post used a v2 envelope. It is not a device-type check.
    this.source = '';            // 'IPC' or 'NVR'
    this.category = '';          // 'lpr', 'face', 'intrusion', 'counting', 'metadata', 'traject'
    this.eventType = '';         // raw smartType code
    this.eventDescription = '';  // human-readable description
    this.configVersion = '';     // config version attribute, for example '2.1.0'
    this.format = '';            // 'v1' or 'v2', from the config version major

    // Device info
    this.cameraName = '';
    this.cameraIp = '';
    this.cameraMac = '';
    this.channelId = '';

    // Timing
    this.timestamp = '';         // raw currentTime text
    this.eventTime = null;       // Date from currentTime (s / ms / µs by magnitude)

    // LPR fields
    this.plateNumber = '';
    this.plateColor = '';
    this.plateGroup = '';        // IPC list name or NVR group name; '' if absent
    this.plateList = null;       // whiteList/blackList/temporaryList/strangerList, or null
    this.direction = null;       // 'approach', 'away', or null
    this.confidence = null;      // 0–100, or null
    this.carOwner = '';
    this.vehicleColor = '';
    this.vehicleBrand = '';
    this.vehicleType = '';
    this.vehicleModel = '';
    this.vehicle = null;         // { type, color, brand, model } when the post includes them

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
  const canonical = resolveCategoryKey(IPC_CATEGORIES, alarmType);

  if (!canonical) return null;

  const event = new ViewtronEvent();
  event.source = 'IPC';
  event.category = IPC_CATEGORIES[canonical];
  event.eventType = alarmType;
  event.eventDescription = ALARM_DESCRIPTIONS[alarmType] || ALARM_DESCRIPTIONS[canonical] || alarmType;
  setTimestamp(event, config.currentTime);
  event.cameraName = getText(config['deviceNo.']) || getText(config.deviceName);
  event.cameraMac = getText(config.mac);
  event.channelId = getText(config.channelId);
  event.xml = xml;
  applyConfigMeta(event, config);

  // LPR — plate number, list, direction, confidence, and car attributes.
  // The overview item often has an empty plateNumber; use the item that has text.
  if (event.category === 'lpr' && config.listInfo) {
    const items = asArray(config.listInfo.item);
    let plateItem = null;
    for (const item of items) {
      if (item && getText(item.plateNumber)) plateItem = item;
    }
    if (plateItem) {
      event.plateNumber = getText(plateItem.plateNumber);
      event.plateGroup = getText(plateItem.vehicleListType);
      applyPlateList(event);
      event.direction = parseDirection(plateItem.vehicleDirect);
      event.confidence = parseConfidence(plateItem.PlateConfidence);
      applyVehicleFields(event, plateItem.carAttr);
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
  const alarmType = getText(config.smartType);
  const canonical = resolveCategoryKey(NVR_CATEGORIES, alarmType);
  if (!canonical) return null;

  // Exact "vehicle" keeps the 2.0 rule (alarmData is enough). Any other
  // spelling, such as VEHICLE, is the v2 plate event only when the v2 plate
  // list is present.
  const vehicleAlias = canonical === 'vehicle' && alarmType !== 'vehicle';
  if (vehicleAlias && !config.licensePlateListInfo) return null;
  if (msgType !== 'alarmData' && !(vehicleAlias && config.licensePlateListInfo)) return null;

  const event = new ViewtronEvent();
  event.source = 'NVR';
  event.category = NVR_CATEGORIES[canonical];
  event.eventType = alarmType;
  event.eventDescription = ALARM_DESCRIPTIONS[alarmType] || ALARM_DESCRIPTIONS[canonical] || alarmType;
  setTimestamp(event, config.currentTime);

  const deviceInfo = config.deviceInfo || {};
  event.cameraName = getText(deviceInfo.deviceName);
  event.cameraIp = getText(deviceInfo.ip);
  event.cameraMac = getText(deviceInfo.mac);
  event.channelId = getText(deviceInfo.channelId);
  event.xml = xml;
  applyConfigMeta(event, config);

  // LPR — plate, vehicle attributes, plate group
  if (event.category === 'lpr' && config.licensePlateListInfo) {
    const items = asArray(config.licensePlateListInfo.item);
    const plate = items[0];
    if (plate) {
      const attr = plate.licensePlateAttribute || {};
      event.plateNumber = getText(attr.licensePlateNumber);
      event.plateColor = getText(attr.color);

      applyVehicleFields(event, plate.carAttribute);

      const matchInfo = plate.licensePlateMatchInfo || {};
      event.plateGroup = getText(matchInfo.groupName);
      applyPlateList(event);
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
  applyConfigMeta(event, config);

  const deviceInfo = config.deviceInfo || {};
  event.cameraName = getText(deviceInfo.deviceName);
  event.cameraIp = getText(deviceInfo.ip);
  event.cameraMac = getText(deviceInfo.mac);
  event.channelId = getText(deviceInfo.channelId);
  setTimestamp(event, config.currentTime);

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

// reason is set only when a real post did not become an event.
// Keepalives and non-XML bodies leave reason null.
// Reasons: unknown-smartType, no-messageType, parse-error, alarmStatus.
function inspectPost(postBody) {
  if (!postBody || typeof postBody !== 'string') return { event: null, reason: null };
  if (!postBody.includes('<?xml')) return { event: null, reason: null };

  // Traject — detect early via string search (high-volume, special format)
  if (postBody.includes('<traject type="list"')) {
    const event = parseTraject(postBody);
    return { event, reason: event ? null : 'parse-error' };
  }

  // Alarm on/off notices carry no detection payload.
  if (postBody.includes('alarmStatusInfo')) {
    return { event: null, reason: 'alarmStatus' };
  }

  let parsed;
  try {
    parsed = xmlParser.parse(postBody);
  } catch (e) {
    return { event: null, reason: 'parse-error' };
  }

  const config = parsed.config;
  if (!config) return { event: null, reason: 'parse-error' };

  // Any 2.x config version uses the v2 envelope. 1.x stays on the v1 path.
  const version = String(config['@_version'] || '');
  if (version.startsWith('2')) {
    return inspectV2(config, postBody);
  }

  // v1 keepalive has a config element and no smartType.
  if (!config.smartType) return { event: null, reason: null };

  const event = parseIPC(config, postBody);
  return { event, reason: event ? null : 'unknown-smartType' };
}

// Route a version-2 post. Results that already parse at 2.0 stay the same.
// Posts that used to be dropped are parsed here or given an unparsed reason.
function inspectV2(config, postBody) {
  const msgType = getText(config.messageType);
  if (msgType === 'keepalive') return { event: null, reason: null };

  const smartRaw = getText(config.smartType);
  const nvrKey = resolveCategoryKey(NVR_CATEGORIES, smartRaw);
  const ipcKey = resolveCategoryKey(IPC_CATEGORIES, smartRaw);

  // VEHICLE (any spelling other than the canonical "vehicle") maps to the v2
  // plate parser only when licensePlateListInfo is present. Without that list
  // the post stays unparsed, even if VEHICLE is also a v1 smartType.
  if (nvrKey === 'vehicle' && smartRaw !== 'vehicle') {
    if (!config.licensePlateListInfo) {
      return { event: null, reason: 'unknown-smartType' };
    }
    const event = parseNVR(config, postBody);
    return { event, reason: event ? null : 'unknown-smartType' };
  }

  // No messageType, but the smartType belongs to the v1 table. Exact "vehicle"
  // is the v2 name, so it is not sent down the v1 path.
  if (!msgType && ipcKey && nvrKey !== 'vehicle') {
    const event = parseIPC(config, postBody);
    return { event, reason: event ? null : 'unknown-smartType' };
  }

  if (!msgType) return { event: null, reason: 'no-messageType' };

  if (msgType !== 'alarmData' || !nvrKey) {
    return { event: null, reason: 'unknown-smartType' };
  }

  const event = parseNVR(config, postBody);
  return { event, reason: event ? null : 'unknown-smartType' };
}

/**
 * Parse an HTTP POST body from a Viewtron camera or NVR.
 *
 * Returns a ViewtronEvent for recognized events, or null for keepalives,
 * alarm status messages, and unrecognized payloads. Parsed events include
 * `configVersion` (the config version attribute) and `format` (`v1` or `v2`).
 *
 * A config version of 2.x selects the v2 envelope. A 2.x post with no
 * `messageType` and a v1 `smartType` is parsed with the v1 layout instead.
 * Within each layout, `smartType` matching is case-insensitive.
 * `eventTime` is the camera time. `currentTime` is read as seconds,
 * milliseconds, or microseconds based on its magnitude.
 *
 * @param {string} postBody - Raw XML string from camera HTTP POST
 * @returns {ViewtronEvent|null}
 */
function parseEvent(postBody) {
  return inspectPost(postBody).event;
}

module.exports = {
  ViewtronEvent: parseEvent,
  ViewtronEventClass: ViewtronEvent,
  inspectPost,
  IPC_CATEGORIES,
  NVR_CATEGORIES,
  ALARM_DESCRIPTIONS,
  TARGET_TYPES,
};
