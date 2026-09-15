"use client";

import { useCallback, useEffect, useState } from "react";

type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

type Rule = {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
  isActive: boolean;
};

type Exception = {
  id: string;
  date: string;
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

type StaffRow = {
  id: string;
  displayName: string;
  bio: string | null;
  color: string | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  sortOrder: number;
  serviceIds: string[];
  rules: Rule[];
  exceptionCount: number;
  bookingCount: number;
};

type ServiceOpt = { id: string; name: string; isActive: boolean };

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sáb" },
  { value: "SUN", label: "Dom" },
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function StaffBoard() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    color: "#C4A35A",
    status: "ACTIVE" as StaffRow["status"],
    serviceIds: [] as string[],
  });
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [exForm, setExForm] = useState({
    date: "",
    isDayOff: true,
    startTime: "09:00",
    endTime: "13:00",
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"perfil" | "horarios" | "folgas">("perfil");

  const load = useCallback(async () => {
    setLoading(true);
    const [staffRes, svcRes] = await Promise.all([
      fetch("/api/app/staff"),
      fetch("/api/app/services"),
    ]);
    const staffData = await staffRes.json();
    const svcData = await svcRes.json();
    setRows(staffData.staff ?? []);
    setServices(svcData.services ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setSelectedId(null);
    setCreating(true);
    setTab("perfil");
    setForm({
      displayName: "",
      bio: "",
      color: "#C4A35A",
      status: "ACTIVE",
      serviceIds: services.filter((s) => s.isActive).map((s) => s.id),
    });
    setRules([]);
    setExceptions([]);
    setError(null);
  };

  const openEdit = async (id: string) => {
    setCreating(false);
    setSelectedId(id);
    setTab("perfil");
    setError(null);
    const res = await fetch(`/api/app/staff/${id}`);
    const data = await res.json();
    const s = data.staff;
    if (!s) return;
    setForm({
      displayName: s.displayName,
      bio: s.bio ?? "",
      color: s.color ?? "#C4A35A",
      status: s.status,
      serviceIds: s.serviceIds ?? [],
    });
    setRules(
      (s.rules ?? []).map((r: Rule) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        breakStart: r.breakStart,
        breakEnd: r.breakEnd,
        isActive: r.isActive,
      })),
    );
    setExceptions(s.exceptions ?? []);
  };

  const close = () => {
    setCreating(false);
    setSelectedId(null);
    setError(null);
  };

  const toggleService = (id: string) => {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }));
  };

  const toggleDay = (day: DayOfWeek) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.dayOfWeek === day);
      if (exists) return prev.filter((r) => r.dayOfWeek !== day);
      return [
        ...prev,
        {
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "19:00",
          breakStart: "12:00",
          breakEnd: "13:00",
          isActive: true,
        },
      ];
    });
  };

  const updateRule = (day: DayOfWeek, patch: Partial<Rule>) => {
    setRules((prev) =>
      prev.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)),
    );
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      displayName: form.displayName,
      bio: form.bio,
      color: form.color,
      status: form.status,
      serviceIds: form.serviceIds,
    };

    const res = selectedId
      ? await fetch(`/api/app/staff/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/app/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar o perfil");
      return;
    }

    if (!selectedId) {
      const data = await res.json();
      await load();
      if (data.staff?.id) await openEdit(data.staff.id);
      return;
    }
    await load();
  };

  const saveRules = async () => {
    if (!selectedId) {
      setError("Salve o perfil antes de definir horários");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/app/staff/${selectedId}/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          breakStart: r.breakStart || null,
          breakEnd: r.breakEnd || null,
          isActive: r.isActive,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Horários inválidos — confira início, fim e intervalo");
      return;
    }
    await openEdit(selectedId);
    await load();
  };

  const addException = async () => {
    if (!selectedId || !exForm.date) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/app/staff/${selectedId}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: exForm.date,
        isDayOff: exForm.isDayOff,
        startTime: exForm.isDayOff ? null : exForm.startTime,
        endTime: exForm.isDayOff ? null : exForm.endTime,
        reason: exForm.reason,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar a folga/exceção");
      return;
    }
    setExForm({
      date: "",
      isDayOff: true,
      startTime: "09:00",
      endTime: "13:00",
      reason: "",
    });
    await openEdit(selectedId);
  };

  const removeException = async (exceptionId: string) => {
    if (!selectedId) return;
    await fetch(
      `/api/app/staff/${selectedId}/exceptions?exceptionId=${exceptionId}`,
      { method: "DELETE" },
    );
    await openEdit(selectedId);
  };

  const deactivate = async () => {
    if (!selectedId) return;
    await fetch(`/api/app/staff/${selectedId}`, { method: "DELETE" });
    close();
    await load();
  };

  const modalOpen = creating || selectedId;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openCreate}
        className="rounded-xl bg-[var(--copper)] px-4 py-2.5 text-sm font-semibold text-[var(--graphite)]"
      >
        Novo barbeiro
      </button>

      {loading ? (
        <p className="text-sm text-[var(--steel)]">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--steel)]">
          Nenhuma pessoa na equipe. Cadastre barbeiros e defina os horários —
          sem isso o público não vê slots.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => void openEdit(s.id)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: s.color ?? "var(--copper)" }}
                    />
                    {s.displayName}
                    {s.status !== "ACTIVE" ? (
                      <span className="ml-2 text-xs text-[var(--steel)]">
                        {s.status === "INACTIVE" ? "inativo" : "afastado"}
                      </span>
                    ) : null}
                  </p>
                  <span className="text-xs text-[var(--steel)]">
                    {s.rules.length} dia{s.rules.length === 1 ? "" : "s"} ·{" "}
                    {s.serviceIds.length} serviço
                    {s.serviceIds.length === 1 ? "" : "s"}
                  </span>
                </div>
                {s.rules.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-300/90">
                    Sem horários — não aparece no agendamento
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--graphite)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {creating ? "Novo barbeiro" : form.displayName || "Equipe"}
              </h2>
              <button
                type="button"
                className="text-sm text-[var(--steel)]"
                onClick={close}
              >
                Fechar
              </button>
            </div>

            <div className="mb-4 flex gap-1 rounded-xl bg-[var(--lead)] p-1">
              {(
                [
                  ["perfil", "Perfil"],
                  ["horarios", "Horários"],
                  ["folgas", "Folgas"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={creating && key !== "perfil"}
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium disabled:opacity-40 ${
                    tab === key
                      ? "bg-[var(--brand-soft)] text-[var(--copper)]"
                      : "text-[var(--steel)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "perfil" ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
                    Nome de exibição
                  </span>
                  <input
                    className={`${inputClass} mt-1`}
                    value={form.displayName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, displayName: e.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
                    Bio
                  </span>
                  <textarea
                    className={`${inputClass} mt-1`}
                    rows={2}
                    value={form.bio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bio: e.target.value }))
                    }
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
                      Cor
                    </span>
                    <input
                      type="color"
                      className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--graphite)]"
                      value={form.color}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, color: e.target.value }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
                      Status
                    </span>
                    <select
                      className={`${inputClass} mt-1`}
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as StaffRow["status"],
                        }))
                      }
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                      <option value="ON_LEAVE">Afastado</option>
                    </select>
                  </label>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--steel)]">
                    Serviços que realiza
                  </p>
                  {services.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--steel)]">
                      Cadastre serviços em Serviços primeiro.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {services.map((svc) => (
                        <li key={svc.id}>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.serviceIds.includes(svc.id)}
                              onChange={() => toggleService(svc.id)}
                            />
                            {svc.name}
                            {!svc.isActive ? (
                              <span className="text-xs text-[var(--steel)]">
                                (inativo)
                              </span>
                            ) : null}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveProfile()}
                  className="rounded-lg bg-[var(--copper)] px-3 py-2 text-sm font-medium text-[var(--graphite)] disabled:opacity-50"
                >
                  {saving ? "Salvando…" : "Salvar perfil"}
                </button>
                {selectedId ? (
                  <button
                    type="button"
                    onClick={() => void deactivate()}
                    className="ml-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--steel)]"
                  >
                    Desativar
                  </button>
                ) : null}
              </div>
            ) : null}

            {tab === "horarios" ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--steel)]">
                  Marque os dias e ajuste o expediente. Sem horários, o barbeiro
                  não gera slots.
                </p>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((d) => {
                    const on = rules.some((r) => r.dayOfWeek === d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                          on
                            ? "bg-[var(--copper)] text-[var(--graphite)]"
                            : "border border-[var(--border)] text-[var(--steel)]"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {rules
                  .slice()
                  .sort(
                    (a, b) =>
                      DAYS.findIndex((d) => d.value === a.dayOfWeek) -
                      DAYS.findIndex((d) => d.value === b.dayOfWeek),
                  )
                  .map((r) => (
                    <div
                      key={r.dayOfWeek}
                      className="rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3"
                    >
                      <p className="mb-2 text-sm font-medium">
                        {DAYS.find((d) => d.value === r.dayOfWeek)?.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-xs text-[var(--steel)]">
                          Início
                          <input
                            type="time"
                            className={`${inputClass} mt-1`}
                            value={r.startTime}
                            onChange={(e) =>
                              updateRule(r.dayOfWeek, {
                                startTime: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-[var(--steel)]">
                          Fim
                          <input
                            type="time"
                            className={`${inputClass} mt-1`}
                            value={r.endTime}
                            onChange={(e) =>
                              updateRule(r.dayOfWeek, {
                                endTime: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-[var(--steel)]">
                          Intervalo início
                          <input
                            type="time"
                            className={`${inputClass} mt-1`}
                            value={r.breakStart ?? ""}
                            onChange={(e) =>
                              updateRule(r.dayOfWeek, {
                                breakStart: e.target.value || null,
                              })
                            }
                          />
                        </label>
                        <label className="text-xs text-[var(--steel)]">
                          Intervalo fim
                          <input
                            type="time"
                            className={`${inputClass} mt-1`}
                            value={r.breakEnd ?? ""}
                            onChange={(e) =>
                              updateRule(r.dayOfWeek, {
                                breakEnd: e.target.value || null,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveRules()}
                  className="rounded-lg bg-[var(--copper)] px-3 py-2 text-sm font-medium text-[var(--graphite)] disabled:opacity-50"
                >
                  {saving ? "Salvando…" : "Salvar horários"}
                </button>
              </div>
            ) : null}

            {tab === "folgas" ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3 space-y-2">
                  <label className="block text-xs text-[var(--steel)]">
                    Data
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      value={exForm.date}
                      onChange={(e) =>
                        setExForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={exForm.isDayOff}
                      onChange={(e) =>
                        setExForm((f) => ({
                          ...f,
                          isDayOff: e.target.checked,
                        }))
                      }
                    />
                    Folga o dia inteiro
                  </label>
                  {!exForm.isDayOff ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        className={inputClass}
                        value={exForm.startTime}
                        onChange={(e) =>
                          setExForm((f) => ({
                            ...f,
                            startTime: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="time"
                        className={inputClass}
                        value={exForm.endTime}
                        onChange={(e) =>
                          setExForm((f) => ({
                            ...f,
                            endTime: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  <input
                    placeholder="Motivo (opcional)"
                    className={inputClass}
                    value={exForm.reason}
                    onChange={(e) =>
                      setExForm((f) => ({ ...f, reason: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    disabled={saving || !exForm.date}
                    onClick={() => void addException()}
                    className="rounded-lg bg-[var(--copper)] px-3 py-2 text-sm font-medium text-[var(--graphite)] disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
                <ul className="space-y-2">
                  {exceptions.map((ex) => (
                    <li
                      key={ex.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--lead)] p-2 text-sm"
                    >
                      <span>
                        {ex.date} ·{" "}
                        {ex.isDayOff
                          ? "Folga"
                          : `${ex.startTime}–${ex.endTime}`}
                        {ex.reason ? ` · ${ex.reason}` : ""}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-[var(--steel)]"
                        onClick={() => void removeException(ex.id)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
