import { networkInterfaces } from 'os';

export type NetworkAddressKind = 'lan' | 'vpn' | 'other';

export interface NetworkAddress {
  interfaceName: string;
  address: string;
  kind: NetworkAddressKind;
}

const VPN_INTERFACE_PATTERN =
  /tap|tun|vpn|wireguard|wg|nordlynx|openvpn|wintun|hamachi|zerotier|tailscale|ppp|vethernet|hyper-v|cloudflare|warp/i;

const LAN_INTERFACE_PATTERN =
  /wi-?fi|wlan|ethernet|eth\d*|en\d+|local area connection|wireless|qualcomm|realtek|intel/i;

function isIpv4(family: string | number): boolean {
  return family === 'IPv4' || family === 4;
}

function classifyInterface(interfaceName: string): NetworkAddressKind {
  if (VPN_INTERFACE_PATTERN.test(interfaceName)) {
    return 'vpn';
  }
  if (LAN_INTERFACE_PATTERN.test(interfaceName)) {
    return 'lan';
  }
  return 'other';
}

export function getNetworkAddresses(): NetworkAddress[] {
  const interfaces = networkInterfaces();
  const addresses: NetworkAddress[] = [];

  for (const [interfaceName, entries] of Object.entries(interfaces)) {
    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (!isIpv4(entry.family) || entry.internal) {
        continue;
      }

      addresses.push({
        interfaceName,
        address: entry.address,
        kind: classifyInterface(interfaceName),
      });
    }
  }

  return addresses;
}

/**
 * Pick the best LAN IP for phones on the same Wi‑Fi network.
 * VPN adapters are deprioritized because they often break local routing.
 */
export function getRecommendedLanIp(): string | undefined {
  const manual = process.env.DEV_LAN_IP?.trim() || process.env.MEDIASOUP_ANNOUNCED_IP?.trim();
  if (manual) {
    return manual;
  }

  const addresses = getNetworkAddresses();
  const lan = addresses.find((entry) => entry.kind === 'lan');
  if (lan) {
    return lan.address;
  }

  const nonVpn = addresses.find((entry) => entry.kind !== 'vpn');
  if (nonVpn) {
    return nonVpn.address;
  }

  return addresses[0]?.address;
}

export function formatDevServerUrls(port: number): string {
  const recommended = getRecommendedLanIp();
  const addresses = getNetworkAddresses();
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  AutoLab API — Flutter IP config (Settings → Server IP)');
  lines.push('═══════════════════════════════════════════════════════════');

  if (recommended) {
    lines.push(`  ★ Recommended for physical phone:  ${recommended}`);
    lines.push(`    API base URL: http://${recommended}:${port}`);
  } else {
    lines.push('  ⚠ No LAN IP detected. Use 10.0.2.2 for Android emulator.');
  }

  lines.push('');
  lines.push('  Quick reference:');
  lines.push(`    Android emulator:  10.0.2.2:${port}`);
  lines.push(`    iOS simulator:     127.0.0.1:${port}`);
  lines.push(`    Same PC / browser: 127.0.0.1:${port}`);

  if (addresses.length > 0) {
    lines.push('');
    lines.push('  All IPv4 interfaces on this machine:');
    for (const entry of addresses) {
      const tag =
        entry.kind === 'vpn' ? 'VPN ' : entry.kind === 'lan' ? 'LAN ' : 'OTHER';
      const marker = entry.address === recommended ? ' ★' : '';
      lines.push(
        `    [${tag}] ${entry.address.padEnd(15)} ${entry.interfaceName}${marker}`,
      );
    }
  }

  lines.push('');
  lines.push('  VPN tip: use the LAN/Wi‑Fi IP (★), not the VPN adapter IP.');
  lines.push('  Override: set DEV_LAN_IP=your.ip.in.env');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}
