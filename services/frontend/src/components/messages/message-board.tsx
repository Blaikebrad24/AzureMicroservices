"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { listMessages, createMessage, deleteMessage } from "@/actions/message-actions";
import type { Channel, Message, Page } from "@/types/api";
import { Send, Trash2, Pin, AlertTriangle, Hash, Server, Wifi } from "lucide-react";

interface MessageBoardProps {
  channels: Channel[];
  initialMessages: Page<Message>;
  channelCounts: Record<string, number>;
}

function getChannelIcon(icon: string) {
  switch (icon) {
    case "server": return Server;
    case "wifi": return Wifi;
    case "alert-triangle": return AlertTriangle;
    default: return Hash;
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function priorityBadge(priority: string) {
  if (priority === "HIGH") {
    return (
      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
        HIGH
      </span>
    );
  }
  if (priority === "URGENT") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
        <AlertTriangle className="h-3 w-3" />
        URGENT
      </span>
    );
  }
  return null;
}

export function MessageBoard({ channels, initialMessages, channelCounts }: MessageBoardProps) {
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages.content);
  const [isPending, startTransition] = useTransition();
  const [newContent, setNewContent] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [sendError, setSendError] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleChannelClick(channelId: number | null) {
    setActiveChannelId(channelId);
    startTransition(async () => {
      try {
        const result = await listMessages(channelId ?? undefined, 0, 50);
        setMessages(result.content);
      } catch {
        setMessages([]);
      }
    });
  }

  function handleSend() {
    if (!newContent.trim()) return;
    setSendError(null);

    const channelId = activeChannelId ?? channels[0]?.id;
    if (!channelId) return;

    startTransition(async () => {
      try {
        await createMessage({
          channelId,
          content: newContent.trim(),
          priority: newPriority,
        });
        setNewContent("");
        setNewPriority("NORMAL");
        const result = await listMessages(activeChannelId ?? undefined, 0, 50);
        setMessages(result.content);
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        await deleteMessage(id);
        const result = await listMessages(activeChannelId ?? undefined, 0, 50);
        setMessages(result.content);
      } catch {
        // ignore
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4">
      {/* Channel sidebar */}
      <div className="w-56 shrink-0 overflow-y-auto rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-3 backdrop-blur-sm">
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-blue-400">
          Channels
        </p>
        <button
          onClick={() => handleChannelClick(null)}
          className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
            activeChannelId === null
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
              : "text-blue-200 hover:bg-blue-900/30 hover:text-white"
          }`}
        >
          <Hash className="h-4 w-4" />
          <span className="flex-1 text-left">All</span>
          <span className="text-xs text-blue-300/70">
            {initialMessages.totalElements}
          </span>
        </button>
        {channels.map((ch) => {
          const Icon = getChannelIcon(ch.icon);
          const count = channelCounts[ch.id.toString()] ?? 0;
          return (
            <button
              key={ch.id}
              onClick={() => handleChannelClick(ch.id)}
              className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                activeChannelId === ch.id
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                  : "text-blue-200 hover:bg-blue-900/30 hover:text-white"
              }`}
            >
              <div
                className="flex h-4 w-4 items-center justify-center"
                style={{ color: ch.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="flex-1 text-left truncate">{ch.name}</span>
              <span className="text-xs text-blue-300/70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Message feed + compose */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 backdrop-blur-sm">
        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isPending && messages.length === 0 && (
            <p className="text-center text-sm text-blue-300/60">Loading...</p>
          )}
          {!isPending && messages.length === 0 && (
            <p className="text-center text-sm text-blue-300/60">
              No messages yet. Start the conversation!
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`group rounded-lg border p-4 transition-colors ${
                msg.priority === "URGENT"
                  ? "border-red-500/30 bg-red-950/20"
                  : msg.priority === "HIGH"
                  ? "border-amber-500/20 bg-amber-950/10"
                  : "border-blue-800/20 bg-blue-950/20 hover:border-blue-700/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${msg.channel.color}, ${msg.channel.color}88)`,
                  }}
                >
                  {msg.author.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {msg.author}
                    </span>
                    <span className="text-xs text-blue-400/60">
                      in #{msg.channel.name}
                    </span>
                    <span className="text-xs text-blue-300/40">
                      {timeAgo(msg.createdAt)}
                    </span>
                    {priorityBadge(msg.priority)}
                    {msg.pinned && (
                      <Pin className="h-3 w-3 text-blue-400" />
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-blue-100">
                    {msg.content}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(msg.id)}
                  className="shrink-0 rounded p-1 text-blue-400/0 transition-colors group-hover:text-blue-400/40 hover:!text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <div ref={feedEndRef} />
        </div>

        {/* Compose */}
        <div className="border-t border-blue-800/30 p-4">
          {sendError && (
            <p className="mb-2 text-sm text-red-400">{sendError}</p>
          )}
          <div className="flex items-end gap-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Post to #${
                activeChannelId
                  ? channels.find((c) => c.id === activeChannelId)?.name ?? "channel"
                  : channels[0]?.name ?? "channel"
              }...`}
              rows={2}
              className="flex-1 resize-none rounded-lg border border-blue-700/30 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder-blue-400/40 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as typeof newPriority)}
              className="rounded-lg border border-blue-700/30 bg-blue-950/50 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="LOW" className="bg-blue-950">Low</option>
              <option value="NORMAL" className="bg-blue-950">Normal</option>
              <option value="HIGH" className="bg-blue-950">High</option>
              <option value="URGENT" className="bg-blue-950">Urgent</option>
            </select>
            <button
              onClick={handleSend}
              disabled={isPending || !newContent.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
