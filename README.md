# Viewtron Node.js SDK

Node.js SDK for Viewtron AI cameras and NVRs. Receive and parse license plate recognition (LPR), face detection, intrusion, and counting events via HTTP Post.

## Installation

```bash
npm install viewtron-sdk
```

## Quick Start

### Event Server

Receive events from cameras with a built-in HTTP server that handles all camera connection requirements (HTTP/1.1 persistent connections, keepalive timeouts, XML responses).

```javascript
const { ViewtronServer } = require('viewtron-sdk');

const server = new ViewtronServer({ port: 5050 });

server.on('connect', (clientIP) => {
  console.log(`Camera connected: ${clientIP}`);
});

server.on('event', (event, clientIP) => {
  console.log(`${event.category} from ${clientIP}`);
  console.log(`${event.format} ${event.configVersion}`);

  if (event.category === 'lpr') {
    console.log(`Plate: ${event.plateNumber}`);
    console.log(`Group: ${event.plateGroup || 'not in database'}`);
  }

  if (event.hasImages) {
    // Save the plate crop image
    const fs = require('fs');
    fs.writeFileSync('plate.jpg', event.targetImageBytes);
  }
});

server.on('unparsed', (xml, clientIp, reason) => {
  console.log(`Unparsed post from ${clientIp}: ${reason}`);
});

server.start();
```

### Parse Events Directly

Parse XML from any HTTP POST body without using the built-in server.

```javascript
const { ViewtronEvent } = require('viewtron-sdk');

const event = ViewtronEvent(xmlString);
if (event) {
  console.log(event.category);       // 'lpr', 'face', 'intrusion', 'counting', 'metadata'
  console.log(event.plateNumber);    // 'ABC1234'
  console.log(event.plateGroup);     // 'whiteList', 'blackList', or ''
  console.log(event.configVersion);  // '2.1.0'
  console.log(event.format);         // 'v2'
}
```

## Camera Setup

1. Open camera web interface → **Setup → Network → HTTP Post**
2. Set **Push Protocol Version** to **V1**
3. Add server: `http://<your-server-ip>:<port>`
4. Set **Connection Type** to **Persistent connection**
5. Enable **Send Heartbeat** (30-second interval)
6. Check **Smart event data**, **Original picture**, **Target picture**
7. **Reboot the camera** after saving

## Event Fields

Every event has these common fields:

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | `'IPC'` or `'NVR'`. `'NVR'` currently means the post used a v2 envelope. Kept for compatibility. A later release may derive the device kind from `channelId`. |
| `format` | string | `'v1'` or `'v2'`, from the major digit of the config version |
| `configVersion` | string | Config version attribute, for example `'1.7'` or `'2.1.0'` |
| `category` | string | `'lpr'`, `'face'`, `'intrusion'`, `'counting'`, `'metadata'`, `'traject'` |
| `eventType` | string | Raw alarm type code (e.g., `'VEHICE'`, `'vehicle'`, `'PEA'`) |
| `eventDescription` | string | Human-readable description |
| `cameraName` | string | Device name |
| `cameraIp` | string | Camera IP address |
| `cameraMac` | string | Camera MAC address |
| `channelId` | string | Channel id when the post includes one |
| `timestamp` | string | Raw `currentTime` text from the camera |
| `eventTime` | Date\|null | Camera event time. Seconds, milliseconds, and microseconds are chosen by magnitude |
| `xml` | string | Raw XML for debugging |

### LPR Fields

| Field | Type | Description |
|-------|------|-------------|
| `plateNumber` | string | Detected plate text |
| `plateGroup` | string | List or group name from the post. Empty when the plate is not in a named group. |
| `plateList` | string\|null | `'whiteList'`, `'blackList'`, `'temporaryList'`, or `'strangerList'` when the post uses one of those names. `null` for any other group. |
| `direction` | string\|null | `'approach'`, `'away'`, or `null` |
| `confidence` | number\|null | `0`–`100`. `PlateConfidence` `count="9900"` is `99`. `null` when the post has no confidence. |
| `vehicleColor` | string | Vehicle color, when the post includes it |
| `vehicleBrand` | string | Vehicle brand |
| `vehicleType` | string | Vehicle type |
| `vehicleModel` | string | Vehicle model |
| `plateColor` | string | Plate color (v2 envelope) |
| `carOwner` | string | Owner name from an NVR database |
| `vehicle` | object\|null | `{ type, color, brand, model }` when car attributes are present |

Only approaching allow-list cars at 90% confidence or better:

```javascript
server.on('event', (event) => {
  if (event.category !== 'lpr') return;
  if (event.plateList !== 'whiteList') return;
  if (event.direction !== 'approach') return;
  if (event.confidence == null || event.confidence < 90) return;

  console.log(event.plateNumber, event.vehicleColor, event.eventTime);
});
```

### Face Fields

| Field | Type | Description |
|-------|------|-------------|
| `face` | object\|null | `{ age, sex, glasses, mask }` (NVR only — IPC face detection has no attributes) |

