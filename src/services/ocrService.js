import { createWorker } from 'tesseract.js';

export async function recognizeOrderImage(imageFile, onProgress = null) {
  try {
    const worker = await createWorker('vie+eng', 1, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100));
        }
      }
    });

    const ret = await worker.recognize(imageFile);
    await worker.terminate();

    const text = ret.data.text || '';
    return parseOrderTextToRows(text);
  } catch (err) {
    console.error("OCR recognition error:", err);
    throw new Error("Không thể nhận diện hình ảnh đơn hàng: " + (err.message || err));
  }
}

export function parseOrderTextToRows(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rows = [];
  let foundMdh = '';

  // Look for MDH pattern
  for (const line of lines) {
    const mdhMatch = line.match(/(?:mã\s*đơn|mdh|mã\s*đh|đơn\s*hàng|po)[\s:#\-_]*([a-zA-Z0-9\-_]+)/i);
    if (mdhMatch && mdhMatch[1]) {
      foundMdh = mdhMatch[1].trim();
      break;
    }
  }

  // Parse lines that look like product codes and quantities
  for (const line of lines) {
    // Pattern: TK-1234 or SP01 ... 10 or 50
    const codeMatch = line.match(/([A-Z0-9\-_]{3,15})\s+.*?(\d+)\s*(?:cái|bộ|hộp|chiếc|pcs)?$/i);
    if (codeMatch) {
      rows.push({
        idSp: codeMatch[1].trim(),
        name: '',
        quantity: parseInt(codeMatch[2], 10) || 1,
        mdh: foundMdh
      });
    }
  }

  return {
    rawText: text,
    detectedMdh: foundMdh,
    detectedItems: rows
  };
}
