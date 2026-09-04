import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { BaseProvider } from '../providers.js';
import { ProviderRegistry } from '../orchestrator/registry.js';
import { Message, StreamChunk } from '../types.js';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  type: 'provider' | 'tool' | 'ui';
  entry: string;
  config?: Record<string, any>;
}

export class PluginLoader {
  private pluginsDir: string;
  private loadedPlugins: Map<string, any> = new Map();
  private manifests: Map<string, PluginManifest> = new Map();

  constructor(pluginsDir?: string) {
    this.pluginsDir = pluginsDir || path.join(process.cwd(), '.altrex', 'plugins');
    // Ensure plugin directory exists
    if (!fsSync.existsSync(this.pluginsDir)) {
      try {
        fsSync.mkdirSync(this.pluginsDir, { recursive: true });
      } catch {}
    }
  }

  /**
   * Discover all plugins in the plugins directory
   */
  async discover(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];

    // Also check standard plugins/ dir if present
    const dirsToCheck = [this.pluginsDir, path.join(process.cwd(), 'plugins')];

    for (const dir of dirsToCheck) {
      if (!fsSync.existsSync(dir)) continue;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const manifestPath = path.join(dir, entry.name, 'altrex-plugin.json');
          try {
            const raw = await fs.readFile(manifestPath, 'utf-8');
            const manifest: PluginManifest = JSON.parse(raw);
            manifests.push(manifest);
            this.manifests.set(manifest.name, manifest);
          } catch {}
        }
      } catch {}
    }

    return manifests;
  }

  /**
   * Load a provider plugin and register it
   */
  async loadProviderPlugin(
    manifest: PluginManifest,
    registry: ProviderRegistry
  ): Promise<boolean> {
    try {
      // Find where the plugin is located
      let pluginFolder = path.join(this.pluginsDir, manifest.name);
      if (!fsSync.existsSync(pluginFolder)) {
        pluginFolder = path.join(process.cwd(), 'plugins', manifest.name);
      }

      const entryPath = path.join(pluginFolder, manifest.entry);
      if (!fsSync.existsSync(entryPath)) {
        return false;
      }

      const module = await import(`file://${entryPath}`);

      if (module.default && typeof module.default === 'function') {
        const ProviderClass = module.default;
        const instance: BaseProvider = new ProviderClass(manifest.config || {});
        registry.register(instance);
        this.loadedPlugins.set(manifest.name, instance);
        return true;
      }

      return false;
    } catch (error) {
      console.warn(`[PluginLoader] Failed to load plugin ${manifest.name}:`, error);
      return false;
    }
  }

  /**
   * Load all provider plugins
   */
  async loadAllProviders(registry: ProviderRegistry): Promise<number> {
    const manifests = await this.discover();
    let loaded = 0;

    for (const manifest of manifests) {
      if (manifest.type === 'provider') {
        const success = await this.loadProviderPlugin(manifest, registry);
        if (success) loaded++;
      }
    }

    return loaded;
  }

  getLoadedPlugins(): { name: string; manifest?: PluginManifest }[] {
    return Array.from(this.loadedPlugins.keys()).map((name) => ({
      name,
      manifest: this.manifests.get(name),
    }));
  }

  getAllManifests(): PluginManifest[] {
    return Array.from(this.manifests.values());
  }
}
