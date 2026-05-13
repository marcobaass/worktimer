import { useState, useEffect, useMemo } from "react";

const STOPWATCHES_STORAGE_KEY = "stopwatches";

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getElapsedMs(sw, now) {
  return (
    sw.accumulatedMs +
    (sw.runStartAt ? now.getTime() - sw.runStartAt.getTime() : 0)
  );
}

function newStopwatch() {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sw-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    accumulatedMs: 0,
    runStartAt: null,
  };
}

function parseStoredStopwatch(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;
  const title = typeof raw.title === "string" ? raw.title : "";
  const am = raw.accumulatedMs;
  const accumulatedMs =
    typeof am === "number" && !Number.isNaN(am)
      ? am
      : Math.max(0, Number(am)) || 0;
  let runStartAt = null;
  if (raw.runStartAt != null) {
    const d = new Date(raw.runStartAt);
    if (!Number.isNaN(d.getTime())) runStartAt = d;
  }
  return { id, title, accumulatedMs, runStartAt };
}

function loadStopwatchesFromStorage() {
  try {
    const saved = localStorage.getItem(STOPWATCHES_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseStoredStopwatch).filter(Boolean);
  } catch {
    return [];
  }
}

export default function Stopwatch() {
  const [stopwatches, setStopwatches] = useState(() =>
    typeof window === "undefined" ? [] : loadStopwatchesFromStorage()
  );
  const [displayNow, setDisplayNow] = useState(() => new Date());

  const hasRunning = useMemo(
    () => stopwatches.some((sw) => sw.runStartAt !== null),
    [stopwatches]
  );

  useEffect(() => {
    localStorage.setItem(STOPWATCHES_STORAGE_KEY, JSON.stringify(stopwatches));
  }, [stopwatches]);

  useEffect(() => {
    if (!hasRunning) return;
    let raf = 0;
    const tick = () => {
      setDisplayNow(new Date());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasRunning]);

  const addStopwatch = () => {
    setStopwatches((prev) => [...prev, newStopwatch()]);
  };

  const updateTitle = (id, title) => {
    setStopwatches((prev) =>
      prev.map((sw) => (sw.id === id ? { ...sw, title } : sw))
    );
  };

  const startStopwatch = (id) => {
    setStopwatches((prev) =>
      prev.map((sw) =>
        sw.id === id && sw.runStartAt === null
          ? { ...sw, runStartAt: new Date() }
          : sw
      )
    );
  };

  const stopStopwatch = (id) => {
    setStopwatches((prev) =>
      prev.map((sw) => {
        if (sw.id !== id || sw.runStartAt === null) return sw;
        const now = new Date();
        return {
          ...sw,
          accumulatedMs:
            sw.accumulatedMs +
            (now.getTime() - sw.runStartAt.getTime()),
          runStartAt: null,
        };
      })
    );
  };

  const resetStopwatch = (id) => {
    setStopwatches((prev) =>
      prev.map((sw) =>
        sw.id === id
          ? { ...sw, accumulatedMs: 0, runStartAt: null }
          : sw
      )
    );
  };

  const removeStopwatch = (id) => {
    setStopwatches((prev) => prev.filter((sw) => sw.id !== id));
  };

  return (
    <div className="flex flex-col items-center bg-white p-4 sm:p-6">
      <div className="mb-4 flex w-full max-w-md items-center gap-2 justify-center">
        <h1 className="text-xl sm:text-2xl font-bold">Stopwatch</h1>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded !bg-green-500 p-0 text-sm font-bold text-white transition hover:!bg-green-600 sm:h-8 sm:w-8 sm:text-base"
          onClick={addStopwatch}
          aria-label="Neue Stoppuhr hinzufügen"
        >
          +
        </button>
      </div>

      <div className="grid gap-3 sm:gap-4 w-full max-w-md">
        {stopwatches.map((sw) => {
          const running = sw.runStartAt !== null;
          const elapsedMs = getElapsedMs(sw, displayNow);

          return (
            <div
              key={sw.id}
              className={`p-3 sm:p-4 rounded-lg shadow-md transition-all ${
                running ? "bg-blue-500 text-white" : "bg-white text-gray-800"
              }`}
            >
              <div className="mb-3 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Titel"
                  className={`min-w-0 flex-1 p-2 border rounded text-sm sm:text-base ${
                    running
                      ? "border-blue-300 bg-blue-400/30 placeholder:text-blue-100 text-white"
                      : "text-gray-800 border-gray-300"
                  }`}
                  value={sw.title}
                  onChange={(e) => updateTitle(sw.id, e.target.value)}
                />
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded !bg-red-500 text-base font-bold leading-none text-white transition hover:!bg-red-600 sm:h-9 sm:w-9"
                  onClick={() => removeStopwatch(sw.id)}
                  aria-label="Stoppuhr entfernen"
                >
                  X
                </button>
              </div>
              <div className="grid w-full grid-cols-[minmax(6.5rem,auto)_1fr_minmax(6.5rem,auto)] items-center gap-2">
                <div className="flex min-w-[6.5rem] shrink-0 justify-start">
                  {!running && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded !bg-blue-500 text-white hover:!bg-blue-600 transition text-sm sm:text-base"
                      onClick={() => startStopwatch(sw.id)}
                    >
                      Start
                    </button>
                  )}
                  {running && (
                    <button
                      type="button"
                      className="px-3 py-1 rounded !bg-yellow-500 text-white hover:!bg-yellow-600 transition text-sm sm:text-base"
                      onClick={() => stopStopwatch(sw.id)}
                    >
                      Stop
                    </button>
                  )}
                </div>

                <span className="min-w-0 text-center text-lg sm:text-xl font-mono tabular-nums">
                  {formatElapsed(elapsedMs)}
                </span>

                <div className="flex min-w-[6.5rem] shrink-0 justify-end">
                  <button
                    type="button"
                    className="px-3 py-1 rounded !bg-red-500 text-white hover:!bg-red-600 transition text-sm sm:text-base"
                    onClick={() => resetStopwatch(sw.id)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
