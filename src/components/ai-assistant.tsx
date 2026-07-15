import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAi } from "@/lib/ai.functions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quels documents pour importer un conteneur au Port de Dakar ?",
  "Explique le circuit GAINDE en 5 étapes",
  "Comment calculer les droits & taxes sur une facture CIF ?",
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 Je suis ClearFlow AI, votre assistant dédouanement. Posez-moi une question sur un dossier, une procédure ou un calcul de taxes.",
    },
  ]);
  const chat = useServerFn(chatWithAi);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      setMessages(next.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="ClearFlow AI"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90"
      >
        <Sparkles className="size-3.5" />
        ClearFlow AI
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="relative flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">ClearFlow AI</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Assistant dédouanement
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto p-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Analyse en cours…
                  </div>
                </div>
              )}
              {messages.length === 1 && !loading && (
                <div className="space-y-1.5 pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Suggestions
                  </div>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded border border-border bg-background px-3 py-2 text-left text-xs text-foreground transition hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
                className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid size-9 place-items-center rounded bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
