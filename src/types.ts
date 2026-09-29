export interface ProxyConfig {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  name: string;
  protocol: 'vless' | 'vmess' | 'trojan' | 'ss' | 'ssr' | 'other';
  server: string;
  port: number;
  rawUrl: string;
  ping: number; // in milliseconds, -1 if unreachable
  lastTestedAt?: string;
  status: 'online' | 'offline' | 'testing' | 'pending';
  assignedPort?: number; // 1081 - 1088
  isLoadBalanced?: boolean; // Part of 1080
  details?: Record<string, any>;
}

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  lastUpdated?: string;
  configsCount: number;
  activeCount: number;
  error?: string;
}

export interface SystemStatus {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalConfigs: number;
  onlineConfigs: number;
  testInterval: number; // seconds
  lastTestTime: string | null;
  nextTestCountdown: number; // seconds
  isTesting: boolean;
  masterPort: number; // 1080
  poolPorts: number[]; // [1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088]
  loadBalancerAlgorithm: 'round-robin' | 'least-ping' | 'random';
  supportsIpv6?: boolean;
  ipv6ConfigsCount?: number;
}

export type TunnelProtocol = 'TCP' | 'UDP';
export type IpStackType = 'IPv4' | 'IPv6' | 'DualStack';

export interface TunnelRule {
  id: string;
  protocol: TunnelProtocol;
  localPort: number;
  remotePort: number;
  description: string;
  enabled: boolean;
  status: 'active' | 'syncing' | 'error';
  lastSyncAt?: string;
  ipFamily?: IpStackType;
  tunnelId?: string; // which tunnel this rule is bound to
}

export type MultiTunnelStrategy = 'failover' | 'load-balance' | 'active-standby';

export interface TunnelInstance {
  id: string;
  name: string;
  remoteHost: string;
  remotePort: number;
  remoteUser: string;
  remoteIpv6?: string;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'unconfigured';
  latencyMs: number;
  uptimeSeconds: number;
  enabled: boolean;
  priority: number;
  mode: 'primary' | 'standby' | 'load-balance';
  sshKeyGenerated: boolean;
  publicKeySnippet: string;
  lastSyncTime?: string;
  rules: TunnelRule[];
}

export interface CoreDependencyStatus {
  name: string;
  package: string;
  installed: boolean;
  version?: string;
  description: string;
}

export interface TunnelConfig {
  id?: string;
  name?: string;
  isConfigured: boolean;
  remoteHost: string;
  remotePort: number;
  remoteUser: string;
  sshKeyGenerated: boolean;
  publicKeySnippet: string;
  autoRecovery: boolean;
  watchdogIntervalSec: number;
  currentLocalIp: string;
  lastKnownLocalIp: string;
  currentLocalIpv6?: string;
  remoteIpv6?: string;
  supportsIpv6: boolean;
  ipStackMode: 'dual-stack' | 'ipv4-only' | 'ipv6-only';
  status: 'connected' | 'disconnected' | 'reconnecting' | 'unconfigured';
  latencyMs: number;
  uptimeSeconds: number;
  lastSyncTime?: string;
  rules: TunnelRule[];
  // Multi-Tunnel additions
  tunnels: TunnelInstance[];
  activeTunnelId: string;
  multiTunnelStrategy: MultiTunnelStrategy;
  autoDependenciesInstalled: boolean;
  coreDependencies: CoreDependencyStatus[];
}

export interface TunnelSetupRequest {
  tunnelId?: string;
  name?: string;
  remoteHost: string;
  remotePort: number;
  remoteUser: string;
  remoteIpv6?: string;
  mode?: 'primary' | 'standby' | 'load-balance';
  password?: string; // used ONCE to set up passwordless SSH, then deleted
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'WATCHDOG' | 'AUTH' | 'RESTART';

export interface LogEntry {
  id: string;
  timestamp: string;
  isoTime: string;
  level: LogLevel;
  tag: string;
  message: string;
  details?: Record<string, any>;
}

export interface LogBufferStats {
  totalEntries: number;
  maxCapacity: number;
  memoryUsageKb: number;
  droppedEntries: number;
  oldestLogTime?: string;
  newestLogTime?: string;
}

export interface OneTimeToken {
  token: string;
  createdAt: string;
  expiresAt: string;
  expiresInSeconds: number;
  used: boolean;
  createdBy: 'cli-ssh' | 'api' | 'system';
}

export interface AuthStatus {
  authRequired: boolean;
  allowLocalhostBypass: boolean;
  isAuthenticated: boolean;
  sessionExpiry?: string;
  activeTokensCount: number;
  loginMethod?: 'localhost-bypass' | 'otp-token' | 'none';
}

export interface MagicLinkInfo {
  token: string;
  localUrl: string;
  publicIpUrl: string;
  remoteTunnelUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
}
