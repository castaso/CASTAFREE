import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import {
  Bot,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@generated/dataModel";

type Chat = Doc<"chats">;
type Message = Doc<"messages">;

export function MentorPage() {
  const chats = useQuery(api.mentor.listChats);
  const createChat = useMutation(api.mentor.createChat);
  const deleteChat = useMutation(api.mentor.deleteChat);
  const askMentor = useAction(api.mentorAI.askMentor);
  const showToast = useToast();

  const [activeChatId, setActiveChatId] = useState<Id<"chats"> | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeChat = chats?.find((c: Chat) => c._id === activeChatId) ?? null;
  const messages = useQuery(
    api.mentor.listMessages,
    activeChatId ? { chatId: activeChatId } : "skip"
  );

  useEffect(() => {
    if (chats && chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0]._id);
    }
  }, [chats, activeChatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, activeChatId]);

  async function onNewChat() {
    try {
      const id = await createChat();
      setActiveChatId(id);
    } catch {
      showToast("Gagal bikin chat baru.", "error");
    }
  }

  async function onDeleteChat(chatId: Id<"chats">) {
    try {
      await deleteChat({ chatId });
      if (activeChatId === chatId) setActiveChatId(null);
      showToast("Chat dihapus.", "info");
    } catch {
      showToast("Gagal hapus chat.", "error");
    }
  }

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    let chatId = activeChatId;
    if (!chatId) {
      try {
        chatId = await createChat();
        setActiveChatId(chatId);
      } catch {
        showToast("Gagal mulai chat.", "error");
        return;
      }
    }
    setPending(true);
    try {
      await askMentor({ chatId, message: text });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal kirim pesan.",
        "error"
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="mb-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black text-ink">
              AI Mentor
            </h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
            <p className="mt-3 text-ink-2">
              Tanya apa aja soal skill digital, produk, atau konten — jawabannya
              langsung dari AI.
            </p>
          </div>
          <Button onClick={onNewChat} className="shrink-0">
            <Plus className="h-4 w-4" />
            Chat Baru
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <Card className="min-h-0 overflow-hidden">
          <CardContent className="h-full overflow-y-auto p-2">
            {chats === undefined ? (
              <div className="flex h-full items-center justify-center text-ink-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
              </div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-2">
                Belum ada chat. Klik <b>Chat Baru</b> buat mulai ngobrol sama AI
                Mentor!
              </div>
            ) : (
              <div className="space-y-1">
                {chats.map((chat: Chat) => (
                  <div
                    key={chat._id}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      activeChatId === chat._id
                        ? "bg-[#FAA61A]/15 text-ink"
                        : "text-ink-2 hover:bg-muted hover:text-ink"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveChatId(chat._id)}
                      className="min-w-0 flex-1 truncate text-left"
                      title={chat.title}
                    >
                      {chat.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteChat(chat._id)}
                      aria-label={`Hapus ${chat.title}`}
                      className="rounded-md p-1 text-ink-3 opacity-0 transition-opacity hover:bg-danger-bg hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          {activeChat === null ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAA61A]/15 text-[#FAA61A]">
                <Sparkles className="h-8 w-8" />
              </span>
              <div>
                <h2 className="font-display text-xl font-black text-ink">
                  Siap belajar bareng AI Mentor?
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
                  Tanya soal marketing, copywriting, bikin produk digital, SEO,
                  FB Ads, atau apa pun yang lagi lu pelajari.
                </p>
              </div>
              <Button onClick={onNewChat}>
                <Sparkles className="h-4 w-4" />
                Mulai Chat
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border-d px-5 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAA61A]/15 text-[#FAA61A]">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {activeChat.title}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    AI Mentor online
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {messages === undefined ? (
                  <div className="flex h-full items-center justify-center text-ink-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
                  </div>
                ) : (
                  messages.map((message: Message) => (
                    <MessageBubble key={message._id} message={message} />
                  ))
                )}
                {pending && <TypingBubble />}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={onSend}
                className="shrink-0 border-t border-border-d p-4"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tanya AI Mentor..."
                    className="flex-1"
                    disabled={pending}
                    autoComplete="off"
                  />
                  <Button
                    type="submit"
                    disabled={pending || !input.trim()}
                    aria-label="Kirim pesan"
                    className="h-10 w-10 shrink-0 px-0"
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-ink/10 text-ink" : "bg-[#FAA61A]/15 text-[#FAA61A]"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed shadow-card",
          isUser
            ? "rounded-tr-sm bg-[var(--brand-primary)] text-[var(--text-on-primary)]"
            : "rounded-tl-sm border border-border-d bg-surface text-ink"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAA61A]/15 text-[#FAA61A]">
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-xl rounded-tl-sm border border-border-d bg-surface px-4 py-3.5 shadow-card">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#FAA61A]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#FAA61A] [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#FAA61A] [animation-delay:300ms]" />
      </div>
    </div>
  );
}
