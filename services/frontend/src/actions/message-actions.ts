"use server";

import { apiGet, apiPost, apiDelete } from "@/lib/api-client";
import { getCurrentUser } from "@/lib/auth";
import type { Channel, Message, CreateMessageRequest, Page } from "@/types/api";

export async function listChannels(): Promise<Channel[]> {
  return apiGet<Channel[]>("ops", "/api/messages/channels");
}

export async function getChannelCounts(): Promise<Record<string, number>> {
  return apiGet<Record<string, number>>("ops", "/api/messages/channels/counts");
}

export async function listMessages(
  channelId?: number,
  page: number = 0,
  size: number = 50
): Promise<Page<Message>> {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sort: "createdAt,desc",
  });
  if (channelId) {
    params.set("channelId", channelId.toString());
  }
  return apiGet<Page<Message>>("ops", `/api/messages?${params}`);
}

export async function createMessage(
  request: Omit<CreateMessageRequest, "author">
): Promise<Message> {
  const user = await getCurrentUser();
  const body: CreateMessageRequest = {
    ...request,
    author: user?.username ?? "anonymous",
  };
  return apiPost<Message>("ops", "/api/messages", body);
}

export async function deleteMessage(id: number): Promise<void> {
  return apiDelete("ops", `/api/messages/${id}`);
}

export async function searchMessages(
  query: string,
  page: number = 0,
  size: number = 20
): Promise<Page<Message>> {
  return apiGet<Page<Message>>(
    "ops",
    `/api/messages/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`
  );
}

export async function getMessageCount(): Promise<number> {
  const result = await apiGet<{ count: number }>("ops", "/api/messages/count");
  return result.count;
}
