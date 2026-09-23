export type Provider =
  | "booking"
  | "getyourguide"
  | "civitatis"
  | "vuelo"
  | "bus"
  | "";

export interface Activity {
  id: string;
  time?: string;
  title: string;
  note?: string;
  provider?: Provider;
  pending?: boolean;
}

export interface Day {
  id: string;
  date: string; // ISO date, e.g. 2026-11-01
  legId: string;
  activities: Activity[];
}

export interface Leg {
  id: string;
  name: string;
  place: string;
  color: string;
}

export interface Note {
  id: string;
  text: string;
}

export interface Itinerary {
  title: string;
  subtitle: string;
  legs: Leg[];
  days: Day[];
  notes?: Note[];
}
