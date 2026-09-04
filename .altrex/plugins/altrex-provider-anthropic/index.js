export default class AnthropicProvider {
  constructor(config = {}) {
    this.name = 'Anthropic Claude (Plugin)';
    this.providerId = 'anthropic-plugin';
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.status = {
      name: this.name,
      providerId: this.providerId,
      online: !!this.apiKey,
      latencyMs: 0,
      lastChecked: Date.now(),
      model: this.model,
    };
  }

  async probe() {
    const start = Date.now();
    this.status.lastChecked = start;
    if (!this.apiKey) {
      this.status.online = false;
      this.status.error = 'Missing ANTHROPIC_API_KEY';
      this.status.latencyMs = 0;
      return this.status;
    }
    this.status.online = true;
    this.status.latencyMs = Date.now() - start;
    return this.status;
  }

  async *chat(messages, tools) {
    if (!this.apiKey) {
      yield { type: 'error', error: 'ANTHROPIC_API_KEY is not configured for plugin.' };
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: messages.filter((m) => m.role !== 'system'),
          system: messages.find((m) => m.role === 'system')?.content,
          stream: true,
        }),
      });

      if (!response.ok) {
        yield { type: 'error', error: `Anthropic API error: ${response.status} ${response.statusText}` };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.text) {
                yield { type: 'text', content: data.delta.text };
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      yield { type: 'error', error: err.message };
    }
  }
}
