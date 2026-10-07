# Changelog

## 1.1.0

Parser and server support for Viewtron API 2.x posts. No camera or plate client in this release.

### Added

- `ViewtronServer` emits `unparsed` with `(xml, clientIp, reason)` when a post does not become an event. Reasons are `unknown-smartType`, `no-messageType`, `parse-error`, and `alarmStatus`. Pass `onUnparsed` to the constructor for the same listener.
- Parsed events include `configVersion` (the config version attribute, for example `2.1.0`) and `format` (`v1` or `v2`).

### Changed

- A version 2 post with no `messageType` and a v1 `smartType` is parsed with the v1 layout. `source` is `IPC` and `format` is `v2`.
- In a v2 envelope, `smartType` `VEHICLE` is parsed as a v2 plate event only when `licensePlateListInfo` is present. Otherwise the post is `unparsed` with reason `unknown-smartType`.
- `smartType` matching is case-insensitive within each layout. The category stays the one stored in that table.
- `source` values are unchanged. `NVR` means the event came from a v2 envelope.

Posts that already parse on API 1.x and 2.0 keep the same field values, with `configVersion` and `format` added. `raw`, `event`, and `connect` keep their previous behavior.
