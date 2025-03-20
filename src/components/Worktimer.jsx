import { useState, useEffect } from "react";

const DEFAULT_TIMES = { Arbeit: 6 * 3600, Haushalt: 2 * 3600, Pause: 2 * 3600 };
const CATEGORIES = Object.keys(DEFAULT_TIMES);

export default function WorkdayTracker() {
  const [timers, setTimers] = useState(() => {
    const savedTimers = localStorage.getItem("timers");
    return savedTimers ? JSON.parse(savedTimers) : DEFAULT_TIMES;
  });
  const [currentCategory, setCurrentCategory] = useState(null);
  const [running, setRunning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());

  useEffect(() => {
    localStorage.setItem("timers", JSON.stringify(timers));
    localStorage.setItem("lastUpdated", lastUpdated.toString());
  }, [timers, lastUpdated]);

  useEffect(() => {
    if (!running || !currentCategory) return;
    const updateTimers = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastUpdated) / 1000);
      setTimers((prev) => ({
        ...prev,
        [currentCategory]: Math.max(0, prev[currentCategory] - elapsed),
      }));
      setLastUpdated(now);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [running, currentCategory, lastUpdated]);

  const resetTimers = () => {
    setRunning(false);
    setCurrentCategory(null);
    setTimers(DEFAULT_TIMES);
    setLastUpdated(Date.now());
  };

  const adjustTimer = (category, hours) => {
    const adjustment = hours * 3600; // Convert hours to seconds
    setTimers(prev => ({
      ...prev,
      [category]: Math.max(0, prev[category] + adjustment)
    }));
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Workday Tracker</h1>
      <div className="grid gap-4 w-full max-w-md">
        {CATEGORIES.map((category) => (
          <div key={category} className="flex items-center">
            <div
              className={`p-4 rounded-lg shadow-md grid grid-cols-3 items-center transition-all flex-grow ${
                currentCategory === category ? "bg-blue-500 text-white" : "bg-white"
              }`}
            >
              <span className="text-lg font-semibold text-left">{category}</span>
              <div className="flex justify-center">
                {currentCategory !== category && (
                  <button
                    className="px-3 py-1 rounded !bg-blue-500 text-white hover:!bg-blue-600 transition"
                    onClick={() => {
                      setRunning(false);
                      setCurrentCategory(category);
                      setLastUpdated(Date.now());
                      setRunning(true);
                    }}
                  >
                    Start
                  </button>
                )}
              </div>
              <span className="text-lg font-mono text-right">{new Date(timers[category] * 1000).toISOString().substr(11, 8)}</span>
            </div>

            <div className="flex space-x-1 ml-2">
              <button
                className="w-6 h-6 flex items-center justify-center rounded !bg-gray-200 hover:!bg-gray-300 text-gray-700 font-bold text-sm"
                onClick={() => adjustTimer(category, -1)}
              >
                -
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded !bg-gray-200 hover:!bg-gray-300 text-gray-700 font-bold text-sm"
                onClick={() => adjustTimer(category, 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="mt-6 px-4 py-2 !bg-red-500 text-white rounded hover:!bg-red-600 transition"
        onClick={resetTimers}
      >
        Reset
      </button>
    </div>
  );
}
