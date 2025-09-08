/**
 * Midnight wallet connector utility
 * Simple wrapper for connecting to Lace wallet with Midnight support
 */

// Type definition for connected wallet info
export type WalletInfo = {
  name: string;
  address?: string;
};

// Safe check for browser environment
const isBrowser = typeof window !== 'undefined';

// Stores the API object returned by `provider.enable()` so we can reuse it
let lastApi: unknown | null = null;

/**
 * Check if a compatible wallet is installed
 * @returns boolean indicating if a supported wallet is available
 */
export function isInstalled(): boolean {
  if (!isBrowser) return false;

  // Check for Lace wallet (Midnight preview)
  if (window.mnLace || window.cardano?.lace || window.lace || window.midnight?.mnLace) {
    return true;
  }

  return false;
}

/**
 * Connect to an available wallet
 * @returns Promise resolving to WalletInfo if successful, null otherwise
 */
export async function connect(): Promise<WalletInfo | null> {
  if (!isBrowser) return null;

  try {
    const provider = getFirstProvider();
    if (!provider) {
      console.warn('No compatible wallet found');
      return null;
    }

    // enable() returns a proxy or capability object in CIP-30 style wallets
    if (typeof provider.enable === 'function') {
      lastApi = await provider.enable();
    }

    // Attempt to derive an address for display
    let addr: string | undefined;
    try {
      // 1) Preferred: state() call exposed by Midnight Lace
      // Narrow type – we only care about an optional `state()` method that reveals an address
      interface MidnightApi {
        state?: () => Promise<{ address?: string }>;
      }
      const apiObj: MidnightApi = (lastApi ?? provider) as MidnightApi;

      const fetchStateAddr = async () => {
        try {
          if (typeof apiObj.state === 'function') {
            const st = await apiObj.state();
            if (st && typeof st.address === 'string' && st.address.length > 0) {
              return st.address as string;
            }
          }
        } catch {
          /* ignore */
        }
        return undefined;
      };

      // Poll up to 10× every 500 ms if address isn't available yet
      addr = await fetchStateAddr();
      let retries = 0;
      while (!addr && retries < 10) {
        await new Promise(r => setTimeout(r, 500));
        addr = await fetchStateAddr();
        retries += 1;
      }

      if (typeof provider.getUsedAddresses === 'function') {
        const used = await provider.getUsedAddresses();
        addr = Array.isArray(used) && used.length ? String(used[0]) : undefined;
      } else if (typeof provider.getChangeAddress === 'function') {
        addr = String(await provider.getChangeAddress());
      }
    } catch {
      // swallow – address retrieval is best-effort
    }

    // Persist reconnect flag
    try {
      localStorage.setItem('geopass:autoReconnect', '1');
    } catch {
      /* ignore quota / private-mode errors */
    }

    return {
      name: window.midnight?.mnLace ? 'Lace (Midnight)' : 'Lace Wallet',
      address: addr,
    };
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    return null;
  }
}

/**
 * Disconnect clears persisted reconnect preference
 */
export function disconnect(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem('geopass:autoReconnect');
  } catch {
    /* ignore */
  }
}

/**
 * Sign an arbitrary UTF-8 message; triggers Lace popup.
 * Returns the signature (hex / base64) or `null` on failure / unsupported.
 */
