import { ProxyConfig } from '../src/types.js';

// Helper to safely decode base64 including url-safe base64 and utf-8
export function safeBase64Decode(str: string): string {
  try {
    let clean = str.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }
    return Buffer.from(clean, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// Extract remarks/name safely
export function safeDecodeRemarks(remark: string): string {
  if (!remark) return '';
  try {
    return decodeURIComponent(remark.trim());
  } catch {
    return remark.trim();
  }
}

export function parseProxyLine(
  line: string,
  subscriptionId: string,
  subscriptionName: string,
  index: number
): ProxyConfig | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
  }

  const id = `cfg_${subscriptionId}_${index}_${Math.random().toString(36).substring(2, 7)}`;

  // VLESS
  if (trimmed.startsWith('vless://')) {
    try {
      const url = new URL(trimmed);
      const name = safeDecodeRemarks(url.hash ? url.hash.slice(1) : '') || `کانفیگ VLESS ${index + 1}`;
      return {
        id,
        subscriptionId,
        subscriptionName,
        name,
        protocol: 'vless',
        server: url.hostname,
        port: parseInt(url.port || '443', 10),
        rawUrl: trimmed,
        ping: -1,
        status: 'pending',
        details: {
          uuid: url.username,
          type: url.searchParams.get('type') || 'tcp',
          security: url.searchParams.get('security') || 'none',
          sni: url.searchParams.get('sni') || url.hostname,
          path: url.searchParams.get('path') || '/',
        }
      };
    } catch {
      return null;
    }
  }

  // VMESS
  if (trimmed.startsWith('vmess://')) {
    try {
      const b64 = trimmed.substring(8);
      const jsonStr = safeBase64Decode(b64);
      if (!jsonStr) return null;
      const vmessData = JSON.parse(jsonStr);
      const name = safeDecodeRemarks(vmessData.ps || '') || `کانفیگ VMess ${index + 1}`;
      return {
        id,
        subscriptionId,
        subscriptionName,
        name,
        protocol: 'vmess',
        server: vmessData.add || '127.0.0.1',
        port: parseInt(vmessData.port || '443', 10),
        rawUrl: trimmed,
        ping: -1,
        status: 'pending',
        details: {
          uuid: vmessData.id,
          net: vmessData.net || 'tcp',
          type: vmessData.type || 'none',
          host: vmessData.host || '',
          path: vmessData.path || '/',
          tls: vmessData.tls || '',
        }
      };
    } catch {
      return null;
    }
  }

  // TROJAN
  if (trimmed.startsWith('trojan://')) {
    try {
      const url = new URL(trimmed);
      const name = safeDecodeRemarks(url.hash ? url.hash.slice(1) : '') || `کانفیگ Trojan ${index + 1}`;
      return {
        id,
        subscriptionId,
        subscriptionName,
        name,
        protocol: 'trojan',
        server: url.hostname,
        port: parseInt(url.port || '443', 10),
        rawUrl: trimmed,
        ping: -1,
        status: 'pending',
        details: {
          password: url.username,
          sni: url.searchParams.get('sni') || url.hostname,
          security: url.searchParams.get('security') || 'tls',
          type: url.searchParams.get('type') || 'tcp',
        }
      };
    } catch {
      return null;
    }
  }

  // SHADOWSOCKS
  if (trimmed.startsWith('ss://')) {
    try {
      let raw = trimmed.substring(5);
      let hash = '';
      if (raw.includes('#')) {
        const parts = raw.split('#');
        raw = parts[0];
        hash = parts[1] || '';
      }
      const name = safeDecodeRemarks(hash) || `کانفیگ SS ${index + 1}`;

      // Can be ss://base64(method:password@host:port) or ss://base64(method:password)@host:port
      if (raw.includes('@')) {
        const [credsPart, serverPart] = raw.split('@');
        const [host, portStr] = serverPart.split(':');
        return {
          id,
          subscriptionId,
          subscriptionName,
          name,
          protocol: 'ss',
          server: host,
          port: parseInt(portStr || '8388', 10),
          rawUrl: trimmed,
          ping: -1,
          status: 'pending',
          details: { creds: credsPart }
        };
      } else {
        const decoded = safeBase64Decode(raw);
        if (decoded && decoded.includes('@')) {
          const [creds, serverPart] = decoded.split('@');
          const [host, portStr] = serverPart.split(':');
          return {
            id,
            subscriptionId,
            subscriptionName,
            name,
            protocol: 'ss',
            server: host,
            port: parseInt(portStr || '8388', 10),
            rawUrl: trimmed,
            ping: -1,
            status: 'pending',
            details: { creds }
          };
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function parseSubscriptionContent(
  rawContent: string,
  subscriptionId: string,
  subscriptionName: string
): ProxyConfig[] {
  let content = rawContent.trim();
  
  // Check if entire content is base64 encoded
  if (!content.includes('vless://') && !content.includes('vmess://') && !content.includes('trojan://') && !content.includes('ss://')) {
    const decoded = safeBase64Decode(content);
    if (decoded && (decoded.includes('vless://') || decoded.includes('vmess://') || decoded.includes('trojan://') || decoded.includes('ss://'))) {
      content = decoded;
    }
  }

  const lines = content.split(/[\r\n]+/);
  const configs: ProxyConfig[] = [];

  let idx = 0;
  for (const line of lines) {
    const parsed = parseProxyLine(line, subscriptionId, subscriptionName, idx);
    if (parsed) {
      configs.push(parsed);
      idx++;
    }
  }

  return configs;
}
