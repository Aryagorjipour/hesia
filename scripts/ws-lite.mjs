import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function acceptWebSocket(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return null;
  }
  const digest = createHash("sha1").update(key + GUID).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${digest}\r\n\r\n`,
  );
  return new WebSocketConnection(socket);
}

class WebSocketConnection {
  /** @param {import('node:net').Socket} socket */
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.readyState = 1;
    socket.on("data", (chunk) => this.#onData(chunk));
    socket.on("close", () => {
      this.readyState = 3;
      this.onclose?.();
    });
    socket.on("error", () => socket.destroy());
  }

  /** @type {((data: string) => void) | undefined} */
  onmessage;
  /** @type {(() => void) | undefined} */
  onclose;

  #onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const fin = (this.buffer[0] & 0x80) !== 0;
      const opcode = this.buffer[0] & 0x0f;
      const masked = (this.buffer[1] & 0x80) !== 0;
      let length = this.buffer[1] & 0x7f;
      let offset = 2;

      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        length = high * 2 ** 32 + low;
        offset = 10;
      }

      const maskLen = masked ? 4 : 0;
      const total = offset + maskLen + length;
      if (this.buffer.length < total) return;

      let payload = this.buffer.subarray(offset + maskLen, total);
      if (masked) {
        const mask = this.buffer.subarray(offset, offset + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      this.buffer = this.buffer.subarray(total);

      if (opcode === 0x8) {
        this.close();
        return;
      }
      if (opcode === 0x1 && fin) {
        this.onmessage?.(payload.toString("utf8"));
      }
    }
  }

  send(text) {
    if (this.readyState !== 1) return;
    const payload = Buffer.from(text, "utf8");
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[0] = 0x81;
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    try {
      this.socket.write(Buffer.from([0x88, 0x00]));
      this.socket.end();
    } catch {
      this.socket.destroy();
    }
  }
}