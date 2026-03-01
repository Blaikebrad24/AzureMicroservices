import { listChannels, listMessages, getChannelCounts } from "@/actions/message-actions";
import { MessageBoard } from "@/components/messages/message-board";
import type { Channel, Message, Page } from "@/types/api";

export default async function MessagesPage() {
  let channels: Channel[] = [];
  let initialMessages: Page<Message> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 50, first: true, last: true };
  let channelCounts: Record<string, number> = {};

  try {
    [channels, initialMessages, channelCounts] = await Promise.all([
      listChannels(),
      listMessages(undefined, 0, 50),
      getChannelCounts(),
    ]);
  } catch {
    // Services may not be available yet
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Messages</h2>
        <p className="mt-1 text-sm text-blue-200">
          Shift handoff board — keep your team in the loop
        </p>
      </div>

      <MessageBoard
        channels={channels}
        initialMessages={initialMessages}
        channelCounts={channelCounts}
      />
    </div>
  );
}
