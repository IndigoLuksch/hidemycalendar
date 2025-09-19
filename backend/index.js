import ICAL from 'node-ical';

// --- Crypto Helper Functions ---

/**
 * Derives a 256-bit AES-GCM key from a secret string.
 */
async function getKey(secret) {
  const keyData = new TextEncoder().encode(secret);
  const keyHash = await crypto.subtle.digest('SHA-256', keyData);
  return crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Converts a Uint8Array to a URL-safe Base64 string.
 */
function toUrlSafeBase64(arrayBuffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Converts a URL-safe Base64 string back to a Uint8Array.
 */
function fromUrlSafeBase64(base64) {
  let padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(b64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


// --- CORS Handling ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or lock down to your Pages domain for better security
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function handleOptions(request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, { headers: corsHeaders });
  } else {
    return new Response(null, { headers: { Allow: 'GET, POST, OPTIONS' } });
  }
}


// --- Main Router ---
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const url = new URL(request.url);
    if (url.pathname === '/create' && request.method === 'POST') {
      return createEncryptedLink(request, env);
    }
    if (url.searchParams.has('cal')) {
      return serveCalendar(request, env);
    }

    const response = new Response('Not Found', { status: 404 });
    Object.keys(corsHeaders).forEach(header => response.headers.set(header, corsHeaders[header]));
    return response;
  },
};


// --- Route Handlers ---

async function createEncryptedLink(request, env) {
  if (!env.ENCRYPTION_KEY) {
    const errorResponse = new Response(JSON.stringify({ error: 'Service is not configured correctly. Secret key is missing.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    return errorResponse;
  }

  try {
    const { url: originalUrl } = await request.json();
    if (!originalUrl || !originalUrl.startsWith('http') && !originalUrl.startsWith('webcal')) {
        return new Response(JSON.stringify({ error: 'Invalid URL provided.' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }});
    }

    const cryptoKey = await getKey(env.ENCRYPTION_KEY);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(originalUrl));
    
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    const base64String = toUrlSafeBase64(combined);
    const workerUrl = new URL(request.url).origin;
    const privateUrl = `${workerUrl}/?cal=${base64String}`;

    return new Response(JSON.stringify({ privateUrl }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (err) {
    console.error('Error in createEncryptedLink:', err);
    return new Response(JSON.stringify({ error: 'Could not process request.' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
}

async function serveCalendar(request, env) {
  if (!env.ENCRYPTION_KEY) {
    return new Response("Error: Service is not configured correctly.", { status: 500, headers: { ...corsHeaders }});
  }
  
  try {
    const url = new URL(request.url);
    const encryptedCalParam = url.searchParams.get('cal');
    if (!encryptedCalParam) {
        return new Response("Error: Missing 'cal' parameter.", { status: 400, headers: { ...corsHeaders }});
    }

    const cryptoKey = await getKey(env.ENCRYPTION_KEY);
    const combined = fromUrlSafeBase64(encryptedCalParam);
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encryptedData);
    const icalUrl = new TextDecoder().decode(decryptedData);
    const icalUrlClean = icalUrl.replace("webcal://", "https://");

    const data = await ICAL.fromURL(icalUrlClean);
    let newIcalString = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PrivacyCalendar//EN\n";
    const formatDT = (dt) => new Date(dt).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    for (const event of Object.values(data)) {
      if (event.type !== 'VEVENT') continue;
      newIcalString += "BEGIN:VEVENT\n";
      newIcalString += `UID:${event.uid}\n`;
      if (event.start) newIcalString += `DTSTART:${formatDT(event.start)}\n`;
      if (event.end) newIcalString += `DTEND:${formatDT(event.end)}\n`;
      if (event.rrule) newIcalString += `RRULE:${event.rrule.toString()}\n`;
      newIcalString += "SUMMARY:Busy\n";
      newIcalString += `DTSTAMP:${formatDT(new Date())}\n`;
      newIcalString += "END:VEVENT\n";
    }
    newIcalString += "END:VCALENDAR\n";

    return new Response(newIcalString, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', ...corsHeaders } });
  } catch (err) {
    console.error("Error in serveCalendar:", err);
    return new Response("An error occurred: could not process calendar link.", { status: 500, headers: { ...corsHeaders } });
  }
}
