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

// ==================== API 2.x ====================

function withConfigVersion(xml, version) {
  return xml.replace(/(<config\b[^>]*\bversion=")[^"]*(")/g, `$1${version}$2`);
}

function comparable(event) {
  if (event == null) return null;
  const copy = { ...event };
  delete copy.xml;
  delete copy.configVersion;
  return copy;
}

function listFixtures(dir) {
  return fs.readdirSync(path.join(__dirname, 'fixtures', dir))
    .filter((name) => name.endsWith('.xml'))
    .sort()
    .map((name) => `${dir}/${name}`);
}

describe('Config version metadata', () => {
  it('parses every v2 fixture the same at 2.0.0, 2.1.0, and 2.9.0', () => {
    for (const name of listFixtures('nvr-v2')) {
      const xml = fixture(name);
      const original = ViewtronEvent(xml);
      if (original) {
        assert.strictEqual(original.format, 'v2', name);
        assert.strictEqual(original.configVersion, '2.0.0', name);
      }
      for (const version of ['2.1.0', '2.9.0']) {
        const parsed = ViewtronEvent(withConfigVersion(xml, version));
        assert.deepStrictEqual(comparable(parsed), comparable(original), `${name} @ ${version}`);
        if (parsed) {
          assert.strictEqual(parsed.configVersion, version, name);
          assert.strictEqual(parsed.format, 'v2', name);
        }
      }
    }
  });

  it('parses every v1 fixture the same at 1.0 and 1.7', () => {
    for (const name of listFixtures('ipc-v1x')) {
      const xml = fixture(name);
      const original = ViewtronEvent(xml);
      if (original) {
        assert.strictEqual(original.format, 'v1', name);
        assert.ok(original.configVersion, name);
      }
      for (const version of ['1.0', '1.7']) {
        const parsed = ViewtronEvent(withConfigVersion(xml, version));
        assert.deepStrictEqual(comparable(parsed), comparable(original), `${name} @ ${version}`);
        if (parsed) {
          assert.strictEqual(parsed.configVersion, version, name);
          assert.strictEqual(parsed.format, 'v1', name);
        }
      }
    }
  });

  it('adds format and configVersion on a traject event', () => {
    const xml = `<?xml version="1.0"?>
      <config version="2.1.0" xmlns="http://www.ipc.com/ver10">
        <currentTime>1732045234584193</currentTime>
        <deviceInfo><channelId>3</channelId></deviceInfo>
        <traject type="list" count="1">
          <item>
            <targetId>1</targetId>
            <targetType>person</targetType>
            <rect><x1>1</x1><y1>2</y1><x2>3</x2><y2>4</y2></rect>
          </item>
        </traject>
      </config>`;
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.source, 'NVR-ch3');
    assert.strictEqual(event.format, 'v2');
    assert.strictEqual(event.configVersion, '2.1.0');
  });
});

describe('API 2.x routing', () => {
  it('parses an IPC-style body at 2.1.0 with no messageType as a v1 event', () => {
    const baseline = ViewtronEvent(fixture('ipc-v1x/lpr.xml'));
    const xml = withConfigVersion(fixture('ipc-v1x/lpr.xml'), '2.1.0');
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.source, 'IPC');
    assert.strictEqual(event.category, 'lpr');
    assert.strictEqual(event.eventType, 'VEHICE');
    assert.strictEqual(event.plateNumber, 'ABC1234');
    assert.strictEqual(event.plateGroup, 'whiteList');
    assert.strictEqual(event.format, 'v2');
    assert.strictEqual(event.configVersion, '2.1.0');

    const left = comparable(event);
    const right = comparable(baseline);
    delete left.format;
    delete right.format;
    assert.deepStrictEqual(left, right);
  });

  it('parses uppercase VEHICLE in a v2 envelope when the v2 plate list is present', () => {
    const original = ViewtronEvent(fixture('nvr-v2/vehicle-lpr.xml'));
    const xml = withConfigVersion(fixture('nvr-v2/vehicle-lpr.xml'), '2.1.0')
      .replace('<smartType>vehicle</smartType>', '<smartType>VEHICLE</smartType>');
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.source, 'NVR');
    assert.strictEqual(event.category, 'lpr');
    assert.strictEqual(event.eventType, 'VEHICLE');
    assert.strictEqual(event.eventDescription, 'License Plate Detection');
    assert.strictEqual(event.plateNumber, original.plateNumber);
    assert.strictEqual(event.plateColor, original.plateColor);
    assert.deepStrictEqual(event.vehicle, original.vehicle);
    assert.strictEqual(event.format, 'v2');
    assert.strictEqual(event.configVersion, '2.1.0');
  });

  it('matches other v2 smartType values without changing the category', () => {
    const original = ViewtronEvent(fixture('nvr-v2/region-intrusion.xml'));
    const xml = fixture('nvr-v2/region-intrusion.xml')
      .replace('<smartType>regionIntrusion</smartType>', '<smartType>RegionIntrusion</smartType>');
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.category, original.category);
    assert.strictEqual(event.eventType, 'RegionIntrusion');
    assert.strictEqual(event.eventId, original.eventId);
    assert.strictEqual(event.targetType, original.targetType);
    assert.strictEqual(event.format, 'v2');
    assert.strictEqual(event.configVersion, '2.0.0');
  });

  it('still parses canonical vehicle alarmData when the plate list is absent', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <config version="2.0.0" xmlns="http://www.ipc.com/ver10">
        <messageType>alarmData</messageType>
        <deviceInfo>
          <deviceName><![CDATA[Front Gate]]></deviceName>
          <ip><![CDATA[203.0.113.10]]></ip>
          <mac><![CDATA[00:11:22:33:44:55]]></mac>
          <channelId>1</channelId>
        </deviceInfo>
        <smartType>vehicle</smartType>
        <currentTime>1700000000000000</currentTime>
      </config>`;
    const event = ViewtronEvent(xml);
    assert.ok(event);
    assert.strictEqual(event.source, 'NVR');
    assert.strictEqual(event.category, 'lpr');
    assert.strictEqual(event.eventType, 'vehicle');
    assert.strictEqual(event.plateNumber, '');
    assert.strictEqual(event.format, 'v2');
    assert.strictEqual(event.configVersion, '2.0.0');
  });
});

describe('Unparsed posts', () => {
  const { ViewtronServer } = require('../src');

  function nvrPost({ version = '2.1.0', messageType, smartType, extra = '' }) {
    const message = messageType == null ? '' : `<messageType>${messageType}</messageType>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
      <config version="${version}" xmlns="http://www.ipc.com/ver10">
        ${message}
        <deviceInfo>
          <deviceName><![CDATA[Front Gate]]></deviceName>
          <ip><![CDATA[203.0.113.10]]></ip>
          <mac><![CDATA[00:11:22:33:44:55]]></mac>
          <channelId>1</channelId>
        </deviceInfo>
        <smartType>${smartType}</smartType>
        <currentTime>1700000000000000</currentTime>
        ${extra}
      </config>`;
  }

  async function listen(xml) {
    const events = [];
    const raw = [];
    const unparsed = [];
    const connections = [];
    const server = new ViewtronServer({
      port: 0,
      onEvent: (event, clientIp) => events.push({ event, clientIp }),
      onConnect: (clientIp) => connections.push(clientIp),
      onRaw: (body, clientIp) => raw.push({ body, clientIp }),
      onUnparsed: (body, clientIp, reason) => unparsed.push({ body, clientIp, reason }),
    });
    const { port } = await server.start();
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml,
      });
      assert.strictEqual(response.status, 200);
      await new Promise((r) => setTimeout(r, 50));
      return { events, raw, unparsed, connections };
    } finally {
      await server.stop();
    }
  }

  it('does not emit unparsed for an IPC-style 2.1.0 body with no messageType', async () => {
    const xml = withConfigVersion(fixture('ipc-v1x/lpr.xml'), '2.1.0');
    assert.strictEqual(ViewtronEvent(xml).category, 'lpr');
    const { events, raw, unparsed } = await listen(xml);
    assert.strictEqual(unparsed.length, 0);
    assert.strictEqual(raw.length, 1);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].event.plateNumber, 'ABC1234');
    assert.strictEqual(events[0].event.source, 'IPC');
    assert.strictEqual(events[0].event.format, 'v2');
    assert.strictEqual(events[0].event.configVersion, '2.1.0');
    assert.ok(events[0].clientIp);
  });

  it('emits unknown-smartType for uppercase VEHICLE with no licensePlateListInfo', async () => {
    const xml = nvrPost({ messageType: 'alarmData', smartType: 'VEHICLE' });
    assert.strictEqual(ViewtronEvent(xml), null);
    const { events, raw, unparsed } = await listen(xml);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(raw.length, 1);
    assert.strictEqual(unparsed.length, 1);
    assert.strictEqual(unparsed[0].reason, 'unknown-smartType');
    assert.strictEqual(unparsed[0].body, xml);
    assert.ok(unparsed[0].clientIp);
    assert.strictEqual(unparsed[0].clientIp, raw[0].clientIp);
  });

  it('emits no-messageType for an NVR-style body with an unknown smartType', async () => {
    const xml = nvrPost({ smartType: 'MOTION' });
    assert.strictEqual(ViewtronEvent(xml), null);
    const { events, raw, unparsed } = await listen(xml);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(raw.length, 1);
    assert.strictEqual(unparsed.length, 1);
    assert.strictEqual(unparsed[0].reason, 'no-messageType');
    assert.strictEqual(unparsed[0].body, xml);
    assert.ok(unparsed[0].clientIp);
  });

  it('emits parse-error for XML that cannot be read', async () => {
    const xml = '<?xml version="1.0"?><broken';
    assert.strictEqual(ViewtronEvent(xml), null);
    const { events, raw, unparsed } = await listen(xml);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(raw.length, 1);
    assert.strictEqual(unparsed.length, 1);
    assert.strictEqual(unparsed[0].reason, 'parse-error');
  });

  it('emits alarmStatus and still does not emit raw', async () => {
    const xml = fixture('nvr-v2/alarm-status.xml');
    assert.strictEqual(ViewtronEvent(xml), null);
    const { events, raw, unparsed, connections } = await listen(xml);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(raw.length, 0);
    assert.strictEqual(unparsed.length, 1);
    assert.strictEqual(unparsed[0].reason, 'alarmStatus');
    assert.strictEqual(unparsed[0].body, xml);
    // deviceInfo with no smartType still counts as a connection
    assert.strictEqual(connections.length, 1);
  });

  it('does not emit unparsed for a keepalive', async () => {
    const xml = withConfigVersion(fixture('nvr-v2/keepalive.xml'), '2.1.0');
    assert.strictEqual(ViewtronEvent(xml), null);
    const { events, raw, unparsed } = await listen(xml);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(raw.length, 0);
    assert.strictEqual(unparsed.length, 0);
  });

  it('emits unknown-smartType for alarmData with an unrecognized smartType', async () => {
    const xml = nvrPost({ messageType: 'alarmData', smartType: 'NOT_A_TYPE' });
    const { events, unparsed } = await listen(xml);
    assert.strictEqual(events.length, 0);
    assert.strictEqual(unparsed.length, 1);
    assert.strictEqual(unparsed[0].reason, 'unknown-smartType');
  });
});
