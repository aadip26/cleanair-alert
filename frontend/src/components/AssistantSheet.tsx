"use client";

import { useEffect, useState } from "react";
import { fetchChatHistory, postChat } from "@/lib/api";
import type { ChatChart, ChatMessage } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssistantLineChart } from "./AssistantLineChart";
import { cn } from "@/lib/utils";

function ChartBlock({ chart }: { chart: ChatChart | null | undefined }) {
  if (!chart?.points?.length) return null;
  return (
    <AssistantLineChart
      chart={chart}
      testId="assistant-chart"
      className="mt-3 w-full max-w-full"
    />
  );
}

export function AssistantSheet({
  open,
  onOpenChange,
  citySlug,
  apiConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citySlug: string;
  apiConnected: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!apiConnected || !open) return;
    fetchChatHistory(citySlug)
      .then((list) => {
        setMessages(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch(() => {
        setMessages([]);
        setSelectedId(null);
      });
  }, [citySlug, apiConnected, open]);

  const selected =
    messages.find((m) => m.id === selectedId) ?? messages[0] ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !apiConnected) return;
    setLoading(true);
    setError(null);
    try {
      const msg = await postChat(citySlug, question.trim());
      setMessages((prev) => [msg, ...prev]);
      setSelectedId(msg.id);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-testid="assistant-sheet"
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle>CleanAir assistant</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="ask" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-3 w-auto">
            <TabsTrigger value="ask">Ask</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="ask" className="mt-0 flex min-h-0 flex-1 flex-col gap-0 px-4 pb-4">
            <MessageScrollerProvider>
              <MessageScroller className="min-h-0 flex-1 py-4">
                <MessageScrollerViewport>
                <MessageScrollerContent className="flex flex-col gap-4">
                  {!messages.length && (
                    <Empty className="border border-dashed">
                      <EmptyHeader>
                        <EmptyTitle>Ask about this city</EmptyTitle>
                        <EmptyDescription>
                          Air now, model outlook, rain history, or soil for the selected place.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                  {[...messages].reverse().map((m) => (
                    <div key={m.id} className="flex flex-col gap-2">
                      <Message align="end">
                        <MessageContent>
                          <Bubble variant="secondary">
                            <BubbleContent>{m.question}</BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                      <Message align="start">
                        <MessageContent className="max-w-full">
                          <Bubble variant="muted">
                            <BubbleContent>
                              <p
                                data-testid="chat-answer"
                                className="leading-relaxed text-foreground"
                              >
                                {m.answer}
                              </p>
                              <ChartBlock chart={m.chart} />
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </div>
                  ))}
                </MessageScrollerContent>
                </MessageScrollerViewport>
              </MessageScroller>
            </MessageScrollerProvider>

            {!apiConnected && (
              <p className="text-sm text-muted-foreground">
                Available after the API is connected.
              </p>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={submit} className="mt-2 shrink-0">
              <InputGroup className="has-[textarea]:h-auto">
                <InputGroupTextarea
                  data-testid="chat-input"
                  placeholder="e.g. How is rain this year compared with 2025?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={!apiConnected || loading}
                  rows={2}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupButton
                    data-testid="chat-submit"
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={!apiConnected || loading}
                  >
                    {loading ? (
                      <>
                        <Spinner data-icon="inline-start" />
                        Thinking…
                      </>
                    ) : (
                      "Send"
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
          </TabsContent>

          <TabsContent value="history" className="mt-0 flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
            <div
              data-testid="chat-history"
              className="flex max-h-40 flex-col gap-2 overflow-y-auto"
            >
              {messages.length === 0 && (
                <Empty className="border border-dashed py-6">
                  <EmptyDescription>No questions yet for this city.</EmptyDescription>
                </Empty>
              )}
              {messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                    selectedId === m.id && "border-primary bg-muted/40",
                  )}
                >
                  <p className="line-clamp-2 text-foreground">{m.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString("en-IN")}
                  </p>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Answer
                </p>
                <p data-testid="chat-answer" className="mt-2 text-sm leading-relaxed">
                  {selected.answer}
                </p>
                <ChartBlock chart={selected.chart} />
              </div>
            ) : (
              <Empty className="flex-1 border border-dashed">
                <EmptyDescription>Select a question to review the answer.</EmptyDescription>
              </Empty>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
