let port = null;
let reader = null;
let writer = null;
let keepReading = false;

export function isSerialSupported() {
  return "serial" in navigator;
}

export async function connectSerial({ onLine, onStatus, onError }) {
  if (!isSerialSupported()) {
    throw new Error("Web Serial is not supported. Use Chrome or Edge.");
  }

  if (port) {
    onStatus?.("Serial already connected.");
    return;
  }

  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 115200 });

  writer = port.writable.getWriter();
  keepReading = true;

  onStatus?.("Serial connected.");
  readLoop({ onLine, onStatus, onError });
}

export async function disconnectSerial() {
  keepReading = false;

  try {
    if (reader) {
      await reader.cancel();
      reader.releaseLock();
      reader = null;
    }
  } catch {}

  try {
    if (writer) {
      writer.releaseLock();
      writer = null;
    }
  } catch {}

  try {
    if (port) {
      await port.close();
      port = null;
    }
  } catch {}

  return true;
}

export async function sendSerialLine(line) {
  if (!writer) {
    throw new Error("Serial writer is not connected.");
  }

  const encoder = new TextEncoder();
  await writer.write(encoder.encode(line.endsWith("\n") ? line : `${line}\n`));
}

async function readLoop({ onLine, onStatus, onError }) {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    reader = port.readable.getReader();

    while (keepReading) {
      const { value, done } = await reader.read();

      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) onLine?.(trimmed);
      }
    }
  } catch (error) {
    if (keepReading) {
      onError?.(error);
    }
  } finally {
    try {
      reader?.releaseLock();
    } catch {}

    reader = null;
    keepReading = false;
    onStatus?.("Serial disconnected.");
  }
}
