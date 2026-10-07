import crypto from 'crypto';

const DEFAULT_CONFIG = {
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "1qo4DMUGNd-D7n2hbrRiGIIkR24mArDoKZSeYjdkP8hQ",
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "lnk-773@cty-lnk-161.iam.gserviceaccount.com",
  privateKey: (process.env.GOOGLE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDTg5BFj22QViBG\nTyE073/XFsN/Tu0qf9zHmCREpC0V8hMUIG1sh7BhcfEYMpoQy3PK1EKmcVFj33/f\nn8p1KI+4vGrFAJgXLPxlbNmfJA1S2Ru5rMZxamZPiQ+vfCSVbjlyfb019oaDTd55\nTYWxl8QjI7uv+bd8p2aJDCk6fMams96j82kjQG5GObrmDNINtNWXW9S7K32Yndjx\nOcoFe4VFICAau9y2phJFdw1Dh82fa2DMtnJttCeRN+wgQhoH0299XEoyJvGTzBTH\n1hJnwzKiiZHlLNMTAmzqlp+/YZa9kkqBhslKG+w3U0qS6gJA2Qh2yJQCEQYUk5OD\nqDrd2ZmBAgMBAAECggEAJIbhJJ4dE/LHrpSuPaPJnkW0W7kv3GnJ4R8tTjxS++n6\n8PwboYU6SM3CTsU4VYOpGsM2wmMp5Nc9UEtaTYrEbSj+wEg2u7PdX4+hcmnpsh/D\nubg0afQvuHcJQissbzDik1rTEO1is+y/6Y9hcfatXMsoN77meMy4+Jxkx1CyhqmT\ncOowEwASxDkSKN4472OSujg7ECkQY224FlafLbjU5nsRgF2EqfA4Z10e+FGQE6l0\n+E6mD135lUyk/Ug6zjizEdEmHC8+BBfsGJCIYizBFJZ7KjfF5VPbdWHBdw+m0qQr\nMIqfTrfiO7TVs8VqiFv3JEOYKSG6ZM7oAIii7xsGdQKBgQDxqLxd+NPbZFp0OKEU\nAOmNt2CjA/iEmCeNZ8Cjkkn6lWS6q8X9fdWEHAgWJPcnOZA4U3PrZSNFZzrJ9f+b\nVWS5/zynJgAY96YAQoOiTJjnJUlaMTNt+QkEtduFZKOwy1I4Ig9fFwQQBIrlE4rQ\nc39QaYm7Az9JLJAqVwScMYlAPQKBgQDgEN1NOKMUkEbOtLIWWnUWTzCtSChs4AvQ\nbhIivQAMQRcZ4ALtpf1RIJgqHyh2SA3ptGaujJDic61tfTeEUx1NEIFdisFpLIG6\nu88g0KMU/0hJd0yabg/Cgh464Sp2XTeiB3tDd7LwfdUMZFVameiSREAZW/feLbPO\nbmJ/3aFulQKBgCwSScgZiQmJ07U+XqH3SKC/wK/6GWiVFyGCum8aTsOUWzpv+Tux\npy7grdjcBPbyWIrtLUbQuw39NYt/gY4ilKwXEEirdXkYMP37I2aF8Zy2ABqivm5f\n7HUfdVlucSvc6LG0BHmjCOqi6XG9jqNVbPKNTMD+ZpxBtEkEdaLGpfFBAoGAE+bL\nkTlPmtr5vxBjpQKh1bpw62M2W/1Gb1vndnhtEamSYLT57ZvJtTP87/jWgjMCMVjZ\nqfVIRSTbKZdun+019AtcQi+54BqY5zoZOqPtaEcIZ6YWAr113uPpxXcMa3j6IQUj\nGKoAFcZHbxNWVXbIJn2zZ804Zd6PUu2RCCRqW0UCgYEAv5rs4lg2tdIx3zKX67qQ\naFDBvxYriDqUuACpzV9TlZme6tDp+S21BGhwzwl9dcaWjda++lqyBqtkSHZtGAY+\nNf7d7jqgqgiofhYlBTSVo8qU8vVvIlzgzOb+Z3aZPiZHiCu8K4YAJ9Qn5q8Fz1PV\n4b87bpePRsmiNvOiCsTBaRY=\n-----END PRIVATE KEY-----\n").replace(/\\n/g, '\n'),
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
};

let cachedAccessToken = null;
let tokenExpiryTime = 0;

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiryTime - 300000) {
    return cachedAccessToken;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: DEFAULT_CONFIG.serviceAccountEmail,
    scope: DEFAULT_CONFIG.scopes.join(" "),
    aud: DEFAULT_CONFIG.tokenUrl,
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(DEFAULT_CONFIG.privateKey, "base64url");
  const sJWT = `${signatureInput}.${signature}`;

  const response = await fetch(DEFAULT_CONFIG.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${sJWT}`
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google OAuth error: ${JSON.stringify(data)}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiryTime = Date.now() + (data.expires_in * 1000);
  return cachedAccessToken;
}

// Helper to convert column letter to 0-based index (e.g. A->0, G->6, AA->26)
function colLetterToIndex(colStr) {
  if (!colStr) return 0;
  let index = 0;
  const upper = colStr.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      index = index * 26 + (code - 64);
    }
  }
  return Math.max(0, index - 1);
}

// Parses start column index, end column index, and start row number from A1 notation range
function parseRangeInfo(rangeStr) {
  if (!rangeStr) {
    return { startColIndex: 0, endColIndex: 25, startRowNum: 1 };
  }
  const clean = rangeStr.replace(/.*!/, '').trim();
  const parts = clean.split(':');
  const startPart = parts[0] || '';
  const endPart = parts[1] || startPart;

  const startColMatch = startPart.match(/^([A-Za-z]+)/);
  const startRowMatch = startPart.match(/^[A-Za-z]*(\d+)/);
  const endColMatch = endPart.match(/^([A-Za-z]+)/);

  const startColIndex = startColMatch ? colLetterToIndex(startColMatch[1]) : 0;
  const endColIndex = endColMatch ? colLetterToIndex(endColMatch[1]) : (startColMatch ? startColIndex : 25);
  const startRowNum = startRowMatch ? parseInt(startRowMatch[1], 10) : 1;

  return { startColIndex, endColIndex, startRowNum };
}

// Google Sheets API Helpers with automatic retry on 429 / network errors
async function callSheetFetch(sheetName, range = "A1:Z50000", maxRetries = 3) {
  const cleanSheetName = (sheetName || '').replace(/['"]/g, '').split('!')[0].trim().toUpperCase();
  const rawSheetName = (sheetName || '').replace(/['"]/g, '').split('!')[0].trim();
  const cleanRange = (range || "A1:Z50000").replace(/.*!/, '').trim() || "A1:Z50000";
  const encodedRange = encodeURIComponent(`'${rawSheetName}'!${cleanRange}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_CONFIG.spreadsheetId}/values/${encodedRange}`;

  let attempt = 0;
  while (true) {
    attempt++;
    const token = await getAccessToken();

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        if ((response.status === 429 || response.status >= 500) && attempt <= maxRetries) {
          const delay = attempt * 1500;
          console.warn(`[callSheetFetch] HTTP ${response.status} for ${sheetName}, retrying attempt ${attempt} in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Sheet fetch failed: HTTP ${response.status} - ${errText}`);
      }

      const data = await response.json();
      let values = data.values || [];

      // SECURITY: If DSNV (Employees/Users) is fetched, ALWAYS sanitize passwords from response!
      // Robust check: normalize sheetName (strip quotes, sub-range syntax, whitespace)
      if (cleanSheetName === 'DSNV' && values.length > 0) {
        const { startColIndex, endColIndex, startRowNum } = parseRangeInfo(cleanRange);
        const firstRowLower = values[0].map(h => (h || '').toString().trim().toLowerCase());
        const headerKeywords = ['id', 'ho_ten', 'họ tên', 'name', 'password', 'mat_khau', 'mk', 'quyen', 'role', 'truong', 'gioi_tinh', 'ngay_sinh'];
        const matchCount = firstRowLower.filter(h => headerKeywords.includes(h)).length;
        // Considered a header row only if at least 2 known schema column names are present
        const isSingleColHeader = firstRowLower.length === 1 && ['password', 'mat_khau', 'mk'].includes(firstRowLower[0]);
        const isHeaderRow = matchCount >= 2 ? (startRowNum === 1) : (startRowNum === 1 && isSingleColHeader);

        const passIndices = new Set();
        if (isHeaderRow) {
          firstRowLower.forEach((h, i) => {
            if (h === 'password' || h === 'mat_khau' || h === 'mk' || h.includes('pass') || h.includes('mật khẩu')) {
              passIndices.add(i);
            }
          });
        }

        // In DSNV schema, column 6 (Col G) is password
        // If queried range includes Col G, calculate its relative index in the returned rows
        const colGInRange = (startColIndex <= 6 && 6 <= endColIndex);
        if (colGInRange) {
          const relColGIndex = 6 - startColIndex;
          if (relColGIndex >= 0) {
            passIndices.add(relColGIndex);
          }
        }
        if (startColIndex === 0 && endColIndex >= 6) {
          passIndices.add(6);
        }

        values = values.map((row, rIdx) => {
          if (rIdx === 0 && isHeaderRow) return row;
          const copy = [...row];
          passIndices.forEach(idx => {
            if (copy[idx] !== undefined) copy[idx] = '***'; // Mask password
          });
          return copy;
        });
      }

      return values;
    } catch (err) {
      if (attempt <= maxRetries && (err.message.includes('429') || err.message.includes('fetch failed') || err.message.includes('ECONNRESET'))) {
        const delay = attempt * 1500;
        console.warn(`[callSheetFetch] Retry attempt ${attempt} for ${sheetName} in ${delay}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

async function callSheetUpdate(sheetName, range, values, valueInputOption = "USER_ENTERED") {
  const token = await getAccessToken();
  const cleanSheet = (sheetName || '').replace(/['"]/g, '').split('!')[0].trim();
  const cleanRange = (range || '').replace(/.*!/, '').trim();
  const encodedRange = encodeURIComponent(`'${cleanSheet}'!${cleanRange}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_CONFIG.spreadsheetId}/values/${encodedRange}?valueInputOption=${valueInputOption}`;
  
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Sheet update failed: HTTP ${response.status} - ${errText}`);
  }

  return await response.json();
}

async function callSheetAppend(sheetName, values, valueInputOption = "USER_ENTERED") {
  const token = await getAccessToken();
  const cleanSheet = (sheetName || '').replace(/['"]/g, '').split('!')[0].trim();
  const encodedRange = encodeURIComponent(`'${cleanSheet}'!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_CONFIG.spreadsheetId}/values/${encodedRange}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Sheet append failed: HTTP ${response.status} - ${errText}`);
  }

  return await response.json();
}

async function callSheetClear(sheetName, range) {
  const token = await getAccessToken();
  const cleanSheet = (sheetName || '').replace(/['"]/g, '').split('!')[0].trim();
  const cleanRange = (range || '').replace(/.*!/, '').trim();
  const encodedRange = encodeURIComponent(`'${cleanSheet}'!${cleanRange}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_CONFIG.spreadsheetId}/values/${encodedRange}:clear`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Sheet clear failed: HTTP ${response.status} - ${errText}`);
  }

  return await response.json();
}

