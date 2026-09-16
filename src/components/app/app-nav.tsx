"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Ellipsis,
  FileText,
  Link2,
  Lock,
  Megaphone,
  MessageCircle,
  Palette,
  PlusCircle,
  Scissors,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { planHasFeature, type PlanFeature } from "@/lib/billing/plans";

type NavItem = {
  href: string;
  label: string;
  icon: typeof CalendarDays;
  feature?: PlanFeature;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const ITEMS = {
  agenda: { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  novo: { href: "/app/novo", label: "Novo", icon: PlusCircle },
  link: { href: "/app/link", label: "Link", icon: Link2 },
  equipe: { href: "/app/equipe", label: "Equipe", icon: UserRound },
  servicos: { href: "/app/servicos", label: "Serviços", icon: Scissors },
  clientes: { href: "/app/clientes", label: "Clientes", icon: Users },
  mensalistas: {
    href: "/app/mensalistas",
    label: "Mensalistas",
    icon: BadgeCheck,
    feature: "memberships",
  },
  campanhas: {
    href: "/app/campanhas",
    label: "Campanhas",
    icon: Megaphone,
    feature: "campaigns",
  },
  temas: {
    href: "/app/temas",
    label: "Temas",
    icon: Palette,
    feature: "themes",
  },
  whatsapp: { href: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  templates: { href: "/app/templates", label: "Templates", icon: FileText },
  alertas: { href: "/app/notificacoes", label: "Alertas", icon: Bell },
  financeiro: { href: "/app/financeiro", label: "Financeiro", icon: Wallet },
  relatorios: { href: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
  plano: { href: "/app/assinatura", label: "Plano", icon: CreditCard },
  config: { href: "/app/configuracoes", label: "Config", icon: Settings },
} satisfies Record<string, NavItem>;

const GROUPS: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [ITEMS.agenda, ITEMS.novo, ITEMS.link],
  },
  {
    id: "casa",
    label: "Casa",
    items: [ITEMS.equipe, ITEMS.servicos, ITEMS.clientes],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    items: [ITEMS.mensalistas, ITEMS.campanhas, ITEMS.temas],
  },
  {
    id: "comunicacao",
    label: "Comunicação",
    items: [ITEMS.whatsapp, ITEMS.templates, ITEMS.alertas],
  },
  {
    id: "conta",
    label: "Conta",
    items: [ITEMS.financeiro, ITEMS.relatorios, ITEMS.plano, ITEMS.config],
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  ITEMS.agenda,
  ITEMS.novo,
  ITEMS.link,
  ITEMS.clientes,
];

const MORE_GROUPS: NavGroup[] = GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) => !BOTTOM_ITEMS.includes(item)),
})).filter((group) => group.items.length > 0);

const DEFAULT_OPEN = new Set(["operacao", "casa"]);
const STORAGE_KEY = "talkey:nav-groups";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--copper)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lead)]";

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function readStored(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    /* localStorage indisponível */
    return {};
  }
}

type Props = { variant: "bottom" | "side"; plan?: string };

export function AppNav({ variant, plan = "trial" }: Props) {
  const pathname = usePathname();
  const [stored, setStored] = useState<Record<string, boolean>>({});
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setStored(readStored());
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const hasCurrent = (group: NavGroup) =>
    group.items.some((item) => isCurrent(pathname, item.href));

  const isOpen = (group: NavGroup) =>
    stored[group.id] ?? (DEFAULT_OPEN.has(group.id) || hasCurrent(group));

  const toggle = (group: NavGroup) => {
    const next = { ...stored, [group.id]: !isOpen(group) };
    setStored(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* localStorage indisponível */
    }
  };

  if (variant === "bottom") {
    const moreCurrent = !BOTTOM_ITEMS.some((item) =>
      isCurrent(pathname, item.href),
    );

    return (
      <>
        {moreOpen ? (
          <>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMoreOpen(false)}
              className="absolute inset-x-0 bottom-full h-[100dvh] bg-[color-mix(in_srgb,var(--graphite)_75%,transparent)]"
            />
            <div
              id="app-nav-mais"
              className="absolute inset-x-0 bottom-full max-h-[68dvh] overflow-y-auto border-t border-[var(--border)] bg-[var(--lead)] px-2 pb-3 pt-2"
            >
              <div className="flex items-center justify-between px-2 pb-1">
                <p className="text-xs font-semibold text-[var(--steel)]">
                  Todas as seções
                </p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Fechar menu"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-[var(--steel)]",
                    FOCUS_RING,
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {MORE_GROUPS.map((group) => (
                <div key={group.id} className="pb-2">
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold text-[var(--steel)]/80">
                    {group.label}
                  </p>
                  <ul className="grid grid-cols-2 gap-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <NavLink
                          item={item}
                          plan={plan}
                          pathname={pathname}
                          onNavigate={() => setMoreOpen(false)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
            const current = isCurrent(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium",
                    FOCUS_RING,
                    current
                      ? "text-[var(--copper)]"
                      : "text-[var(--steel)] active:text-[var(--offwhite)]",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={current ? 2.4 : 2} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-controls="app-nav-mais"
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium",
                FOCUS_RING,
                moreOpen || moreCurrent
                  ? "text-[var(--copper)]"
                  : "text-[var(--steel)] active:text-[var(--offwhite)]",
              )}
            >
              {moreOpen ? (
                <X className="h-5 w-5" strokeWidth={2.4} />
              ) : (
                <Ellipsis
                  className="h-5 w-5"
                  strokeWidth={moreCurrent ? 2.4 : 2}
                />
              )}
              Mais
            </button>
          </li>
        </ul>
      </>
    );
  }

  return (
    <nav
      aria-label="Seções do painel"
      className="sticky top-20 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-2"
    >
      {GROUPS.map((group, index) => {
        const open = isOpen(group);
        return (
          <div
            key={group.id}
            className={
              index > 0
                ? "mt-1 border-t border-[color-mix(in_srgb,var(--steel)_18%,transparent)] pt-1"
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => toggle(group)}
              aria-expanded={open}
              aria-controls={`nav-group-${group.id}`}
              className={cn(
                "flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[11px] font-semibold tracking-wide text-[var(--steel)] transition hover:text-[var(--offwhite)]",
                FOCUS_RING,
              )}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform",
                  open ? undefined : "-rotate-90",
                )}
                aria-hidden
              />
              <span className="flex-1">{group.label}</span>
              {!open && hasCurrent(group) ? (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--copper)]"
                  aria-hidden
                />
              ) : null}
            </button>
            <ul
              id={`nav-group-${group.id}`}
              hidden={!open}
              className="space-y-0.5 pb-1"
            >
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} plan={plan} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function NavLink({
  item,
  plan,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  plan: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon, feature } = item;
  const locked = Boolean(feature && !planHasFeature(plan, feature));
  const target = locked
    ? `/app/assinatura?upgrade=1&feature=${feature}`
    : href;
  const current = !locked && isCurrent(pathname, href);

  return (
    <Link
      href={target}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      title={locked ? "Disponível no plano Pro" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
        FOCUS_RING,
        current
          ? "bg-[var(--brand-soft)] text-[var(--copper)]"
          : locked
            ? "text-[var(--steel)]/70 hover:bg-[var(--surface-2)]"
            : "text-[var(--steel)] hover:bg-[var(--surface-2)] hover:text-[var(--offwhite)]",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {locked ? <Lock className="h-3.5 w-3.5 opacity-70" /> : null}
    </Link>
  );
}
