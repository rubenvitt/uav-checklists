import net from 'node:net';

/**
 * Result of scanning a single byte buffer with ClamAV.
 *  - `clean: true`           → clamd reported `stream: OK`
 *  - `clean: false`          → clamd reported `... FOUND`; `signature` names the hit
 */
export interface ScanResult {
  clean: boolean;
  signature?: string;
}

/**
 * A virus scanner: takes raw bytes, resolves with a {@link ScanResult}, and
 * REJECTS (throws) when the scanner is unreachable, times out, or replies with
 * anything unexpected. Callers MUST treat a rejection as fail-closed (refuse the
 * upload) rather than letting unscanned bytes through.
 */
export type UploadScanner = (buf: Buffer) => Promise<ScanResult>;

const CHUNK_SIZE = 64 * 1024;

/**
 * Builds a {@link UploadScanner} backed by a clamd daemon reachable over TCP,
 * speaking the INSTREAM protocol directly — no third-party dependency.
 *
 * INSTREAM framing: send `zINSTREAM\0`, then for each chunk a 4-byte big-endian
 * length prefix followed by the chunk bytes, terminated by a zero-length chunk
 * (`0x00000000`). clamd replies `stream: OK\0` or `stream: <sig> FOUND\0` and
 * closes the connection.
 *
 * NOTE on size limits: clamd silently returns OK for streams exceeding its
 * `StreamMaxLength`/`MaxFileSize` (the bytes are NOT scanned). Keep the request
 * body cap comfortably below clamd's configured limits (see clamav/clamd.conf).
 */
export function createClamavScanner(
  host: string,
  port: number,
  opts: { timeoutMs?: number } = {},
): UploadScanner {
  const timeoutMs = opts.timeoutMs ?? 30_000;

  return (buf: Buffer) =>
    new Promise<ScanResult>((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let response = '';
      let settled = false;

      const finish = (err: Error | null, result?: ScanResult): void => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (err) reject(err);
        else resolve(result!);
      };

      socket.setTimeout(timeoutMs);
      socket.on('timeout', () => finish(new Error('clamav: timeout')));
      socket.on('error', (err) => finish(err));
      socket.on('data', (d) => {
        response += d.toString('utf8');
      });
      socket.on('end', () => {
        const text = response.replace(/\0/g, '').trim();
        const found = text.match(/^stream:\s*(.+?)\s+FOUND$/);
        if (found) {
          finish(null, { clean: false, signature: found[1] });
          return;
        }
        if (/^stream:\s*OK$/.test(text)) {
          finish(null, { clean: true });
          return;
        }
        // INSTREAM size-limit / parse / protocol errors all fail closed.
        finish(new Error(`clamav: unexpected response: ${text || '(empty)'}`));
      });

      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let off = 0; off < buf.length; off += CHUNK_SIZE) {
          const chunk = buf.subarray(off, off + CHUNK_SIZE);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }
        // Zero-length chunk terminates the stream.
        socket.write(Buffer.alloc(4));
      });
    });
}
