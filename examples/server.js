#!/usr/bin/env node

/**
 * Viewtron SDK Example Server
 *
 * Receives events from Viewtron AI cameras and NVRs and logs them
 * to the console. Use this to test your camera's HTTP Post connection
 * and see the event data structure.
 *
 * Usage:
 *   node examples/server.js [port]
 *
 * Default port: 5050
 *
 * Camera setup:
 *   1. Open camera web interface → Setup → Network → HTTP Post
 *   2. Set Push Protocol Version to V1
 *   3. Add server: http://<this-machine-ip>:<port>
 *   4. Set Connection Type to Persistent connection
 *   5. Enable Send Heartbeat (30s interval)
 *   6. Check Smart event data, Original picture, Target picture
 *   7. Reboot camera after saving
 */

'use strict';

const path = require('path');
const { ViewtronServer } = require(path.join(__dirname, '..', 'src'));

const port = parseInt(process.argv[2]) || 5050;

const server = new ViewtronServer({ port });

server.on('connect', (clientIP) => {
  console.log(`\n[+] Camera connected: ${clientIP}`);
});

server.on('event', (event, clientIP) => {
  const time = new Date().toLocaleTimeString();
  console.log(`\n[${time}] ${event.category.toUpperCase()} from ${clientIP}`);
  console.log(`  Source: ${event.source} | Type: ${event.eventDescription}`);

  switch (event.category) {
    case 'lpr':
      console.log(`  Plate: ${event.plateNumber}`);
      console.log(`  Group: ${event.plateGroup || '(not in database)'}`);
      if (event.plateColor) console.log(`  Plate Color: ${event.plateColor}`);
      if (event.vehicle) {
        const v = event.vehicle;
        const parts = [v.color, v.brand, v.model, v.type].filter(Boolean);
        console.log(`  Vehicle: ${parts.join(' ')}`);
      }
      if (event.carOwner) console.log(`  Owner: ${event.carOwner}`);
      break;

    case 'face':
      if (event.face) {
        console.log(`  Age: ${event.face.age}, Sex: ${event.face.sex}`);
        if (event.face.glasses !== 'unknown') console.log(`  Glasses: ${event.face.glasses}`);
        if (event.face.mask !== 'unknown') console.log(`  Mask: ${event.face.mask}`);
      }
      break;

    case 'intrusion':
    case 'counting':
      if (event.targetType) console.log(`  Target: ${event.targetType}`);
      if (event.eventId) console.log(`  Event ID: ${event.eventId}`);
      if (event.boundary) console.log(`  Boundary: ${event.boundary}`);
      if (event.status) console.log(`  Status: ${event.status}`);
      break;

    case 'traject':
      if (event.targets) {
        console.log(`  Targets: ${event.targets.length}`);
        for (const t of event.targets) {
          console.log(`    [${t.targetId}] ${t.targetType} vel=${t.velocity} dir=${t.direction}`);
        }
      }
      break;

    default:
      console.log(`  Event Type: ${event.eventType}`);
  }

  if (event.hasImages) {
    const parts = [];
    if (event.sourceImage) {
      const kb = Math.round(event.sourceImage.length * 0.75 / 1024);
      parts.push(`overview ${kb}KB`);
    }
    if (event.targetImage) {
      const kb = Math.round(event.targetImage.length * 0.75 / 1024);
      parts.push(`crop ${kb}KB`);
    }
    console.log(`  Images: ${parts.join(', ')}`);
  }

  if (event.source === 'NVR') {
    console.log(`  Camera: ${event.cameraName} (${event.cameraIp}) ch${event.channelId}`);
  }
});

server.start().then(({ port, ip }) => {
  console.log('Viewtron SDK — Example Server');
  console.log(`Listening on ${ip}:${port}`);
  console.log(`\nPoint your camera's HTTP Post at http://${ip}:${port}`);
  console.log('Press Ctrl+C to stop.\n');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
