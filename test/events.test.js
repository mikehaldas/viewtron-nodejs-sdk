'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ViewtronEvent } = require('../src');

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

// ==================== IPC v1.x Events ====================

describe('IPC v1.x', () => {
  describe('LPR', () => {
    it('should parse plate number and group', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/lpr.xml'));
      assert.ok(event);
      assert.strictEqual(event.source, 'IPC');
      assert.strictEqual(event.category, 'lpr');
      assert.strictEqual(event.eventType, 'VEHICE');
      assert.strictEqual(event.eventDescription, 'License Plate Detection');
      assert.strictEqual(event.plateNumber, 'ABC1234');
      assert.strictEqual(event.plateGroup, 'whiteList');
    });

    it('should have timestamp', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/lpr.xml'));
      assert.ok(event.timestamp);
      assert.strictEqual(event.timestamp, '1732045234584193');
    });
  });

  describe('Perimeter Intrusion', () => {
    it('should parse intrusion event', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/perimeter-intrusion.xml'));
      assert.ok(event);
      assert.strictEqual(event.source, 'IPC');
      assert.strictEqual(event.category, 'intrusion');
      assert.strictEqual(event.eventType, 'PEA');
      assert.strictEqual(event.eventId, '220');
      assert.strictEqual(event.targetId, '20');
      assert.strictEqual(event.status, 'SMART_START');
      assert.strictEqual(event.targetType, 'person');
    });
  });

  describe('Line Crossing', () => {
    it('should parse as intrusion category', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/line-crossing.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'intrusion');
      assert.strictEqual(event.eventType, 'PEA');
    });
  });

  describe('Zone Entry', () => {
    it('should parse zone entry', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/zone-entry.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'intrusion');
      assert.strictEqual(event.eventType, 'AOIENTRY');
      assert.strictEqual(event.eventDescription, 'Intrusion Zone Entry');
    });
  });

  describe('Zone Exit', () => {
    it('should parse zone exit', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/zone-exit.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'intrusion');
      assert.strictEqual(event.eventType, 'AOILEAVE');
      assert.strictEqual(event.eventDescription, 'Intrusion Zone Exit');
    });
  });

  describe('Face Detection', () => {
    it('should parse face event', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/face-detection.xml'));
      assert.ok(event);
      assert.strictEqual(event.source, 'IPC');
      assert.strictEqual(event.category, 'face');
      assert.strictEqual(event.eventType, 'VFD');
    });

    it('should not have face attributes (IPC limitation)', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/face-detection.xml'));
      assert.strictEqual(event.face, null);
    });
  });

  describe('Video Metadata', () => {
    it('should parse metadata event', () => {
      const event = ViewtronEvent(fixture('ipc-v1x/video-metadata.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'metadata');
      assert.strictEqual(event.eventType, 'VSD');
    });
  });
});

// ==================== NVR v2.0 Events ====================

