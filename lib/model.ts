export const STORAGE_KEY = "ritmo.habits.v1";

export const MEALS = [
  { id: "breakfast", name: "Caf\u00e9 da manh\u00e3", detail: "Primeira refei\u00e7\u00e3o" },
  { id: "morningSnack", name: "Lanche da manh\u00e3", detail: "Entre as refei\u00e7\u00f5es" },
  { id: "lunch", name: "Almo\u00e7o", detail: "Refei\u00e7\u00e3o principal" },
  { id: "afternoonSnack", name: "Lanche da tarde", detail: "Pausa da tarde" },
  { id: "preWorkout", name: "Pr\u00e9-treino", detail: "Energia para treinar" },
  { id: "dinner", name: "Janta", detail: "Fechando o dia" },
] as const;

export type MealId = (typeof MEALS)[number]["id"];
export type HabitId = "duolingo" | "creatine" | "gym" | "noAlcohol";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Monday = 0

export const WEEKDAYS = [
  { short: "Seg", label: "Segunda" },
  { short: "Ter", label: "Ter\u00e7a" },
  { short: "Qua", label: "Quarta" },
  { short: "Qui", label: "Quinta" },
  { short: "Sex", label: "Sexta" },
  { short: "S\u00e1b", label: "S\u00e1bado" },
  { short: "Dom", label: "Domingo" },
] as const;

export type DayLog = {
  duolingo: boolean;
  creatine: boolean;
  gym: boolean;
  noAlcohol: boolean;
  studyMinutes: number;
  meals: Record<MealId, boolean>;
};

export type Exercise = {
  id: string;
  name: string;
  weight: number; // one live weight shared by all plans
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
};

export type RecordedExercise = {
  exerciseId: string;
  name: string;
  weight: number; // immutable snapshot for historical accuracy
  plannedSets: number;
  performedSets: number;
  reps: number;
};

export type WorkoutSession = {
  id: string;
  date: string;
  planDay: Weekday;
  createdAt: string;
  exercises: RecordedExercise[];
};

export type AppData = {
  version: 1;
  days: Record<string, DayLog>;
  exercises: Record<string, Exercise>;
  plans: Record<Weekday, PlanExercise[]>;
  workoutChecks: Record<string, Record<string, boolean[]>>;
  sessions: WorkoutSession[];
  settings: { studyGoal: number };
};

export function emptyDay(): DayLog {
  return {
    duolingo: false,
    creatine: false,
    gym: false,
    noAlcohol: false,
    studyMinutes: 0,
    meals: {
      breakfast: false,
      morningSnack: false,
      lunch: false,
      afternoonSnack: false,
      preWorkout: false,
      dinner: false,
    },
  };
}

export function emptyData(): AppData {
  return {
    version: 1,
    days: {},
    exercises: {},
    plans: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    workoutChecks: {},
    sessions: [],
    settings: { studyGoal: 60 },
  };
}

export function safeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function dayScore(log: DayLog, studyGoal: number): number {
  return (
    Number(log.duolingo) +
    Number(log.creatine) +
    Number(log.gym) +
    Number(log.noAlcohol) +
    Number(log.studyMinutes >= studyGoal) +
    MEALS.reduce((sum, meal) => sum + Number(Boolean(log.meals[meal.id])), 0)
  );
}

export const MAX_SCORE = 5 + MEALS.length;

export function normalizeExerciseName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function sanitizeImportedData(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== "object") throw new Error("Arquivo inv\u00e1lido.");
  const parsed = candidate as Partial<AppData>;
  if (parsed.version !== 1 || !parsed.days || !parsed.plans || !parsed.exercises) {
    throw new Error("Este backup n\u00e3o pertence ao Ritmo ou tem vers\u00e3o incompat\u00edvel.");
  }
  const blank = emptyData();
  const days: AppData["days"] = {};
  for (const [date, value] of Object.entries(parsed.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !value || typeof value !== "object") continue;
    const day = value as DayLog;
    days[date] = {
      duolingo: day.duolingo === true,
      creatine: day.creatine === true,
      gym: day.gym === true,
      noAlcohol: day.noAlcohol === true,
      studyMinutes: safeNumber(day.studyMinutes, 0, 1440, 0),
      meals: Object.fromEntries(MEALS.map((meal) => [meal.id, day.meals?.[meal.id] === true])) as DayLog["meals"],
    };
  }
  const exercises: AppData["exercises"] = {};
  for (const [id, value] of Object.entries(parsed.exercises)) {
    if (!value || typeof value !== "object") continue;
    const exercise = value as Exercise;
    const name = typeof exercise.name === "string" ? exercise.name.trim().slice(0, 80) : "";
    if (name && /^[a-zA-Z0-9-]{1,99}$/.test(id)) exercises[id] = { id, name, weight: safeNumber(exercise.weight, 0, 2000, 0) };
  }
  const plans = blank.plans;
  for (let i = 0; i < 7; i++) {
    const weekday = i as Weekday;
    const incoming = parsed.plans?.[weekday];
    plans[weekday] = Array.isArray(incoming)
      ? incoming
          .filter((item): item is PlanExercise => Boolean(item && typeof item === "object" && exercises[item.exerciseId]))
          .slice(0, 60)
          .map((item) => ({
            id: String(item.id).slice(0, 100),
            exerciseId: String(item.exerciseId),
            sets: Math.round(safeNumber(item.sets, 1, 20, 3)),
            reps: Math.round(safeNumber(item.reps, 1, 100, 10)),
          }))
      : [];
  }
  const rawChecks = parsed.workoutChecks && typeof parsed.workoutChecks === "object" ? parsed.workoutChecks : {};
  const workoutChecks: AppData["workoutChecks"] = {};
  for (const [date, dayChecks] of Object.entries(rawChecks)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dayChecks || typeof dayChecks !== "object") continue;
    workoutChecks[date] = {};
    for (const [id, array] of Object.entries(dayChecks)) {
      if (Array.isArray(array) && id.length < 100) workoutChecks[date][id] = array.slice(0, 20).map((v) => v === true);
    }
  }
  const sessions = Array.isArray(parsed.sessions)
    ? parsed.sessions
        .filter((session): session is WorkoutSession => Boolean(session && typeof session === "object" && /^\d{4}-\d{2}-\d{2}$/.test(session.date) && Array.isArray(session.exercises)))
        .slice(0, 3000)
        .map((session) => ({
          id: String(session.id).slice(0, 100),
          date: session.date,
          planDay: (Number(session.planDay) >= 0 && Number(session.planDay) < 7 ? Number(session.planDay) : 0) as Weekday,
          createdAt: String(session.createdAt),
          exercises: session.exercises.slice(0, 60).map((ex) => ({
            exerciseId: String(ex.exerciseId),
            name: String(ex.name).slice(0, 80),
            weight: safeNumber(ex.weight, 0, 2000, 0),
            plannedSets: Math.round(safeNumber(ex.plannedSets, 0, 20, 0)),
            performedSets: Math.round(safeNumber(ex.performedSets, 0, 20, 0)),
            reps: Math.round(safeNumber(ex.reps, 0, 100, 0)),
          })),
        }))
    : [];
  return {
    version: 1,
    days,
    exercises,
    plans,
    workoutChecks,
    sessions,
    settings: { studyGoal: Math.round(safeNumber(parsed.settings?.studyGoal, 1, 1440, 60)) },
  };
}
