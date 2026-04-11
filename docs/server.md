## Classes

<dl>
<dt><a href="#ViewtronServer">ViewtronServer</a></dt>
<dd><p>HTTP server that receives events from Viewtron cameras and NVRs.</p>
<p>Handles all camera-specific requirements:</p>
<ul>
<li>HTTP/1.1 persistent connections (cameras use Connection: keep-alive)</li>
<li>keepAliveTimeout of 60s (cameras heartbeat every 30s)</li>
<li>XML success response on every request</li>
<li>Keepalive, traject, and alarm status filtering</li>
<li>Connected camera tracking</li>
</ul>
<p>Events:
  &#39;event&#39;     (event, clientIP) — Parsed ViewtronEvent
  &#39;connect&#39;   (clientIP)        — First message from a new camera IP
  &#39;raw&#39;       (xml, clientIP)   — Raw XML before parsing (excludes traject)
  &#39;listening&#39; ({ port, ip })    — Server started
  &#39;error&#39;     (err)             — Server error</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#getLanIP">getLanIP()</a> ⇒ <code>string</code></dt>
<dd><p>Get the LAN IP address of this machine.</p>
</dd>
</dl>

<a name="ViewtronServer"></a>

## ViewtronServer
HTTP server that receives events from Viewtron cameras and NVRs.

Handles all camera-specific requirements:
- HTTP/1.1 persistent connections (cameras use Connection: keep-alive)
- keepAliveTimeout of 60s (cameras heartbeat every 30s)
- XML success response on every request
- Keepalive, traject, and alarm status filtering
- Connected camera tracking

Events:
  'event'     (event, clientIP) — Parsed ViewtronEvent
  'connect'   (clientIP)        — First message from a new camera IP
  'raw'       (xml, clientIP)   — Raw XML before parsing (excludes traject)
  'listening' ({ port, ip })    — Server started
  'error'     (err)             — Server error

**Kind**: global class  

* [ViewtronServer](#ViewtronServer)
    * [new ViewtronServer(options)](#new_ViewtronServer_new)
    * [.start()](#ViewtronServer+start) ⇒ <code>Promise.&lt;{port: number, ip: string}&gt;</code>
    * [.stop()](#ViewtronServer+stop) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="new_ViewtronServer_new"></a>

### new ViewtronServer(options)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  |  |
| [options.port] | <code>number</code> | <code>5050</code> | Port to listen on |
| [options.maxBodySize] | <code>number</code> | <code>5242880</code> | Max POST body size in bytes |
| [options.onEvent] | <code>function</code> |  | Shorthand for server.on('event', fn) |
| [options.onConnect] | <code>function</code> |  | Shorthand for server.on('connect', fn) |
| [options.onRaw] | <code>function</code> |  | Shorthand for server.on('raw', fn) |

**Example**  
```js
const server = new ViewtronServer({ port: 5050 });
server.on('event', (event, clientIP) => {
  console.log(event.category, event.plateNumber);
});
server.start();
```
<a name="ViewtronServer+start"></a>

### viewtronServer.start() ⇒ <code>Promise.&lt;{port: number, ip: string}&gt;</code>
Start the HTTP server.

**Kind**: instance method of [<code>ViewtronServer</code>](#ViewtronServer)  
**Returns**: <code>Promise.&lt;{port: number, ip: string}&gt;</code> - Resolves when listening  
<a name="ViewtronServer+stop"></a>

### viewtronServer.stop() ⇒ <code>Promise.&lt;void&gt;</code>
Stop the server gracefully.

**Kind**: instance method of [<code>ViewtronServer</code>](#ViewtronServer)  
<a name="getLanIP"></a>

## getLanIP() ⇒ <code>string</code>
Get the LAN IP address of this machine.

**Kind**: global function  