// Payload Encryption: AES-256-GCM (Protects sheet data from DevTools network sniffing)
const ENCRYPTION_SECRET = process.env.PAYLOAD_SECRET || "lnk-secure-payload-encryption-v2-key-2026";
let cachedAggregatesResult = null;
let cachedAggregatesTime = 0;
const AGGREGATES_CACHE_TTL = 30000; // 30 seconds memory cache

let cachedRawSheets = null;
let cachedRawSheetsTime = 0;
const RAW_SHEETS_CACHE_TTL = 180000; // 3 minutes memory cache

// Persistent beginning inventory cache (DS_SP_KHO) to guarantee tonDau is never wiped to 0
let cachedSpKhoRows = null;

async function getRawOrderSheets(force = false) {
  const now = Date.now();
  if (!force && cachedRawSheets && (now - cachedRawSheetsTime < RAW_SHEETS_CACHE_TTL)) {
    return cachedRawSheets;
  }
  try {
    const [spKhoRes, nhapRes, xuatRes, transferRes] = await Promise.all([
      callSheetFetch('DS_SP_KHO', 'A1:F10000').catch(err => { console.warn('Fetch DS_SP_KHO:', err.message); return null; }),
      callSheetFetch('NHAP_CT', 'A1:Q60000').catch(err => { console.warn('Fetch NHAP_CT:', err.message); return null; }),
      callSheetFetch('XUAT_CT', 'A1:O60000').catch(err => { console.warn('Fetch XUAT_CT:', err.message); return null; }),
      callSheetFetch('CHUYEN_KHO_CT', 'A1:K60000').catch(err => { console.warn('Fetch CHUYEN_KHO_CT:', err.message); return null; })
    ]);

    // Keep persistent DS_SP_KHO cache whenever successfully loaded
    if (Array.isArray(spKhoRes) && spKhoRes.length > 1) {
      cachedSpKhoRows = spKhoRes;
    }

    // Always fallback to cachedSpKhoRows if new fetch failed or returned empty
    const spRows = (Array.isArray(spKhoRes) && spKhoRes.length > 1)
      ? spKhoRes
      : (cachedSpKhoRows && cachedSpKhoRows.length > 1 ? cachedSpKhoRows : (cachedRawSheets?.spRows || []));

    const nhapRows = (Array.isArray(nhapRes) && nhapRes.length > 0)
      ? nhapRes
      : (cachedRawSheets?.nhapRows || []);

    const xuatRows = (Array.isArray(xuatRes) && xuatRes.length > 0)
      ? xuatRes
      : (cachedRawSheets?.xuatRows || []);

    const transferRows = (Array.isArray(transferRes) && transferRes.length > 0)
      ? transferRes
      : (cachedRawSheets?.transferRows || []);

    if (spRows.length > 0 || nhapRows.length > 0 || xuatRows.length > 0 || !cachedRawSheets) {
      cachedRawSheets = { spRows, nhapRows, xuatRows, transferRows };
      cachedRawSheetsTime = now;
    }
    return cachedRawSheets;
  } catch (err) {
    if (cachedRawSheets) return cachedRawSheets;
    throw err;
  }
}

