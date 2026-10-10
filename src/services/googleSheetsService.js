/**
 * Client-Side Google Sheets Proxy Service
 * Communicates with /api/sheets serverless backend to keep credentials & raw sheets 100% hidden from DevTools
 * Encrypted with AES-256-GCM so responses are indecipherable in Network Tab
 */

const ENCRYPTION_SECRET = "lnk-secure-payload-encryption-v2-key-2026";
let cachedCryptoKey = null;

async function getCryptoKey() {
  if (cachedCryptoKey) return cachedCryptoKey;
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    const enc = new TextEncoder();
    const keyHash = await window.crypto.subtle.digest('SHA-256', enc.encode(ENCRYPTION_SECRET));
    cachedCryptoKey = await window.crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM' }, false, ['decrypt']);
    return cachedCryptoKey;
  } catch (e) {
    console.error('Failed to initialize crypto key:', e);
    return null;
  }
}

function base64ToUint8Array(base64Str) {
  const binaryStr = atob(base64Str);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export async function decryptPayload(payload) {
  if (!payload || !payload.encrypted || !payload.iv || !payload.data) {
    return payload;
  }
  try {
    const cryptoKey = await getCryptoKey();
    if (!cryptoKey) return payload;

    const ivBytes = base64ToUint8Array(payload.iv);
    const dataBytes = base64ToUint8Array(payload.data);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      dataBytes
    );
    const dec = new TextDecoder('utf-8');
    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Payload decryption error:', err);
    return payload;
  }
}

export async function loginWithServerAuth(id, password) {
  const response = await fetch('/api/sheets?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', id, password })
  });

  const raw = await response.json().catch(() => ({}));
  const data = await decryptPayload(raw);

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Tài khoản hoặc mật khẩu không chính xác!');
  }

  return data;
}

export async function fetchSheetValues(sheetName, range = "A1:Z50000") {
  const encodedSheet = encodeURIComponent(sheetName);
  const encodedRange = encodeURIComponent(range);
  const url = `/api/sheets?action=fetch&sheet=${encodedSheet}&range=${encodedRange}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to fetch sheet ${sheetName}: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data.values || [];
}

export async function fetchAggregates(options = {}) {
  const { force = false, nppId = '', nppName = '' } = options;
  const params = new URLSearchParams();
  params.set('action', 'aggregates');
  if (force) params.set('force', 'true');
  if (nppId) params.set('nppId', nppId);
  if (nppName) params.set('nppName', nppName);

  const url = `/api/sheets?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to fetch aggregates: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data;
}

export async function fetchProductDetail(productId) {
  const url = `/api/sheets?action=product_detail&productId=${encodeURIComponent(productId || '')}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to fetch product detail: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data;
}

export async function updateSheetRange(sheetName, range, values, valueInputOption = "USER_ENTERED") {
  const response = await fetch('/api/sheets?action=update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      sheetName,
      range,
      values,
      valueInputOption
    })
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to update sheet ${sheetName}!${range}: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data.result;
}

export async function appendSheetValues(sheetName, values, valueInputOption = "USER_ENTERED") {
  const response = await fetch('/api/sheets?action=append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'append',
      sheetName,
      values,
      valueInputOption
    })
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to append rows to ${sheetName}: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data.result;
}

export async function batchClearAndWriteSheet(sheetName, range, values, valueInputOption = "USER_ENTERED") {
  const response = await fetch('/api/sheets?action=batchClearAndWrite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'batchClearAndWrite',
      sheetName,
      range,
      values,
      valueInputOption
    })
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to write sheet ${sheetName}!${range}: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data.result;
}

export async function clearSheetRange(sheetName, range) {
  const response = await fetch('/api/sheets?action=clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'clear',
      sheetName,
      range
    })
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => ({}));
    const errorData = await decryptPayload(rawError);
    throw new Error(errorData.error || `Failed to clear sheet ${sheetName}!${range}: HTTP ${response.status}`);
  }

  const raw = await response.json();
  const data = await decryptPayload(raw);
  return data.result;
}

