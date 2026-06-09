import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, XCircle, Search, Bot, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { sidecar, type AppAction } from '@/services/sidecarClient';

const PROVIDER_LABELS: Record<string, string> = {
  anthropic:     'Claude (Anthropic)',
  openai:        'GPT-4o (OpenAI)',
  gemini:        'Gemini (Google)',
  'azure-openai':'Azure OpenAI',
  ollama:        'Ollama (local)',
  together:      'Together AI',
  'custom-openai':'Custom OpenAI',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserMsg    { role: 'user';      content: string }
interface AssistMsg  { role: 'assistant'; content: string; actions: AppAction[] }
type ConvMessage = UserMsg | AssistMsg;

// ── Action cards ──────────────────────────────────────────────────────────────

function CatalogSearchCard({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const results = (data['results'] as { id: string; method: string; path: string; summary?: string }[]) ?? [];
  const query   = data['query'] as string;

  const METHOD_COLOR: Record<string, string> = {
    GET: 'bg-sky-100 text-sky-700', POST: 'bg-emerald-100 text-emerald-700',
    PUT: 'bg-amber-100 text-amber-700', DELETE: 'bg-red-100 text-red-700',
    PATCH: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="mt-2 rounded border border-border bg-surface-alt text-xs">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <Search size={13} className="text-text-muted" />
        <span className="flex-1 font-medium">Catalog search: "{query}" — {results.length} result(s)</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {results.length === 0
            ? <li className="px-3 py-2 text-text-muted">No matching endpoints found.</li>
            : results.map((ep) => (
              <li key={ep.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className={`rounded px-1.5 py-0.5 font-mono font-semibold ${METHOD_COLOR[ep.method] ?? 'bg-surface text-text'}`}>
                  {ep.method}
                </span>
                <span className="flex-1 truncate font-mono" title={ep.path}>{ep.path}</span>
                {ep.summary && <span className="hidden truncate text-text-muted sm:block" style={{ maxWidth: '30ch' }}>{ep.summary}</span>}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function BotJobCreatedCard({ data }: { data: Record<string, unknown> }) {
  const id   = data['id'] as string;
  const name = data['name'] as string;
  return (
    <div className="mt-2 flex items-center gap-3 rounded border border-success/30 bg-success/5 px-3 py-2 text-xs">
      <CheckCircle2 size={16} className="flex-shrink-0 text-success" />
      <div className="flex-1">
        <span className="font-semibold">{name}</span>
        <span className="ml-2 font-mono text-text-muted">{id}</span>
      </div>
      <Link
        to={`/designer?job=${id}`}
        className="btn btn-sm flex items-center gap-1 text-xs"
      >
        Open Designer <ExternalLink size={11} />
      </Link>
    </div>
  );
}

function ExecutionCard({ data }: { data: Record<string, unknown> }) {
  const passed = Number(data['passed'] ?? 0);
  const total  = Number(data['total']  ?? 0);
  const status = data['status'] as string;
  const ok     = status === 'passed' || passed === total;
  return (
    <div className={`mt-2 flex items-center gap-3 rounded border px-3 py-2 text-xs ${
      ok ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
    }`}>
      {ok
        ? <CheckCircle2 size={16} className="flex-shrink-0 text-success" />
        : <XCircle     size={16} className="flex-shrink-0 text-destructive" />
      }
      <span className="flex-1">
        {passed}/{total} steps passed · status: <strong>{status}</strong>
      </span>
      <Link to="/execute" className="btn btn-sm text-xs">View Results</Link>
    </div>
  );
}

function ActionCard({ action }: { action: AppAction }) {
  switch (action.type) {
    case 'catalog_search':  return <CatalogSearchCard  data={action.data} />;
    case 'botjob_created':  return <BotJobCreatedCard  data={action.data} />;
    case 'botjob_executed': return <ExecutionCard      data={action.data} />;
    default: return null;
  }
}

// ── Message bubbles ────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
        {content}
      </div>
    </div>
  );
}

function AssistBubble({ msg }: { msg: AssistMsg }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot size={15} className="text-primary" />
      </div>
      <div className="flex-1">
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-2.5 text-sm shadow-sm">
          {msg.content
            ? <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            : <p className="italic text-text-muted">…</p>
          }
        </div>
        {msg.actions.map((a, i) => <ActionCard key={i} action={a} />)}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot size={15} className="text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-2.5 text-sm text-text-muted shadow-sm">
        <span className="animate-pulse">ARWeb Builder is thinking…</span>
      </div>
    </div>
  );
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'I want to create a BotJob that creates a new client',
  'What BotJobs do I already have?',
  'Search the catalog for payment endpoints',
  'Run all my BotJobs against the Mock Server',
];

// ── Main page ─────────────────────────────────────────────────────────────────

export function BotBuilderPage() {
  const [messages,     setMessages]     = useState<ConvMessage[]>([]);
  const [input,        setInput]        = useState('');
  const [busy,         setBusy]         = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Probe which provider is active by making a silent ping.
  useEffect(() => {
    sidecar.getAiProviders().then(({ providers }) => {
      const def = providers.find((p) => p.isDefault && p.enabled && p.hasApiKey);
      const any = providers.find((p) => p.enabled && p.hasApiKey);
      setActiveProvider((def ?? any)?.provider ?? null);
    }).catch(() => setActiveProvider(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    const userMsg: UserMsg  = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);

    const payload = next.map((m) => ({ role: m.role, content: m.content }));

    console.group('%c[Bot Builder] handleSend', 'color:#6366f1;font-weight:bold');
    console.log('user message :', content);
    console.log('full history sent to server:', payload);
    console.groupEnd();

    try {
      console.time('[Bot Builder] appChat round-trip');
      const r = await sidecar.appChat(payload);
      console.timeEnd('[Bot Builder] appChat round-trip');

      console.group('%c[Bot Builder] response received', 'color:#22c55e;font-weight:bold');
      console.log('provider used :', r.provider ?? '(none)');
      console.log('answer        :', r.answer);
      console.log('actions       :', r.actions);
      console.groupEnd();

      if (r.provider && activeProvider === undefined) setActiveProvider(r.provider);
      setMessages([...next, { role: 'assistant', content: r.answer, actions: r.actions }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[Bot Builder] appChat FAILED:', errMsg);
      setMessages([...next, { role: 'assistant', content: `Error: ${errMsg}`, actions: [] }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Bot Builder"
            subtitle="Ask me to create BotJobs, search the API catalog, or run tests — I take real actions."
          />
          {/* AI provider badge */}
          {activeProvider === undefined ? null : activeProvider ? (
            <span className="mt-1 flex-shrink-0 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              {PROVIDER_LABELS[activeProvider] ?? activeProvider}
              {activeProvider === 'anthropic' && ' · tool use ✓'}
            </span>
          ) : (
            <Link
              to="/settings"
              className="mt-1 flex flex-shrink-0 items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-medium text-warning hover:bg-warning/20"
            >
              <AlertTriangle size={12} /> No AI provider — configure in Settings
            </Link>
          )}
        </div>
      </div>

      {/* conversation area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">What would you like to build?</h3>
            <p className="mb-6 max-w-sm text-sm text-text-muted">
              I can search your API catalog, create BotJobs, and run tests — all from a single conversation.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="rounded-lg border border-border bg-surface px-4 py-2.5 text-left text-sm hover:border-primary/50 hover:bg-surface-alt"
                  onClick={() => handleSend(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m, i) =>
              m.role === 'user'
                ? <UserBubble   key={i} content={m.content} />
                : <AssistBubble key={i} msg={m as AssistMsg} />,
            )}
            {busy && <ThinkingBubble />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* input bar */}
      <div className="border-t border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build or test…"
            className="input flex-1 resize-none"
            style={{ maxHeight: '8rem', overflowY: 'auto' }}
          />
          <button
            className="btn btn-primary flex items-center gap-1.5 self-end px-4"
            onClick={() => handleSend()}
            disabled={busy || !input.trim()}
          >
            <Send size={15} /> Send
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-text-muted">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
