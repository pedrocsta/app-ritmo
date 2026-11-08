"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Activity,
  Apple,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  Cloud,
  CloudOff,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Download,
  Dumbbell,
  Flame,
  Home,
  Info,
  Languages,
  Link2,
  LockKeyhole,
  Minus,
  Moon,
  MoreHorizontal,
  Pill,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UtensilsCrossed,
  WineOff,
  Heart,
  Sun,
  LogOut,
  Pencil,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  dayScore,
  emptyData,
  emptyDay,
  DEFAULT_HABITS,
  isHabitDone,
  totalGoals,
  normalizeExerciseName,
  safeNumber,
  sanitizeImportedData,
  WEEKDAYS,
} from "@/lib/model";
import type { AppData, DayLog, HabitDefinition, HabitIcon, HabitTone, MealId, Weekday } from "@/lib/model";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { buildHeatmapDates, isFuture, parseDateKey, prettyDate, shiftDate, todayKey, weekdayOf } from "@/lib/dates";
import { useCloudStore } from "@/lib/use-cloud-store";

type Tab = "today" | "calendar" | "training" | "settings";

type TabInfo = { id: Tab; title: string; icon: LucideIcon };
const ILLUSTRATED_EXERCISE_KEYS = new Set<string>([
  "corrida",
  "agachamento-livre",
  "leg-press-45",
  "cadeira-extensora",
  "cadeira-flexora",
  "panturrilha-unilateral",
  "abdominal-polia",
  "elevacao-joelhos",
  "supino-inclinado-halteres",
  "puxada-neutra",
  "supino-reto-halteres",
  "remada-baixa",
  "desenvolvimento-neutro",
  "lateral-polia",
  "crucifixo-inverso-maquina",
  "rosca-scott-maquina",
  "triceps-frances-corda",
  "terra-romeno",
  "agachamento-bulgaro",
  "hip-thrust",
]);
const exerciseImageUrl = (key: string) => `/exercises/${key}.${ILLUSTRATED_EXERCISE_KEYS.has(key) ? "webp" : "svg"}`;

const TABS: TabInfo[] = [
  { id: "today", title: "Hoje", icon: Home },
  { id: "calendar", title: "Hist\u00f3rico", icon: CalendarDays },
  { id: "training", title: "Treinos", icon: Dumbbell },
  { id: "settings", title: "Ajustes", icon: Settings2 },
];

const HABIT_ICON_MAP: Record<HabitIcon, LucideIcon> = {
  languages: Languages, pill: Pill, dumbbell: Dumbbell, 'wine-off': WineOff,
  book: BookOpen, sparkles: Sparkles, flame: Flame, heart: Heart,
  sun: Sun, moon: Moon, target: Target, activity: Activity,
};
const ICON_CHOICES: { id: HabitIcon; title: string }[] = [
  {id:'sparkles',title:'Estrela'}, {id:'languages',title:'Idiomas'},
  {id:'pill',title:'Saude'}, {id:'dumbbell',title:'Treino'},
  {id:'book',title:'Leitura'}, {id:'wine-off',title:'Sem alcool'},
  {id:'flame',title:'Fogo'}, {id:'heart',title:'Coracao'},
  {id:'sun',title:'Sol'}, {id:'moon',title:'Lua'},
  {id:'target',title:'Meta'}, {id:'activity',title:'Atividade'},
];
const TONE_CHOICES: HabitTone[] = ['mint', 'lavender', 'peach', 'sky', 'yellow'];

const MEAL_ICONS: Record<string, LucideIcon> = {
  breakfast: Coffee,
  morningSnack: Apple,
  lunch: UtensilsCrossed,
  afternoonSnack: Coffee,
  preWorkout: Zap,
  dinner: Moon,
};

const shortDate = (key: string) => prettyDate(key, { day: "numeric", month: "short" });
const weightText = (value: number) => Number.isInteger(value) ? String(value) : String(value).replace(".", ",");

function AppLogo({ small = false }: { small?: boolean }) {
  return (
    <div className={`logo-lockup ${small ? "logo-small" : ""}`} aria-label="RYVMO">
      <span className="logo-mark" aria-hidden="true">R</span>
      <span className="logo-word">ryvmo<span className="logo-dot">.</span></span>
    </div>
  );
}

function ProgressRing({ percent, size = 118 }: { percent: number; size?: number }) {
  const radius = 45;
  const circumference = Math.PI * radius * 2;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${percent}% conclu\u00eddo`}>
        <circle className="ring-track" cx="60" cy="60" r={radius} strokeWidth="9" fill="none" />
        <circle className="ring-fill" cx="60" cy="60" r={radius} strokeWidth="9" fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
      </svg>
      <div className="ring-center"><strong>{percent}<small>%</small></strong><span>do dia</span></div>
    </div>
  );
}

function NavButton({ tab, selected, onClick, compact = false }: {
  tab: TabInfo; selected: boolean; onClick: () => void; compact?: boolean;
}) {
  const Icon = tab.icon;
  return (
    <button type="button" className={`nav-button ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}
      onClick={onClick} aria-current={selected ? "page" : undefined}>
      <Icon size={compact ? 21 : 19} strokeWidth={selected ? 2.4 : 1.9} />
      <span>{tab.title}</span>
    </button>
  );
}

function MiniStat({ icon: Icon, number, title, tone }: { icon: LucideIcon; number: string; title: string; tone: string }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon tone-${tone}`}><Icon size={18} strokeWidth={2.1} /></span>
      <strong>{number}</strong>
      <span className="stat-label">{title}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h2>{title}</h2></div>
      {aside ? <div className="section-aside">{aside}</div> : null}
    </div>
  );
}

function Heatmap({ data, weeks, currentDate, selectedDate, onDateClick, withTitle = true }: {
  data: AppData; weeks: number; currentDate: string; selectedDate: string;
  onDateClick: (date: string) => void; withTitle?: boolean;
}) {
  const columns = useMemo(() => buildHeatmapDates(weeks, currentDate), [weeks, currentDate]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [weeks]);
  const monthLabels = columns.map((week, index) => {
    const curr = parseDateKey(week[0]);
    const prev = index === 0 ? null : parseDateKey(columns[index - 1][0]);
    return index === 0 || prev?.getMonth() !== curr.getMonth()
      ? curr.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
      : "";
  });
  return (
    <div className="heatmap-module">
      {withTitle ? <div className="heatmap-kicker"><span><span className="pulse-dot" /> SEU MAPA DE CONST&Acirc;NCIA</span><span>{totalGoals(data)} metas / dia</span></div> : null}
      <div className="heatmap-scroll" ref={scrollRef} tabIndex={0} aria-label="Mapa de calor dos h\u00e1bitos; role para visualizar as semanas">
        <div className="heatmap-inner">
          <div className="heatmap-daylabels"><span /> <span>Seg</span><span /> <span>Qua</span><span /> <span>Sex</span><span /></div>
          <div className="heatmap-weeks">
            {columns.map((week, index) => (
              <div className="heatmap-week" key={week[0]}>
                <span className="heatmap-month">{monthLabels[index]}</span>
                {week.map((day) => {
                  const future = isFuture(day, currentDate);
                  const log = data.days[day] ?? emptyDay();
                  const score = future ? 0 : dayScore(log, data.settings.studyGoal, data.habits, data.mealCatalog);
                  const max = totalGoals(data);
                  const fraction = max ? score / max : 0;
                  const level = score === 0 ? 0 : fraction < .25 ? 1 : fraction < .5 ? 2 : fraction < .8 ? 3 : 4;
                  return <button key={day} type="button" disabled={future}
                    className={`heat-cell level-${level} ${day === selectedDate ? "focused" : ""} ${future ? "future" : ""}`}
                    onClick={() => onDateClick(day)}
                    title={`${prettyDate(day)}: ${score} de ${totalGoals(data)} metas`}
                    aria-label={`${prettyDate(day)}: ${score} de ${totalGoals(data)} metas${day === selectedDate ? ", selecionado" : ""}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-footer"><span>Toque em um dia para ver os detalhes</span><div className="heatmap-legend">Menos <i className="level-0" /><i className="level-1" /><i className="level-2" /><i className="level-3" /><i className="level-4" /> Mais</div></div>
    </div>
  );
}

