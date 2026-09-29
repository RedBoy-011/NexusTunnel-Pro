import net from 'net';
import { ProxyConfig } from '../src/types.js';

export interface PingResult {
  latency: number;
  success: boolean;
  error?: string;
}

/**
 * Real TCP socket connection test to proxy server:port
 * Measures precise millisecond latency for the TCP 3-way handshake.
 */
export function testTcpLatency(host: string, port: number, timeoutMs = 2500): Promise<PingResult> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (isResolved) return;
      isResolved = true;
      const latency = Math.round(performance.now() - startTime);
      cleanup();
      resolve({ latency, success: true });
    });

    socket.on('timeout', () => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve({ latency: -1, success: false, error: 'Timeout (پاسخی دریافت نشد)' });
    });

    socket.on('error', (err) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve({ latency: -1, success: false, error: err.message || 'خطای اتصال' });
    });

    try {
      socket.connect(port, host);
    } catch (err: any) {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve({ latency: -1, success: false, error: err.message || 'عدم دسترسی به هاست' });
    }
  });
}

/**
 * Run concurrent tests with controlled concurrency to avoid socket exhaustion.
 */
export async function testConfigsBatch(
  configs: ProxyConfig[],
  concurrency = 8,
  timeoutMs = 2500,
  onProgress?: (testedCount: number, total: number) => void
): Promise<ProxyConfig[]> {
  const results: ProxyConfig[] = [...configs];
  let currentIdx = 0;
  let finishedCount = 0;

  async function worker() {
    while (currentIdx < results.length) {
      const idx = currentIdx++;
      const item = results[idx];

      const res = await testTcpLatency(item.server, item.port, timeoutMs);
      results[idx] = {
        ...item,
        ping: res.success ? res.latency : -1,
        status: res.success ? 'online' : 'offline',
        lastTestedAt: new Date().toLocaleTimeString('fa-IR'),
      };

      finishedCount++;
      if (onProgress) {
        onProgress(finishedCount, results.length);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, configs.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
