import { useState, useEffect, useRef } from "react";

// Default-Zeiten werden nun durch einen State ersetzt
const INITIAL_CATEGORIES = { Arbeit: 6 * 3600, Haushalt: 2 * 3600, Pause: 2 * 3600 };

// Konvertiert Sekunden in einen "HH:MM" String (z.B. 9000 -> "02:30")
const secondsToHHMM = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  // padStart sorgt für führende Nullen (z.B. 7 -> "07")
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Konvertiert einen "HH:MM" String in Sekunden (z.B. "02:30" -> 9000)
const HHMMToSeconds = (hhmm) => {
  // Regex zur Prüfung des Formats (z.B. "1:30" oder "01:30")
  if (!/^\d{1,2}:\d{2}$/.test(hhmm)) return NaN;

  const parts = hhmm.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  // Zusätzliche Prüfung, ob Minuten gültig sind
  if (isNaN(hours) || isNaN(minutes) || minutes > 59) return NaN;

  return (hours * 3600) + (minutes * 60);
};

// Eine dedizierte Komponente für die HH:MM-Eingabe
function TimeInput({ valueInSeconds, onChange }) {
  const [displayValue, setDisplayValue] = useState(secondsToHHMM(valueInSeconds));

  // Effekt, um den Anzeigewert zu aktualisieren, wenn sich der Prop von außen ändert
  // (z.B. beim Reset oder initialem Laden)
  useEffect(() => {
    setDisplayValue(secondsToHHMM(valueInSeconds));
  }, [valueInSeconds]);

  const handleInputChange = (e) => {
    const inputText = e.target.value;
    setDisplayValue(inputText); // Erlaube dem Benutzer, frei zu tippen

    const newSeconds = HHMMToSeconds(inputText);
    // Nur wenn die Eingabe ein gültiges Zeitformat ist, rufen wir die onChange-Funktion
    // des Parents auf, um den globalen State zu aktualisieren.
    if (!isNaN(newSeconds)) {
      onChange(newSeconds);
    }
  };

  return (
    <input
      type="text"
      placeholder="HH:MM"
      className="p-2 border rounded w-24 text-center text-sm sm:text-base text-gray-800"
      value={displayValue}
      onChange={handleInputChange}
    />
  );
}