### Detection Fields (Intrusion, Counting)

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event identifier |
| `targetId` | string | Target identifier |
| `targetType` | string | `'person'`, `'car'`, `'motorcycle'` |
| `status` | string | `'SMART_START'`, etc. (IPC only) |
| `boundary` | string | `'area'`, `'tripwire'` (NVR only) |

### Image Fields

| Field | Type | Description |
|-------|------|-------------|
| `sourceImage` | string | Overview image as base64 string |
| `targetImage` | string | Cropped target image as base64 string |
| `sourceImageBytes` | Buffer\|null | Decoded overview image (lazy, cached) |
| `targetImageBytes` | Buffer\|null | Decoded crop image (lazy, cached) |
| `hasImages` | boolean | Whether any images are present |

## API Reference

### `ViewtronEvent(postBody)`

Parse an XML POST body from a Viewtron camera or NVR.

- **postBody** `string` — Raw XML from camera HTTP POST
- **Returns** `ViewtronEvent | null` — Parsed event, or `null` for keepalives, alarm status, and unrecognized payloads. Parsed events include `configVersion` and `format`.

### `new ViewtronServer(options)`

HTTP server that receives camera events.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | number | `5050` | Port to listen on |
| `maxBodySize` | number | `5242880` | Max POST body size (bytes) |
| `onEvent` | function | — | Shorthand for `server.on('event', fn)` |
| `onConnect` | function | — | Shorthand for `server.on('connect', fn)` |
| `onRaw` | function | — | Shorthand for `server.on('raw', fn)` |
| `onUnparsed` | function | — | Shorthand for `server.on('unparsed', fn)` |

**Events:**

| Event | Arguments | Description |
|-------|-----------|-------------|
| `event` | `(event, clientIP)` | Parsed ViewtronEvent |
| `connect` | `(clientIP)` | First message from a new camera IP |
| `raw` | `(xml, clientIP)` | Raw XML before parsing. Omitted for keepalives, traject, and alarm status. |
| `unparsed` | `(xml, clientIp, reason)` | Post did not become an event. See reasons below. |
| `listening` | `({ port, ip })` | Server started |
| `error` | `(err)` | Server error |

**`unparsed` reasons:**

| Reason | When |
|--------|------|
| `unknown-smartType` | `smartType` is missing or not accepted for that post |
| `no-messageType` | A v2 post has no `messageType` and was not parsed as a v1 body |
| `parse-error` | The XML could not be parsed |
| `alarmStatus` | Alarm on/off notice with no detection payload |

Keepalives, traject posts, and bodies that are not XML do not emit `unparsed`. An alarm-status post that has device info and no `smartType` counts as a connection and does not emit `raw`.

**Methods:**

- `server.start()` → `Promise<{ port, ip }>` — Start listening
- `server.stop()` → `Promise<void>` — Graceful shutdown
- `server.connectedCameras` → `Map<string, Date>` — Connected camera IPs and first-seen timestamps

## Config version 2.x

Any config version that starts with `2` is the v2 family, including `2.1.0` and later 2.x versions. A post laid out like a 2.0 event parses the same way.

- A 2.x post with no `messageType` and a v1 `smartType` (for example `VEHICE` or `PEA`) is parsed with the v1 layout. `source` is `'IPC'` and `format` is `'v2'`.
- A direct camera can also post that same v1 plate layout with config version `1.7` (no `messageType`, `smartType` `VEHICE`). That post parses as an LPR event. `format` is `'v1'`.
- `smartType` matching is case-insensitive inside each layout, and the category stays the one in that table. `VEHICLE` in a v2 envelope is a v2 plate event only when `licensePlateListInfo` is present. Without that list the post is `unparsed` with reason `unknown-smartType`. The canonical spelling `vehicle` is unchanged: it still requires `messageType` of `alarmData` and does not require the plate list.

## IPC vs NVR

The SDK automatically detects and handles both formats. `source: 'NVR'` means the event was parsed from a v2 envelope:

| Feature | IPC v1.x (Direct) | NVR v2.0 (Via NVR) |
|---------|-------------------|-------------------|
| Face attributes | No | Yes (age, sex, glasses, mask) |
| Vehicle attributes | When the post includes `carAttr` | Yes (type, color, brand, model) |
| Plate group | `whiteList` / `blackList` / `temporaryList` / `strangerList` | User-defined group name |
| Channel ID | When the post includes it | Yes |
| Device info | Name, MAC, and channel when present | Name, IP, MAC, channel |

## Example Server

Run the included example server to test your camera connection:

```bash
node examples/server.js 5050
```

## Links

- [Viewtron Developer Docs](https://videos.cctvcamerapros.com/developer/)
- [Python SDK](https://github.com/mikehaldas/viewtron-python-sdk)
- [Node-RED Integration](https://github.com/mikehaldas/node-red-contrib-viewtron)
- [Home Assistant Integration](https://github.com/mikehaldas/viewtron-home-assistant)

Maintainers: see [RELEASING.md](RELEASING.md).

## License

MIT
