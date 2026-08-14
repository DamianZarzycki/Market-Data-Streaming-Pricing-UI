import type { SseStatus } from "@/services/sseClient";

export type { SseStatus };

export type SharedSseInbound =
  | { type: "subscribe"; url: string; eventName?: string }
  | { type: "unsubscribe"; url: string; eventName?: string };

export type SharedSseOutbound =
  | {
      type: "status";
      url: string;
      eventName?: string;
      status: SseStatus;
      receivedCount: number;
    }
  | {
      type: "message";
      url: string;
      eventName?: string;
      data: unknown;
      receivedCount: number;
    };
