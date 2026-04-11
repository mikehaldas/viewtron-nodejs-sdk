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

server.start();
```

### Parse Events Directly

Parse XML from any HTTP POST body without using the built-in server.

```javascript
const { ViewtronEvent } = require('viewtron-sdk');

const event = ViewtronEvent(xmlString);
if (event) {
  console.log(event.category);    // 'lpr', 'face', 'intrusion', 'counting', 'metadata'
  console.log(event.plateNumber); // 'ABC1234'
  console.log(event.plateGroup);  // 'whiteList', 'blackList', or ''
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
| `source` | string | `'IPC'` (direct from camera) or `'NVR'` (via NVR) |
| `category` | string | `'lpr'`, `'face'`, `'intrusion'`, `'counting'`, `'metadata'`, `'traject'` |
| `eventType` | string | Raw alarm type code (e.g., `'VEHICE'`, `'vehicle'`, `'PEA'`) |
| `eventDescription` | string | Human-readable description |
| `cameraName` | string | Device name |
| `cameraIp` | string | Camera IP address |
| `cameraMac` | string | Camera MAC address |
| `channelId` | string | NVR channel ID |
| `timestamp` | string | Event timestamp |
| `xml` | string | Raw XML for debugging |

### LPR Fields

| Field | Type | Description |
|-------|------|-------------|
| `plateNumber` | string | Detected plate text |
| `plateGroup` | string | IPC: `'whiteList'`, `'blackList'`, `'temporaryList'`. NVR: user-defined group name. Empty if not in database. |
| `plateColor` | string | Plate color (NVR only) |
| `carOwner` | string | Owner name from NVR database |
| `vehicle` | object\|null | `{ type, color, brand, model }` (NVR only) |

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
- **Returns** `ViewtronEvent | null` — Parsed event, or `null` for keepalives, alarm status, and unrecognized payloads

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

**Events:**

| Event | Arguments | Description |
|-------|-----------|-------------|
| `event` | `(event, clientIP)` | Parsed ViewtronEvent |
| `connect` | `(clientIP)` | First message from a new camera IP |
| `raw` | `(xml, clientIP)` | Raw XML before parsing |
| `listening` | `({ port, ip })` | Server started |
| `error` | `(err)` | Server error |

**Methods:**

- `server.start()` → `Promise<{ port, ip }>` — Start listening
- `server.stop()` → `Promise<void>` — Graceful shutdown
- `server.connectedCameras` → `Map<string, Date>` — Connected camera IPs and first-seen timestamps

## IPC vs NVR

The SDK automatically detects and handles both formats:

| Feature | IPC v1.x (Direct) | NVR v2.0 (Via NVR) |
|---------|-------------------|-------------------|
| Face attributes | No | Yes (age, sex, glasses, mask) |
| Vehicle attributes | No | Yes (type, color, brand, model) |
| Plate group | `whiteList` / `blackList` / `temporaryList` | User-defined group name |
| Channel ID | No | Yes |
| Device info | Camera name only | Name, IP, MAC, channel |

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

## License

MIT
