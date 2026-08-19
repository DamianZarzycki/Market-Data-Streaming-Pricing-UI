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
    if (data.type === "register") hub.register(port, data.role);
    if (data.type === "unregister") hub.detachPort(port);
    if (data.type === "heartbeat") hub.heartbeat(port);
  };

  (
    port as MessagePort & { onclose: (() => void) | null }
  ).onclose = () => hub.detachPort(port);

  port.start();
};

setInterval(() => hub.sweepStaleAppPorts(), 1000);
