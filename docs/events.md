## Functions

<dl>
<dt><a href="#getText">getText()</a></dt>
<dd><p>Extract text from a fast-xml-parser value.
Handles both direct strings and objects with #text property.</p>
</dd>
<dt><a href="#asArray">asArray()</a></dt>
<dd><p>Normalize a value to an array. Handles xmltodict/fast-xml-parser single-item quirk.</p>
</dd>
<dt><a href="#extractBase64">extractBase64()</a></dt>
<dd><p>Extract base64 image data, filtering out placeholder values.</p>
</dd>
<dt><a href="#parseEvent">parseEvent(postBody)</a> ⇒ <code>ViewtronEvent</code> | <code>null</code></dt>
<dd><p>Parse an HTTP POST body from a Viewtron camera or NVR.</p>
<p>Returns a ViewtronEvent for recognized events, or null for keepalives,
alarm status messages, and unrecognized payloads. Parsed events include
<code>configVersion</code> (the config version attribute) and <code>format</code> (<code>v1</code> or <code>v2</code>).</p>
<p>A config version of 2.x selects the v2 envelope. A 2.x post with no
<code>messageType</code> and a v1 <code>smartType</code> is parsed with the v1 layout instead.
Within each layout, <code>smartType</code> matching is case-insensitive.
<code>eventTime</code> is the camera time. <code>currentTime</code> is read as seconds,
milliseconds, or microseconds based on its magnitude.</p>
</dd>
</dl>

<a name="getText"></a>

## getText()
Extract text from a fast-xml-parser value.
Handles both direct strings and objects with #text property.

**Kind**: global function  
<a name="asArray"></a>

## asArray()
Normalize a value to an array. Handles xmltodict/fast-xml-parser single-item quirk.

**Kind**: global function  
<a name="extractBase64"></a>

## extractBase64()
Extract base64 image data, filtering out placeholder values.

**Kind**: global function  
<a name="parseEvent"></a>

## parseEvent(postBody) ⇒ <code>ViewtronEvent</code> \| <code>null</code>
Parse an HTTP POST body from a Viewtron camera or NVR.

Returns a ViewtronEvent for recognized events, or null for keepalives,
alarm status messages, and unrecognized payloads. Parsed events include
`configVersion` (the config version attribute) and `format` (`v1` or `v2`).

A config version of 2.x selects the v2 envelope. A 2.x post with no
`messageType` and a v1 `smartType` is parsed with the v1 layout instead.
Within each layout, `smartType` matching is case-insensitive.
`eventTime` is the camera time. `currentTime` is read as seconds,
milliseconds, or microseconds based on its magnitude.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| postBody | <code>string</code> | Raw XML string from camera HTTP POST |

