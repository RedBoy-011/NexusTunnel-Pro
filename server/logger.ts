import { LogEntry, LogLevel, LogBufferStats } from '../src/types.js';

class CircularLogBuffer {
  private buffer: LogEntry[] = [];
  private maxCapacity: number = 600; // Strictly bounded memory allocation
  private droppedCount: number = 0;

  constructor(maxCapacity = 600) {
    this.maxCapacity = maxCapacity;
    this.seedInitialLogs();
  }

  private seedInitialLogs() {
    this.addLog('INFO', 'SYSTEM', 'سامانه مدیریت و لودبالانسر اوبونتو با موفقیت استارت شد.');
    this.addLog('INFO', 'NETWORK', 'پورت‌های محلی ساکس۵ (۱۰۸۰ تا ۱۰۸۸) به 127.0.0.1 بایند شدند.');
    this.addLog('INFO', 'AUTH', 'احراز هویت بدون رمز (SSH Key Auth) برای تونل معکوس فعال است.');
    this.addLog('WATCHDOG', 'WATCHDOG', 'سرویس پایش زنده و ریکاوری خودکار تونل آماده‌به‌کار گردید.');
  }

  public addLog(level: LogLevel, tag: string, message: string, details?: Record<string, any>): LogEntry {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      isoTime: new Date().toISOString(),
      level,
      tag: tag.toUpperCase(),
      message,
      details,
    };

    if (this.buffer.length >= this.maxCapacity) {
      this.buffer.shift(); // Drop oldest entry (FIFO) to enforce memory limits
      this.droppedCount++;
    }

    this.buffer.push(entry);
    return entry;
  }

  public getLogs(query?: { level?: string; search?: string; limit?: number }): LogEntry[] {
    let result = [...this.buffer];

    if (query?.level && query.level !== 'ALL') {
      result = result.filter((l) => l.level === query.level);
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.tag.toLowerCase().includes(q) ||
          l.level.toLowerCase().includes(q)
      );
    }

    if (query?.limit && query.limit > 0) {
      result = result.slice(-query.limit);
    }

    return result.reverse(); // newest first
  }

  public clearLogs(): void {
    this.buffer = [];
    this.droppedCount = 0;
    this.addLog('INFO', 'SYSTEM', 'بافر حافظه لاگ‌ها توسط کاربر بازنشانی و پاک گردید.');
  }

  public getStats(): LogBufferStats {
    const jsonStr = JSON.stringify(this.buffer);
    const memoryBytes = Buffer.byteLength(jsonStr, 'utf8');

    return {
      totalEntries: this.buffer.length,
      maxCapacity: this.maxCapacity,
      memoryUsageKb: Math.round((memoryBytes / 1024) * 10) / 10,
      droppedEntries: this.droppedCount,
      oldestLogTime: this.buffer[0]?.timestamp,
      newestLogTime: this.buffer[this.buffer.length - 1]?.timestamp,
    };
  }

  public exportPlainText(): string {
    return this.buffer
      .map((l) => `[${l.isoTime}] [${l.level.padEnd(8)}] [${l.tag.padEnd(8)}] ${l.message}`)
      .join('\n');
  }
}

export const logger = new CircularLogBuffer(600);
