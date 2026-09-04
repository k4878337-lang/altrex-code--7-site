import { NextRequest } from 'next/server';
import { ProviderRegistry } from '@altrex/core/orchestrator/registry.js';
import { AltrexAgentV2 } from '@altrex/core/agent/agent-v2.js';
import { GroqProvider } from '@altrex/core/providers/groq.js';
import { OllamaProvider } from '@altrex/core/providers/ollama.js';
import { XkiroProvider } from '@altrex/core/providers/xkiro.js';

let registry: ProviderRegistry | null = null;

function getRegistry(): ProviderRegistry {
  if (!registry) {
    registry = new ProviderRegistry();
    const xkiroKey = process.env.XKIRO_API_KEY || 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d';
    registry.register(new XkiroProvider({ apiKey: xkiroKey }));
    if (process.env.GROQ_API_KEY) {
      registry.register(new GroqProvider({ apiKey: process.env.GROQ_API_KEY }));
    } else {
      registry.register(new GroqProvider({}));
    }
    registry.register(new OllamaProvider({}));
  }
  return registry;
}

export async function POST(req: NextRequest) {
  const { message, prompt, mode } = await req.json();
  const userPrompt = message || prompt;
  const reg = getRegistry();

  await reg.probeAll();

  const agent = new AltrexAgentV2(reg, mode || 'balanced');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of agent.run(userPrompt)) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
