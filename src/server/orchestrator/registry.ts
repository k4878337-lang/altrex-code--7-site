import { BaseProvider } from '../providers.js';
import { StreamChunk } from '../types.js';

export interface ProviderStatus {
  name: string;
  providerId: string;
  online: boolean;
  latencyMs: number;
  lastChecked: number;
  model?: string;
  error?: string;
}

export class ProviderRegistry {
  private providers = new Map<string, BaseProvider>();
  private statusCache = new Map<string, ProviderStatus>();

  register(provider: BaseProvider) {
    this.providers.set(provider.name.toLowerCase(), provider);
    if (provider.providerId) {
      this.providers.set(provider.providerId.toLowerCase(), provider);
    }
  }

  get(name: string): BaseProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAll(): BaseProvider[] {
    const set = new Set(this.providers.values());
    return Array.from(set);
  }

  /**
   * Probes all providers to check availability and measure latency
   */
  async probeAll(): Promise<ProviderStatus[]> {
    const uniqueProviders = this.getAll();
    const probes = uniqueProviders.map(async (provider) => {
      const start = Date.now();
      let online = false;
      let errMsg: string | undefined;

      try {
        // Send a minimal ping prompt with a 10-second timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Probe timeout (10s)')), 10000)
        );

        const pingPromise = (async () => {
          const gen = provider.chat([{ role: 'user', content: 'Ping' }]);
          const first = await gen.next();
          if (first.value && first.value.type === 'error') {
            throw new Error(first.value.error || 'Provider error');
          }
          return true;
        })();

        await Promise.race([pingPromise, timeoutPromise]);
        online = true;
      } catch (err: any) {
        online = false;
        errMsg = err.message || 'Unknown error';
      }

      const status: ProviderStatus = {
        name: provider.name,
        providerId: provider.providerId || provider.name.toLowerCase(),
        online,
        latencyMs: Date.now() - start,
        lastChecked: Date.now(),
        error: errMsg,
      };

      this.statusCache.set(provider.name.toLowerCase(), status);
      if (provider.providerId) {
        this.statusCache.set(provider.providerId.toLowerCase(), status);
      }
      return status;
    });

    return Promise.all(probes);
  }

  getStatus(name: string): ProviderStatus | undefined {
    return this.statusCache.get(name.toLowerCase());
  }

  setStatus(name: string, status: ProviderStatus) {
    this.statusCache.set(name.toLowerCase(), status);
  }

  getAllStatuses(): ProviderStatus[] {
    const seen = new Set<string>();
    const statuses: ProviderStatus[] = [];
    for (const status of this.statusCache.values()) {
      if (!seen.has(status.name)) {
        seen.add(status.name);
        statuses.push(status);
      }
    }
    return statuses;
  }
}
