// Loaded only with ?debug-performance=1; keeps a bounded, local trace.
export function createPerformanceDiagnostics(root = document) {
  const view = root.defaultView;
  const audio = root.querySelector("[data-ambient-audio]");
  const entries = [];
  const mediaEvents = ["play", "playing", "pause", "waiting", "stalled", "seeking", "seeked", "ended", "error"];

  const record = (type, detail = {}) => {
    const end = audio?.buffered?.length ? audio.buffered.end(audio.buffered.length - 1) : 0;
    entries.push({
      at: Math.round(view.performance.now()), type, ...detail,
      audio: audio ? {
        paused: audio.paused,
        time: Number(audio.currentTime.toFixed(3)),
        volume: audio.volume,
        readyState: audio.readyState,
        networkState: audio.networkState,
        bufferedAhead: Number(Math.max(0, end - audio.currentTime).toFixed(3)),
        error: audio.error?.code ?? null,
      } : null,
    });
    if (entries.length > 200) entries.shift();
  };
  const onMedia = (event) => record(`audio:${event.type}`);
  const onClick = (event) => {
    const control = event.target?.closest?.("button, a");
    if (control) record("interaction", { control: control.getAttribute("aria-label") ?? control.tagName });
  };
  const onVisibility = () => record("visibility", { state: root.visibilityState });
  let observer;
  if (view.PerformanceObserver?.supportedEntryTypes?.includes("longtask")) {
    observer = new view.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        record("long-task", { start: Math.round(entry.startTime), duration: Math.round(entry.duration) });
      }
    });
    observer.observe({ type: "longtask", buffered: false });
  }
  mediaEvents.forEach((name) => audio?.addEventListener(name, onMedia));
  view.addEventListener("click", onClick);
  root.addEventListener("visibilitychange", onVisibility);
  record("trace-start");

  return {
    entries,
    destroy() {
      observer?.disconnect();
      mediaEvents.forEach((name) => audio?.removeEventListener(name, onMedia));
      view.removeEventListener("click", onClick);
      root.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
