export const APP_PRESENCE_CHANNEL = "trading-app-presence";

type PresenceMessage =
  | { type: "alive"; id: string }
  | { type: "bye"; id: string }
  | { type: "who" };

const ALIVE_MS = 1_000;
const STALE_MS = 3_000;
const GRACE_MS = 1_500;

function isPresenceMessage(data: unknown): data is PresenceMessage {
  if (!data || typeof data !== "object") return false;
  const type = (data as PresenceMessage).type;
  return type === "alive" || type === "bye" || type === "who";
}

/**
 * App tabs announce they are alive. Chart popouts close when the last
 * announcement goes away — BroadcastChannel survives tab close better
 * than SharedWorker MessagePort.onclose.
 */
export function startAppTabPresence(): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const channel = new BroadcastChannel(APP_PRESENCE_CHANNEL);

  const announce = () => {
    const msg: PresenceMessage = { type: "alive", id };
    channel.postMessage(msg);
  };

  const onMessage = (event: MessageEvent<unknown>) => {
    if (isPresenceMessage(event.data) && event.data.type === "who") {
      announce();
    }
  };

  const onPageHide = () => {
    const msg: PresenceMessage = { type: "bye", id };
    channel.postMessage(msg);
  };

  channel.addEventListener("message", onMessage);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", onPageHide);
  announce();
  const timer = setInterval(announce, ALIVE_MS);

  return () => {
    clearInterval(timer);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("beforeunload", onPageHide);
    channel.removeEventListener("message", onMessage);
    onPageHide();
    channel.close();
  };
}

export function watchAppTabPresence(onAllGone: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => {};
  }

  const tabs = new Map<string, number>();
  const channel = new BroadcastChannel(APP_PRESENCE_CHANNEL);
  const startedAt = Date.now();
  let gone = false;

  const fire = () => {
    if (gone) return;
    gone = true;
    onAllGone();
  };

  const onMessage = (event: MessageEvent<unknown>) => {
    if (!isPresenceMessage(event.data)) return;
    const msg = event.data;
    if (msg.type === "alive") {
      tabs.set(msg.id, Date.now());
      return;
    }
    if (msg.type === "bye") {
      tabs.delete(msg.id);
      if (tabs.size === 0 && Date.now() - startedAt >= GRACE_MS) {
        fire();
      }
    }
  };

  channel.addEventListener("message", onMessage);
  channel.postMessage({ type: "who" } satisfies PresenceMessage);

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, at] of tabs) {
      if (now - at > STALE_MS) tabs.delete(id);
    }
    if (now - startedAt >= GRACE_MS && tabs.size === 0) {
      fire();
    }
  }, 500);

  return () => {
    clearInterval(timer);
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}
