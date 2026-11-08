/** RYVMO data model. Version 1 stays compatible with the existing ritmo_state JSON row. */
export const STORAGE_KEY = 'ritmo.habits.v1';

export const MEALS = [
  { id: 'breakfast', name: 'Caf\u00e9 da manh\u00e3', detail: 'Primeira refei\u00e7\u00e3o' },
  { id: 'morningSnack', name: 'Lanche da manh\u00e3', detail: 'Entre as refei\u00e7\u00f5es' },
  { id: 'lunch', name: 'Almo\u00e7o', detail: 'Refei\u00e7\u00e3o principal' },
  { id: 'afternoonSnack', name: 'Lanche da tarde', detail: 'Pausa da tarde' },
  { id: 'preWorkout', name: 'Pr\u00e9-treino', detail: 'Energia para treinar' },
  { id: 'dinner', name: 'Janta', detail: 'Fechando o dia' },
] as const;
export type MealId = string;
export type HabitId = string;
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HabitIcon = 'languages' | 'pill' | 'dumbbell' | 'wine-off' | 'book' | 'sparkles' | 'flame' | 'heart' | 'sun' | 'moon' | 'target' | 'activity';
export type HabitTone = 'mint' | 'lavender' | 'peach' | 'sky' | 'yellow';
export type HabitDefinition = { id: string; title: string; subtitle: string; icon: HabitIcon; tone: HabitTone };
export type MealDefinition = { id: string; name: string; detail: string };

export const DEFAULT_HABITS: HabitDefinition[] = [
  { id: 'duolingo', title: 'Duolingo', subtitle: 'Praticar ingl\u00eas todos os dias', icon: 'languages', tone: 'mint' },
  { id: 'creatine', title: 'Tomar creatina', subtitle: 'Manter a rotina de suplementa\u00e7\u00e3o', icon: 'pill', tone: 'lavender' },
  { id: 'gym', title: 'Ir para a academia', subtitle: 'Movimento e evolu\u00e7\u00e3o', icon: 'dumbbell', tone: 'peach' },
  { id: 'study', title: 'Estudar 1 hora por dia', subtitle: 'Foco e aprendizado consistente', icon: 'book', tone: 'yellow' },
  { id: 'noAlcohol', title: 'N\u00e3o beber \u00e1lcool', subtitle: 'Priorizar o seu bem-estar', icon: 'wine-off', tone: 'sky' },
];
export const WEEKDAYS = [
  { short: 'Seg', label: 'Segunda' }, { short: 'Ter', label: 'Ter\u00e7a' },
  { short: 'Qua', label: 'Quarta' }, { short: 'Qui', label: 'Quinta' },
  { short: 'Sex', label: 'Sexta' }, { short: 'S\u00e1b', label: 'S\u00e1bado' },
  { short: 'Dom', label: 'Domingo' },
] as const;

export type DayLog = {
  duolingo: boolean;
  creatine: boolean;
  gym: boolean;
  noAlcohol: boolean;
  studyMinutes: number;
  meals: Record<string, boolean>;
  habitChecks: Record<string, boolean>;
};
export type Exercise = { id: string; name: string; weight: number; imageKey?: string; muscleGroup?: string; instructions?: string; kind?: 'strength' | 'cardio' };
export type PlanExercise = {
  id: string; exerciseId: string; sets: number; reps: number;
  repsUpper?: number; restSeconds?: number; referenceWeight?: number;
  notes?: string; durationMinutes?: number; warmupMinutes?: number;
  mainMinutes?: number; cooldownMinutes?: number; intensity?: string;
};
export type ProgramDay = { title: string; subtitle: string; kind: 'strength' | 'cardio' | 'rest' };
export type PerformedSet = { setNumber: number; reps: number; weight: number };
export type DraftSet = { reps: number; weight: number };
export type RecordedExercise = {
  exerciseId: string; name: string; weight: number; plannedSets: number;
  performedSets: number; reps: number; setsDone?: PerformedSet[]; durationMinutes?: number;
};
export type WorkoutSession = { id: string; date: string; planDay: Weekday; createdAt: string; exercises: RecordedExercise[] };
export type AppData = {
  version: 1;
  days: Record<string, DayLog>;
  habits: HabitDefinition[];
  mealCatalog: MealDefinition[];
  exercises: Record<string, Exercise>;
  plans: Record<Weekday, PlanExercise[]>;
  trainingDays: Partial<Record<Weekday, ProgramDay>>;
  workoutDetails: Record<string, Record<string, DraftSet[]>>;
  workoutChecks: Record<string, Record<string, boolean[]>>;
  sessions: WorkoutSession[];
  settings: { studyGoal: number };
};

