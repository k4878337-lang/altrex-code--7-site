import { NextResponse } from 'next/server';
import { ProviderRegistry } from '@altrex/core/orchestrator/registry.js';
import { GroqProvider } from '@altrex/core/providers/groq.js';
import { OllamaProvider } from '@altrex/core/providers/ollama.js';
import { XkiroProvider } from '@altrex/core/providers/xkiro.js';

export async function GET() {
  const registry = new ProviderRegistry();
  const xkiroKey = process.env.XKIRO_API_KEY || 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d';
  registry.register(new XkiroProvider({ apiKey: xkiroKey }));
  if (process.env.GROQ_API_KEY) {
    registry.register(new GroqProvider({ apiKey: process.env.GROQ_API_KEY }));
  } else {
    registry.register(new GroqProvider({}));
  }
  registry.register(new OllamaProvider({}));

  const statuses = await registry.probeAll();

  return NextResponse.json({
    models: statuses,
    onlineCount: statuses.filter((s) => s.online).length,
  });
}
