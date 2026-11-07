"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyData, sanitizeImportedData, STORAGE_KEY } from "@/lib/model";
import type { AppData } from "@/lib/model";

export type CloudStatus = "loading" | "saved" | "saving" | "offline" | "conflict" | "error";
const CACHE_KEY = "ritmo.supabase-cache.v1";

type Snapshot = { data: AppData; revision: number; updatedAt?: string };
type Cache = Snapshot & { dirty: boolean };

function isEmptyApp(data: AppData): boolean {
  return Object.keys(data.days).length === 0 && Object.keys(data.exercises).length === 0 &&
    data.sessions.length === 0 && Object.values(data.plans).every((items) => items.length === 0);
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Cache>;
    if (typeof parsed.revision !== "number" || !Number.isSafeInteger(parsed.revision) || parsed.revision < 0) return null;
    return {
      data: sanitizeImportedData(parsed.data),
      revision: Number(parsed.revision),
      updatedAt: parsed.updatedAt,
      dirty: parsed.dirty === true,
    };
  } catch { return null; }
}

function writeCache(data: AppData, revision: number, dirty: boolean, updatedAt?: string) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, revision, dirty, updatedAt })); }
  catch { /* The cloud remains the canonical store if local storage is unavailable. */ }
}

async function readServer(): Promise<Snapshot> {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "Nao foi possivel carregar o Supabase.");
  }
  const payload = (await response.json()) as Snapshot;
  if (!Number.isSafeInteger(payload.revision)) throw new Error("Revisao do banco invalida.");
  return { data: sanitizeImportedData(payload.data), revision: payload.revision, updatedAt: payload.updatedAt };
}

async function writeServer(data: AppData, expectedRevision: number): Promise<Pick<Snapshot, "revision" | "updatedAt">> {
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, expectedRevision }),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.error === "string" ? payload.error : "Erro de sincronizacao.";
    if (response.status === 409) throw Object.assign(new Error(message), { isConflict: true });
    throw new Error(message);
  }
  const result = (await response.json()) as { revision: number; updatedAt: string };
  if (!Number.isSafeInteger(result.revision) || result.revision <= expectedRevision) throw new Error("Revisao retornada invalida.");
  return result;
}

