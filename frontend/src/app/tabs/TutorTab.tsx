/**
 * TutorTab — streaming AI chat grounded in the current playback context
 * (algorithm + events around the current step). Requires sign-in.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AlgorithmDefinition } from '../../engine/definition';
import { ApiError, streamPost } from '../../lib/api';
import { useAuth } from '../../stores/auth';
import { usePlayback } from '../../stores/playback';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function TutorTab({ def }: { def: AlgorithmDefinition }) {
  const user = useAuth((s) => s.user);
  const aiConfigured = useAuth((s) => s.aiConfigured);
  const aiProvider = useAuth((s) => s.aiProvider);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const send = async () => {
    const question = input.trim();
    if (!question || streaming) return;
    setInput('');
    setError(null);

    const playback = usePlayback.getState();
    const history = [...messages, { role: 'user' as const, content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const stream = streamPost(
        '/tutor/chat',
        {
          algorithm_id: def.id,
          question,
          history: messages,
          step: playback.step,
          context: playback.contextWindow(10),
        },
        abort.signal,
      );
      for await (const chunk of stream) {
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Chat failed — is the backend running?');
        setMessages((m) => (m[m.length - 1]?.content === '' ? m.slice(0, -1) : m));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-ink-muted">
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>{' '}
        to chat with the AI tutor. It sees the exact step you're looking at in the visualizer and explains what's
        happening and why.
      </p>
    );
  }

  if (!aiConfigured) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <strong>AI tutor not configured.</strong> The server is running without an API key, so the tutor is disabled.
          Everything else (visualizer, practice tests, progress tracking) still works.
        </div>
        <p className="text-xs text-ink-muted">
          To enable it, add any of <code>ANTHROPIC_API_KEY</code>, <code>OPENAI_API_KEY</code>, <code>GROQ_API_KEY</code>,{' '}
          <code>OPENROUTER_API_KEY</code>, <code>GEMINI_API_KEY</code> to <code>backend/.env</code> (or set{' '}
          <code>OLLAMA_BASE_URL</code> for local Ollama) and restart the backend.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      {aiProvider && (
        <p className="text-[11px] uppercase tracking-wide text-ink-muted">
          Powered by {aiProvider}
        </p>
      )}
      <div ref={scrollRef} className="min-h-[200px] flex-1 space-y-3 overflow-auto">
        {messages.length === 0 && (
          <p className="text-sm text-ink-muted">
            Ask anything about {def.name} — the tutor sees the current playback step and the events around it. Try
            “why did these two elements just swap?”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
              m.role === 'user' ? 'ml-8 bg-accent/15 text-ink' : 'mr-4 bg-surface-2 text-ink'
            }`}
          >
            {m.content || <span className="italic text-ink-muted">Thinking…</span>}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder="Ask about the current step…"
          className="flex-1 rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
        />
        {streaming ? (
          <button
            onClick={() => abortRef.current?.abort()}
            className="rounded-md bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => void send()}
            disabled={!input.trim()}
            className="rounded-md border border-accent/40 bg-accent/20 px-4 py-2 text-sm text-accent hover:bg-accent/30 disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
