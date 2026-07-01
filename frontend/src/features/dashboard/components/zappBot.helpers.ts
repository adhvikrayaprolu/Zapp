import type { AiAssistantMetadata, AiQuickAction, ApiMessage } from "@/api/ai.api";

export type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  quickActions?: AiQuickAction[];
};

const QUICK_ACTION_ROUTE_ALIASES: Record<string, string> = {
  "/valuations/new": "/analytics?tab=valuations&create=item",
};

export const DEFAULT_ZAPPBOT_GREETING =
  "Hello! I'm ZappBot. I've been monitoring your subscriptions. How can I help you optimize your value score today?";

export function normalizeQuickActionRoute(route: string) {
  const trimmedRoute = route.replace(/\/+$/, "") || "/";
  return QUICK_ACTION_ROUTE_ALIASES[trimmedRoute] ?? trimmedRoute;
}

export function normalizeQuickActions(actions: AiQuickAction[] | undefined) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return undefined;
  }

  const normalized = actions.flatMap((action) => {
    if (!action || typeof action.label !== "string") {
      return [];
    }

    if (typeof action.route === "string") {
      return [
        {
          ...action,
          route: normalizeQuickActionRoute(action.route),
        },
      ];
    }

    if (action.action_payload && typeof action.action_payload === "object") {
      return [action];
    }

    return [];
  });

  return normalized.length > 0 ? normalized : undefined;
}

export function buildFallbackAssistantMessage(): ChatMessage {
  return {
    id: "zappbot-greeting",
    text: DEFAULT_ZAPPBOT_GREETING,
    sender: "assistant",
    timestamp: new Date(),
  };
}

function parseAssistantMetadata(metadataJson: ApiMessage["metadata_json"]) {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return undefined;
  }

  return metadataJson as AiAssistantMetadata;
}

function parseMessageTimestamp(createdAt: string | undefined) {
  if (!createdAt) {
    return new Date();
  }

  const parsed = new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function mapApiMessageToChatMessage(message: ApiMessage): ChatMessage | null {
  if (!message || typeof message.content !== "string") {
    return null;
  }

  const metadata = parseAssistantMetadata(message.metadata_json);

  return {
    id: String(message.id),
    text: message.content,
    sender: message.role === "user" ? "user" : "assistant",
    timestamp: parseMessageTimestamp(message.created_at),
    quickActions: normalizeQuickActions(metadata?.quick_actions),
  };
}