function encryptPayload(dataObj) {
  try {
    const iv = crypto.randomBytes(12);
    const key = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const jsonStr = JSON.stringify(dataObj);
    const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([encrypted, tag]);
    return {
      success: true,
      encrypted: true,
      iv: iv.toString('base64'),
      data: combined.toString('base64')
    };
  } catch (err) {
    console.error('Payload encryption error:', err);
    return dataObj;
  }
}

function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim().replace(/\s+/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function removeVietnameseTones(str) {
  if (!str) return '';
  let s = str.toString().toLowerCase();
  s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  s = s.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  s = s.replace(/đ/g, 'd');
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function cleanString(val) {
  return (val || '').toString().trim().normalize('NFC');
}

// Serverless Handler (Vercel Node.js Function)
export default async function handler(req, res) {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // CORS Headers: Restrict to trusted domains only
  const origin = req.headers?.origin;
  const reqHost = (req.headers?.host || '').split(':')[0].toLowerCase();
  let isAllowedOrigin = false;
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      const host = parsedOrigin.hostname.toLowerCase();
      if (
        (reqHost && host === reqHost) ||
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.vercel.app') ||
        host.endsWith('.github.io')
      ) {
        isAllowedOrigin = true;
      }
    } catch (_) {
      isAllowedOrigin = false;
    }
  }

  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
  }

  // Preflight and Origin Validation: Reject untrusted cross-origin requests immediately
  if (origin && !isAllowedOrigin) {
    if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }
    return res.status(403).json({ success: false, error: 'Origin không được phép truy cập (CORS Forbidden).' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch (_) {
      return res.status(400).json({ success: false, error: 'Đường dẫn yêu cầu không hợp lệ (URI malformed).' });
    }

    let body = req.body;
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf8'));
      } catch (_) {
        body = {};
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {
        body = {};
      }
    }
    const action = req.query?.action || url.searchParams.get('action') || (body && body.action);

    // 1. SECURE LOGIN ACTION (Server-side Authentication)
    if (action === 'login') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Chỉ chấp nhận phương thức POST cho đăng nhập.' });
      }

      const { id, password } = body || {};
      const rawId = cleanString(id);
      const rawPass = cleanString(password);

      if (!rawId || !rawPass) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ ID và mật khẩu.' });
      }

      if (rawId.length > 100 || rawPass.length > 200) {
        return res.status(400).json({ success: false, error: 'Thông tin tài khoản hoặc mật khẩu vượt quá độ dài cho phép.' });
      }

      const normInputId = rawId.toLowerCase();
      const noToneInputId = removeVietnameseTones(normInputId);
      const normInputPass = rawPass;

      // Read raw DSNV privately on server
      const token = await getAccessToken();
      const encodedRange = encodeURIComponent(`'DSNV'!A1:H10000`);
      const authUrl = `https://sheets.googleapis.com/v4/spreadsheets/${DEFAULT_CONFIG.spreadsheetId}/values/${encodedRange}`;
      const authRes = await fetch(authUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!authRes.ok) {
        throw new Error(`Lỗi kết nối máy chủ xác thực Google Sheets: HTTP ${authRes.status}`);
      }
      const authData = await authRes.json();
      const rows = authData.values || [];

      if (rows.length <= 1) {
        return res.status(401).json({ success: false, error: 'Không tìm thấy dữ liệu nhân viên.' });
      }

      const headers = rows[0].map(h => (h || '').toString().trim().toLowerCase());
      const iId = headers.findIndex(h => h === 'id');
      const iName = headers.findIndex(h => h === 'ho_ten' || h === 'họ tên' || h === 'name' || h === 'ten');
      const iImage = headers.findIndex(h => h === 'hinh_anh');
      const iGender = headers.findIndex(h => h === 'gioi_tinh');
      const iBirthDate = headers.findIndex(h => h === 'ngay_sinh');
      const iRole = headers.findIndex(h => h === 'role' || h === 'quyen');
      const iPass = headers.findIndex(h => h === 'password' || h === 'mat_khau' || h === 'mk');
      const iType = headers.findIndex(h => h === 'truong');

      // Multi-criteria candidate scoring
      const candidates = [];
      for (let idx = 0; idx < rows.slice(1).length; idx++) {
        const r = rows[idx + 1];
        if (!r || r.length === 0) continue;

        const uId = cleanString(iId !== -1 ? r[iId] : r[0]);
        const uName = cleanString(iName !== -1 ? r[iName] : r[1]) || uId;
        const uPass = cleanString(iPass !== -1 ? r[iPass] : r[6]);

        if (!uId && !uName) continue;
        if (uId.toLowerCase() === 'mã nhân viên' || uId.toLowerCase() === 'id') continue;

        const uIdLower = uId.toLowerCase();
        const uNameLower = uName.toLowerCase();
        const uIdNoTone = removeVietnameseTones(uIdLower);
        const uNameNoTone = removeVietnameseTones(uNameLower);
        const typeStr = cleanString(iType !== -1 ? r[iType] : r[7] || '').toUpperCase();
        const isEmployee = typeStr.includes('VIÊN') || !typeStr.includes('KHÁCH');

        const nameTokens = uNameLower.split(/[\s\-_,.]+/).filter(Boolean);
        const nameNoToneTokens = uNameNoTone.split(/[\s\-_,.]+/).filter(Boolean);

        let score = 0;
        if (uIdLower === normInputId) {
          score = 100; // Exact ID match
        } else if (uNameLower === normInputId) {
          score = 90; // Exact Name match
        } else if (uIdNoTone === noToneInputId) {
          score = 80; // Unaccented ID match
        } else if (uNameNoTone === noToneInputId) {
          score = 70; // Unaccented Name match
        } else if (nameTokens.includes(normInputId)) {
          score = 60; // Word in name match
        } else if (nameNoToneTokens.includes(noToneInputId)) {
          score = 50; // Word in unaccented name match
        } else if (normInputId.length >= 3 && uNameLower.startsWith(normInputId)) {
          score = 40; // Name starts with input
        } else if (noToneInputId.length >= 3 && uNameNoTone.startsWith(noToneInputId)) {
          score = 30; // Unaccented name starts with input
        }

        if (score === 0) continue;

        if (isEmployee) score += 5;

        const isPassMatch = (
          uPass === normInputPass ||
          ((uPass === '123456' || uPass === '1') && (normInputPass === '1' || normInputPass === '123456')) ||
          (!uPass && (normInputPass === '1' || normInputPass === '123456'))
        );

        if (isPassMatch) {
          candidates.push({
            score,
            user: {
              sheetRow: idx + 2,
              id: uId,
              loginAlias: rawId,
              name: uName,
              image: cleanString(iImage !== -1 ? r[iImage] : r[2]),
              gender: cleanString(iGender !== -1 ? r[iGender] : r[3]),
              birthDate: cleanString(iBirthDate !== -1 ? r[iBirthDate] : r[4]),
              role: cleanString(iRole !== -1 ? r[iRole] : r[5] || 'KHO').toUpperCase(),
              type: typeStr || 'NHÂN VIÊN'
            }
          });
        }
      }

      let matchedUser = null;
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        matchedUser = candidates[0].user;
      }

      if (!matchedUser) {
        return res.status(401).json({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác!' });
      }

      return res.status(200).json(encryptPayload({
        success: true,
        user: matchedUser
      }));
    }

    // 2. SERVER-SIDE STOCK AGGREGATIONS (Eliminates raw transaction downloads in DevTools)
    if (action === 'aggregates') {
      const force = (req.query?.force || url.searchParams.get('force') || (body && body.force)) === 'true';
      const nppId = (req.query?.nppId || url.searchParams.get('nppId') || (body && body.nppId) || '').toString().trim().toLowerCase();
      const nppName = (req.query?.nppName || url.searchParams.get('nppName') || (body && body.nppName) || '').toString().trim().toLowerCase();

      const now = Date.now();
      let rawAggregates = null;

      if (!force && cachedAggregatesResult && (now - cachedAggregatesTime < AGGREGATES_CACHE_TTL)) {
        rawAggregates = cachedAggregatesResult;
      } else {
        const { spRows, nhapRows, xuatRows } = await getRawOrderSheets(force);

        const aggregatesMap = {};
        const nppExportMap = {};

        const findCol = (rows, candidates, fallback) => {
          if (!rows || rows.length === 0) return fallback;
          const headers = (rows[0] || []).map(h => (h || '').toString().trim().toLowerCase());
          for (const c of candidates) {
            const idx = headers.findIndex(h => h.includes(c));
            if (idx !== -1) return idx;
          }
          return fallback;
        };

        const iSpKhoId = findCol(spRows, ['id_sp', 'ma_sp'], 2);
        const iSpKhoTonDau = findCol(spRows, ['ton_dau'], 4);

        const iNhapSpId = findCol(nhapRows, ['id_sp', 'ma_sp'], 6);
        const iNhapSlg = findCol(nhapRows, ['slg', 'so_luong'], 8);

        const iXuatCustId = findCol(xuatRows, ['ma_kh'], 4);
        const iXuatCustName = findCol(xuatRows, ['ten_khach', 'ten_kh'], 5);
        const iXuatSpId = findCol(xuatRows, ['id_sp', 'ma_sp'], 6);
        const iXuatSlg = findCol(xuatRows, ['slg', 'so_luong'], 8);

        // 1. Ton dau from DS_SP_KHO
        spRows.slice(1).forEach(row => {
          const idSp = (row[iSpKhoId] || '').toString().trim().toLowerCase();
          if (!idSp) return;
          const tonDau = cleanNumber(row[iSpKhoTonDau]);
          if (!aggregatesMap[idSp]) {
            aggregatesMap[idSp] = { tonDau: 0, tongNhap: 0, tongXuat: 0, tonCuoi: 0 };
          }
          aggregatesMap[idSp].tonDau += tonDau;
        });

        // Fallback: If spRows was somehow empty on this run, preserve tonDau from previous cache
        if (spRows.length <= 1 && cachedAggregatesResult?.aggregatesMap) {
          for (const key in cachedAggregatesResult.aggregatesMap) {
            const prevItem = cachedAggregatesResult.aggregatesMap[key];
            if (prevItem && prevItem.tonDau > 0) {
              if (!aggregatesMap[key]) {
                aggregatesMap[key] = { tonDau: 0, tongNhap: 0, tongXuat: 0, tonCuoi: 0 };
              }
              aggregatesMap[key].tonDau = prevItem.tonDau;
            }
          }
        }

        // 2. Nhap from NHAP_CT
        nhapRows.slice(1).forEach(row => {
          const idSp = (row[iNhapSpId] || '').toString().trim().toLowerCase();
          if (!idSp) return;
          const slg = cleanNumber(row[iNhapSlg]);
          if (!aggregatesMap[idSp]) {
            aggregatesMap[idSp] = { tonDau: 0, tongNhap: 0, tongXuat: 0, tonCuoi: 0 };
          }
          aggregatesMap[idSp].tongNhap += slg;
        });

        // 3. Xuat from XUAT_CT
        xuatRows.slice(1).forEach(row => {
          const idSp = (row[iXuatSpId] || '').toString().trim().toLowerCase();
          if (!idSp) return;
          const slg = cleanNumber(row[iXuatSlg]);
          if (!aggregatesMap[idSp]) {
            aggregatesMap[idSp] = { tonDau: 0, tongNhap: 0, tongXuat: 0, tonCuoi: 0 };
          }
          aggregatesMap[idSp].tongXuat += slg;

          const custId = (row[iXuatCustId] || '').toString().trim().toLowerCase();
          const custName = (row[iXuatCustName] || '').toString().trim().toLowerCase();
          if (custId) {
            if (!nppExportMap[custId]) nppExportMap[custId] = new Set();
            nppExportMap[custId].add(idSp);
          }
          if (custName) {
            if (!nppExportMap[custName]) nppExportMap[custName] = new Set();
            nppExportMap[custName].add(idSp);
          }
        });

        // 4. tonCuoi = tonDau + tongNhap - tongXuat
        for (const key in aggregatesMap) {
          const item = aggregatesMap[key];
          item.tonCuoi = item.tonDau + item.tongNhap - item.tongXuat;
        }

        if (Object.keys(aggregatesMap).length > 0 || !cachedAggregatesResult) {
          rawAggregates = { aggregatesMap, nppExportMap };
          cachedAggregatesResult = rawAggregates;
          cachedAggregatesTime = now;
        } else {
          rawAggregates = cachedAggregatesResult;
        }
      }

      let nppProductIds = [];
      if (nppId || nppName) {
        const idSet = (rawAggregates.nppExportMap && rawAggregates.nppExportMap[nppId]) || new Set();
        const nameSet = (rawAggregates.nppExportMap && rawAggregates.nppExportMap[nppName]) || new Set();
        const combined = new Set([...idSet, ...nameSet]);
        nppProductIds = Array.from(combined);
      }

      return res.status(200).json(encryptPayload({
        success: true,
        aggregates: rawAggregates.aggregatesMap,
        nppProductIds
      }));
    }

    // 2.5 PRODUCT DETAIL (Stock by warehouse & Chronological transactions with running balance)
    if (action === 'product_detail') {
      const rawProductId = req.query?.productId || url.searchParams.get('productId') || (body && body.productId) || '';
      const targetId = cleanString(rawProductId).toLowerCase();

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Thiếu mã sản phẩm (productId).' });
      }

      const { spRows, nhapRows, xuatRows, transferRows } = await getRawOrderSheets(false);

      const findCol = (rows, candidates, fallback) => {
        if (!rows || rows.length === 0) return fallback;
        const headers = (rows[0] || []).map(h => (h || '').toString().trim().toLowerCase());
        for (const c of candidates) {
          const idx = headers.findIndex(h => h.includes(c));
          if (idx !== -1) return idx;
        }
        return fallback;
      };

      const iSpKhoId = findCol(spRows, ['id_sp', 'ma_sp'], 2);
      const iSpKhoTonDau = findCol(spRows, ['ton_dau'], 4);
      const iSpKhoName = findCol(spRows, ['kho'], 1);

      const iNhapSpId = findCol(nhapRows, ['id_sp', 'ma_sp'], 6);
      const iNhapSlg = findCol(nhapRows, ['slg', 'so_luong'], 8);
      const iNhapKho = findCol(nhapRows, ['kho'], 11);

      const iXuatSpId = findCol(xuatRows, ['id_sp', 'ma_sp'], 6);
      const iXuatSlg = findCol(xuatRows, ['slg', 'so_luong'], 8);
      const iXuatKho = findCol(xuatRows, ['kho'], 11);

      const iTransferSpId = findCol(transferRows, ['id_sp', 'ma_sp'], 3);
      const iTransferSlg = findCol(transferRows, ['slg', 'so_luong'], 5);
      const iTransferKhoDi = findCol(transferRows, ['kho_di'], 6);
      const iTransferKhoNhan = findCol(transferRows, ['kho_nhan'], 7);

      // Default warehouses
      const whMap = {};
      ['KHO 1', 'KHO 2', 'KHO 3', 'KHO 4', 'KHO 5'].forEach(w => {
        whMap[w] = { kho: w, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 };
      });

      // 1. Baseline tonDau from DS_SP_KHO
      spRows.slice(1).forEach(row => {
        const idSp = (row[iSpKhoId] || '').toString().trim().toLowerCase();
        if (idSp === targetId) {
          const kho = (row[iSpKhoName] || '').toString().trim().toUpperCase();
          if (kho) {
            if (!whMap[kho]) whMap[kho] = { kho, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 };
            whMap[kho].tonDau += cleanNumber(row[iSpKhoTonDau]);
          }
        }
      });

      const transactions = [];

      // 2. Nhap from NHAP_CT
      nhapRows.slice(1).forEach((row, idx) => {
        const idSp = (row[iNhapSpId] || '').toString().trim().toLowerCase();
        if (idSp === targetId) {
          const kho = (row[iNhapKho] || '').toString().trim().toUpperCase();
          const slg = cleanNumber(row[iNhapSlg]);
          if (kho) {
            if (!whMap[kho]) whMap[kho] = { kho, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 };
            whMap[kho].nhap += slg;
          }
          transactions.push({
            id: `NHAP_${row[0] || idx}`,
            _origIdx: idx,
            date: row[1] || '',
            type: 'NHẬP',
            delta: slg,
            slg,
            mdh: (row[3] || '').toString().trim(),
            partnerCode: (row[4] || '').toString().trim(),
            partnerName: (row[5] || '').toString().trim(),
            kho: kho || 'KHO 1',
            donGia: cleanNumber(row[9]),
            thanhTien: cleanNumber(row[10]),
            user: row[12] || '',
            note: row[13] || '',
            loaiHinh: row[14] || 'Thường'
          });
        }
      });

      // 3. Xuat from XUAT_CT
      xuatRows.slice(1).forEach((row, idx) => {
        const idSp = (row[iXuatSpId] || '').toString().trim().toLowerCase();
        if (idSp === targetId) {
          const kho = (row[iXuatKho] || '').toString().trim().toUpperCase();
          const slg = cleanNumber(row[iXuatSlg]);
          if (kho) {
            if (!whMap[kho]) whMap[kho] = { kho, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 };
            whMap[kho].xuat += slg;
          }
          transactions.push({
            id: `XUAT_${row[0] || idx}`,
            _origIdx: idx,
            date: row[1] || '',
            type: 'XUẤT',
            delta: -slg,
            slg,
            mdh: (row[3] || '').toString().trim(),
            partnerCode: (row[4] || '').toString().trim(),
            partnerName: (row[5] || '').toString().trim(),
            kho: kho || 'KHO 1',
            donGia: cleanNumber(row[9]),
            thanhTien: cleanNumber(row[10]),
            user: row[12] || '',
            note: row[13] || '',
            loaiHinh: row[14] || 'Thường'
          });
        }
      });

      // 4. Chuyen kho from CHUYEN_KHO_CT
      transferRows.slice(1).forEach((row, idx) => {
        const idSp = (row[iTransferSpId] || '').toString().trim().toLowerCase();
        if (idSp === targetId) {
          const khoDi = (row[iTransferKhoDi] || '').toString().trim().toUpperCase();
          const khoNhan = (row[iTransferKhoNhan] || '').toString().trim().toUpperCase();
          const slg = cleanNumber(row[iTransferSlg]);
          if (khoDi) {
            if (!whMap[khoDi]) whMap[khoDi] = { kho: khoDi, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 };
            whMap[khoDi].chuyenDi += slg;
          }
          if (khoNhan) {
            if (!whMap[khoNhan]) whMap[khoNhan] = { kho: khoNhan, tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 };
            whMap[khoNhan].chuyenDen += slg;
          }
          transactions.push({
            id: `TRANSFER_${row[0] || idx}`,
            _origIdx: idx,
            date: row[1] || '',
            type: 'CHUYỂN KHO',
            delta: 0,
            slg,
            mdh: (row[2] || '').toString().trim(),
            partnerCode: '',
            partnerName: `Chuyển kho: ${khoDi} ➔ ${khoNhan}`,
            kho: `${khoDi} ➔ ${khoNhan}`,
            transferFrom: khoDi,
            transferTo: khoNhan,
            donGia: 0,
            thanhTien: 0,
            user: '',
            note: row[8] || '',
            loaiHinh: row[9] || 'Điều chuyển'
          });
        }
      });

      // Compute tonCuoi for each kho
      const warehouseBreakdown = Object.values(whMap).map(w => ({
        ...w,
        tonCuoi: w.tonDau + w.nhap - w.xuat + w.chuyenDen - w.chuyenDi
      })).sort((a, b) => a.kho.localeCompare(b.kho));

      const totals = warehouseBreakdown.reduce((acc, curr) => ({
        tonDau: acc.tonDau + curr.tonDau,
        nhap: acc.nhap + curr.nhap,
        xuat: acc.xuat + curr.xuat,
        chuyenDen: acc.chuyenDen + curr.chuyenDen,
        chuyenDi: acc.chuyenDi + curr.chuyenDi,
        tonCuoi: acc.tonCuoi + curr.tonCuoi
      }), { tonDau: 0, nhap: 0, xuat: 0, chuyenDen: 0, chuyenDi: 0, tonCuoi: 0 });

      return res.status(200).json(encryptPayload({
        success: true,
        productId: rawProductId,
        warehouseBreakdown,
        transactions,
        totals
      }));
    }

    // 3. FETCH SHEET VALUES
    if (action === 'fetch') {
      const rawSheet = req.query?.sheet || url.searchParams.get('sheet') || (body && body.sheet);
      const sheetName = (rawSheet || '').toString().trim();
      const range = req.query?.range || url.searchParams.get('range') || (body && body.range) || "A1:Z50000";

      if (!sheetName) {
        return res.status(400).json({ success: false, error: 'Thiếu tên sheet.' });
      }

      const values = await callSheetFetch(sheetName, range);
      return res.status(200).json(encryptPayload({ success: true, values }));
    }

    // 4. UPDATE SHEET RANGE
    if (action === 'update') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Chỉ chấp nhận phương thức POST cho cập nhật.' });
      }
      const { sheetName, range, values, valueInputOption } = body || {};
      const rawSheet = (sheetName || '').toString().trim();
      const rawRange = (range || '').toString().trim();
      if (!rawSheet || !rawRange || !values) {
        return res.status(400).json({ success: false, error: 'Thiếu thông số cập nhật.' });
      }
      if (!Array.isArray(values)) {
        return res.status(400).json({ success: false, error: 'Thông số values phải là mảng dữ liệu (Array).' });
      }

      const cleanSheet = rawSheet.replace(/['"]/g, '').split('!')[0].trim().toUpperCase();
      if (cleanSheet === 'DSNV') {
        const { startRowNum } = parseRangeInfo(rawRange);
        if (startRowNum === 1) {
          return res.status(403).json({ success: false, error: 'Không cho phép sửa đổi dòng tiêu đề (Header row) trên DSNV.' });
        }
      }

      cachedAggregatesResult = null; // Invalidate cached stock aggregates
      const result = await callSheetUpdate(rawSheet, rawRange, values, valueInputOption);
      return res.status(200).json(encryptPayload({ success: true, result }));
    }

    // 5. APPEND SHEET ROWS
    if (action === 'append') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Chỉ chấp nhận phương thức POST cho thêm dòng.' });
      }
      const { sheetName, values, valueInputOption } = body || {};
      const rawSheet = (sheetName || '').toString().trim();
      if (!rawSheet || !values) {
        return res.status(400).json({ success: false, error: 'Thiếu thông số thêm dòng.' });
      }
      if (!Array.isArray(values)) {
        return res.status(400).json({ success: false, error: 'Thông số values phải là mảng dữ liệu (Array).' });
      }

      cachedAggregatesResult = null; // Invalidate cached stock aggregates
      const result = await callSheetAppend(rawSheet, values, valueInputOption);
      return res.status(200).json(encryptPayload({ success: true, result }));
    }

    // 6. BATCH CLEAR AND WRITE (e.g. CAI_DAT)
    if (action === 'batchClearAndWrite') {
      if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Chỉ chấp nhận phương thức POST cho ghi đè batch.' });
      }
      const { sheetName, range = "A1:H1000", values, valueInputOption } = body || {};
      const rawSheet = (sheetName || '').toString().trim();
      if (!rawSheet || !values) {
        return res.status(400).json({ success: false, error: 'Thiếu thông số ghi sheet.' });
      }
      if (!Array.isArray(values)) {
        return res.status(400).json({ success: false, error: 'Thông số values phải là mảng dữ liệu (Array).' });
      }

      const cleanSheet = rawSheet.replace(/['"]/g, '').split('!')[0].trim().toUpperCase();
      if (cleanSheet === 'DSNV') {
        return res.status(403).json({ success: false, error: 'Không cho phép batch clear trên DSNV.' });
      }

      cachedAggregatesResult = null; // Invalidate cached stock aggregates
      await callSheetClear(rawSheet, range);
      const result = await callSheetUpdate(rawSheet, range, values, valueInputOption);
      return res.status(200).json(encryptPayload({ success: true, result }));
    }

    return res.status(400).json({ success: false, error: `Hành động không hợp lệ: ${action}` });
  } catch (err) {
    console.error("API /api/sheets error:", err);
    let msg = err.message || 'Lỗi xử lý máy chủ';
    if (msg.includes('type.googleapis.com') || msg.includes('fieldViolations') || msg.includes('oauth2.googleapis.com')) {
      msg = 'Lỗi kết nối máy chủ Google Sheets API.';
    }
    return res.status(500).json({ success: false, error: msg });
  }
}
