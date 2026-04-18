import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, ComposedChart, Area } from "recharts";

// ⚠️ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BELOW
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwI0YvcSG9CAL53dYjc-1H1z4FtxGOXJZRJO35iOKZr_uA38MN2GEgkpzaOI_wxVHU/exec";

const STORAGE_KEY = "sage_app_data";

const defaultSettings = { targetWeight: 75 };

const getStoredData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { entries: [], settings: defaultSettings };
  } catch { return { entries: [], settings: defaultSettings }; }
};

const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

const sendToGoogleSheet = async (entry) => {
  if (GOOGLE_SHEET_URL === "PASTE_YOUR_URL_HERE") return;
  try {
    await fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch (err) {
    console.error("Google Sheets sync failed:", err);
  }
};

const todayStr = () => new Date().toISOString().split("T")[0];
const formatDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const COLORS = {
  bg: "#f8f9fc",
  card: "#ffffff",
  cardHover: "#f1f3f8",
  accent: "#6347de",
  accentGlow: "rgba(99,71,222,0.12)",
  green: "#16a34a",
  red: "#dc2626",
  orange: "#ea580c",
  blue: "#2563eb",
  cyan: "#0891b2",
  pink: "#db2777",
  yellow: "#ca8a04",
  text: "#1e293b",
  textDim: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  inputBg: "#f1f5f9",
};

const tabs = ["Log", "Dashboard", "Insights", "Report"];
const tabIcons = ["✎", "◐", "⟁", "⊞"];

const MealButton = ({ label, value, selected, onClick }) => (
  <button
    onClick={() => onClick(value === selected ? "" : value)}
    style={{
      flex: 1, padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${value === selected ? COLORS.accent : COLORS.border}`,
      background: value === selected ? COLORS.accentGlow : COLORS.inputBg, color: value === selected ? COLORS.accent : COLORS.textDim,
      fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
    }}
  >{label}</button>
);

const ToggleButton = ({ label, active, onClick, colorOn = COLORS.green, colorOff = COLORS.red }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: "12px 8px", borderRadius: 10, border: `1.5px solid ${active ? colorOn : COLORS.border}`,
      background: active ? `${colorOn}18` : COLORS.inputBg, color: active ? colorOn : COLORS.textDim,
      fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
    }}
  >{label}</button>
);

const NumInput = ({ label, value, onChange, unit, step = 0.1, icon }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
      {icon} {label}
    </label>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number" value={value} onChange={(e) => onChange(e.target.value)} step={step}
        style={{
          flex: 1, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.inputBg,
          color: COLORS.text, fontFamily: "'Nunito', sans-serif", fontSize: 16, outline: "none"
        }}
      />
      <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600, minWidth: 24 }}>{unit}</span>
    </div>
  </div>
);

const StatCard = ({ label, value, unit, color = COLORS.accent, icon }) => (
  <div style={{
    background: COLORS.card, borderRadius: 14, padding: "18px 16px", border: `1px solid ${COLORS.border}`,
    flex: "1 1 140px", minWidth: 120, boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
  }}>
    <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{icon} {label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'Quicksand', sans-serif" }}>{value}<span style={{ fontSize: 13, color: COLORS.textDim, marginLeft: 4 }}>{unit}</span></div>
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, marginBottom: 12, marginTop: 24, textTransform: "uppercase", letterSpacing: 1.5 }}>{children}</div>
);

const chartTheme = {
  style: { fontSize: 11, fontFamily: "'Nunito', sans-serif", fill: COLORS.textMuted },
};

export default function SageApp() {
  const [data, setData] = useState(getStoredData);
  const [tab, setTab] = useState(1); // default to Dashboard
  const [form, setForm] = useState({
    date: todayStr(), weight: "", breakfast: "", lunch: "", dinner: "", sugar: false,
    walkKm: "", runKm: "", waterL: "", sleepHrs: ""
  });
  const [targetInput, setTargetInput] = useState(data.settings?.targetWeight || 75);
  const [saved, setSaved] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });

  useEffect(() => { saveData(data); }, [data]);

  const updateForm = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = () => {
    if (!form.weight && !form.breakfast && !form.lunch && !form.dinner && !form.walkKm && !form.runKm && !form.waterL && !form.sleepHrs) return;
    const entry = {
      id: Date.now(),
      date: form.date,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      weight: form.weight ? parseFloat(form.weight) : null,
      breakfast: form.breakfast, lunch: form.lunch, dinner: form.dinner,
      sugar: form.sugar,
      walkKm: form.walkKm ? parseFloat(form.walkKm) : 0,
      runKm: form.runKm ? parseFloat(form.runKm) : 0,
      waterL: form.waterL ? parseFloat(form.waterL) : 0,
      sleepHrs: form.sleepHrs ? parseFloat(form.sleepHrs) : 0,
    };
    setData(p => ({ ...p, entries: [...p.entries, entry] }));
    sendToGoogleSheet(entry);
    setForm({ date: todayStr(), weight: "", breakfast: "", lunch: "", dinner: "", sugar: false, walkKm: "", runKm: "", waterL: "", sleepHrs: "" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveTarget = () => {
    setData(p => ({ ...p, settings: { ...p.settings, targetWeight: parseFloat(targetInput) || 75 } }));
  };

  // Aggregate by date
  const dailyData = useMemo(() => {
    const map = {};
    data.entries.forEach(e => {
      if (!map[e.date]) map[e.date] = { date: e.date, weights: [], meals: [], sugar: false, walkKm: 0, runKm: 0, waterL: 0, sleepHrs: 0 };
      const d = map[e.date];
      if (e.weight) d.weights.push(e.weight);
      ["breakfast","lunch","dinner"].forEach(m => { if (e[m]) d.meals.push(e[m]); });
      if (e.sugar) d.sugar = true;
      d.walkKm += e.walkKm || 0;
      d.runKm += e.runKm || 0;
      d.waterL += e.waterL || 0;
      d.sleepHrs = Math.max(d.sleepHrs, e.sleepHrs || 0);
    });
    return Object.values(map).sort((a,b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      avgWeight: d.weights.length ? +(d.weights.reduce((a,b)=>a+b,0)/d.weights.length).toFixed(1) : null,
      heavyMeals: d.meals.filter(m => m === "heavy").length,
      lightMeals: d.meals.filter(m => m === "light").length,
      totalExercise: d.walkKm + d.runKm,
      label: formatDate(d.date),
    }));
  }, [data.entries]);

  const last7 = dailyData.slice(-7);
  const last30 = dailyData.slice(-30);
  const targetWeight = data.settings?.targetWeight || 75;

  const latestWeight = [...dailyData].reverse().find(d => d.avgWeight)?.avgWeight;
  const totalWalkWeek = last7.reduce((a,d) => a + d.walkKm, 0).toFixed(1);
  const totalRunWeek = last7.reduce((a,d) => a + d.runKm, 0).toFixed(1);
  const sugarFreeWeek = last7.filter(d => !d.sugar).length;
  const avgWaterWeek = last7.length ? (last7.reduce((a,d) => a + d.waterL, 0) / last7.length).toFixed(1) : 0;
  const avgSleepWeek = last7.length ? (last7.reduce((a,d) => a + d.sleepHrs, 0) / last7.length).toFixed(1) : 0;

  // Correlations data
  const corrData = useMemo(() => {
    const withWeight = dailyData.filter(d => d.avgWeight);
    return {
      sugarVsWeight: withWeight.map(d => ({ sugar: d.sugar ? 1 : 0, weight: d.avgWeight, label: d.label, sugarLabel: d.sugar ? "Yes" : "No" })),
      exerciseVsWeight: withWeight.map(d => ({ exercise: d.totalExercise, weight: d.avgWeight, label: d.label })),
      mealsVsWeight: withWeight.map(d => ({ heavyMeals: d.heavyMeals, weight: d.avgWeight, label: d.label })),
      waterVsWeight: withWeight.map(d => ({ water: d.waterL, weight: d.avgWeight, label: d.label })),
      sleepVsWeight: withWeight.map(d => ({ sleep: d.sleepHrs, weight: d.avgWeight, label: d.label })),
    };
  }, [dailyData]);

  // Monthly report
  const monthlyEntries = useMemo(() => {
    return dailyData.filter(d => d.date.startsWith(reportMonth));
  }, [dailyData, reportMonth]);

  const monthReport = useMemo(() => {
    const m = monthlyEntries;
    if (!m.length) return null;
    const withW = m.filter(d => d.avgWeight);
    const avgW = withW.length ? (withW.reduce((a,d)=>a+d.avgWeight,0)/withW.length).toFixed(1) : "-";
    const totalWalk = m.reduce((a,d)=>a+d.walkKm,0).toFixed(1);
    const totalRun = m.reduce((a,d)=>a+d.runKm,0).toFixed(1);
    const sugarFree = m.filter(d=>!d.sugar).length;
    const avgWater = (m.reduce((a,d)=>a+d.waterL,0)/m.length).toFixed(1);
    const avgSleep = (m.reduce((a,d)=>a+d.sleepHrs,0)/m.length).toFixed(1);
    const heavyTotal = m.reduce((a,d)=>a+d.heavyMeals,0);
    const lightTotal = m.reduce((a,d)=>a+d.lightMeals,0);

    // Best/worst week by weight change
    const weeks = [];
    for (let i = 0; i < m.length; i += 7) {
      const week = m.slice(i, i+7);
      const ww = week.filter(d=>d.avgWeight);
      if (ww.length >= 2) {
        weeks.push({ start: week[0].label, end: week[week.length-1].label, change: +(ww[ww.length-1].avgWeight - ww[0].avgWeight).toFixed(1) });
      }
    }
    const bestWeek = weeks.length ? weeks.reduce((a,b) => a.change < b.change ? a : b) : null;
    const worstWeek = weeks.length ? weeks.reduce((a,b) => a.change > b.change ? a : b) : null;

    return { avgW, totalWalk, totalRun, sugarFree, avgWater, avgSleep, heavyTotal, lightTotal, bestWeek, worstWeek, days: m.length };
  }, [monthlyEntries]);

  const exportCSV = () => {
    const headers = "Date,Weight(kg),Breakfast,Lunch,Dinner,Sugar,Walk(km),Run(km),Water(L),Sleep(hrs)\n";
    const rows = data.entries.map(e => `${e.date},${e.weight||""},${e.breakfast},${e.lunch},${e.dinner},${e.sugar?"Yes":"No"},${e.walkKm},${e.runKm},${e.waterL},${e.sleepHrs}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `sage_data_${reportMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const customTooltipStyle = { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: COLORS.text };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: "'Nunito', sans-serif", color: COLORS.text, maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Quicksand:wght@400;500;600;700&family=Josefin+Sans:wght@600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "28px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: 34, fontWeight: 700, letterSpacing: 4, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sage</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>Health & Fitness Tracker</div>
        </div>
        {latestWeight && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Current</div>
            <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.accent }}>{latestWeight}<span style={{fontSize:12,color:COLORS.textDim}}> kg</span></div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "0 16px" }}>

        {/* ===== TAB 0: LOG ===== */}
        {tab === 0 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <SectionTitle>📝 Daily Entry</SectionTitle>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>📅 Date</label>
              <input type="date" value={form.date} onChange={e => updateForm("date", e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontFamily: "'Nunito', sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>

            <NumInput label="Weight" value={form.weight} onChange={v => updateForm("weight", v)} unit="kg" step={0.1} icon="⚖️" />

            <SectionTitle>🍽️ Meals</SectionTitle>
            {["breakfast","lunch","dinner"].map(meal => (
              <div key={meal} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>{meal}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <MealButton label="🥗 Light" value="light" selected={form[meal]} onClick={v => updateForm(meal, v)} />
                  <MealButton label="🍔 Heavy" value="heavy" selected={form[meal]} onClick={v => updateForm(meal, v)} />
                </div>
              </div>
            ))}

            <SectionTitle>🍬 Sugar</SectionTitle>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <ToggleButton label={form.sugar ? "🍬 Yes — Had Sugar" : "🚫 No Sugar"} active={!form.sugar} onClick={() => updateForm("sugar", !form.sugar)} colorOn={COLORS.green} />
            </div>

            <SectionTitle>🏃 Exercise</SectionTitle>
            <NumInput label="Walk" value={form.walkKm} onChange={v => updateForm("walkKm", v)} unit="km" step={0.1} icon="🚶" />
            <NumInput label="Run" value={form.runKm} onChange={v => updateForm("runKm", v)} unit="km" step={0.1} icon="🏃" />

            <SectionTitle>💧 Hydration & Sleep</SectionTitle>
            <NumInput label="Water Intake" value={form.waterL} onChange={v => updateForm("waterL", v)} unit="L" step={0.1} icon="💧" />
            <NumInput label="Sleep" value={form.sleepHrs} onChange={v => updateForm("sleepHrs", v)} unit="hrs" step={0.5} icon="😴" />

            <button onClick={handleSave} style={{
              width: "100%", padding: "16px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${COLORS.accent}, #9b7cfc)`,
              color: "#fff", fontFamily: "'Nunito', sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 20, letterSpacing: 0.5,
              boxShadow: `0 4px 20px ${COLORS.accentGlow}`, transition: "transform 0.2s"
            }}>
              {saved ? "✓ Saved!" : "Save Entry"}
            </button>

            {/* Target Weight */}
            <div style={{ marginTop: 32, padding: 16, background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}` }}>
              <label style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>🎯 Target Weight</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} step={0.5}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontFamily: "'Nunito', sans-serif", fontSize: 15, outline: "none" }} />
                <button onClick={saveTarget} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: COLORS.accent, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Set</button>
              </div>
            </div>

            {/* Today's entries */}
            {data.entries.filter(e => e.date === todayStr()).length > 0 && (
              <>
                <SectionTitle>Today's Entries</SectionTitle>
                {data.entries.filter(e => e.date === todayStr()).map(e => (
                  <div key={e.id} style={{ padding: "12px 14px", background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, marginBottom: 8, fontSize: 13, color: COLORS.textDim }}>
                    <span style={{ color: COLORS.textMuted, marginRight: 8 }}>{e.time}</span>
                    {e.weight && <span style={{ color: COLORS.accent, fontWeight: 700, marginRight: 10 }}>{e.weight}kg</span>}
                    {e.breakfast && <span style={{ marginRight: 6 }}>B:{e.breakfast}</span>}
                    {e.lunch && <span style={{ marginRight: 6 }}>L:{e.lunch}</span>}
                    {e.dinner && <span style={{ marginRight: 6 }}>D:{e.dinner}</span>}
                    {e.walkKm > 0 && <span style={{ marginRight: 6 }}>🚶{e.walkKm}km</span>}
                    {e.runKm > 0 && <span style={{ marginRight: 6 }}>🏃{e.runKm}km</span>}
                    {e.waterL > 0 && <span style={{ marginRight: 6 }}>💧{e.waterL}L</span>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ===== TAB 1: DASHBOARD ===== */}
        {tab === 1 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <SectionTitle>📊 Weekly Overview</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <StatCard label="Weight" value={latestWeight || "--"} unit="kg" color={COLORS.accent} icon="⚖️" />
              <StatCard label="Target" value={targetWeight} unit="kg" color={COLORS.cyan} icon="🎯" />
              <StatCard label="Walk" value={totalWalkWeek} unit="km" color={COLORS.green} icon="🚶" />
              <StatCard label="Run" value={totalRunWeek} unit="km" color={COLORS.orange} icon="🏃" />
              <StatCard label="Sugar Free" value={`${sugarFreeWeek}/7`} unit="days" color={COLORS.pink} icon="🚫" />
              <StatCard label="Avg Water" value={avgWaterWeek} unit="L" color={COLORS.blue} icon="💧" />
              <StatCard label="Avg Sleep" value={avgSleepWeek} unit="hrs" color={COLORS.yellow} icon="😴" />
            </div>

            {last7.some(d => d.avgWeight) && (
              <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>Weight Trend</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={last7.filter(d=>d.avgWeight)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="label" tick={chartTheme.style} />
                    <YAxis domain={["auto","auto"]} tick={chartTheme.style} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <ReferenceLine y={targetWeight} stroke={COLORS.cyan} strokeDasharray="6 3" label={{ value: "Target", fill: COLORS.cyan, fontSize: 10 }} />
                    <Line type="monotone" dataKey="avgWeight" stroke={COLORS.accent} strokeWidth={3} dot={{ fill: COLORS.accent, r: 5 }} name="Weight (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {last7.some(d => d.walkKm || d.runKm) && (
              <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>Exercise (km)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="label" tick={chartTheme.style} />
                    <YAxis tick={chartTheme.style} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="walkKm" stackId="a" fill={COLORS.green} name="Walk" radius={[0,0,0,0]} />
                    <Bar dataKey="runKm" stackId="a" fill={COLORS.orange} name="Run" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {last7.some(d => d.waterL) && (
              <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>Water Intake (L)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="label" tick={chartTheme.style} />
                    <YAxis tick={chartTheme.style} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="waterL" fill={COLORS.blue} name="Water (L)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {last7.some(d => d.sleepHrs) && (
              <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>Sleep (hrs)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="label" tick={chartTheme.style} />
                    <YAxis tick={chartTheme.style} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="sleepHrs" fill={COLORS.yellow} name="Sleep (hrs)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {dailyData.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>No data yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Head to the Log tab to start tracking</div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 2: INSIGHTS ===== */}
        {tab === 2 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <SectionTitle>🔗 Correlations</SectionTitle>
            {corrData.sugarVsWeight.length < 3 ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Need at least 3 days of data</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Keep logging to unlock insights</div>
              </div>
            ) : (
              <>
                {/* Sugar vs Weight */}
                <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>🍬 Sugar Days vs Weight</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={corrData.sugarVsWeight}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="label" tick={chartTheme.style} />
                      <YAxis domain={["auto","auto"]} tick={chartTheme.style} />
                      <Tooltip contentStyle={customTooltipStyle} formatter={(v,n) => n === "sugar" ? (v ? "Yes":"No") : v} />
                      <Bar dataKey="sugar" fill={COLORS.pink} opacity={0.3} name="Sugar" />
                      <Line type="monotone" dataKey="weight" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 4 }} name="Weight" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Exercise vs Weight */}
                <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>🏃 Exercise vs Weight</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="exercise" name="Exercise (km)" tick={chartTheme.style} />
                      <YAxis dataKey="weight" name="Weight (kg)" domain={["auto","auto"]} tick={chartTheme.style} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={corrData.exerciseVsWeight} fill={COLORS.green}>
                        {corrData.exerciseVsWeight.map((_, i) => <Cell key={i} fill={COLORS.green} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Heavy Meals vs Weight */}
                <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>🍔 Heavy Meals vs Weight</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="heavyMeals" name="Heavy Meals" tick={chartTheme.style} type="number" domain={[0,3]} />
                      <YAxis dataKey="weight" name="Weight (kg)" domain={["auto","auto"]} tick={chartTheme.style} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={corrData.mealsVsWeight} fill={COLORS.red}>
                        {corrData.mealsVsWeight.map((_, i) => <Cell key={i} fill={COLORS.red} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Water vs Weight */}
                <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>💧 Water vs Weight</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="water" name="Water (L)" tick={chartTheme.style} />
                      <YAxis dataKey="weight" name="Weight (kg)" domain={["auto","auto"]} tick={chartTheme.style} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={corrData.waterVsWeight} fill={COLORS.blue}>
                        {corrData.waterVsWeight.map((_, i) => <Cell key={i} fill={COLORS.blue} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Sleep vs Weight */}
                <div style={{ background: COLORS.card, borderRadius: 14, padding: "16px 8px 8px", border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, paddingLeft: 8, marginBottom: 8 }}>😴 Sleep vs Weight</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="sleep" name="Sleep (hrs)" tick={chartTheme.style} />
                      <YAxis dataKey="weight" name="Weight (kg)" domain={["auto","auto"]} tick={chartTheme.style} />
                      <Tooltip contentStyle={customTooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={corrData.sleepVsWeight} fill={COLORS.yellow}>
                        {corrData.sleepVsWeight.map((_, i) => <Cell key={i} fill={COLORS.yellow} />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== TAB 3: REPORT ===== */}
        {tab === 3 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <SectionTitle>📋 Monthly Report Card</SectionTitle>
            <div style={{ marginBottom: 16 }}>
              <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${COLORS.border}`, background: COLORS.inputBg, color: COLORS.text, fontFamily: "'Nunito', sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>

            {!monthReport ? (
              <div style={{ textAlign: "center", padding: 40, color: COLORS.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>No data for this month</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
                  <StatCard label="Days Tracked" value={monthReport.days} unit="" color={COLORS.accent} icon="📅" />
                  <StatCard label="Avg Weight" value={monthReport.avgW} unit="kg" color={COLORS.accent} icon="⚖️" />
                  <StatCard label="Total Walk" value={monthReport.totalWalk} unit="km" color={COLORS.green} icon="🚶" />
                  <StatCard label="Total Run" value={monthReport.totalRun} unit="km" color={COLORS.orange} icon="🏃" />
                  <StatCard label="Sugar Free" value={monthReport.sugarFree} unit="days" color={COLORS.pink} icon="🚫" />
                  <StatCard label="Avg Water" value={monthReport.avgWater} unit="L" color={COLORS.blue} icon="💧" />
                  <StatCard label="Avg Sleep" value={monthReport.avgSleep} unit="hrs" color={COLORS.yellow} icon="😴" />
                  <StatCard label="Heavy Meals" value={monthReport.heavyTotal} unit="" color={COLORS.red} icon="🍔" />
                  <StatCard label="Light Meals" value={monthReport.lightTotal} unit="" color={COLORS.green} icon="🥗" />
                </div>

                {monthReport.bestWeek && (
                  <div style={{ background: COLORS.card, borderRadius: 14, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: COLORS.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🏆 Best Week</div>
                    <div style={{ color: COLORS.text, fontSize: 14 }}>{monthReport.bestWeek.start} → {monthReport.bestWeek.end}: <span style={{ color: COLORS.green, fontWeight: 700 }}>{monthReport.bestWeek.change > 0 ? "+" : ""}{monthReport.bestWeek.change} kg</span></div>
                  </div>
                )}
                {monthReport.worstWeek && monthReport.worstWeek !== monthReport.bestWeek && (
                  <div style={{ background: COLORS.card, borderRadius: 14, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: COLORS.red, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>⚠️ Toughest Week</div>
                    <div style={{ color: COLORS.text, fontSize: 14 }}>{monthReport.worstWeek.start} → {monthReport.worstWeek.end}: <span style={{ color: COLORS.red, fontWeight: 700 }}>{monthReport.worstWeek.change > 0 ? "+" : ""}{monthReport.worstWeek.change} kg</span></div>
                  </div>
                )}

                <button onClick={exportCSV} style={{
                  width: "100%", padding: "16px", borderRadius: 12, border: `1.5px solid ${COLORS.accent}`, background: "transparent",
                  color: COLORS.accent, fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 16, letterSpacing: 0.5
                }}>
                  📥 Export Data as CSV
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480,
        background: `${COLORS.bg}f0`, backdropFilter: "blur(16px)", borderTop: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-around", padding: "8px 0 12px", zIndex: 100
      }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 12px",
            color: tab === i ? COLORS.accent : COLORS.textMuted, transition: "color 0.2s"
          }}>
            <span style={{ fontSize: 18 }}>{tabIcons[i]}</span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{t}</span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 4px; }
      `}</style>
    </div>
  );
}