describe('NVR v2.0', () => {
  describe('Vehicle LPR', () => {
    it('should parse plate number and color', () => {
      const event = ViewtronEvent(fixture('nvr-v2/vehicle-lpr.xml'));
      assert.ok(event);
      assert.strictEqual(event.source, 'NVR');
      assert.strictEqual(event.category, 'lpr');
      assert.strictEqual(event.eventType, 'vehicle');
      assert.strictEqual(event.plateNumber, 'JP116D');
      assert.strictEqual(event.plateColor, 'white');
    });

    it('should parse vehicle attributes', () => {
      const event = ViewtronEvent(fixture('nvr-v2/vehicle-lpr.xml'));
      assert.ok(event.vehicle);
      assert.strictEqual(event.vehicle.type, 'mpv');
      assert.strictEqual(event.vehicle.color, 'white');
      assert.strictEqual(event.vehicle.brand, 'GMC');
      assert.strictEqual(event.vehicle.model, 'GMC_SAVANA');
    });

    it('should parse device info', () => {
      const event = ViewtronEvent(fixture('nvr-v2/vehicle-lpr.xml'));
      assert.strictEqual(event.cameraName, 'Device Name');
      assert.strictEqual(event.cameraIp, '192.168.0.60');
      assert.strictEqual(event.cameraMac, '58:5B:69:40:F4:0D');
      assert.strictEqual(event.channelId, '2');
    });
  });

  describe('Face Detection', () => {
    it('should parse face attributes', () => {
      const event = ViewtronEvent(fixture('nvr-v2/face-detection.xml'));
      assert.ok(event);
      assert.strictEqual(event.source, 'NVR');
      assert.strictEqual(event.category, 'face');
      assert.strictEqual(event.eventType, 'videoFaceDetect');
      assert.ok(event.face);
      assert.strictEqual(event.face.age, 'middleAged');
      assert.strictEqual(event.face.sex, 'male');
      assert.strictEqual(event.face.glasses, 'unknown');
      assert.strictEqual(event.face.mask, 'unknown');
    });
  });

  describe('Region Intrusion', () => {
    it('should parse intrusion with boundary', () => {
      const event = ViewtronEvent(fixture('nvr-v2/region-intrusion.xml'));
      assert.ok(event);
      assert.strictEqual(event.source, 'NVR');
      assert.strictEqual(event.category, 'intrusion');
      assert.strictEqual(event.eventType, 'regionIntrusion');
      assert.strictEqual(event.eventId, '916');
      assert.strictEqual(event.targetId, '716');
      assert.strictEqual(event.boundary, 'area');
      assert.strictEqual(event.targetType, 'person');
    });
  });

  describe('Line Crossing', () => {
    it('should parse line crossing as intrusion', () => {
      const event = ViewtronEvent(fixture('nvr-v2/line-crossing.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'intrusion');
      assert.strictEqual(event.eventType, 'lineCrossing');
      assert.strictEqual(event.boundary, 'tripwire');
      assert.strictEqual(event.targetType, 'person');
    });
  });

  describe('Target Counting by Line', () => {
    it('should parse counting event', () => {
      const event = ViewtronEvent(fixture('nvr-v2/target-counting-by-line.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'counting');
      assert.strictEqual(event.eventType, 'targetCountingByLine');
      assert.strictEqual(event.boundary, 'tripwire');
      assert.strictEqual(event.targetType, 'person');
    });
  });

  describe('Target Counting by Area', () => {
    it('should parse area counting event', () => {
      const event = ViewtronEvent(fixture('nvr-v2/target-counting-by-area.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'counting');
      assert.strictEqual(event.eventType, 'targetCountingByArea');
    });
  });

  describe('Video Metadata', () => {
    it('should parse metadata event', () => {
      const event = ViewtronEvent(fixture('nvr-v2/video-metadata.xml'));
      assert.ok(event);
      assert.strictEqual(event.category, 'metadata');
      assert.strictEqual(event.eventType, 'videoMetadata');
    });
  });
});

// ==================== Filtering ====================

describe('Filtering', () => {
  it('should return null for IPC keepalive', () => {
    const event = ViewtronEvent(fixture('ipc-v1x/keepalive.xml'));
    assert.strictEqual(event, null);
  });

  it('should return null for NVR keepalive', () => {
    const event = ViewtronEvent(fixture('nvr-v2/keepalive.xml'));
    assert.strictEqual(event, null);
  });

  it('should return null for IPC alarm status', () => {
    const event = ViewtronEvent(fixture('ipc-v1x/alarm-status.xml'));
    assert.strictEqual(event, null);
  });

  it('should return null for NVR alarm status', () => {
    const event = ViewtronEvent(fixture('nvr-v2/alarm-status.xml'));
    assert.strictEqual(event, null);
  });

  it('should return null for empty string', () => {
    assert.strictEqual(ViewtronEvent(''), null);
  });

  it('should return null for null', () => {
    assert.strictEqual(ViewtronEvent(null), null);
  });

  it('should return null for undefined', () => {
    assert.strictEqual(ViewtronEvent(undefined), null);
  });

  it('should return null for non-XML string', () => {
    assert.strictEqual(ViewtronEvent('hello world'), null);
  });

  it('should return null for malformed XML', () => {
    assert.strictEqual(ViewtronEvent('<?xml version="1.0"?><broken'), null);
  });
});

// ==================== Images ====================

describe('Images', () => {
  it('should filter BASE64 placeholder images', () => {
    // Fixture images use BASE64_JPEG_... placeholders — should be filtered
    const event = ViewtronEvent(fixture('ipc-v1x/lpr.xml'));
    assert.ok(event);
    assert.strictEqual(event.sourceImage, '');
    assert.strictEqual(event.targetImage, '');
    assert.strictEqual(event.hasImages, false);
  });

  it('should return null for image bytes when no images', () => {
    const event = ViewtronEvent(fixture('ipc-v1x/lpr.xml'));
    assert.strictEqual(event.sourceImageBytes, null);
    assert.strictEqual(event.targetImageBytes, null);
  });

  it('should decode real base64 images to Buffer', () => {
    // Create a minimal LPR event with a real base64 image
    const realB64 = Buffer.from('test-image-data').toString('base64');
    const xml = `<?xml version="1.0"?>
      <config version="1.7" xmlns="http://www.ipc.com/ver10">
        <smartType>VEHICE</smartType>
        <currentTime>1732045234584193</currentTime>
        <listInfo type="list" count="1">
          <item>
            <plateNumber>TEST123</plateNumber>
            <targetImageData>
              <targetBase64Data>${realB64}</targetBase64Data>
            </targetImageData>
          </item>
        </listInfo>
        <sourceDataInfo>
          <sourceBase64Data>${realB64}</sourceBase64Data>
        </sourceDataInfo>
      </config>`;
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.sourceImage, realB64);
    assert.strictEqual(event.hasImages, true);
    assert.ok(Buffer.isBuffer(event.sourceImageBytes));
    assert.strictEqual(event.sourceImageBytes.toString(), 'test-image-data');
  });

  it('should lazily decode image bytes (same Buffer on repeat access)', () => {
    const realB64 = Buffer.from('lazy-test').toString('base64');
    const xml = `<?xml version="1.0"?>
      <config version="1.7" xmlns="http://www.ipc.com/ver10">
        <smartType>VEHICE</smartType>
        <currentTime>123</currentTime>
        <sourceDataInfo>
          <sourceBase64Data>${realB64}</sourceBase64Data>
        </sourceDataInfo>
      </config>`;
    const event = ViewtronEvent(xml);
    const first = event.sourceImageBytes;
    const second = event.sourceImageBytes;
    assert.strictEqual(first, second); // same reference — cached
  });
});

// ==================== Traject ====================

describe('Traject', () => {
  it('should parse traject event', () => {
    const xml = `<?xml version="1.0"?>
      <config version="1.7" xmlns="http://www.ipc.com/ver10">
        <currentTime>1732045234584193</currentTime>
        <traject type="list" count="2">
          <item>
            <targetId>1</targetId>
            <targetType>person</targetType>
            <velocity>5</velocity>
            <direction>180</direction>
            <rect><x1>100</x1><y1>200</y1><x2>300</x2><y2>400</y2></rect>
          </item>
          <item>
            <targetId>2</targetId>
            <targetType>car</targetType>
            <velocity>20</velocity>
            <direction>90</direction>
            <rect><x1>500</x1><y1>600</y1><x2>700</x2><y2>800</y2></rect>
          </item>
        </traject>
      </config>`;
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.category, 'traject');
    assert.strictEqual(event.source, 'IPC');
    assert.ok(Array.isArray(event.targets));
    assert.strictEqual(event.targets.length, 2);
    assert.strictEqual(event.targets[0].targetId, '1');
    assert.strictEqual(event.targets[0].targetType, 'person');
    assert.strictEqual(event.targets[0].rect.x1, '100');
    assert.strictEqual(event.targets[1].targetId, '2');
    assert.strictEqual(event.targets[1].targetType, 'car');
  });
});

// ==================== ViewtronServer ====================

describe('ViewtronServer', () => {
  const { ViewtronServer } = require('../src');

  it('should start and stop cleanly', async () => {
    const server = new ViewtronServer({ port: 0 }); // port 0 = random available
    const result = await server.start();
    assert.ok(result.port > 0);
    assert.ok(result.ip);
    await server.stop();
  });

  it('should emit listening event', async () => {
    let listenInfo = null;
    const server = new ViewtronServer({ port: 0 });
    server.on('listening', (info) => { listenInfo = info; });
    await server.start();
    assert.ok(listenInfo);
    assert.ok(listenInfo.port > 0);
    await server.stop();
  });

  it('should parse events from HTTP POST', async () => {
    const events = [];
    const server = new ViewtronServer({ port: 0 });
    server.on('event', (event) => events.push(event));
    const { port } = await server.start();

    const xml = fixture('ipc-v1x/lpr.xml');
    const response = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    assert.strictEqual(response.status, 200);
    const body = await response.text();
    assert.ok(body.includes('<status>success</status>'));

    // Give event handler a tick to process
    await new Promise((r) => setTimeout(r, 50));

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].category, 'lpr');
    assert.strictEqual(events[0].plateNumber, 'ABC1234');

    await server.stop();
  });

  it('should emit connect on first camera message', async () => {
    const connections = [];
    const server = new ViewtronServer({ port: 0 });
    server.on('connect', (ip) => connections.push(ip));
    const { port } = await server.start();

    // Send keepalive
    const xml = fixture('nvr-v2/keepalive.xml');
    await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });

    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(connections.length, 1);
    assert.ok(connections[0]); // has an IP

    await server.stop();
  });

  it('should filter keepalives from event output', async () => {
    const events = [];
    const server = new ViewtronServer({ port: 0 });
    server.on('event', (event) => events.push(event));
    const { port } = await server.start();

    // Send keepalive — should NOT produce an event
    await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: fixture('nvr-v2/keepalive.xml'),
    });

    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(events.length, 0);

    await server.stop();
  });

  it('should support callback-style options', async () => {
    const events = [];
    const server = new ViewtronServer({
      port: 0,
      onEvent: (event) => events.push(event),
    });
    const { port } = await server.start();

    await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: fixture('nvr-v2/region-intrusion.xml'),
    });

    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].category, 'intrusion');

    await server.stop();
  });
});