function ToggleButton({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`check-action ${checked ? "checked" : ""}`} onClick={onClick}
      aria-label={`${checked ? "Desmarcar" : "Marcar"} ${label}`} aria-pressed={checked}>
      <Check size={17} strokeWidth={3} />
    </button>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { data, setData, ready, status: cloudStatus, error: cloudError, retry, loadCloudVersion, keepDeviceVersion } = useCloudStore();
  const [tab, setTab] = useState<Tab>("today");
  const [currentDate, setCurrentDate] = useState(todayKey);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedDay, setSelectedDay] = useState<Weekday>(() => weekdayOf(todayKey()));
  const [exerciseName, setExerciseName] = useState("");
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [artOpen, setArtOpen] = useState<{ name: string; imageKey: string; instructions?: string } | null>(null);
  const [showExerciseSuggestions, setShowExerciseSuggestions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"reset" | "import" | null>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [habitName, setHabitName] = useState('');
  const [habitSubtitle, setHabitSubtitle] = useState('');
  const [habitIcon, setHabitIcon] = useState<HabitIcon>('sparkles');
  const [habitTone, setHabitTone] = useState<HabitTone>('mint');
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [mealDetail, setMealDetail] = useState('');
  const [deletion, setDeletion] = useState<{ kind: 'habit' | 'meal'; id: string; title: string } | null>(null);

  useEffect(() => {
    const refreshDate = () => setCurrentDate(todayKey());
    const timer = window.setInterval(refreshDate, 60_000);
    document.addEventListener("visibilitychange", refreshDate);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then(async () => {
        const registration = await navigator.serviceWorker.ready;
        const assets = performance.getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(`${location.origin}/_next/static/`));
        registration.active?.postMessage({ type: "CACHE_ASSETS", assets });
      }).catch(() => undefined);
    }
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const log = data.days[selectedDate] ?? emptyDay();
  const goalCount = totalGoals(data);
  const score = dayScore(log, data.settings.studyGoal, data.habits, data.mealCatalog);
  const percent = goalCount ? Math.round((score / goalCount) * 100) : 0;
  const mealCount = data.mealCatalog.filter((meal) => log.meals[meal.id]).length;
  const todayLog = data.days[currentDate] ?? emptyDay();
  const todayScore = dayScore(todayLog, data.settings.studyGoal, data.habits, data.mealCatalog);
  const plan = data.plans[selectedDay];
  const programDay = data.trainingDays?.[selectedDay];
  const planSets = plan.reduce((sum, item) => sum + item.sets, 0);
  const exerciseOptions = Object.values(data.exercises).filter((exercise) =>
    normalizeExerciseName(exercise.name).includes(normalizeExerciseName(exerciseName)) && exerciseName.trim().length > 0
  ).slice(0, 5);
  const completedSets = plan.reduce((sum, item) => sum + (data.workoutChecks[selectedDate]?.[item.id] ?? []).filter(Boolean).length, 0);
  const sessionsForDate = data.sessions.filter((session) => session.date === selectedDate);
  const loggedDays = Object.values(data.days).filter((day) => dayScore(day, data.settings.studyGoal, data.habits, data.mealCatalog) > 0).length;
  const perfectDays = goalCount ? Object.values(data.days).filter((day) => dayScore(day, data.settings.studyGoal, data.habits, data.mealCatalog) === goalCount).length : 0;
  const last7Days = Array.from({ length: 7 }, (_, i) => shiftDate(currentDate, -i));
  const weeklyRate = goalCount ? Math.round(last7Days.reduce((sum, date) => sum + dayScore(data.days[date] ?? emptyDay(), data.settings.studyGoal, data.habits, data.mealCatalog), 0) / (7 * goalCount) * 100) : 0;
  const streak = useMemo(() => {
    let start = currentDate;
    if (!goalCount || dayScore(data.days[start] ?? emptyDay(), data.settings.studyGoal, data.habits, data.mealCatalog) !== goalCount) start = shiftDate(start, -1);
    let count = 0;
    for (let i = 0; i < 366; i++) {
      const date = shiftDate(start, -i);
      if (goalCount && dayScore(data.days[date] ?? emptyDay(), data.settings.studyGoal, data.habits, data.mealCatalog) === goalCount) count++;
      else break;
    }
    return count;
  }, [data, currentDate, goalCount]);

  const dietStreak = useMemo(() => {
    const fullDiet = (date: string) => data.mealCatalog.length > 0 && data.mealCatalog.every((meal) => data.days[date]?.meals[meal.id] === true);
    const start = fullDiet(currentDate) ? currentDate : shiftDate(currentDate, -1);
    let count = 0;
    for (let i = 0; i < 366; i++) {
      if (!fullDiet(shiftDate(start, -i))) break;
      count++;
    }
    return count;
  }, [data, currentDate]);

  function switchTab(next: Tab) {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToDate(next: string, jumpToToday = false) {
    if (next > currentDate || !/^\d{4}-\d{2}-\d{2}$/.test(next)) return;
    setSelectedDate(next);
    setSelectedDay(weekdayOf(next));
    if (jumpToToday) switchTab("today");
  }

  function patchLog(edit: (current: DayLog) => DayLog) {
    setData((prev) => ({ ...prev, days: { ...prev.days, [selectedDate]: edit(prev.days[selectedDate] ?? emptyDay()) } }));
  }

  function toggleHabit(id: string) {
    if (id === 'duolingo' || id === 'creatine' || id === 'gym' || id === 'noAlcohol') {
      patchLog((current) => ({ ...current, [id]: !current[id] }));
    } else {
      patchLog((current) => ({ ...current, habitChecks: { ...current.habitChecks, [id]: !current.habitChecks?.[id] } }));
    }
  }

  function toggleMeal(id: MealId) {
    patchLog((current) => ({ ...current, meals: { ...current.meals, [id]: !current.meals[id] } }));
  }

  function changeStudy(value: number) {
    patchLog((current) => ({ ...current, studyMinutes: Math.round(safeNumber(value, 0, 1440, 0)) }));
  }

  function startHabitEdit(habit: HabitDefinition) {
    setEditingHabit(habit.id); setHabitName(habit.title); setHabitSubtitle(habit.subtitle);
    setHabitIcon(habit.icon); setHabitTone(habit.tone);
  }
  function resetHabitForm() {
    setEditingHabit(null); setHabitName(''); setHabitSubtitle(''); setHabitIcon('sparkles'); setHabitTone('mint');
  }
  function saveHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = habitName.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!title) { setToast('Informe o nome do hábito.'); return; }
    if (!editingHabit && data.habits.length >= 80) { setToast('Limite de 80 hábitos atingido.'); return; }
    if (!editingHabit && data.habits.some((habit) => normalizeExerciseName(habit.title) === normalizeExerciseName(title))) {
      setToast('Este hábito já existe.'); return;
    }
    const item: HabitDefinition = { id: editingHabit ?? crypto.randomUUID(), title,
      subtitle: habitSubtitle.trim().slice(0, 100), icon: habitIcon, tone: habitTone };
    setData((prev) => ({ ...prev, habits: editingHabit
      ? prev.habits.map((habit) => habit.id === editingHabit ? item : habit)
      : [...prev.habits, item] }));
    resetHabitForm();
    setToast(editingHabit ? 'Hábito atualizado.' : 'Novo hábito adicionado.');
  }
  function startMealEdit(meal: { id: string; name: string; detail: string }) {
    setEditingMeal(meal.id); setMealName(meal.name); setMealDetail(meal.detail);
  }
  function resetMealForm() { setEditingMeal(null); setMealName(''); setMealDetail(''); }
  function saveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = mealName.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!name) { setToast('Informe o nome da refeição.'); return; }
    if (!editingMeal && data.mealCatalog.length >= 30) { setToast('Limite de 30 refeições atingido.'); return; }
    const item = { id: editingMeal ?? crypto.randomUUID(), name, detail: mealDetail.trim().slice(0, 100) };
    setData((prev) => ({ ...prev, mealCatalog: editingMeal
      ? prev.mealCatalog.map((meal) => meal.id === editingMeal ? item : meal)
      : [...prev.mealCatalog, item] }));
    resetMealForm(); setToast(editingMeal ? 'Etapa atualizada.' : 'Etapa da dieta criada.');
  }
  function confirmDelete() {
    if (!deletion) return;
    setData((prev) => deletion.kind === 'habit'
      ? { ...prev, habits: prev.habits.filter((item) => item.id !== deletion.id) }
      : { ...prev, mealCatalog: prev.mealCatalog.filter((item) => item.id !== deletion.id) });
    if (deletion.kind === 'habit' && editingHabit === deletion.id) resetHabitForm();
    if (deletion.kind === 'meal' && editingMeal === deletion.id) resetMealForm();
    setDeletion(null);
    setToast('Item removido. O histórico bruto permanece no backup.');
  }
  async function signOut() {
    try { await createClient().auth.signOut(); } finally {
      // Avoid leaving personal offline copies in a shared browser after logout.
      localStorage.removeItem('ritmo.supabase-cache.v1');
      localStorage.removeItem('ritmo.habits.v1');
      router.replace('/login'); router.refresh();
    }
  }

  function addExercise(rawName: string) {
    const name = rawName.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!name) { setToast("Digite o nome do exerc\u00edcio."); return; }
    const normalized = normalizeExerciseName(name);
    if (!normalized) { setToast("Informe um nome v\u00e1lido."); return; }
    const existing = Object.values(data.exercises).find((exercise) => normalizeExerciseName(exercise.name) === normalized);
    if (existing && plan.some((item) => item.exerciseId === existing.id)) {
      setToast("Este exerc\u00edcio j\u00e1 est\u00e1 nesse dia.");
      return;
    }
    const exerciseId = existing?.id ?? crypto.randomUUID();
    const planItemId = crypto.randomUUID();
    setData((prev) => ({
      ...prev,
      exercises: existing ? prev.exercises : { ...prev.exercises, [exerciseId]: { id: exerciseId, name, weight: 0 } },
      plans: {
        ...prev.plans,
        [selectedDay]: [...prev.plans[selectedDay], { id: planItemId, exerciseId, sets: 3, reps: 10 }],
      },
    }));
    setExerciseName("");
    setShowExerciseSuggestions(false);
    setToast(existing ? "Exerc\u00edcio adicionado com a carga sincronizada." : "Exerc\u00edcio adicionado ao treino.");
  }

  function patchPlanItem(id: string, field: "sets" | "reps", value: number) {
    const max = field === "sets" ? 20 : 100;
    setData((prev) => ({
      ...prev,
      plans: { ...prev.plans, [selectedDay]: prev.plans[selectedDay].map((item) => item.id === id
        ? { ...item, [field]: Math.round(safeNumber(value, 1, max, field === "sets" ? 3 : 10)) } : item) },
    }));
  }

  function changeSharedWeight(exerciseId: string, value: number) {
    setData((prev) => ({
      ...prev,
      exercises: {
        ...prev.exercises,
        [exerciseId]: { ...prev.exercises[exerciseId], weight: Math.round(safeNumber(value, 0, 2000, 0) * 4) / 4 },
      },
    }));
  }

  function removeExercise(planItemId: string) {
    setData((prev) => ({ ...prev, plans: { ...prev.plans, [selectedDay]: prev.plans[selectedDay].filter((item) => item.id !== planItemId) } }));
    setToast("Exerc\u00edcio removido deste dia.");
  }

  function patchPerformedSet(itemId: string, setIndex: number, field: 'reps' | 'weight', value: number) {
    setData((prev) => {
      const item = prev.plans[selectedDay].find((candidate) => candidate.id === itemId);
      if (!item) return prev;
      const exercise = prev.exercises[item.exerciseId];
      if (!exercise) return prev;
      const old = prev.workoutDetails?.[selectedDate]?.[itemId] ?? [];
      const rows = Array.from({ length: item.sets }, (_, index) => old[index] ?? { reps: item.reps, weight: exercise.weight });
      rows[setIndex] = { ...rows[setIndex], [field]: field === 'reps'
        ? Math.round(safeNumber(value, 0, 100, item.reps))
        : Math.round(safeNumber(value, 0, 2000, exercise.weight) * 4) / 4 };
      return { ...prev, workoutDetails: { ...prev.workoutDetails, [selectedDate]: {
        ...(prev.workoutDetails[selectedDate] ?? {}), [itemId]: rows,
      } } };
    });
  }

  function toggleSet(itemId: string, setIndex: number, numberOfSets: number) {
    setData((prev) => {
      const dayChecks = prev.workoutChecks[selectedDate] ?? {};
      const currentChecks = Array.from({ length: numberOfSets }, (_, index) => Boolean(dayChecks[itemId]?.[index]));
      currentChecks[setIndex] = !currentChecks[setIndex];
      return { ...prev, workoutChecks: { ...prev.workoutChecks, [selectedDate]: { ...dayChecks, [itemId]: currentChecks } } };
    });
  }

  function markAllSets() {
    setData((prev) => {
      const all = { ...(prev.workoutChecks[selectedDate] ?? {}) };
      for (const item of prev.plans[selectedDay]) all[item.id] = Array.from({ length: item.sets }, () => true);
      return { ...prev, workoutChecks: { ...prev.workoutChecks, [selectedDate]: all } };
    });
  }

  function recordWorkout() {
    if (!plan.length) { setToast("Adicione exercícios ao treino primeiro."); return; }
    if (!completedSets) { setToast("Marque as séries realizadas ou use 'Marcar todas'."); return; }
    const isCardioDay = programDay?.kind === 'cardio' || plan.every((item) => data.exercises[item.exerciseId]?.kind === 'cardio');
    const session = {
      id: crypto.randomUUID(),
      date: selectedDate,
      planDay: selectedDay,
      createdAt: new Date().toISOString(),
      exercises: plan.map((item) => {
        const ex = data.exercises[item.exerciseId];
        const checked = data.workoutChecks[selectedDate]?.[item.id] ?? [];
        const details = data.workoutDetails?.[selectedDate]?.[item.id] ?? [];
        const setsDone = checked.flatMap((done, index) => done ? [{
          setNumber: index + 1,
          reps: details[index]?.reps ?? item.reps,
          weight: details[index]?.weight ?? ex.weight,
        }] : []);
        return {
          exerciseId: item.exerciseId, name: ex.name,
          weight: ex.weight, plannedSets: item.sets, performedSets: setsDone.length,
          reps: item.reps, setsDone,
          ...(item.durationMinutes ? { durationMinutes: item.durationMinutes } : {}),
        };
      }).filter((item) => item.performedSets > 0),
    };
    setData((prev) => ({
      ...prev,
      // Run days are cardio, not automatically a gym visit.
      days: isCardioDay ? prev.days : {
        ...prev.days,
        [selectedDate]: { ...(prev.days[selectedDate] ?? emptyDay()), gym: true },
      },
      sessions: [session, ...prev.sessions],
      workoutChecks: { ...prev.workoutChecks, [selectedDate]: {} },
      workoutDetails: { ...prev.workoutDetails, [selectedDate]: {} },
    }));
    setToast(isCardioDay ? "Corrida registrada no histórico!" : "Treino registrado e academia marcada no dia!");
  }

  function exportBackup() {
    const exported = { ...data, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ryvmo-backup-${currentDate}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Backup criado. Guarde o arquivo em local seguro.");
  }

  async function selectImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setToast("O backup excede 3 MB e não pode ser enviado ao Supabase nesta versão."); return; }
    try {
      const incoming = sanitizeImportedData(JSON.parse(await file.text()));
      setPendingImport(incoming);
      setModal("import");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "N\u00e3o foi poss\u00edvel importar o arquivo.");
    }
  }

  function confirmModal() {
    if (modal === "reset") {
      setData(emptyData());
      setSelectedDate(currentDate);
      setSelectedDay(weekdayOf(currentDate));
      setToast("Registros apagados. Sincronizando com a nuvem...");
    }
    if (modal === "import" && pendingImport) {
      setData(pendingImport);
      setToast("Backup restaurado com sucesso.");
    }
    setPendingImport(null);
    setModal(null);
  }

  if (!ready) return <div className="loading-screen"><AppLogo />
    {cloudStatus === "error" ? <div className="boot-error"><CloudOff size={26} /><strong>Não foi possível conectar ao Supabase</strong><p>{cloudError}</p><button type="button" className="btn-primary" onClick={retry}><RefreshCw size={16} /> Tentar novamente</button></div> : <><div className="loading-line" /><p>Conectando ao seu espaço na nuvem...</p></>}
  </div>;

  const syncLabels = { loading: "Conectando", saved: "Sincronizado", saving: "Salvando", offline: "Pendente", conflict: "Conflito", error: "Erro" } as const;

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-top"><AppLogo /><p>Pequenos passos.<br />Grandes mudan&ccedil;as.</p></div>
        <nav className="desktop-navigation" aria-label="Navega\u00e7\u00e3o principal">
          <span className="sidebar-group-label">SEU ESPA&Ccedil;O</span>
          {TABS.map((item) => <NavButton key={item.id} tab={item} selected={tab === item.id} onClick={() => switchTab(item.id)} />)}
        </nav>
        <div className="sidebar-bottom"><span className="sidebar-bottom-icon"><LockKeyhole size={17} /></span><div><strong>Seus dados, com voc&ecirc;.</strong><p>Acesso exclusivo e protegido.</p></div></div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand"><AppLogo small /></div>
          <div className="desktop-breadcrumb"><span>Meu espa&ccedil;o</span><ChevronRight size={14} /><strong>{TABS.find((item) => item.id === tab)?.title}</strong></div>
          <div className="topbar-right"><button type="button" onClick={retry} className={`cloud-status state-${cloudStatus}`} title={cloudError ?? "Sincronização com o Supabase"} aria-label={`Supabase: ${syncLabels[cloudStatus]}. Tocar para atualizar.`} disabled={cloudStatus === "saving" || cloudStatus === "conflict"}>
            {cloudStatus === "saved" ? <Cloud size={16} /> : cloudStatus === "saving" ? <RefreshCw size={16} className="spin-icon" /> : <CloudOff size={16} />}
            <span>{syncLabels[cloudStatus]}</span>
          </button><span className="topbar-date"><CalendarDays size={15} />{prettyDate(currentDate, { day: "numeric", month: "short", year: "numeric" })}</span><button className="profile-circle signout-circle" title="Sair da conta" aria-label="Sair da conta" onClick={() => void signOut()}><LogOut size={16} /></button></div>
        </header>

        <main className="content">
          {cloudStatus === "conflict" ? <div className="cloud-notice warning" role="alert"><div className="cloud-notice-copy"><AlertTriangle size={22} /><div><strong>Alterações diferentes em dois aparelhos</strong><p>{cloudError ?? "A versão atual do banco é diferente desta tela."} Exporte um backup antes de escolher qual versão deve permanecer.</p></div></div><div className="cloud-notice-actions"><button type="button" className="btn-outline" onClick={() => { if (window.confirm("Descartar as alterações deste aparelho e carregar os dados do Supabase?")) void loadCloudVersion(); }}>Carregar da nuvem</button><button type="button" className="btn-primary" onClick={() => { if (window.confirm("Substituir os dados do Supabase pelos registros exibidos neste aparelho? O outro conjunto será perdido.")) void keepDeviceVersion(); }}>Manter este aparelho</button></div></div> : null}
          {cloudStatus === "offline" ? <div className="cloud-notice offline" role="status"><div className="cloud-notice-copy"><CloudOff size={20} /><div><strong>Sincronização pendente</strong><p>{cloudError ?? "O app vai tentar enviar suas mudanças quando a conexão voltar."} Se voce registrou algo, não apague os dados deste navegador.</p></div></div><button type="button" className="btn-outline" onClick={retry}><RefreshCw size={15} /> Tentar novamente</button></div> : null}
          {tab === "today" && <>
            <div className="page-intro">
              <div><span className="eyebrow"><Sparkles size={14} /> O SEU DIA IMPORTA</span><h1>{selectedDate === currentDate ? "Um dia de cada vez" : "Seu dia em detalhes"}<span className="heading-period">.</span></h1><p>Consist&ecirc;ncia se constr&oacute;i nas pequenas escolhas.</p></div>
              <div className="date-switcher"><button onClick={() => goToDate(shiftDate(selectedDate, -1))} aria-label="Dia anterior"><ChevronLeft size={17} /></button>
                <label className="date-switch-label"><CalendarDays size={16} /><span>{selectedDate === currentDate ? "Hoje" : shortDate(selectedDate)}</span><input type="date" aria-label="Selecionar data" max={currentDate} value={selectedDate} onChange={(e) => goToDate(e.target.value)} /></label>
                <button onClick={() => goToDate(shiftDate(selectedDate, 1))} disabled={selectedDate >= currentDate} aria-label="Pr\u00f3ximo dia"><ChevronRight size={17} /></button></div>
            </div>

            <section className="hero-card" aria-label="Resumo do dia">
              <div className="hero-glow" /><div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
              <div className="hero-copy"><span className="hero-eyebrow"><span className="hero-star"><Sparkles size={13} /></span> SEU PROGRESSO</span><h2>{percent === 100 ? "Voc\u00ea conseguiu!" : percent >= 55 ? "Voc\u00ea est\u00e1 no ritmo!" : "Hoje \u00e9 uma nova chance."}</h2><p>{score} de {goalCount} metas conclu&iacute;das{percent === 100 ? ". Dia completo!" : ". Continue no seu ritmo."}</p><div className="hero-badge"><Flame size={15} fill="currentColor" /> {streak} {streak === 1 ? "dia perfeito seguido" : "dias perfeitos seguidos"}</div></div>
              <ProgressRing percent={percent} size={136} />
            </section>

            <div className="stats-row"><MiniStat icon={Target} number={`${score}/${goalCount}`} title="Metas do dia" tone="green" /><MiniStat icon={Flame} number={`${streak}`} title="Dias em sequ&ecirc;ncia" tone="orange" /><MiniStat icon={TrendingUp} number={`${weeklyRate}%`} title="&Uacute;ltimos 7 dias" tone="blue" /></div>

            <div className="dashboard-grid">
              <section className="dashboard-column">
                <SectionHeading eyebrow="UM PASSO DE CADA VEZ" title="Hábitos diários" aside={<button className="heading-count manage-link" onClick={() => switchTab('settings')}><Settings2 size={13} /> Editar · {data.habits.filter((habit) => isHabitDone(log, habit.id, data.settings.studyGoal)).length}/{data.habits.length}</button>} />
                <div className="habit-list">
                  {data.habits.map((habit) => {
                    const Icon = HABIT_ICON_MAP[habit.icon] ?? Sparkles;
                    const checked = isHabitDone(log, habit.id, data.settings.studyGoal);
                    if (habit.id === 'study') return <div className={`habit-row study-habit ${checked ? 'done' : ''}`} key={habit.id}>
                      <span className={`habit-icon tone-${habit.tone}`}><Icon size={22} strokeWidth={1.9}/></span>
                      <div className="habit-text"><strong>{habit.title === DEFAULT_HABITS[3].title && data.settings.studyGoal !== 60 ? `Estudar ${data.settings.studyGoal} min por dia` : habit.title}</strong><span>{habit.subtitle}</span></div>
                      <span className="study-total">{log.studyMinutes}<small>/{data.settings.studyGoal} min</small></span>
                      <ToggleButton checked={checked} label={habit.title} onClick={() => changeStudy(checked ? 0 : data.settings.studyGoal)} />
                      <div className="study-controls"><div className="study-track"><span style={{ width: `${Math.min(100, log.studyMinutes / data.settings.studyGoal * 100)}%` }} /></div><div className="study-actions"><button onClick={() => changeStudy(log.studyMinutes - 15)} aria-label="Remover 15 minutos"><Minus size={13} /> 15 min</button><button onClick={() => changeStudy(log.studyMinutes + 15)}><Plus size={13} /> 15 min</button><button onClick={() => changeStudy(log.studyMinutes + 30)}><Plus size={13} /> 30 min</button></div></div>
                    </div>;
                    return <div className={`habit-row ${checked ? 'done' : ''}`} key={habit.id}>
                      <span className={`habit-icon tone-${habit.tone}`}><Icon size={22} strokeWidth={1.9} /></span>
                      <div className="habit-text"><strong>{habit.title}</strong><span>{habit.subtitle}</span></div>
                      {habit.id === 'gym' ? <button className="habit-go" onClick={() => { setSelectedDay(weekdayOf(selectedDate)); switchTab('training'); }} aria-label="Abrir gerenciador de treinos"><ArrowUpRight size={18} /></button> : null}
                      <ToggleButton checked={checked} label={habit.title} onClick={() => toggleHabit(habit.id)} />
                    </div>;
                  })}
                  {data.habits.length === 0 ? <div className="empty-habit-list"><Sparkles size={21} /><strong>O seu painel, do seu jeito.</strong><p>Crie seu primeiro hábito em Ajustes para começar.</p><button className="btn-outline" onClick={() => switchTab('settings')}><Plus size={16}/> Criar hábito</button></div> : null}
                </div>
              </section>
              <div className="dashboard-column right-column">
                <section><SectionHeading eyebrow="SUA ROTINA ALIMENTAR" title="Minha dieta" aside={<span className="heading-count">{mealCount} / {data.mealCatalog.length}</span>} />
                  <div className="diet-card"><div className="diet-top"><div><span className="diet-small">Refei&ccedil;&otilde;es de hoje</span><strong>{data.mealCatalog.length > 0 && mealCount === data.mealCatalog.length ? "Tudo em dia!" : `${data.mealCatalog.length - mealCount} para completar`}</strong></div><span className="diet-progress" style={{ background: `conic-gradient(var(--green) ${data.mealCatalog.length ? mealCount / data.mealCatalog.length * 360 : 0}deg, var(--line) 0deg)` }}><span>{data.mealCatalog.length ? Math.round(mealCount / data.mealCatalog.length * 100) : 0}%</span></span></div>
                    <div className="meal-list">{data.mealCatalog.map((meal) => { const Icon = MEAL_ICONS[meal.id] ?? UtensilsCrossed; return <button type="button" key={meal.id} className={`meal-row ${log.meals[meal.id] ? "completed" : ""}`} onClick={() => toggleMeal(meal.id)} aria-pressed={log.meals[meal.id]}><span className="meal-icon"><Icon size={17} strokeWidth={1.8} /></span><span className="meal-label">{meal.name}</span><span className="meal-check"><Check size={15} strokeWidth={3} /></span></button>; })}</div><div className="diet-streak"><Flame size={15} /><span><strong>{dietStreak} {dietStreak === 1 ? "dia" : "dias"}</strong> de dieta completa em sequ&ecirc;ncia</span></div>
                  </div>
                </section>
                <section className="heatmap-dashboard"><SectionHeading eyebrow="CADA DIA CONTA" title="Seu mapa de h\u00e1bitos" aside={<button className="text-link" onClick={() => switchTab("calendar")}>Ver tudo <ArrowUpRight size={15} /></button>} /><div className="surface-card heatmap-card"><Heatmap data={data} weeks={16} currentDate={currentDate} selectedDate={selectedDate} onDateClick={(date) => goToDate(date, true)} /></div></section>
                <div className="training-shortcut"><div className="shortcut-icon"><Dumbbell size={21} /></div><div><strong>Seu treino merece um plano.</strong><p>Organize cargas, s&eacute;ries e repeti&ccedil;&otilde;es.</p></div><button onClick={() => { setSelectedDay(weekdayOf(selectedDate)); switchTab("training"); }} aria-label="Gerenciar treinos"><ArrowRight size={20} /></button></div>
              </div>
            </div>
          </>}

          {tab === "calendar" && <>
            <div className="page-intro"><div><span className="eyebrow"><Activity size={14} /> HIST&Oacute;RICO E EVOLU&Ccedil;&Atilde;O</span><h1>A const&acirc;ncia aparece<span className="heading-period">.</span></h1><p>Todos os seus pequenos progressos, num s&oacute; lugar.</p></div></div>
            <div className="stats-row calendar-stats"><MiniStat icon={CalendarDays} number={String(loggedDays)} title="Dias com registros" tone="blue" /><MiniStat icon={CheckCheck} number={String(perfectDays)} title="Dias perfeitos" tone="green" /><MiniStat icon={Flame} number={String(streak)} title="Sequ&ecirc;ncia atual" tone="orange" /></div>
            <section className="calendar-heatmap-surface"><SectionHeading eyebrow="VIS&Atilde;O DOS &Uacute;LTIMOS 12 MESES" title="O seu ano em cores" /><div className="surface-card calendar-heatmap-card"><Heatmap data={data} weeks={53} currentDate={currentDate} selectedDate={selectedDate} onDateClick={(date) => goToDate(date, true)} /><div className="calendar-hint"><Info size={16} /><span>Cada quadradinho representa um dia. Quanto mais forte a cor, mais metas voc&ecirc; concluiu. Toque para editar um dia.</span></div></div></section>
            <div className="calendar-lower-grid"><section className="surface-card week-review"><SectionHeading eyebrow="SEUS &Uacute;LTIMOS 7 DIAS" title="Na &uacute;ltima semana" /><div className="week-bars">{last7Days.slice().reverse().map((date) => { const n = dayScore(data.days[date] ?? emptyDay(), data.settings.studyGoal, data.habits, data.mealCatalog); const isSelected = date === selectedDate; return <button type="button" key={date} className={`week-bar-item ${isSelected ? "active" : ""}`} onClick={() => goToDate(date, true)} aria-label={`${prettyDate(date)}: ${n} metas`}><span className="week-bar-value">{n}</span><span className="week-bar-track"><span style={{ height: `${goalCount ? n / goalCount * 100 : 0}%` }} /></span><span>{parseDateKey(date).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span></button>; })}</div></section>
              <section className="surface-card milestone-card"><span className="milestone-mark"><Target size={24} /></span><h3>O segredo &eacute; continuar.</h3><p>N&atilde;o precisa acertar todos os dias. Cada check &eacute; uma decis&atilde;o a favor do seu objetivo.</p><button onClick={() => { goToDate(currentDate); switchTab("today"); }}>Voltar aos h&aacute;bitos <ArrowRight size={16} /></button></section></div>
          </>}

          {tab === "training" && <>
            <div className="page-intro"><div><span className="eyebrow"><Dumbbell size={14} /> SUA EVOLU&Ccedil;&Atilde;O EM MOVIMENTO</span><h1>Treine com inten&ccedil;&atilde;o<span className="heading-period">.</span></h1><p>Sete dias para planejar. Cada carga conta.</p></div><div className="date-switcher"><button onClick={() => goToDate(shiftDate(selectedDate, -1))} aria-label="Dia anterior"><ChevronLeft size={17} /></button><label className="date-switch-label"><CalendarDays size={16} /><span>{selectedDate === currentDate ? "Hoje" : shortDate(selectedDate)}</span><input type="date" aria-label="Data do treino" max={currentDate} value={selectedDate} onChange={(e) => goToDate(e.target.value)} /></label><button onClick={() => goToDate(shiftDate(selectedDate, 1))} disabled={selectedDate >= currentDate} aria-label="Próximo dia"><ChevronRight size={17} /></button></div></div>
            <section className="training-hero"><div className="training-hero-copy"><span className="hero-eyebrow"><span className="hero-star"><Dumbbell size={13} /></span> GERENCIADOR DE TREINOS</span><h2>Mais for&ccedil;a.<br />Mais const&acirc;ncia.</h2><p>Monte sua semana, registre o que fez e acompanhe seus pesos.</p></div><div className="training-hero-graphic" aria-hidden="true"><Dumbbell size={106} strokeWidth={1.05} /></div></section>
            <div className="workout-layout"><section className="workout-main">
              <div className="workout-day-heading"><div><span className="eyebrow">SUA SEMANA</span><h2>Plano de treino</h2></div><span className="heading-count">{WEEKDAYS.filter((_, day) => data.plans[day as Weekday].length > 0 || data.trainingDays?.[day as Weekday]?.kind === 'rest').length} / 7 dias planejados</span></div>
              <div className="weekday-tabs" role="group" aria-label="Escolher dia do treino">{WEEKDAYS.map((day, index) => <button type="button" key={day.short} className={`weekday-tab ${selectedDay === index ? "selected" : ""}`} onClick={() => setSelectedDay(index as Weekday)} aria-pressed={selectedDay === index}><span>{day.short}</span><i className={data.plans[index as Weekday].length || data.trainingDays?.[index as Weekday]?.kind === 'rest' ? "has-plan" : ""} aria-hidden="true" /></button>)}</div>
              <div className="plan-title-row"><div><span className="eyebrow">{WEEKDAYS[selectedDay].label.toLocaleUpperCase("pt-BR")}</span><h3>{programDay?.title || (plan.length ? `${plan.length} ${plan.length === 1 ? "exercício" : "exercícios"} no plano` : "Monte seu treino")}</h3><p>{programDay?.subtitle || "Séries e repetições são individuais para cada dia."}</p></div><span className="small-plan-icon"><MoreHorizontal size={19} /></span></div>
              <div className="shared-weight-note"><Link2 size={17} /><span><strong>Cargas conectadas.</strong> Se mudar o peso de um exerc&iacute;cio, ele ser&aacute; atualizado automaticamente nos outros dias.</span></div>
              <div className="exercise-list">{plan.map((item, index) => {
                const exercise = data.exercises[item.exerciseId];
                if (!exercise) return null;
                const checkArray = data.workoutChecks[selectedDate]?.[item.id] ?? [];
                const doneCount = checkArray.filter(Boolean).length;
                const isCardio = exercise.kind === 'cardio' || Boolean(item.durationMinutes);
                const otherDays = WEEKDAYS.filter((_, indexDay) => indexDay !== selectedDay && data.plans[indexDay as Weekday].some((p) => p.exerciseId === item.exerciseId)).map((d) => d.short);
                const details = data.workoutDetails?.[selectedDate]?.[item.id] ?? [];
                const showDetails = expandedExercise === item.id;
                return <article className={`exercise-card ${isCardio ? 'cardio-card' : ''}`} key={item.id}>
                  <div className="exercise-head">
                    <span className="exercise-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="exercise-heading"><h4>{exercise.name}</h4><span>{exercise.muscleGroup ? `${exercise.muscleGroup} · ` : ''}{otherDays.length ? `Também em: ${otherDays.join(", ")}` : isCardio ? 'Cardio' : 'Exercício do plano'}</span></div>
                    <button className="icon-quiet" type="button" onClick={() => removeExercise(item.id)} aria-label={`Remover ${exercise.name}`} title="Remover deste dia"><Trash2 size={17} /></button>
                  </div>
                  {exercise.imageKey ? <button type="button" className="exercise-visual" onClick={() => setArtOpen({ name: exercise.name, imageKey: exercise.imageKey!, instructions: exercise.instructions })} aria-label={`Abrir imagem e execução de ${exercise.name}`}>
                    <img src={exerciseImageUrl(exercise.imageKey)} alt={`Ilustração de ${exercise.name}`} loading="lazy" />
                    <span className="exercise-visual-action"><Info size={14} /> Ver movimento <ArrowUpRight size={14} /></span>
                  </button> : null}
                  {isCardio ? <div className="run-summary">
                    <div className="run-total"><Clock3 size={18}/><strong>{item.durationMinutes || 40} minutos</strong><span>{item.intensity || 'Leve a moderada'}</span></div>
                    <div className="run-steps"><span><b>{item.warmupMinutes ?? 5} min</b> aquecimento caminhando</span><span><b>{item.mainMinutes ?? 30} min</b> corrida leve</span><span><b>{item.cooldownMinutes ?? 5} min</b> desaquecimento</span></div>
                    <button className={`run-done ${checkArray[0] ? 'active' : ''}`} onClick={() => toggleSet(item.id, 0, 1)} aria-pressed={Boolean(checkArray[0])}><Check size={17}/>{checkArray[0] ? 'Corrida concluída' : 'Marcar corrida como concluída'}</button>
                  </div> : <>
                    <div className="exercise-fields"><label><span>SÉRIES</span><div className="number-field"><input type="number" inputMode="numeric" min="1" max="20" value={item.sets} onChange={(e) => patchPlanItem(item.id, "sets", Number(e.target.value))} aria-label={`Séries de ${exercise.name}`} /></div></label>
                      <label><span>REPETIÇÕES</span><div className="number-field"><input type="number" inputMode="numeric" min="1" max="100" value={item.reps} onChange={(e) => patchPlanItem(item.id, "reps", Number(e.target.value))} aria-label={`Repetições de ${exercise.name}`} /></div></label>
                      <label><span><Link2 size={11} /> CARGA</span><div className="number-field weight-field"><input type="number" inputMode="decimal" min="0" max="2000" step="0.25" value={exercise.weight} onChange={(e) => changeSharedWeight(exercise.id, Number(e.target.value))} aria-label={`Carga compartilhada de ${exercise.name}, em quilos`} /><small>{exercise.weight === 0 ? 'PC' : 'kg'}</small></div></label>
                    </div>
                    <div className="exercise-prescription"><span><Clock3 size={14}/>{item.restSeconds ? `${item.restSeconds}s descanso` : 'Descanso livre'}</span>
                      {item.repsUpper && item.repsUpper !== item.reps ? <span><Target size={14}/>{item.reps}–{item.repsUpper} reps</span> : null}
                      {item.referenceWeight != null && item.referenceWeight !== exercise.weight ? <span className="ref-weight"><Link2 size={14}/> Referência do dia: {item.referenceWeight === 0 ? 'peso corporal' : `${weightText(item.referenceWeight)} kg`}</span> : null}
                      {exercise.weight === 0 ? <span>Peso corporal</span> : null}
                    </div>
                    {item.notes ? <p className="exercise-notes">{item.notes}</p> : null}
                    <div className="exercise-sets-heading"><span>SÉRIES FEITAS · {shortDate(selectedDate)}</span><strong>{doneCount}/{item.sets}</strong></div>
                    <div className="exercise-sets">{Array.from({ length: item.sets }, (_, setIndex) => <button key={setIndex} type="button" onClick={() => toggleSet(item.id, setIndex, item.sets)} className={`set-chip ${checkArray[setIndex] ? "done" : ""}`} aria-pressed={Boolean(checkArray[setIndex])} aria-label={`${checkArray[setIndex] ? "Desmarcar" : "Concluir"} série ${setIndex + 1} de ${exercise.name}`}>{checkArray[setIndex] ? <Check size={15} strokeWidth={3} /> : setIndex + 1}</button>)}</div>
                    <button type="button" className="details-toggle" onClick={() => setExpandedExercise(showDetails ? null : item.id)} aria-expanded={showDetails}><Pencil size={14}/>{showDetails ? 'Ocultar repetições e cargas realizadas' : 'Registrar repetições e cargas por série'} <ChevronRight size={15}/></button>
                    {showDetails ? <div className="performance-list"><div className="performance-list-caption">Valores realizados • independentes da carga planejada</div>
                      {Array.from({ length: item.sets }, (_, setIndex) => <div className="performance-row" key={setIndex}><span className="performance-number">{setIndex + 1}ª</span><label><span>Reps</span><input type="number" inputMode="numeric" min="0" max="100" value={details[setIndex]?.reps ?? item.reps} onChange={(e) => patchPerformedSet(item.id,setIndex,'reps', Number(e.target.value))} aria-label={`Repetições realizadas na série ${setIndex + 1} de ${exercise.name}`} /></label><label><span>Carga (kg)</span><input type="number" inputMode="decimal" min="0" max="2000" step="0.25" value={details[setIndex]?.weight ?? exercise.weight} onChange={(e) => patchPerformedSet(item.id,setIndex,'weight', Number(e.target.value))} aria-label={`Carga realizada na série ${setIndex + 1} de ${exercise.name}`} /></label><button type="button" onClick={() => toggleSet(item.id, setIndex, item.sets)} className={`performance-check ${checkArray[setIndex] ? 'done' : ''}`} aria-label={`Alternar série ${setIndex + 1}`}><Check size={17}/></button></div>)}
                    </div> : null}
                  </>}
                </article>;
              })}</div>
              {plan.length === 0 && programDay?.kind === 'rest' ? <div className="empty-workout rest-workout"><span className="empty-workout-icon"><Moon size={28}/></span><h3>Quarta de recuperação.</h3><p>O programa reserva este dia para descanso. Você pode ajustar o plano se sua rotina mudar.</p></div> : plan.length === 0 ? <div className="empty-workout"><span className="empty-workout-icon"><Dumbbell size={29} strokeWidth={1.5} /></span><h3>Seu treino come&ccedil;a aqui.</h3><p>Adicione o primeiro exerc&iacute;cio de {WEEKDAYS[selectedDay].label.toLowerCase()} e defina s&eacute;ries, repeti&ccedil;&otilde;es e carga.</p></div> : null}
              <div className="add-exercise-card"><div className="add-exercise-label"><Plus size={18} /><strong>Adicionar exerc&iacute;cio</strong></div><div className="exercise-entry"><div className="exercise-input-wrap"><input type="text" value={exerciseName} maxLength={80} placeholder="Ex.: Supino reto, agachamento..." onChange={(e) => { setExerciseName(e.target.value); setShowExerciseSuggestions(true); }} onFocus={() => setShowExerciseSuggestions(true)} onBlur={() => window.setTimeout(() => setShowExerciseSuggestions(false), 130)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExercise(exerciseName); } }} aria-label="Nome do exerc\u00edcio" autoComplete="off" />
                  {showExerciseSuggestions && exerciseOptions.length > 0 ? <div className="exercise-suggestions">{exerciseOptions.map((item) => <button key={item.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addExercise(item.name)}><Dumbbell size={14} /><span>{item.name}</span><small>{weightText(item.weight)} kg</small></button>)}</div> : null}
                </div><button className="btn-primary" onClick={() => addExercise(exerciseName)}><Plus size={18} /><span>Adicionar</span></button></div><p>Ao repetir um nome de exerc&iacute;cio, o app reutiliza a mesma carga.</p></div>
              {plan.length > 0 ? <div className="finish-workout"><div><strong>Registrar treino &bull; {shortDate(selectedDate)}</strong><p>{completedSets} de {planSets} s&eacute;ries marcadas</p></div><div className="finish-actions"><button type="button" className="btn-outline" onClick={markAllSets}><CheckCheck size={16} /> Marcar todas</button><button type="button" className="btn-primary" onClick={recordWorkout}><Check size={18} /> Registrar treino</button></div></div> : null}
            </section>
            <aside className="workout-side"><div className="workout-side-card"><div className="side-card-top"><span className="side-card-icon"><Activity size={20} /></span><span>RESUMO DO PLANO</span></div><h3>{WEEKDAYS[selectedDay].label}</h3><div className="side-value"><strong>{plan.length}</strong><span>exerc&iacute;cios</span></div><div className="side-value"><strong>{programDay?.kind === 'rest' ? '—' : planSets}</strong><span>{programDay?.kind === 'cardio' ? 'sessões de corrida' : 'séries planejadas'}</span></div><div className="side-card-divider" /><p>Voc&ecirc; pode definir cargas diferentes para exerc&iacute;cios diferentes. O mesmo exerc&iacute;cio mant&eacute;m uma carga &uacute;nica na semana.</p></div>
              <div className="sessions-card"><div className="sessions-heading"><span className="eyebrow">SEU HIST&Oacute;RICO</span><h3>Treinos registrados</h3></div>{data.sessions.length === 0 ? <p className="session-placeholder">Quando registrar um treino, ele aparecer&aacute; aqui com o peso e as s&eacute;ries feitas.</p> : <div className="session-list">{data.sessions.slice(0, showAllSessions ? undefined : 5).map((session) => <div className="session-item" key={session.id}><span className="session-icon"><Check size={16} /></span><div><strong>{shortDate(session.date)} &middot; {WEEKDAYS[session.planDay].short}</strong><span>{session.exercises.length} exerc&iacute;cios &middot; {session.exercises.reduce((n, ex) => n + ex.performedSets, 0)} s&eacute;ries</span><details><summary>Ver exerc&iacute;cios</summary><ul>{session.exercises.map((ex) => <li key={ex.exerciseId}>{ex.name}: {ex.durationMinutes ? `${ex.durationMinutes} min` : ex.setsDone?.length ? ex.setsDone.map((set) => `${set.reps} reps / ${weightText(set.weight)} kg`).join(' · ') : `${ex.performedSets} x ${ex.reps} · ${weightText(ex.weight)} kg`}</li>)}</ul></details></div></div>)}</div>}{data.sessions.length > 5 ? <button type="button" className="view-history" onClick={() => setShowAllSessions(!showAllSessions)}>{showAllSessions ? "Mostrar menos" : `Ver todos (${data.sessions.length})`} <ChevronRight size={15} /></button> : null}</div>
              {sessionsForDate.length > 0 ? <p className="logged-today"><Check size={16} /> {sessionsForDate.length} treino(s) registrado(s) em {shortDate(selectedDate)}.</p> : null}
            </aside></div>
          </>}

          {tab === "settings" && <>
            <div className="page-intro"><div><span className="eyebrow"><Settings2 size={14} /> PERSONALIZE SEU RYVMO</span><h1>Tudo no seu tempo<span className="heading-period">.</span></h1><p>Seus objetivos, suas prefer&ecirc;ncias e seus dados.</p></div></div>
            <div className="manager-layout">
              <section className="surface-card manager-panel">
                <div className="manager-heading"><span className="manager-heading-icon"><Sparkles size={21}/></span><div><span className="eyebrow">ORGANIZE SEU DIA</span><h2>Meus hábitos</h2><p>Adicione, edite ou remova objetivos. Suas escolhas atualizam o heatmap.</p></div><span className="manager-count">{data.habits.length}</span></div>
                <div className="manager-items">{data.habits.map((habit) => { const Icon = HABIT_ICON_MAP[habit.icon]; return <div className="manager-item" key={habit.id}><span className={`manager-item-icon tone-${habit.tone}`}><Icon size={17}/></span><div><strong>{habit.title}</strong><small>{habit.subtitle || 'Hábito diário'}</small></div><button type="button" aria-label={`Editar ${habit.title}`} title="Editar" onClick={() => startHabitEdit(habit)}><Pencil size={15}/></button><button type="button" className="manager-delete" aria-label={`Excluir ${habit.title}`} title="Excluir" onClick={() => setDeletion({kind:'habit',id:habit.id,title:habit.title})}><Trash2 size={15}/></button></div>; })}</div>
                <form className="manager-form" onSubmit={saveHabit}><strong>{editingHabit ? 'Editar hábito' : 'Novo hábito'}</strong><label>Nome<input required maxLength={60} placeholder="Ex.: Ler 20 páginas" value={habitName} onChange={(e) => setHabitName(e.target.value)}/></label><label>Descrição (opcional)<input maxLength={100} placeholder="Um passo de cada vez" value={habitSubtitle} onChange={(e) => setHabitSubtitle(e.target.value)}/></label><div className="manager-dual-fields"><label>Ícone<select value={habitIcon} onChange={(e) => setHabitIcon(e.target.value as HabitIcon)}>{ICON_CHOICES.map((option) => <option value={option.id} key={option.id}>{option.title}</option>)}</select></label><label>Cor<select value={habitTone} onChange={(e) => setHabitTone(e.target.value as HabitTone)}>{TONE_CHOICES.map((tone) => <option key={tone} value={tone}>{({mint:'Verde',lavender:'Lilás',peach:'Laranja',sky:'Azul',yellow:'Amarelo'} as Record<HabitTone,string>)[tone]}</option>)}</select></label></div><div className="manager-form-actions"><button type="submit" className="btn-primary"><Plus size={17}/>{editingHabit ? 'Salvar alterações' : 'Criar hábito'}</button>{editingHabit ? <button type="button" className="btn-outline" onClick={resetHabitForm}>Cancelar</button> : null}</div></form>
              </section>
              <section className="surface-card manager-panel"><div className="manager-heading"><span className="manager-heading-icon manager-food"><UtensilsCrossed size={21}/></span><div><span className="eyebrow">CHECKLIST FLEXÍVEL</span><h2>Etapas da dieta</h2><p>Personalize suas refeições sem perder a sequência.</p></div><span className="manager-count">{data.mealCatalog.length}</span></div>
                <div className="manager-items">{data.mealCatalog.map((meal) => <div className="manager-item" key={meal.id}><span className="manager-item-icon tone-peach"><UtensilsCrossed size={16}/></span><div><strong>{meal.name}</strong><small>{meal.detail || 'Etapa da dieta'}</small></div><button type="button" aria-label={`Editar ${meal.name}`} title="Editar" onClick={() => startMealEdit(meal)}><Pencil size={15}/></button><button type="button" className="manager-delete" aria-label={`Excluir ${meal.name}`} title="Excluir" onClick={() => setDeletion({kind:'meal',id:meal.id,title:meal.name})}><Trash2 size={15}/></button></div>)}</div>
                <form className="manager-form" onSubmit={saveMeal}><strong>{editingMeal ? 'Editar refeição' : 'Nova etapa'}</strong><label>Nome<input required maxLength={60} placeholder="Ex.: Ceia" value={mealName} onChange={(e) => setMealName(e.target.value)}/></label><label>Descrição (opcional)<input maxLength={100} placeholder="Fechando o dia" value={mealDetail} onChange={(e) => setMealDetail(e.target.value)}/></label><div className="manager-form-actions"><button type="submit" className="btn-primary"><Plus size={17}/>{editingMeal ? 'Salvar alterações' : 'Adicionar etapa'}</button>{editingMeal ? <button type="button" className="btn-outline" onClick={resetMealForm}>Cancelar</button> : null}</div></form>
              </section>
            </div>
            <div className="settings-grid"><section className="surface-card settings-card"><span className="settings-icon tone-yellow"><Clock3 size={22} /></span><h2>Meta di&aacute;ria de estudo</h2><p>O h&aacute;bito de estudar &eacute; marcado como conclu&iacute;do ao atingir a quantidade de minutos definida.</p><label className="settings-field"><span>Minutos de estudo por dia</span><div><input type="number" min="1" max="1440" inputMode="numeric" value={data.settings.studyGoal} onChange={(event) => setData((prev) => ({ ...prev, settings: { studyGoal: Math.round(safeNumber(event.target.value, 1, 1440, 60)) } }))} /><span>min</span></div></label><span className="settings-hint"><Check size={14} /> Sincroniza&ccedil;&atilde;o autom&aacute;tica com Supabase</span></section>
              <section className="surface-card settings-card"><span className="settings-icon tone-mint"><ShieldCheck size={22} /></span><h2>Seus dados na nuvem</h2><p>Com login privado, seus h&aacute;bitos, planos e treinos s&atilde;o guardados no Supabase. O navegador mant&eacute;m uma c&oacute;pia para emerg&ecirc;ncias e sincroniza automaticamente quando h&aacute; conex&atilde;o. Voc&ecirc; tamb&eacute;m pode exportar um backup.</p><div className="settings-actions"><button className="btn-primary" onClick={exportBackup}><Download size={18} /> Exportar backup</button><button className="btn-outline" onClick={() => importInputRef.current?.click()}><Upload size={18} /> Importar backup</button></div><input type="file" accept=".json,application/json" ref={importInputRef} onChange={selectImportFile} hidden /></section>
              <section className="surface-card settings-card danger-card"><span className="settings-icon tone-peach"><RotateCcw size={22} /></span><h2>Recome&ccedil;ar do zero</h2><p>Apague todos os h&aacute;bitos, planos, cargas e hist&oacute;rico, inclusive da nuvem ap&oacute;s a sincroniza&ccedil;&atilde;o.</p><button className="btn-danger" onClick={() => setModal("reset")}><Trash2 size={17} /> Apagar meus dados</button></section>
              <section className="settings-about"><AppLogo /><p>Um lugar para acompanhar o que voc&ecirc; realmente quer construir. Sem distra&ccedil;&otilde;es e sem cobran&ccedil;a.</p><span>RYVMO &middot; v3.0 &middot; Supabase Auth</span><button type="button" className="btn-outline logout-action" onClick={() => void signOut()}><LogOut size={17}/> Sair da conta</button></section></div>
          </>}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Navega\u00e7\u00e3o inferior">{TABS.map((item) => <NavButton key={item.id} compact tab={item} selected={tab === item.id} onClick={() => switchTab(item.id)} />)}</nav>
      {artOpen && <div className="modal-backdrop image-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setArtOpen(null); }}>
        <div className="exercise-modal" role="dialog" aria-modal="true" aria-label={`Como reconhecer ${artOpen.name}`}>
          <div className="exercise-modal-heading"><div><span className="eyebrow">GUIA VISUAL DO EXERCÍCIO</span><h2>{artOpen.name}</h2></div><button type="button" onClick={() => setArtOpen(null)} className="icon-quiet" aria-label="Fechar imagem"><X size={19}/></button></div>
          <img src={exerciseImageUrl(artOpen.imageKey)} alt={`Ilustração do exercício ${artOpen.name}`} />
          {artOpen.instructions ? <p>{artOpen.instructions}</p> : null}
          <small>Ilustração para reconhecer o movimento. Não substitui a demonstração de um profissional.</small>
        </div>
      </div>}
      {toast && <div className="toast" role="status"><span className="toast-check"><Check size={16} /></span>{toast}<button onClick={() => setToast(null)} aria-label="Fechar aviso"><X size={15} /></button></div>}
      {deletion && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeletion(null); }}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-item-title"><span className="modal-icon"><Trash2 size={25}/></span><h2 id="delete-item-title">Excluir {deletion.title}?</h2><p>O item não aparecerá mais na lista, e a pontuação diária será recalculada. Os registros brutos antigos continuarão preservados no backup.</p><div className="modal-actions"><button className="btn-outline" onClick={() => setDeletion(null)}>Cancelar</button><button className="btn-danger" onClick={confirmDelete}><Trash2 size={16}/> Excluir</button></div></div></div>}
      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span className="modal-icon">{modal === "reset" ? <Trash2 size={25} /> : <ArrowDownToLine size={25} />}</span><h2 id="confirm-title">{modal === "reset" ? "Apagar todos os registros?" : "Restaurar este backup?"}</h2><p>{modal === "reset" ? "Esta ação apaga os dados do Supabase e deste navegador após sincronizar. Recomendamos exportar um backup primeiro." : "Os registros atuais ser\u00e3o substitu\u00eddos pelos dados do arquivo escolhido."}</p><div className="modal-actions"><button className="btn-outline" onClick={() => { setModal(null); setPendingImport(null); }}>Cancelar</button><button className={modal === "reset" ? "btn-danger" : "btn-primary"} onClick={confirmModal}>{modal === "reset" ? "Sim, apagar tudo" : "Restaurar dados"}</button></div></div></div>}
    </div>
  );
}
