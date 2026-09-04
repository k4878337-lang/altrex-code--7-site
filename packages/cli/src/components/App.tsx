import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { AltrexAgentV2, AgentMode } from '../../../../src/server/agent-v2.js';
import { ProviderRegistry } from '../../../../src/server/orchestrator/registry.js';
import { GroqProvider, OllamaProvider, XkiroProvider, GeminiProvider } from '../../../../src/server/providers.js';

export function App() {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<{ type: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AgentMode>('balanced');
  const [registry] = useState(() => {
    const reg = new ProviderRegistry();
    // Default xKiro provider with user's verified API key
    reg.register(new XkiroProvider({ apiKey: process.env.XKIRO_API_KEY || 'sk-xt-19b03eb1104eca18e25a8a1c9445d0daef38460339ec289d' }));
    if (process.env.GROQ_API_KEY) {
      reg.register(new GroqProvider({ apiKey: process.env.GROQ_API_KEY }));
    }
    reg.register(new OllamaProvider({}));
    if (process.env.GEMINI_API_KEY) {
      reg.register(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY }));
    }
    return reg;
  });
  const [agent] = useState(() => new AltrexAgentV2(registry, mode));
  const [onlineCount, setOnlineCount] = useState(0);

  // Probe providers on mount
  useEffect(() => {
    registry.probeAll().then((statuses) => {
      const online = statuses.filter((s) => s.online).length;
      setOnlineCount(online);
      setLogs((l) => [
        ...l,
        {
          type: 'system',
          content: `🔌 Probed ${statuses.length} providers. ${online} online.`,
        },
      ]);
    });
  }, []);

  useInput((char, key) => {
    if (key.ctrl && char.toLowerCase() === 'c') exit();
    if (key.ctrl && char.toLowerCase() === 'm') {
      const modes: AgentMode[] = ['speed', 'balanced', 'deep'];
      const next = modes[(modes.indexOf(mode) + 1) % modes.length];
      setMode(next);
      agent.setMode(next);
      setLogs((l) => [...l, { type: 'system', content: `⚡ Mode switched to: ${next.toUpperCase()}` }]);
    }
  });

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const prompt = input;
    setInput('');
    setLogs((l) => [...l, { type: 'user', content: prompt }]);
    setIsLoading(true);

    try {
      let currentAssistantMsg = '';
      for await (const chunk of agent.run(prompt)) {
        if (chunk.type === 'text') {
          currentAssistantMsg += chunk.content;
          setLogs((l) => {
            const last = l[l.length - 1];
            if (last?.type === 'assistant') {
              return [...l.slice(0, -1), { type: 'assistant', content: currentAssistantMsg }];
            }
            return [...l, { type: 'assistant', content: currentAssistantMsg }];
          });
        } else if (chunk.type === 'tool_execution') {
          setLogs((l) => [...l, { type: 'tool', content: `🛠️  ${chunk.name}: ${chunk.result.substring(0, 120)}...` }]);
        } else if (chunk.type === 'ensemble_info') {
          setLogs((l) => [...l, { type: 'ensemble', content: chunk.info }]);
        } else if (chunk.type === 'error') {
          setLogs((l) => [...l, { type: 'error', content: chunk.content || 'Unknown error' }]);
        }
      }
    } catch (err: any) {
      setLogs((l) => [...l, { type: 'error', content: err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const modeColors: Record<AgentMode, string> = { speed: 'green', balanced: 'cyan', deep: 'magenta' };

  return (
    <Box flexDirection="column" width={120} height={45} borderStyle="round" borderColor="cyan">
      {/* Header */}
      <Box paddingX={2} marginBottom={1} justifyContent="space-between">
        <Text color="cyan" bold>⚡ ALTREX CODE v2.0</Text>
        <Box gap={3}>
          <Text>Models: <Text color="green" bold>{onlineCount}</Text></Text>
          <Text>Mode: <Text color={modeColors[mode]} bold>{mode.toUpperCase()}</Text></Text>
          <Text dimColor>Ctrl+M: Mode | Ctrl+C: Exit</Text>
        </Box>
      </Box>

      {/* Chat Log */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} overflowY="hidden">
        {logs.map((log, i) => (
          <Box key={i} marginBottom={1}>
            {log.type === 'user' && <Text color="blue" bold>❯ {log.content}</Text>}
            {log.type === 'assistant' && <Text color="white">{log.content}</Text>}
            {log.type === 'tool' && <Text color="yellow">{log.content}</Text>}
            {log.type === 'ensemble' && <Text color="magenta" bold>{log.content}</Text>}
            {log.type === 'error' && <Text color="red">❌ {log.content}</Text>}
            {log.type === 'system' && <Text color="gray">{log.content}</Text>}
          </Box>
        ))}
        {isLoading && <Text color="cyan">⏳ Processing...</Text>}
      </Box>

      {/* Input */}
      <Box paddingX={2} marginTop={1}>
        <Text color="cyan" bold>❯ </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} placeholder="Ask ALTREX anything..." />
      </Box>
    </Box>
  );
}