export async function signMessage(message: string): Promise<string | null> {
  if (!isBrowser) return null;
  const provider = getProvider();
  if (!provider) return null;

  /**
   * Attempt to read an address by introspecting `state()` or `serializeState()`
   * on the given object. Supports nested `{ state: { address } }`.
   */
  const readAddressViaState = async (src: unknown): Promise<string | undefined> => {
    if (!src || typeof src !== 'object') return undefined;

    const tryCall = async (fnName: 'state' | 'serializeState') => {
      try {
        const fn = (src as Record<string, unknown>)[fnName];
        if (typeof fn === 'function') {
          const raw = await (fn as () => Promise<unknown>)();
          const parsed =
            typeof raw === 'string'
              ? JSON.parse(raw as string)
              : (raw as Record<string, unknown> | null);
          if (!parsed) return undefined;
          // unwrap one level if nested under `state`
          const obj =
            (parsed as Record<string, unknown>).state && typeof parsed === 'object'
              ? (parsed as Record<string, unknown>).state
              : parsed;
          const addr = (obj as Record<string, unknown>).address;
          return typeof addr === 'string' && addr.length ? addr : undefined;
        }
      } catch {
        /* ignore and continue */
      }
      return undefined;
    };

    return (await tryCall('state')) ?? (await tryCall('serializeState'));
  };

  // Narrow type for the subset of API we rely on
  interface SignApi {
    getUsedAddresses?: () => Promise<unknown[]>;
    getChangeAddress?: () => Promise<unknown>;
    signData?: (addr: string, payloadHex: string) => Promise<unknown>;
    signMessage?: (args: unknown) => Promise<unknown>;
  }

  try {
    // Ensure we have an API (result of enable)
    if (!lastApi && typeof provider.enable === 'function') {
      lastApi = await provider.enable();
    }

    // Helper to pick first address for signing (best-effort)
    let address: string | undefined;
    const apiObj: SignApi = (lastApi ?? provider) as SignApi;
    if (typeof apiObj.getUsedAddresses === 'function') {
      const used = await apiObj.getUsedAddresses();
      if (Array.isArray(used) && used.length) address = String(used[0]);
    }
    if (!address && typeof apiObj.getChangeAddress === 'function') {
      address = String(await apiObj.getChangeAddress());
    }

    // Fallback: derive via wallet state serialisation methods
    if (!address) {
      address =
        (await readAddressViaState(apiObj)) ??
        (await readAddressViaState(provider)) ??
        undefined;
    }

    // Convert message -> hex
    let payloadHex: string | undefined;
    const getPayloadHex = () => {
      if (!payloadHex) {
        const msgBytes = new TextEncoder().encode(message);
        payloadHex = Array.from(msgBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return payloadHex;
    };

    // Try signData(addr, hex)
    if (address && apiObj && typeof apiObj.signData === 'function') {
      const sig = await apiObj.signData(address, getPayloadHex());
      return typeof sig === 'string' ? sig : JSON.stringify(sig);
    }
    if (address && typeof (provider as SignApi).signData === 'function') {
      const sig = await (provider as SignApi).signData!(address, getPayloadHex());
      return typeof sig === 'string' ? sig : JSON.stringify(sig);
    }

    // Try generic signMessage variants
    const trySignMessageVariants = async (
      target: SignApi | undefined,
    ): Promise<string | null> => {
      if (!target || typeof target.signMessage !== 'function') return null;
      const fn = target.signMessage.bind(target);
      const attempts: unknown[] = [
        message,
        { message },
        address ? { message, address } : undefined,
      ].filter(Boolean);

      for (const payload of attempts) {
        try {
          const sig = await fn(payload as unknown);
          if (sig != null) {
            return typeof sig === 'string' ? sig : JSON.stringify(sig);
          }
        } catch {
          /* ignore and try next payload */
        }
      }
      return null;
    };

    const sigApi = await trySignMessageVariants(apiObj);
    if (sigApi) return sigApi;

    const sigProvider =
      apiObj === provider ? null : await trySignMessageVariants(provider as SignApi);
    if (sigProvider) return sigProvider;

    console.warn('signMessage not supported by wallet');
    return null;
  } catch (err) {
    console.error('signMessage error:', err);
    return null;
  }
}

/**
 * Try automatic reconnection if user previously connected.
 * @returns WalletInfo or null
 */
export async function autoReconnect(): Promise<WalletInfo | null> {
  if (!isBrowser) return null;
  try {
    const flag = localStorage.getItem('geopass:autoReconnect');
    if (!flag) return null;
    // Only attempt if provider is still present
    if (!isInstalled()) return null;
    return await connect();
  } catch {
    return null;
  }
}

/**
 * Helper ‑ pick the first available wallet provider in priority order.
 */
function getFirstProvider(): LaceProvider | undefined {
  if (!isBrowser) return undefined;
  // Prefer providers exposed under the `window.midnight` namespace
  if (window.midnight) {
    // 1) Explicit mnLace property (current preview build)
    if (window.midnight.mnLace) {
      return window.midnight.mnLace as unknown as LaceProvider;
    }
    // 2) Fallback to generic `lace` key if present
    //    Some older demos exposed `window.midnight.lace`
    if ((window.midnight as Record<string, unknown>).lace) {
      return (window.midnight as Record<string, unknown>)
        .lace as unknown as LaceProvider;
    }
    // 3) Last-resort: first object-valued key under `window.midnight`
    for (const k of Object.keys(window.midnight)) {
      const maybe = (window.midnight as Record<string, unknown>)[k];
      if (maybe && typeof maybe === 'object') {
        return maybe as LaceProvider;
      }
    }
  }
  if (window.mnLace) return window.mnLace;
  if (window.cardano?.lace) return window.cardano.lace as unknown as LaceProvider;
  if (window.lace) return window.lace;
  return undefined;
}

/**
 * Public helper to retrieve provider (may be undefined).
 */
export function getProvider(): LaceProvider | undefined {
  return getFirstProvider();
}

// Add TypeScript declaration for window object extensions
declare global {
  interface Window {
    cardano?: CardanoNamespace;
    lace?: LaceProvider;
    mnLace?: LaceProvider;
    midnight?: {
      mnLace?: LaceProvider;
      [key: string]: unknown;
    };
  }
}

/**
 * Minimal typings for Lace / Cardano providers to avoid `any`.
 * Only the parts we actually touch are typed; everything else is kept as
 * `unknown` to stay future-proof without broad `any` usage.
 */
export interface LaceProvider {
  enable?: () => Promise<unknown>;
  signData?: (addr: string, payloadHex: string) => Promise<unknown>;
  signMessage?: (args: unknown) => Promise<unknown>;
  // unknown fields we don't use are left as `unknown`
  [key: string]: unknown;
}

export interface CardanoNamespace {
  lace?: LaceProvider;
  [key: string]: unknown;
}