export default function WorkdayTracker() {
  // State für verfügbare Kategorien
  const [categories, setCategories] = useState(() => {
    const savedCategories = localStorage.getItem("categories");
    return savedCategories ? JSON.parse(savedCategories) : INITIAL_CATEGORIES;
  });

  const [timers, setTimers] = useState(() => {
    // Lade beide relevanten Daten direkt hier
    const savedTimers = localStorage.getItem("timers");
    const savedCategories = localStorage.getItem("categories");

    // Bestimme die "master"-Liste der Kategorien für den Sync
    const masterCategories = savedCategories ? JSON.parse(savedCategories) : INITIAL_CATEGORIES;

    if (savedTimers) {
      const parsedTimers = JSON.parse(savedTimers);

      // Filtere Timer basierend auf den masterCategories
      const syncedTimers = Object.keys(masterCategories)
        .reduce((acc, key) => {
          // Nimm den gespeicherten Timer-Wert, falls vorhanden, sonst den Standardwert der Kategorie
          acc[key] = (key in parsedTimers) ? parsedTimers[key] : masterCategories[key];
          return acc;
        }, {});

      return syncedTimers;
    }
    // Wenn keine Timer gespeichert sind, starte mit den Standardwerten der masterCategories
    return { ...masterCategories };
});

  const [currentCategory, setCurrentCategory] = useState(null);
  const [running, setRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryTime, setNewCategoryTime] = useState(3600); // 1 Stunde als Default

  // Refs für Timer-Funktionalität
  const startTimeRef = useRef(null);
  const requestRef = useRef(null);
  const previousTimeRef = useRef(null);
  const originalTimerValueRef = useRef(null);

  // Kategorie-Management-Funktionen
  const addCategory = () => {
    if (!newCategoryName.trim()) return;

    // Überprüfe, ob die Kategorie bereits existiert
    if (newCategoryName in categories) {
      alert(`Kategorie "${newCategoryName}" existiert bereits.`);
      return;
    }

    // Füge neue Kategorie hinzu
    const updatedCategories = {
      ...categories,
      [newCategoryName]: newCategoryTime
    };

    setCategories(updatedCategories);
    setTimers(prev => ({
      ...prev,
      [newCategoryName]: newCategoryTime
    }));

    // Zurücksetzen der Eingabefelder
    setNewCategoryName("");
    setNewCategoryTime(3600);
  };

  const removeCategory = (categoryName) => {
    // Überprüfe, ob der zu löschende Timer aktiv ist
    if (currentCategory === categoryName && running) {
      setRunning(false);
      setCurrentCategory(null);
    }

    // Erstelle neue Objekte ohne die zu löschende Kategorie
    const updatedCategories = { ...categories };
    const updatedTimers = { ...timers };

    delete updatedCategories[categoryName];
    delete updatedTimers[categoryName];

    setCategories(updatedCategories);
    setTimers(updatedTimers);
  };

  const renameCategory = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;

    // Überprüfe, ob die neue Kategorie bereits existiert
    if (newName in categories) {
      alert(`Kategorie "${newName}" existiert bereits.`);
      return;
    }

    // Erstelle neue Objekte mit umbenannter Kategorie
    const updatedCategories = { ...categories };
    const updatedTimers = { ...timers };

    updatedCategories[newName] = updatedCategories[oldName];
    updatedTimers[newName] = updatedTimers[oldName];

    delete updatedCategories[oldName];
    delete updatedTimers[oldName];

    // Aktualisiere currentCategory, falls nötig
    if (currentCategory === oldName) {
      setCurrentCategory(newName);
    }

    setCategories(updatedCategories);
    setTimers(updatedTimers);
  };

  const updateCategoryTime = (categoryName, newTimeInSeconds) => {
    setCategories(prev => ({
      ...prev,
      [categoryName]: newTimeInSeconds
    }));

    // Timer nur aktualisieren, wenn er nicht gerade läuft
    if (currentCategory !== categoryName || !running) {
      setTimers(prev => ({
        ...prev,
        [categoryName]: newTimeInSeconds
      }));
    }
  };

  // Speichern in localStorage
  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories));
    localStorage.setItem("timers", JSON.stringify(timers));
  }, [categories, timers]);

  // Timer-Funktionalität (wie im vorherigen Code)
  useEffect(() => {
    if (!running || !currentCategory) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTimeRef.current = null;
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = performance.now();
      originalTimerValueRef.current = timers[currentCategory];
    }

    const updateTimer = (timestamp) => {
      if (!previousTimeRef.current) {
        previousTimeRef.current = timestamp;
      }

      const elapsedSinceStart = (timestamp - startTimeRef.current) / 1000;
      const newValue = Math.max(0, originalTimerValueRef.current - elapsedSinceStart);

      setTimers(prev => {
        if (Math.abs(prev[currentCategory] - newValue) >= 0.1) {
          return {
            ...prev,
            [currentCategory]: newValue
          };
        }
        return prev;
      });

      requestRef.current = requestAnimationFrame(updateTimer);
    };

    requestRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [running, currentCategory, timers]);

  const resetTimers = () => {
    setRunning(false);
    setCurrentCategory(null);
    setTimers({ ...categories }); // Zurücksetzen auf die aktuellen Standardwerte
    startTimeRef.current = null;
    originalTimerValueRef.current = null;
  };

  const adjustTimer = (category, minutes) => { // Erwartet jetzt Minuten
    const adjustment = minutes * 60; // Rechnet Minuten in Sekunden um

    if (running && category === currentCategory && originalTimerValueRef.current !== null) {
      originalTimerValueRef.current = Math.max(0, originalTimerValueRef.current + adjustment);
    }

    setTimers(prev => ({
      ...prev,
      [category]: Math.max(0, prev[category] + adjustment)
    }));
  };

  const startTimer = (category) => {
    setRunning(false);
    setTimeout(() => {
      setCurrentCategory(category);
      startTimeRef.current = null;
      setRunning(true);
    }, 0);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 bg-gray-100">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Workday Tracker</h1>

      {/* Kategorie-Verwaltungs-Button */}
      <button
        className="mb-4 px-3 py-1 sm:px-4 sm:py-2 !bg-blue-600 text-white rounded hover:!bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto"
        onClick={() => setIsEditing(!isEditing)}
      >
        {isEditing ? "Fertig" : "Kategorien verwalten"}
      </button>

      {/* Kategorie-Verwaltungs-Bereich */}
      {isEditing && (
        <div className="w-full max-w-md mb-6 p-3 sm:p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Kategorien verwalten</h2>

          {/* Neue Kategorie hinzufügen */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
            <input
              type="text"
              placeholder="Neue Kategorie"
              className="p-2 border rounded col-span-1 sm:col-span-2 text-sm sm:text-base text-gray-800"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <div className="flex items-center justify-between">
              {/* Ersetze das alte Input-Feld durch die neue Komponente */}
              <TimeInput
                valueInSeconds={newCategoryTime}
                onChange={setNewCategoryTime}
              />
              <button
                className="p-1 sm:p-2 !bg-green-500 text-white rounded hover:!bg-green-600 w-8 h-8 flex items-center justify-center ml-2"
                onClick={addCategory}
                aria-label="Kategorie hinzufügen"
              >
                +
              </button>
            </div>
          </div>

          {/* Liste bestehender Kategorien */}
          <div className="space-y-2">
            {Object.entries(categories).map(([name, defaultTime]) => (
              <div key={name} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <input
                  type="text"
                  className="p-2 border rounded text-sm sm:text-base text-gray-800"
                  value={name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Die Prüfung ist wichtig, um das Umbenennen in einen leeren String zu verhindern
                    if (newName.trim() || newName === "") {
                      renameCategory(name, newName);
                    }
                  }}
                />

                {/* Ersetze das alte Input-Feld auch hier */}
                <TimeInput
                  valueInSeconds={defaultTime}
                  onChange={(newSeconds) => updateCategoryTime(name, newSeconds)}
                />

                <button
                  className="p-1 sm:p-2 !bg-red-500 text-white rounded hover:!bg-red-600 text-xs sm:text-sm"
                  onClick={() => removeCategory(name)}
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timer-Anzeige */}
      <div className="grid gap-3 sm:gap-4 w-full max-w-md">
        {Object.keys(timers).map((category) => (
          <div key={category} className="flex items-center">
            <div
              className={`p-3 sm:p-4 rounded-lg shadow-md grid grid-cols-1 sm:grid-cols-3 items-center transition-all flex-grow gap-2 ${
                currentCategory === category && running ? "bg-blue-500 text-white" : "bg-white text-gray-800"
              }`}
            >
              {/* Mobile Layout: Kategorie und Zeit in einer Zeile */}
              <div className="flex justify-between items-center sm:hidden">
                <span className="text-base font-semibold">{category}</span>
                <span className="text-base font-mono">{formatTime(timers[category])}</span>
              </div>

              {/* Desktop Layout */}
              <span className="hidden sm:block text-lg font-semibold text-left">{category}</span>

              <div className="flex justify-center">
                {(currentCategory !== category || !running) && (
                  <button
                    className="px-3 py-1 rounded !bg-blue-500 text-white hover:!bg-blue-600 transition text-sm sm:text-base"
                    onClick={() => startTimer(category)}
                  >
                    Start
                  </button>
                )}
                {currentCategory === category && running && (
                  <button
                    className="px-3 py-1 rounded !bg-yellow-500 text-white hover:!bg-yellow-600 transition text-sm sm:text-base"
                    onClick={() => setRunning(false)}
                  >
                    Pause
                  </button>
                )}
              </div>

              <span className="hidden sm:block text-lg font-mono text-right">{formatTime(timers[category])}</span>
            </div>

            <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 ml-2">
              <button
                className="w-6 h-6 flex items-center justify-center rounded !bg-gray-200 hover:!bg-gray-300 text-gray-700 font-bold text-sm"
                onClick={() => adjustTimer(category, -15)} // -15 Minuten
                aria-label="15 Minuten abziehen"
              >
                -
              </button>
              <button
                className="w-6 h-6 flex items-center justify-center rounded !bg-gray-200 hover:!bg-gray-300 text-gray-700 font-bold text-sm"
                onClick={() => adjustTimer(category, 15)} // +15 Minuten
                aria-label="15 Minuten hinzufügen"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reset-Button */}
      <button
        className="mt-6 px-3 py-1 sm:px-4 sm:py-2 !bg-red-500 text-white rounded hover:!bg-red-600 transition text-sm sm:text-base w-full sm:w-auto max-w-md"
        onClick={resetTimers}
      >
        Reset
      </button>
    </div>
  );
}