export function emptyDay(): DayLog {
  return {
    duolingo: false, creatine: false, gym: false, noAlcohol: false, studyMinutes: 0,
    meals: Object.fromEntries(MEALS.map((meal) => [meal.id, false])),
    habitChecks: {},
  };
}
export function emptyData(): AppData {
  return {
    version: 1, days: {}, habits: DEFAULT_HABITS.map((habit) => ({ ...habit })),
    mealCatalog: MEALS.map((meal) => ({ ...meal })), exercises: {},
    plans: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    trainingDays: {}, workoutDetails: {},
    workoutChecks: {}, sessions: [], settings: { studyGoal: 60 },
  };
}
export function safeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
export function isHabitDone(log: DayLog, habitId: string, studyGoal: number): boolean {
  if (habitId === 'study') return log.studyMinutes >= studyGoal;
  if (habitId === 'duolingo' || habitId === 'creatine' || habitId === 'gym' || habitId === 'noAlcohol') {
    return log[habitId] === true;
  }
  return log.habitChecks?.[habitId] === true;
}
export function dayScore(log: DayLog, studyGoal: number, habits: HabitDefinition[] = DEFAULT_HABITS, meals: MealDefinition[] = MEALS.map((meal) => ({ ...meal }))) {
  return habits.reduce((sum, habit) => sum + Number(isHabitDone(log, habit.id, studyGoal)), 0) +
    meals.reduce((sum, meal) => sum + Number(log.meals?.[meal.id] === true), 0);
}
export const MAX_SCORE = DEFAULT_HABITS.length + MEALS.length;
export function totalGoals(data: AppData): number { return data.habits.length + data.mealCatalog.length; }
export function normalizeExerciseName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function safeText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}
function validId(id: string) { return /^[a-zA-Z0-9-]{1,99}$/.test(id); }
const ICONS: HabitIcon[] = ['languages','pill','dumbbell','wine-off','book','sparkles','flame','heart','sun','moon','target','activity'];
const TONES: HabitTone[] = ['mint', 'lavender', 'peach', 'sky', 'yellow'];

