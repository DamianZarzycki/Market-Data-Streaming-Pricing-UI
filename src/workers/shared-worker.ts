import type { SharedSseInbound } from "./sharedSseProtocol";
import { createSseHub } from "./sharedSseHub";

const hub = createSseHub();

const scope = self as unknown as {
  onconnect: ((event: MessageEvent) => void) | null;
};

scope.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  if (!port) return;

  port.onmessage = (message: MessageEvent<SharedSseInbound>) => {
    const data = message.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "subscribe") hub.subscribe(port, data.url, data.eventName);
    if (data.type === "unsubscribe") hub.unsubscribe(port, data.url);
  };

  (
    port as MessagePort & { onclose: (() => void) | null }
  ).onclose = () => hub.detachPort(port);

  port.start();
};