export function useCloudStore() {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<CloudStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const liveData = useRef(data);
  liveData.current = data;
  const revision = useRef(0);
  const changeNumber = useRef(0);
  const readyRef = useRef(false);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const conflicted = useRef(false);
  const skipNextChange = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!readyRef.current || !dirty.current || inFlight.current || conflicted.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      setError("Sem conexao. Seus registros estao pendentes neste aparelho.");
      return;
    }

    const snapshot = liveData.current;
    const generation = changeNumber.current;
    const baseRevision = revision.current;
    inFlight.current = true;
    setStatus("saving");
    let saveAgain = false;
    try {
      const result = await writeServer(snapshot, baseRevision);
      revision.current = result.revision;
      if (changeNumber.current === generation) {
        dirty.current = false;
        writeCache(liveData.current, revision.current, false, result.updatedAt);
        setStatus("saved");
      } else {
        saveAgain = true;
        writeCache(liveData.current, revision.current, true, result.updatedAt);
      }
      setError(null);
    } catch (cause) {
      const isConflict = Boolean(cause && typeof cause === "object" && "isConflict" in cause);
      if (isConflict) conflicted.current = true;
      setStatus(isConflict ? "conflict" : "offline");
      setError(cause instanceof Error ? cause.message : "Erro ao salvar dados.");
      writeCache(liveData.current, revision.current, true);
    } finally {
      inFlight.current = false;
      if (saveAgain && !conflicted.current) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => { void flush(); }, 120);
      }
    }
  }, []);

  const refreshFromCloud = useCallback(async () => {
    if (!readyRef.current || dirty.current || inFlight.current || conflicted.current) return;
    try {
      const remote = await readServer();
      // A user edit could occur while the GET request is in progress.
      if (dirty.current || inFlight.current || conflicted.current) return;
      if (remote.revision > revision.current) {
        revision.current = remote.revision;
        skipNextChange.current = true;
        liveData.current = remote.data;
        setData(remote.data);
        writeCache(remote.data, remote.revision, false, remote.updatedAt);
      }
      setStatus("saved");
      setError(null);
    } catch (cause) {
      setStatus("offline");
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar dados.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const cache = readCache();
      try {
        const remote = await readServer();
        if (!active) return;
        let initial = remote.data;
        let initialRevision = remote.revision;
        let needsSync = false;
        let conflict = false;
        if (cache?.dirty) {
          initial = cache.data;
          initialRevision = cache.revision;
          needsSync = true;
          conflict = cache.revision !== remote.revision;
        } else if (!cache && isEmptyApp(remote.data)) {
          // Upgrade from the previous local-only version, if present.
          try {
            const legacy = localStorage.getItem(STORAGE_KEY);
            if (legacy) {
              const imported = sanitizeImportedData(JSON.parse(legacy));
              if (!isEmptyApp(imported)) {
                initial = imported;
                needsSync = true;
              }
            }
          } catch { /* Invalid legacy data must not overwrite remote data. */ }
        }
        revision.current = initialRevision;
        dirty.current = needsSync;
        conflicted.current = conflict;
        skipNextChange.current = true;
        liveData.current = initial;
        setData(initial);
        writeCache(initial, initialRevision, needsSync, remote.updatedAt);
        readyRef.current = true;
        setReady(true);
        setStatus(conflict ? "conflict" : needsSync ? "saving" : "saved");
        setError(conflict ? "Alteracoes pendentes deste aparelho conflitam com a versao da nuvem." : null);
        if (needsSync && !conflict) setTimeout(() => { if (active) void flush(); }, 250);
      } catch (cause) {
        if (!active) return;
        if (cache) {
          revision.current = cache.revision;
          dirty.current = cache.dirty;
          skipNextChange.current = true;
          liveData.current = cache.data;
          setData(cache.data);
          readyRef.current = true;
          setReady(true);
          setStatus("offline");
          setError("Sem acesso ao Supabase. Os dados em cache estao disponiveis, mas talvez nao estejam atualizados.");
        } else {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : "Nao foi possivel carregar os dados.");
        }
      }
    };
    void initialize();
    return () => { active = false; };
  }, [flush]);

  useEffect(() => {
    if (!ready) return;
    if (skipNextChange.current) { skipNextChange.current = false; return; }
    dirty.current = true;
    changeNumber.current += 1;
    writeCache(data, revision.current, true);
    setStatus(conflicted.current ? "conflict" : "saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush(); }, 550);
  }, [data, ready, flush]);

  useEffect(() => {
    const sync = () => {
      if (!readyRef.current) return;
      if (dirty.current) void flush();
      else void refreshFromCloud();
    };
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CACHE_KEY || !event.newValue || dirty.current || inFlight.current) return;
      const cache = readCache();
      if (cache && !cache.dirty && cache.revision > revision.current) {
        revision.current = cache.revision;
        skipNextChange.current = true;
        liveData.current = cache.data;
        setData(cache.data);
        setStatus("saved");
      }
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && !dirty.current && !inFlight.current) void refreshFromCloud();
    }, 60_000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [flush, refreshFromCloud]);

  const retry = useCallback(() => {
    if (!readyRef.current) { window.location.reload(); return; }
    if (conflicted.current) return;
    if (dirty.current) void flush();
    else void refreshFromCloud();
  }, [flush, refreshFromCloud]);

  const loadCloudVersion = useCallback(async () => {
    try {
      const remote = await readServer();
      revision.current = remote.revision;
      conflicted.current = false;
      dirty.current = false;
      skipNextChange.current = true;
      liveData.current = remote.data;
      setData(remote.data);
      writeCache(remote.data, remote.revision, false, remote.updatedAt);
      setStatus("saved");
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro ao abrir nuvem."); }
  }, []);

  const keepDeviceVersion = useCallback(async () => {
    if (!conflicted.current) return;
    setStatus("saving");
    try {
      const remote = await readServer();
      const generation = changeNumber.current;
      const snapshot = liveData.current;
      const result = await writeServer(snapshot, remote.revision);
      revision.current = result.revision;
      conflicted.current = false;
      if (changeNumber.current === generation) {
        dirty.current = false;
        writeCache(liveData.current, revision.current, false, result.updatedAt);
        setStatus("saved");
      } else {
        dirty.current = true;
        writeCache(liveData.current, revision.current, true, result.updatedAt);
        void flush();
      }
      setError(null);
    } catch (cause) {
      setStatus("conflict");
      setError(cause instanceof Error ? cause.message : "Conflito ao salvar.");
    }
  }, [flush]);

  return { data, setData, ready, status, error, retry, loadCloudVersion, keepDeviceVersion };
}
