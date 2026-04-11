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
<p>Returns a ViewtronEvent object for recognized events, or null for
keepalives, alarm status messages, and unrecognized payloads.</p>
<p>Automatically detects IPC v1.x vs NVR v2.0 format.</p>
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

Returns a ViewtronEvent object for recognized events, or null for
keepalives, alarm status messages, and unrecognized payloads.

Automatically detects IPC v1.x vs NVR v2.0 format.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| postBody | <code>string</code> | Raw XML string from camera HTTP POST |

