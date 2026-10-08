# Changelog

## 1.1.1 — 2026-10-08

Documentation only. No code changes.

- Updated the README example plate to `IB36NL`.
- Added product and documentation links to the README.
- Dated the 1.1.0 notes and linked the tested camera and the Node.js SDK guide.

## 1.1.0 — 2026-10-08

Parser and server support for Viewtron API 2.x posts. No camera or plate client in this release.

### Added

- `ViewtronServer` emits `unparsed` with `(xml, clientIp, reason)` when a post does not become an event. Reasons are `unknown-smartType`, `no-messageType`, `parse-error`, and `alarmStatus`. Pass `onUnparsed` to the constructor for the same listener.
- Parsed events include `configVersion` (the config version attribute, for example `2.1.0`) and `format` (`v1` or `v2`).
- `eventTime` is the camera's event time as a `Date`. `currentTime` is read as seconds, milliseconds, or microseconds based on its magnitude. `timestamp` stays the raw text.
- LPR events include `direction` (`approach`, `away`, or `null`), `confidence` (`0`–`100`; `PlateConfidence` `count="9900"` is `99`), `plateList` (`whiteList`, `blackList`, `temporaryList`, `strangerList`, or `null`), and `vehicleColor`, `vehicleBrand`, `vehicleType`, `vehicleModel`.

### Changed

- A version 2 post with no `messageType` and a v1 `smartType` is parsed with the v1 layout. `source` is `IPC` and `format` is `v2`.
- In a v2 envelope, `smartType` `VEHICLE` is parsed as a v2 plate event only when `licensePlateListInfo` is present. Otherwise the post is `unparsed` with reason `unknown-smartType`.
- `smartType` matching is case-insensitive within each layout. The category stays the one stored in that table.
- `source` values are unchanged. `NVR` means the event came from a v2 envelope.
- A direct camera plate post that uses the v1 layout (`smartType` `VEHICE`, no `messageType`, config version `1.7`) parses as an LPR event. Keepalives are ignored. Alarm-status posts emit `unparsed` with reason `alarmStatus`.

Posts that already parse on API 1.x and 2.0 keep the same field values, with `configVersion` and `format` added. `raw`, `event`, and `connect` keep their previous behavior.

Tested with the [Viewtron LPR-IP4 LPR camera](https://www.cctvcamerapros.com/LPR-Camera-p/lpr-ip4.htm) on firmware 5.3.x. Setup and field reference: [Node.js SDK guide](https://videos.cctvcamerapros.com/developer/docs/getting-started/nodejs-sdk/).
