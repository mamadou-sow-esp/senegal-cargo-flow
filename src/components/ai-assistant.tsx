import { useState, useRef, useEffect, type ReactNode } from "react";
import { Send, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAi } from "@/lib/ai.functions";
import { toast } from "sonner";
import orusMark from "@/assets/newlogo.png";

type Msg = { role: "user" | "assistant"; content: string };

const sora = { fontFamily: "var(--font-label)" };

const SUGGESTIONS = [
  "Quels documents pour importer un conteneur au Port de Dakar ?",
  "Explique le circuit GAINDE en 5 étapes",
  "Comment calculer les droits & taxes sur une facture CIF ?",
];

// Anneau ORUS qui tourne, avec un liseré fluo (indicateur de chargement).
function OrusSpinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 rounded-full border-2 border-hero-blue/15" />
      <span
        className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-hero-blue"
        style={{ boxShadow: "0 0 10px 0 rgba(51,168,255,0.65)" }}
      />
    </span>
  );
}

// Rendu léger du markdown des réponses (gras, puces, sauts de ligne).
function renderInline(text: string, k: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? (
      <strong key={k + i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={k + i}>{p}</span>
    ),
  );
}

function RichText({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  const flush = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul
        key={`ul${key++}`}
        className="my-1 list-disc space-y-1 pl-5 marker:text-hero-blue"
      >
        {items.map((it, i) => (
          <li key={i}>{renderInline(it, `li${key}-${i}-`)}</li>
        ))}
      </ul>,
    );
  };

  for (const raw of content.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const bullet = line.match(/^\s*[-*+•]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,3}\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim()) {
      blocks.push(<div key={`sp${key++}`} className="h-2" />);
      continue;
    }
    if (heading) {
      blocks.push(
        <p key={`h${key++}`} className="font-bold">
          {renderInline(heading[1], `h${key}-`)}
        </p>,
      );
      continue;
    }
    blocks.push(<p key={`p${key++}`}>{renderInline(line, `p${key}-`)}</p>);
  }
  flush();
  return <div className="space-y-0.5">{blocks}</div>;
}

function Avatar({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-black/10"
      style={{ width: size, height: size, backgroundColor: "#ffffff" }}
    >
      <img
        src={orusMark}
        alt="TransitORUS"
        className="object-contain"
        style={{ width: size * 0.72, height: size * 0.72 }}
      />
    </span>
  );
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour 👋 Je suis TransitORUS, votre assistant dédouanement. Posez-moi une question sur un dossier, une procédure, un calcul de taxes, ou demandez-moi de créer ou modifier un dossier.",
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

  // Verrouille réellement le scroll de la page tant que le panneau est ouvert
  // (technique position:fixed — la seule fiable sur mobile).
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const saved = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.left = saved.left;
      body.style.right = saved.right;
      body.style.width = saved.width;
      body.style.overflow = saved.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

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
      {/* Lanceur flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="TransitORUS"
          aria-label="Ouvrir l'assistant"
          className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg shadow-black/25 ring-1 ring-black/5 transition hover:scale-105"
        >
          <Avatar size={56} />
        </button>
      )}

      {open && (
        <>
          {/* Zone de clic pour fermer (sans voiler tout l'écran) */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />

          {/* Panneau flottant arrondi */}
          <aside className="fixed bottom-5 right-5 z-50 flex h-[640px] max-h-[calc(100vh-2.5rem)] w-[400px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl ring-1 ring-hero-blue/10">
            {/* En-tête */}
            <header className="flex items-center justify-between gap-2 border-b border-border/70 bg-gradient-to-b from-hero-blue/5 to-transparent px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar size={38} />
                  {loading && (
                    <span className="absolute -inset-1">
                      <OrusSpinner size={46} />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-extrabold tracking-tight" style={sora}>
                    Transit<span className="text-hero-blue">ORUS</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Assistant dédouanement
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-black/5 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </header>

            {/* Fil de messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "assistant" && <Avatar size={26} />}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "rounded-2xl rounded-br-md bg-hero-blue text-white"
                        : "rounded-2xl rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <RichText content={m.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 pl-9">
                  <OrusSpinner size={18} />
                  <span className="text-sm text-muted-foreground">
                    Analyse en cours…
                  </span>
                </div>
              )}

              {messages.length === 1 && !loading && (
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Suggestions
                  </div>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-left text-xs text-foreground transition hover:border-hero-blue/50 hover:bg-hero-blue/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Barre d'écriture */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-border/70 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-hero-blue focus:ring-2 focus:ring-hero-blue/25"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-hero-blue text-white shadow-lg shadow-hero-blue/40 transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none"
              >
                {loading ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </form>
          </aside>
        </>
      )}
    </>
  );
}
