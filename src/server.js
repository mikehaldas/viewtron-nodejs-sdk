'use strict';

const http = require('http');
const os = require('os');
const { EventEmitter } = require('events');
const { inspectPost } = require('./events');

// XML success response — cameras expect this to confirm the connection is alive.
// Without it, cameras will disconnect and retry.
const SUCCESS_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<config version="1.0" xmlns="http://www.ipc.com/ver10">' +
  '<status>success</status></config>';

const SUCCESS_BYTES = Buffer.byteLength(SUCCESS_XML);

// Default body size limit (5MB). Camera posts with images can be large
// but anything over this is likely malformed or an attack.
const DEFAULT_MAX_BODY_SIZE = 5 * 1024 * 1024;

/**
 * HTTP server that receives events from Viewtron cameras and NVRs.
 *
 * Handles all camera-specific requirements:
 * - HTTP/1.1 persistent connections (cameras use Connection: keep-alive)
 * - keepAliveTimeout of 60s (cameras heartbeat every 30s)
 * - XML success response on every request
 * - Keepalive, traject, and alarm status filtering
 * - Connected camera tracking
 *
 * Events:
 *   'event'     (event, clientIP)              — Parsed ViewtronEvent
 *   'connect'   (clientIP)                     — First message from a new camera IP
 *   'raw'       (xml, clientIP)                — Raw XML before parsing (excludes traject)
 *   'unparsed'  (xml, clientIp, reason)        — Post did not become an event
 *   'listening' ({ port, ip })                 — Server started
 *   'error'     (err)                          — Server error
 *
 * `unparsed` reasons: `unknown-smartType`, `no-messageType`, `parse-error`,
 * `alarmStatus`. Keepalives, traject, and non-XML bodies do not emit it.
 * `raw` is unchanged: alarm status, traject, and keepalives still skip it.
 *
 * @example
 * const server = new ViewtronServer({ port: 5050 });
 * server.on('event', (event, clientIP) => {
 *   console.log(event.category, event.plateNumber);
 * });
 * server.start();
 */
class ViewtronServer extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} [options.port=5050] - Port to listen on
   * @param {number} [options.maxBodySize=5242880] - Max POST body size in bytes
   * @param {Function} [options.onEvent] - Shorthand for server.on('event', fn)
   * @param {Function} [options.onConnect] - Shorthand for server.on('connect', fn)
   * @param {Function} [options.onRaw] - Shorthand for server.on('raw', fn)
   * @param {Function} [options.onUnparsed] - Shorthand for server.on('unparsed', fn)
   */
  constructor(options = {}) {
    super();
    this.port = options.port ?? 5050;
    this.maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;
    this.connectedCameras = new Map();
    this._server = null;

    // Support callback-style options
    if (options.onEvent) this.on('event', options.onEvent);
    if (options.onConnect) this.on('connect', options.onConnect);
    if (options.onRaw) this.on('raw', options.onRaw);
    if (options.onUnparsed) this.on('unparsed', options.onUnparsed);
  }

  /**
   * Start the HTTP server.
   * @returns {Promise<{port: number, ip: string}>} Resolves when listening
   */
  start() {
    return new Promise((resolve, reject) => {
      this._server = http.createServer(this._handleRequest.bind(this));

      // Camera sends heartbeats every 30s. Default Node.js keepAliveTimeout
      // is 5 seconds, which silently kills connections between heartbeats.
      this._server.keepAliveTimeout = 60000;
      this._server.headersTimeout = 65000;

      // Forward server errors
      this._server.on('error', (err) => this.emit('error', err));

      // Reject on startup errors (e.g. EADDRINUSE)
      this._server.once('error', reject);

      this._server.listen(this.port, () => {
        // Remove the one-time reject handler — startup succeeded
        this._server.removeListener('error', reject);

        // Read actual port (needed when port=0 assigns a random port)
        const actualPort = this._server.address().port;
        this.port = actualPort;

        const ip = getLanIP();
        this.emit('listening', { port: actualPort, ip });
        resolve({ port: actualPort, ip });
      });
    });
  }

  /**
   * Stop the server gracefully.
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (this._server) {
        this._server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle an incoming HTTP request from a camera.
   * @private
   */
  _handleRequest(req, res) {
    // Send XML success response immediately — this keeps the camera's
    // persistent connection alive. Do NOT wait for body parsing.
    res.writeHead(200, {
      'Content-Type': 'application/xml',
      'Content-Length': SUCCESS_BYTES,
    });
    res.end(SUCCESS_XML);

    if (req.method !== 'POST') return;

    const chunks = [];
    let bodyLength = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      bodyLength += chunk.length;
      if (bodyLength > this.maxBodySize) {
        aborted = true;
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;

      const body = Buffer.concat(chunks).toString('utf-8');
      const clientIP = req.socket.remoteAddress?.replace('::ffff:', '') || 'unknown';

      // Keepalive detection:
      // - Empty body
      // - Explicit keepalive messageType
      // - deviceInfo-only (IPC keepalive — has deviceInfo but no smartType)
      if (
        !body ||
        body.includes('<messageType>keepalive</messageType>') ||
        (body.toLowerCase().includes('<deviceinfo>') && !body.includes('smartType'))
      ) {
        if (!this.connectedCameras.has(clientIP)) {
          this.connectedCameras.set(clientIP, new Date());
          this.emit('connect', clientIP);
        }
        // Alarm status often has device info and no smartType, so it matches
        // this keepalive check. It still does not emit raw or event.
        if (body && body.includes('alarmStatusInfo')) {
          this.emit('unparsed', body, clientIP, 'alarmStatus');
        }
        return;
      }

      // Not XML — ignore
      if (!body.includes('<?xml')) return;

      // Skip traject (high-volume continuous tracking data)
      if (body.includes('<traject type="list"')) return;

      // Skip alarmStatus (alarm on/off with no detection data).
      // Still not emitted as raw. Callers can listen on 'unparsed'.
      if (body.includes('alarmStatusInfo')) {
        this.emit('unparsed', body, clientIP, 'alarmStatus');
        return;
      }

      // Emit raw XML before parsing
      this.emit('raw', body, clientIP);

      // Parse event
      try {
        const { event, reason } = inspectPost(body);
        if (!event) {
          if (reason) this.emit('unparsed', body, clientIP, reason);
          return;
        }

        // Set camera IP from socket if not in the event payload
        if (!event.cameraIp) event.cameraIp = clientIP;

        // Track camera connection on first real event
        if (!this.connectedCameras.has(clientIP)) {
          this.connectedCameras.set(clientIP, new Date());
          this.emit('connect', clientIP);
        }

        this.emit('event', event, clientIP);
      } catch (err) {
        this.emit('error', err);
      }
    });
  }
}

/**
 * Get the LAN IP address of this machine.
 * @returns {string}
 */
function getLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

module.exports = { ViewtronServer };