export function sanitizeImportedData(candidate: unknown): AppData {
  if (!candidate || typeof candidate !== 'object') throw new Error('Arquivo inv\u00e1lido.');
  const parsed = candidate as Partial<AppData>;
  if (parsed.version !== 1 || !parsed.days || !parsed.plans || !parsed.exercises) {
    throw new Error('Este backup n\u00e3o pertence ao RYVMO ou tem vers\u00e3o incompat\u00edvel.');
  }
  const blank = emptyData();
  // Old RITMO exports had no habit / meal catalogs. Missing catalogs are migrated,
  // while [] is a deliberate user choice and must remain empty.
  const habits: HabitDefinition[] = Array.isArray(parsed.habits) ? parsed.habits.slice(0, 80)
    .filter((item): item is HabitDefinition => Boolean(item && typeof item === 'object' && validId(String(item.id)) && safeText(item.title, 60)))
    .map((item) => ({ id: String(item.id), title: safeText(item.title, 60), subtitle: safeText(item.subtitle, 100),
      icon: ICONS.includes(item.icon) ? item.icon : 'sparkles', tone: TONES.includes(item.tone) ? item.tone : 'mint' }))
    .filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index)
    : blank.habits;
  const mealCatalog: MealDefinition[] = Array.isArray(parsed.mealCatalog) ? parsed.mealCatalog.slice(0, 30)
    .filter((item): item is MealDefinition => Boolean(item && typeof item === 'object' && validId(String(item.id)) && safeText(item.name, 60)))
    .map((item) => ({ id: String(item.id), name: safeText(item.name, 60), detail: safeText(item.detail, 100) }))
    .filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index)
    : blank.mealCatalog;
  const days: AppData['days'] = {};
  for (const [date, value] of Object.entries(parsed.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !value || typeof value !== 'object') continue;
    const day = value as DayLog;
    const meals: Record<string, boolean> = {};
    const rawMeals = day.meals && typeof day.meals === 'object' ? day.meals : {};
    for (const [id, checked] of Object.entries(rawMeals)) if (validId(id)) meals[id] = checked === true;
    const habitChecks: Record<string, boolean> = {};
    const rawChecks = day.habitChecks && typeof day.habitChecks === 'object' ? day.habitChecks : {};
    for (const [id, checked] of Object.entries(rawChecks)) if (validId(id)) habitChecks[id] = checked === true;
    days[date] = { duolingo: day.duolingo === true, creatine: day.creatine === true,
      gym: day.gym === true, noAlcohol: day.noAlcohol === true,
      studyMinutes: safeNumber(day.studyMinutes, 0, 1440, 0), meals, habitChecks };
  }
  const exercises: AppData['exercises'] = {};
  for (const [id, value] of Object.entries(parsed.exercises)) {
    if (!value || typeof value !== 'object') continue;
    const ex = value as Exercise;
    const name = safeText(ex.name, 80);
    if (name && validId(id)) exercises[id] = {
      id, name, weight: safeNumber(ex.weight, 0, 2000, 0),
      ...(typeof ex.imageKey === 'string' && /^[a-z0-9-]{1,60}$/.test(ex.imageKey) ? { imageKey: ex.imageKey } : {}),
      ...(ex.muscleGroup ? { muscleGroup: safeText(ex.muscleGroup, 80) } : {}),
      ...(ex.instructions ? { instructions: safeText(ex.instructions, 360) } : {}),
      kind: ex.kind === 'cardio' ? 'cardio' : 'strength',
    };
  }
  const plans = blank.plans;
  for (let i = 0; i < 7; i++) {
    const weekday = i as Weekday;
    const incoming = parsed.plans?.[weekday];
    plans[weekday] = Array.isArray(incoming) ? incoming
      .filter((item): item is PlanExercise => Boolean(item && typeof item === 'object' && exercises[item.exerciseId]))
      .slice(0, 60)
      .map((item) => ({ id: String(item.id).slice(0, 100), exerciseId: String(item.exerciseId),
        sets: Math.round(safeNumber(item.sets, 1, 20, 3)), reps: Math.round(safeNumber(item.reps, 1, 100, 10)),
        ...(item.repsUpper != null ? { repsUpper: Math.round(safeNumber(item.repsUpper, 1, 100, 15)) } : {}),
        ...(item.restSeconds != null ? { restSeconds: Math.round(safeNumber(item.restSeconds, 0, 600, 90)) } : {}),
        ...(item.referenceWeight != null ? { referenceWeight: safeNumber(item.referenceWeight, 0, 2000, 0) } : {}),
        ...(item.notes ? { notes: safeText(item.notes, 250) } : {}),
        ...(item.durationMinutes != null ? { durationMinutes: Math.round(safeNumber(item.durationMinutes, 1, 360, 40)) } : {}),
        ...(item.warmupMinutes != null ? { warmupMinutes: Math.round(safeNumber(item.warmupMinutes, 0, 120, 5)) } : {}),
        ...(item.mainMinutes != null ? { mainMinutes: Math.round(safeNumber(item.mainMinutes, 0, 360, 30)) } : {}),
        ...(item.cooldownMinutes != null ? { cooldownMinutes: Math.round(safeNumber(item.cooldownMinutes, 0, 120, 5)) } : {}),
        ...(item.intensity ? { intensity: safeText(item.intensity, 70) } : {}),
      })) : [];
  }
  const trainingDays: AppData['trainingDays'] = {};
  for (let i = 0; i < 7; i++) {
    const weekday = i as Weekday;
    const info = parsed.trainingDays?.[weekday];
    if (info && typeof info === 'object') trainingDays[weekday] = {
      title: safeText(info.title, 65), subtitle: safeText(info.subtitle, 130),
      kind: info.kind === 'rest' ? 'rest' : info.kind === 'cardio' ? 'cardio' : 'strength',
    };
  }
  const workoutDetails: AppData['workoutDetails'] = {};
  const rawDetails = parsed.workoutDetails && typeof parsed.workoutDetails === 'object' ? parsed.workoutDetails : {};
  for (const [date, dayDetails] of Object.entries(rawDetails)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dayDetails || typeof dayDetails !== 'object') continue;
    workoutDetails[date] = {};
    for (const [id, rows] of Object.entries(dayDetails)) {
      if (!validId(id) || !Array.isArray(rows)) continue;
      workoutDetails[date][id] = rows.slice(0, 20).map((row) => ({
        reps: Math.round(safeNumber(row?.reps, 0, 100, 0)),
        weight: safeNumber(row?.weight, 0, 2000, 0),
      }));
    }
  }
  const rawChecks = parsed.workoutChecks && typeof parsed.workoutChecks === 'object' ? parsed.workoutChecks : {};
  const workoutChecks: AppData['workoutChecks'] = {};
  for (const [date, dayChecks] of Object.entries(rawChecks)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dayChecks || typeof dayChecks !== 'object') continue;
    workoutChecks[date] = {};
    for (const [id, array] of Object.entries(dayChecks)) {
      if (Array.isArray(array) && id.length < 100) workoutChecks[date][id] = array.slice(0, 20).map((v) => v === true);
    }
  }
  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions
    .filter((session): session is WorkoutSession => Boolean(session && typeof session === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(session.date) && Array.isArray(session.exercises)))
    .slice(0, 3000)
    .map((session) => ({ id: String(session.id).slice(0, 100), date: session.date,
      planDay: (Number(session.planDay) >= 0 && Number(session.planDay) < 7 ? Number(session.planDay) : 0) as Weekday,
      createdAt: String(session.createdAt),
      exercises: session.exercises.slice(0, 60).map((ex) => ({ exerciseId: String(ex.exerciseId),
        name: String(ex.name).slice(0, 80), weight: safeNumber(ex.weight, 0, 2000, 0),
        plannedSets: Math.round(safeNumber(ex.plannedSets, 0, 20, 0)),
        performedSets: Math.round(safeNumber(ex.performedSets, 0, 20, 0)), reps: Math.round(safeNumber(ex.reps, 0, 100, 0)),
        ...(ex.durationMinutes != null ? { durationMinutes: Math.round(safeNumber(ex.durationMinutes, 0, 360, 0)) } : {}),
        ...(Array.isArray(ex.setsDone) ? { setsDone: ex.setsDone.slice(0, 20).map((set) => ({
          setNumber: Math.round(safeNumber(set.setNumber, 1, 20, 1)),
          reps: Math.round(safeNumber(set.reps, 0, 100, 0)), weight: safeNumber(set.weight, 0, 2000, 0),
        })) } : {}),
      })) })) : [];
  return { version: 1, days, habits, mealCatalog, exercises, plans, trainingDays, workoutDetails, workoutChecks, sessions,
    settings: { studyGoal: Math.round(safeNumber(parsed.settings?.studyGoal, 1, 1440, 60)) } };
}
