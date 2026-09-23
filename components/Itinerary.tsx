"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity, Day, Itinerary as ItineraryData, Leg, Note, Provider } from "@/lib/types";

const STORAGE_KEY = "viaje-noviembre:itinerary:v1";

const PROVIDER_LABEL: Record<Exclude<Provider, "">, string> = {
  booking: "Booking",
  airbnb: "Airbnb",
  getyourguide: "GetYourGuide",
  civitatis: "Civitatis",
  vuelo: "Vuelo",
  bus: "Bus",
};

// Dates are stored as plain ISO days; format them in UTC so the day never shifts.
function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", ...opts }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function fmtTime(hhmm?: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${suffix}`;
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function legRange(leg: Leg, days: Day[]) {
  const own = days.filter((d) => d.legId === leg.id);
  if (own.length === 0) return null;
  return { first: own[0].date, last: own[own.length - 1].date, count: own.length };
}

function rangeLabel(first: string, last: string) {
  const a = fmtDate(first, { day: "numeric" });
  const b = fmtDate(last, { day: "numeric", month: "short" }).replace(".", "");
  return first === last ? b : `${a} al ${b}`;
}

export default function Itinerary({ initial }: { initial: ItineraryData }) {
  const [data, setData] = useState<ItineraryData>(initial);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasLocal, setHasLocal] = useState(false);

  // Load edits saved on this device after the first render (avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw) as ItineraryData);
        setHasLocal(true);
      }
    } catch {
      /* storage unavailable: keep the bundled itinerary */
    }
    setHydrated(true);
  }, []);

  // Persist every change while editing.
  useEffect(() => {
    if (!hydrated || data === initial) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setHasLocal(true);
    } catch {
      /* ignore */
    }
  }, [data, hydrated, initial]);

  const days = useMemo(
    () => [...data.days].sort((a, b) => a.date.localeCompare(b.date)),
    [data.days],
  );
  const totalDays = days.length;

  // ---- mutations -----------------------------------------------------------

  const patchDay = (dayId: string, fn: (d: Day) => Day) =>
    setData((s) => ({ ...s, days: s.days.map((d) => (d.id === dayId ? fn(d) : d)) }));

  const patchActivity = (dayId: string, actId: string, patch: Partial<Activity>) =>
    patchDay(dayId, (d) => ({
      ...d,
      activities: d.activities.map((a) => (a.id === actId ? { ...a, ...patch } : a)),
    }));

  const addActivity = (dayId: string) =>
    patchDay(dayId, (d) => ({
      ...d,
      activities: [...d.activities, { id: uid("a"), title: "" }],
    }));

  const removeActivity = (dayId: string, actId: string) =>
    patchDay(dayId, (d) => ({ ...d, activities: d.activities.filter((a) => a.id !== actId) }));

  const addDay = (legId: string) =>
    setData((s) => {
      const sorted = [...s.days].sort((a, b) => a.date.localeCompare(b.date));
      const own = sorted.filter((d) => d.legId === legId);
      const anchor = own.length ? own[own.length - 1] : sorted[sorted.length - 1];
      const date = anchor ? addDays(anchor.date, 1) : "2026-11-01";
      return {
        ...s,
        days: [...s.days, { id: uid("d"), date, legId, activities: [{ id: uid("a"), title: "" }] }],
      };
    });

  const removeDay = (dayId: string) => {
    if (!confirm("¿Quitar este día del itinerario?")) return;
    setData((s) => ({ ...s, days: s.days.filter((d) => d.id !== dayId) }));
  };

  const notes: Note[] = data.notes ?? [];

  const setNotes = (fn: (n: Note[]) => Note[]) =>
    setData((s) => ({ ...s, notes: fn(s.notes ?? []) }));

  const addNote = () => setNotes((n) => [...n, { id: uid("n"), text: "" }]);

  const patchNote = (id: string, text: string) =>
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, text } : x)));

  const removeNote = (id: string) => setNotes((n) => n.filter((x) => x.id !== id));

  const reset = () => {
    if (!confirm("Esto borra los cambios guardados en este navegador y vuelve al itinerario original.")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setData(initial);
    setHasLocal(false);
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "itinerary.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- render ---------------------------------------------------------------

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-top">
          {editing ? (
            <input
              className="ed ed-title"
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              aria-label="Título del viaje"
            />
          ) : (
            <h1>{data.title}</h1>
          )}
          <button className="btn btn-ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Terminar edición" : "Editar itinerario"}
          </button>
        </div>
        {editing ? (
          <input
            className="ed ed-sub"
            value={data.subtitle}
            onChange={(e) => setData({ ...data, subtitle: e.target.value })}
            aria-label="Subtítulo"
          />
        ) : (
          <p className="sub">{data.subtitle}</p>
        )}

        <nav className="route" aria-label="Tramos del viaje">
          {data.legs.map((leg) => {
            const r = legRange(leg, days);
            if (!r) return null;
            return (
              <a
                key={leg.id}
                href={`#${leg.id}`}
                className="route-seg"
                style={{ flexGrow: r.count, ["--leg" as string]: leg.color }}
              >
                <span className="route-name">{leg.name}</span>
                <span className="route-dates">{rangeLabel(r.first, r.last)}</span>
              </a>
            );
          })}
        </nav>
        <ul className="route-list">
          {data.legs.map((leg) => {
            const r = legRange(leg, days);
            if (!r) return null;
            return (
              <li key={leg.id} style={{ ["--leg" as string]: leg.color }}>
                <span className="dot" />
                <span>{leg.name}</span>
                <span className="muted">{rangeLabel(r.first, r.last)}</span>
              </li>
            );
          })}
        </ul>
      </header>

      {data.legs.map((leg) => {
        const own = days.filter((d) => d.legId === leg.id);
        const r = legRange(leg, days);
        if (!r && !editing) return null;
        return (
          <section key={leg.id} id={leg.id} className="leg" style={{ ["--leg" as string]: leg.color }}>
            <div className="leg-head">
              {editing ? (
                <input
                  className="ed ed-leg"
                  value={leg.name}
                  onChange={(e) =>
                    setData((s) => ({
                      ...s,
                      legs: s.legs.map((l) => (l.id === leg.id ? { ...l, name: e.target.value } : l)),
                    }))
                  }
                  aria-label="Nombre del tramo"
                />
              ) : (
                <h2>{leg.name}</h2>
              )}
              <p className="leg-meta">
                {leg.place}
                {r && <>. {rangeLabel(r.first, r.last)}, {r.count === 1 ? "un día" : `${r.count} días`}</>}
              </p>
            </div>

            <ol className="days">
              {own.map((day) => {
                const idx = days.findIndex((d) => d.id === day.id) + 1;
                return (
                  <li key={day.id} className="day">
                    <div className="day-date">
                      <span className="day-num">{fmtDate(day.date, { day: "numeric" })}</span>
                      <span className="day-wd">
                        <span className="day-wd-name">
                          {fmtDate(day.date, { weekday: "short" }).replace(".", "")}
                        </span>
                        {editing ? (
                          <input
                            type="date"
                            className="ed ed-date"
                            value={day.date}
                            onChange={(e) => patchDay(day.id, (d) => ({ ...d, date: e.target.value }))}
                            aria-label="Fecha"
                          />
                        ) : (
                          <>, día {idx} de {totalDays}</>
                        )}
                      </span>
                      {editing && (
                        <button className="btn btn-danger btn-xs" onClick={() => removeDay(day.id)}>
                          Quitar día
                        </button>
                      )}
                    </div>

                    <ul className="acts">
                      {day.activities.map((act) => (
                        <li key={act.id} className={`act${act.pending ? " is-pending" : ""}`}>
                          {editing ? (
                            <div className="act-edit">
                              <input
                                type="time"
                                className="ed ed-time"
                                value={act.time ?? ""}
                                onChange={(e) => patchActivity(day.id, act.id, { time: e.target.value })}
                                aria-label="Hora"
                              />
                              <input
                                className="ed ed-act"
                                placeholder="¿Qué vamos a hacer?"
                                value={act.title}
                                onChange={(e) => patchActivity(day.id, act.id, { title: e.target.value })}
                                aria-label="Actividad"
                              />
                              <input
                                className="ed ed-note"
                                placeholder="Nota (opcional)"
                                value={act.note ?? ""}
                                onChange={(e) => patchActivity(day.id, act.id, { note: e.target.value })}
                                aria-label="Nota"
                              />
                              <div className="act-edit-row">
                                <select
                                  className="ed ed-sel"
                                  value={act.provider ?? ""}
                                  onChange={(e) =>
                                    patchActivity(day.id, act.id, { provider: e.target.value as Provider })
                                  }
                                  aria-label="Reservado con"
                                >
                                  <option value="">Sin reserva</option>
                                  {Object.entries(PROVIDER_LABEL).map(([k, v]) => (
                                    <option key={k} value={k}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                                <label className="chk">
                                  <input
                                    type="checkbox"
                                    checked={!!act.pending}
                                    onChange={(e) => patchActivity(day.id, act.id, { pending: e.target.checked })}
                                  />
                                  Pendiente
                                </label>
                                <button
                                  className="btn btn-danger btn-xs"
                                  onClick={() => removeActivity(day.id, act.id)}
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="act-time">{fmtTime(act.time)}</span>
                              <div className="act-body">
                                <p className="act-title">
                                  {act.title || <em className="muted">Sin título</em>}
                                  {act.provider && (
                                    <span className="tag">{PROVIDER_LABEL[act.provider]}</span>
                                  )}
                                  {act.pending && <span className="tag tag-pending">Pendiente</span>}
                                </p>
                                {act.note && <p className="act-note">{act.note}</p>}
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    {editing && (
                      <button className="btn btn-link" onClick={() => addActivity(day.id)}>
                        + Agregar actividad
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            {editing && (
              <button className="btn btn-outline" onClick={() => addDay(leg.id)}>
                + Agregar día en {leg.name}
              </button>
            )}
          </section>
        );
      })}

      {(notes.length > 0 || editing) && (
        <section id="notas" className="notes">
          <div className="leg-head notes-head">
            <h2>Notas</h2>
            <p className="leg-meta">Pendientes y recordatorios sueltos.</p>
          </div>
          <ul className="notes-list">
            {notes.map((n) => (
              <li key={n.id} className="note">
                {editing ? (
                  <div className="note-edit">
                    <textarea
                      className="ed ed-noteText"
                      rows={2}
                      placeholder="Escribe la nota"
                      value={n.text}
                      onChange={(e) => patchNote(n.id, e.target.value)}
                      aria-label="Nota"
                    />
                    <button className="btn btn-danger btn-xs" onClick={() => removeNote(n.id)}>
                      Quitar
                    </button>
                  </div>
                ) : (
                  <p>{n.text || <em className="muted">Nota vacía</em>}</p>
                )}
              </li>
            ))}
          </ul>
          {editing && (
            <button className="btn btn-outline" onClick={addNote}>
              + Agregar nota
            </button>
          )}
        </section>
      )}

      <footer className="foot">
        {hasLocal ? (
          <p className="muted">
            Estás viendo cambios guardados en este navegador. Descarga el JSON y reemplaza{" "}
            <code>data/itinerary.json</code> para publicarlos.
          </p>
        ) : (
          <p className="muted">Itinerario publicado. Usa “Editar itinerario” para cambiarlo desde aquí.</p>
        )}
      </footer>

      {editing && (
        <div className="editbar" role="toolbar" aria-label="Acciones de edición">
          <span className="editbar-status">Los cambios se guardan solos en este navegador.</span>
          <button className="btn btn-ghost" onClick={download}>
            Descargar JSON
          </button>
          <button className="btn btn-ghost" onClick={reset} disabled={!hasLocal}>
            Restablecer original
          </button>
          <button className="btn btn-solid" onClick={() => setEditing(false)}>
            Listo
          </button>
        </div>
      )}
    </main>
  );
}
