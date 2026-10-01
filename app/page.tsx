"use client";

import { ChangeEvent, CSSProperties, useEffect, useState } from "react";
import * as XLSX from "xlsx";

type HabitState = 0 | 1 | 2;
type DailyData = { sleep: number; steps: number; water: number; calories: number; weight: number };
type SavedDay = DailyData & { month: string; day: number };

const HABITS = [
  "🏋️ Workout", "🚶 10K+ Steps", "🥗 Clean Diet", "💧 3L Water", "😴 Sleep 7-8 Hrs",
  "📚 Read / Learn", "🧴 Skincare", "🚫 No Junk", "🚫 No Distractions", "🎯 Daily Discipline",
];
const MONTHS: Record<string, number> = { October: 31, November: 30, December: 31 };
const MONTH_ORDER = Object.keys(MONTHS);
const SYMBOLS: Record<HabitState, string> = { 0: "—", 1: "✓", 2: "✗" };
const DEFAULT_DAILY: DailyData = { sleep: 0, steps: 0, water: 0, calories: 0, weight: 0 };
const HABITS_KEY = "winter_arc_habits";
const DAILY_KEY = "winter_arc_daily";

const NAV = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "tracker", icon: "📅", label: "Tracker" },
  { id: "stats", icon: "📊", label: "Statistics" },
  { id: "backup", icon: "🗄️", label: "Backup" },
];

export default function Home() {
  const [month, setMonth] = useState("October");
  const [habits, setHabits] = useState<Record<string, HabitState>>({});
  const [dailyData, setDailyData] = useState<Record<string, DailyData>>({});
  const [selectedDay, setSelectedDay] = useState(1);
  const [form, setForm] = useState<DailyData>(DEFAULT_DAILY);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState("home");

  // ---------- load / save ----------
  useEffect(() => {
    try {
      const h = localStorage.getItem(HABITS_KEY);
      const d = localStorage.getItem(DAILY_KEY);
      if (h) setHabits(JSON.parse(h));
      if (d) setDailyData(JSON.parse(d));
    } catch (e) {
      console.error("Could not load saved data:", e);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  }, [habits, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(DAILY_KEY, JSON.stringify(dailyData));
  }, [dailyData, loaded]);

  // ---------- scroll effects: reveal, parallax, progress bar, active nav ----------
  useEffect(() => {
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            reveal.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

    const spy = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -50% 0px" }
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) spy.observe(el);
    });

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const root = document.documentElement.style;
      root.setProperty("--sy", String(window.scrollY));
      root.setProperty("--p", String(max > 0 ? window.scrollY / max : 0));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      reveal.disconnect();
      spy.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // ---------- helpers ----------
  const daysInMonth = MONTHS[month];
  const habitKey = (m: string, day: number, habit: string) => `${m}_${day}_${habit}`;
  const dailyKey = (m: string, day: number) => `${m}_${day}`;

  const cycleHabit = (day: number, habit: string) => {
    const key = habitKey(month, day, habit);
    setHabits((prev) => {
      const cur = prev[key] ?? 0;
      return { ...prev, [key]: (cur === 0 ? 1 : cur === 1 ? 2 : 0) as HabitState };
    });
  };

  useEffect(() => {
    if (!loaded) return;
    setForm(dailyData[dailyKey(month, selectedDay)] ?? DEFAULT_DAILY);
    setEditingKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, selectedDay, loaded]);

  const updateForm = (field: keyof DailyData, value: number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const saveDay = () => {
    setDailyData((p) => ({ ...p, [dailyKey(month, selectedDay)]: { ...form } }));
    setEditingKey(null);
    alert(`${month} ${selectedDay} saved successfully!`);
  };

  const editDay = (m: string, day: number) => {
    setMonth(m);
    setSelectedDay(day);
    const key = dailyKey(m, day);
    if (dailyData[key]) {
      setForm(dailyData[key]);
      setEditingKey(key);
    }
    document.getElementById("daily")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deleteDay = (m: string, day: number) => {
    if (!window.confirm(`Delete ${m} ${day} data?`)) return;
    setDailyData((p) => {
      const copy = { ...p };
      delete copy[dailyKey(m, day)];
      return copy;
    });
    if (m === month && day === selectedDay) setForm(DEFAULT_DAILY);
  };

  const getSavedRows = (): SavedDay[] =>
    Object.entries(dailyData)
      .map(([key, value]) => {
        const [m, d] = key.split("_");
        return { month: m, day: Number(d), ...value };
      })
      .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month) || a.day - b.day);

  const monthRows = getSavedRows().filter((r) => r.month === month);

  // ---------- stats ----------
  const completed = Object.entries(habits).filter(([k, s]) => k.startsWith(`${month}_`) && s === 1).length;
  const missed = Object.entries(habits).filter(([k, s]) => k.startsWith(`${month}_`) && s === 2).length;
  const totalPossible = HABITS.length * daysInMonth;
  const pending = totalPossible - completed - missed;
  const completion = totalPossible > 0 ? (completed / totalPossible) * 100 : 0;

  const habitProgress = HABITS.map((habit) => {
    let done = 0;
    for (let d = 1; d <= daysInMonth; d++) if (habits[habitKey(month, d, habit)] === 1) done++;
    return { habit, done, percentage: (done / daysInMonth) * 100 };
  });

  // ---------- excel ----------
  const exportExcel = () => {
    const habitRows = Object.entries(habits).map(([key, state]) => {
      const parts = key.split("_");
      return { Month: parts[0], Day: Number(parts[1]), Habit: parts.slice(2).join("_"), State: SYMBOLS[state] };
    });
    const dailyRows = getSavedRows().map((r) => ({
      Month: r.month, Day: r.day, Sleep: r.sleep, Steps: r.steps, Water: r.water, Calories: r.calories, "Weight (kg)": r.weight,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(habitRows), "Habits");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), "Daily Data");
    XLSX.writeFile(wb, "winter_arc.xlsx");
  };

  const importExcel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: "array" });
        const importedHabits: Record<string, HabitState> = {};
        const importedDaily: Record<string, DailyData> = {};

        const hs = wb.Sheets["Habits"];
        if (hs) {
          XLSX.utils.sheet_to_json<any>(hs).forEach((row) => {
            const st = String(row.State);
            importedHabits[habitKey(String(row.Month), Number(row.Day), String(row.Habit))] =
              st === "✓" ? 1 : st === "✗" ? 2 : 0;
          });
        }
        const ds = wb.Sheets["Daily Data"];
        if (ds) {
          XLSX.utils.sheet_to_json<any>(ds).forEach((row) => {
            importedDaily[dailyKey(String(row.Month), Number(row.Day))] = {
              sleep: Number(row.Sleep) || 0,
              steps: Number(row.Steps) || 0,
              water: Number(row.Water) || 0,
              calories: Number(row.Calories) || 0,
              weight: Number(row["Weight (kg)"]) || 0,
            };
          });
        }
        setHabits(importedHabits);
        setDailyData(importedDaily);
        alert("Winter Arc data imported successfully! ✅");
      } catch (err) {
        console.error(err);
        alert("Could not import this Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };

  const go = (id: string) => {
    setActive(id);
    if (id === "home") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const gridCols = `150px repeat(${daysInMonth}, minmax(28px, 1fr))`;
  const delay = (n: number): CSSProperties => ({ ["--d" as string]: `${n}s` });

  // ---------- UI ----------
  return (
    <>
      <div className="progress" />
      <div className="bg">
        <div className="sun" />
        <div className="mount m2" />
        <div className="mount" />
        <div className="embers">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 7.3) % 100}%`, animationDuration: `${7 + (i % 5) * 2}s`, animationDelay: `${i * 0.9}s` }} />
          ))}
        </div>
      </div>

      <div className="shell">
        {/* SIDEBAR */}
        <aside className="side">
          <div className="logo">WINTER<b>ARC</b></div>
          <div className="tag">Discipline today,<br />a stronger tomorrow</div>
          <nav className="nav">
            {NAV.map((n) => (
              <button key={n.id} className={active === n.id ? "on" : ""} onClick={() => go(n.id)}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
          <div className="quote">Cold days<br />build a<br />stronger<br />version<br />of <em>you.</em></div>
        </aside>

        <main className="content" id="home">
          {/* HERO */}
          <section className="hero reveal">
            <div className="months">
              {MONTH_ORDER.map((m) => (
                <button key={m} className={m === month ? "on" : ""} onClick={() => { setMonth(m); setSelectedDay(1); }}>
                  {m}
                </button>
              ))}
            </div>
            <div className="say"><span>"Same you</span><br />higher standards"</div>
          </section>

          {/* HABIT TRACKER */}
          <section className="panel reveal" id="tracker">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <h2>📅 Habit Tracker</h2>
              <div className="legend">
                <span><i style={{ background: "#3ddc5a" }} />Completed</span>
                <span><i style={{ background: "#ff3b3b" }} />Missed</span>
                <span><i style={{ background: "#888" }} />Not done</span>
              </div>
            </div>
            <p className="sub">Tap a box: — → ✓ → ✗ → —</p>
            <div className="gridwrap">
              <div style={{ minWidth: daysInMonth * 32 + 150 }}>
                <div className="hg" style={{ gridTemplateColumns: gridCols }}>
                  <strong style={{ fontSize: 12 }}>Habit</strong>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <div key={i} className={`dh ${i + 1 === selectedDay ? "sel" : ""}`}>{i + 1}</div>
                  ))}
                </div>
                {HABITS.map((habit) => (
                  <div key={habit} className="hg" style={{ gridTemplateColumns: gridCols }}>
                    <div className="hn">{habit}</div>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const state = (habits[habitKey(month, day, habit)] ?? 0) as HabitState;
                      return (
                        <button
                          key={day}
                          className={`cell s${state} ${day === selectedDay ? "sel" : ""}`}
                          onClick={() => cycleHabit(day, habit)}
                        >
                          {SYMBOLS[state]}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* DAILY / SAVED / BACKUP */}
          <div className="row2" id="backup">
            <section className="panel reveal left" id="daily">
              <div className="dnav">
                <h2>📊 Daily Tracker</h2>
                <button onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}>‹</button>
                <span>{month} {selectedDay}, 2026</span>
                <button onClick={() => setSelectedDay((d) => Math.min(daysInMonth, d + 1))}>›</button>
              </div>
              <div className="fields">
                <Field label="😴 Sleep (hrs)" value={form.sleep} step={0.5} onChange={(v) => updateForm("sleep", v)} />
                <Field label="🚶 Steps" value={form.steps} step={500} onChange={(v) => updateForm("steps", v)} />
                <Field label="💧 Water (L)" value={form.water} step={0.5} onChange={(v) => updateForm("water", v)} />
                <Field label="🔥 Calories" value={form.calories} step={50} onChange={(v) => updateForm("calories", v)} />
                <Field label="⚖️ Weight (kg)" value={form.weight} step={0.1} onChange={(v) => updateForm("weight", v)} />
              </div>
              <button className="btn" onClick={saveDay}>💾 {editingKey ? "UPDATE DAY" : "SAVE DAY"}</button>
            </section>

            <section className="panel reveal" style={delay(0.12)}>
              <h2>🏋️ Saved Data ({month})</h2>
              {monthRows.length === 0 ? (
                <p className="sub">No daily data saved for {month} yet.</p>
              ) : (
                <div className="tbl">
                  <table>
                    <thead>
                      <tr>{["Day", "Sleep", "Steps", "Water", "Calories", "Weight", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {monthRows.map((r) => (
                        <tr key={`${r.month}_${r.day}`}>
                          <td>{r.day}</td><td>{r.sleep}</td><td>{r.steps}</td><td>{r.water}</td><td>{r.calories}</td><td>{r.weight}</td>
                          <td>
                            <button className="mini" onClick={() => editDay(r.month, r.day)}>✏️</button>
                            <button className="mini" onClick={() => deleteDay(r.month, r.day)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel reveal right" style={delay(0.24)}>
              <h2>📁 Excel Backup</h2>
              <p className="sub">Export your data to Excel or import it from another device.</p>
              <button className="btn" onClick={exportExcel}>📤 Export to Excel</button>
              <label>
                <span className="btn ghost" style={{ display: "block", textAlign: "center", cursor: "pointer" }}>📥 Import Excel</span>
                <input type="file" accept=".xlsx,.xls" onChange={importExcel} style={{ display: "none" }} />
              </label>
            </section>
          </div>

          {/* STATS / PROGRESS / QUOTE */}
          <div className="row3" id="stats">
            <section className="panel reveal left">
              <h2>📈 Monthly Statistics</h2>
              <div className="donutwrap">
                <div className="donut" style={{ background: `conic-gradient(var(--o) ${completion * 3.6}deg, #2a1a10 0)` }}>
                  <div>
                    <span>{completion.toFixed(0)}%<small>{completed}/{totalPossible}<br />Habits Completed</small></span>
                  </div>
                </div>
                <div className="stats">
                  <div className="stat"><span>✅ Completed</span><b>{completed}</b></div>
                  <div className="stat"><span>❌ Missed</span><b>{missed}</b></div>
                  <div className="stat"><span>➖ Pending</span><b>{pending}</b></div>
                  <div className="stat"><span>Σ Total</span><b>{totalPossible}</b></div>
                </div>
              </div>
            </section>

            <section className="panel reveal" style={delay(0.12)}>
              <h2>🎯 Habit Progress</h2>
              {habitProgress.map((item, i) => (
                <div className="habit" key={item.habit}>
                  <div className="t">
                    <strong>{item.habit}</strong>
                    <span style={{ color: "#ff8a3d" }}>{item.done}/{daysInMonth} ({item.percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="bar"><i style={{ ["--w" as string]: `${item.percentage}%`, ["--d" as string]: `${0.15 + i * 0.07}s` } as CSSProperties} /></div>
                </div>
              ))}
            </section>

            <section className="panel reveal right discipline" style={delay(0.24)}>
              <p><em>"Discipline</em><br />turns ordinary days<br />into extraordinary results.</p>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="number" value={value} step={step} min={0} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
