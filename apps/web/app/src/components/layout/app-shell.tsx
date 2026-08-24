"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  BarChart3,
  Bell,
  Bot,
  Grid2X2,
  Leaf,
  ListPlus,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Target,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { clearStoredSession } from "../../lib/api";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: ComponentType<{
    className?: string;
  }>;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Grid2X2,
  },
  {
    label: "Lançamentos",
    href: "/entries",
    icon: ReceiptText,
  },
  {
    label: "Contas",
    href: "/accounts",
    icon: WalletCards,
  },
  {
    label: "Categorias",
    href: "/categories",
    icon: ListPlus,
  },
  {
    label: "Orçamentos",
    href: "/budgets",
    icon: PiggyBank,
  },
  {
    label: "Metas",
    href: "/goals",
    icon: Target,
  },
  {
    label: "Relatórios",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Análises com IA",
    href: "/ai",
    icon: Bot,
  },
];

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] =
    useState(false);
  const [user, setUser] =
    useState<StoredUser | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser =
        window.localStorage.getItem("user") ??
        window.sessionStorage.getItem("user");

      if (!storedUser) {
        return;
      }

      try {
        setUser(
          JSON.parse(storedUser) as StoredUser,
        );
      } catch {
        setUser(null);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-dvh bg-[#f2f5f2] text-[#17211c]">
      <DesktopSidebar
        pathname={pathname}
        user={user}
      />

      <AnimatePresence>
        {sidebarOpen && (
          <MobileSidebar
            pathname={pathname}
            user={user}
            onClose={() =>
              setSidebarOpen(false)
            }
          />
        )}
      </AnimatePresence>

      <div className="min-h-dvh lg:pl-[272px]">
        <AppHeader
          onOpenMenu={() =>
            setSidebarOpen(true)
          }
        />
        {children}
      </div>

      <MobileBottomNavigation
        pathname={pathname}
        hidden={sidebarOpen}
        onOpenMenu={() =>
          setSidebarOpen(true)
        }
      />
    </div>
  );
}

function DesktopSidebar({
  pathname,
  user,
}: {
  pathname: string;
  user: StoredUser | null;
}) {
  return (
    <aside
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#073c2b] via-[#084b35] to-[#063524] px-5 py-6 text-white lg:flex"
    >
      <SidebarDecoration />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Logo />

        <nav className="mt-8 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.label}
              item={item}
              active={isRouteActive(
                pathname,
                item.href,
              )}
            />
          ))}
        </nav>

        <div className="mt-5 shrink-0">
          <UserCard user={user} />
        </div>
      </div>
    </aside>
  );
}

function MobileSidebar({
  pathname,
  user,
  onClose,
}: {
  pathname: string;
  user: StoredUser | null;
  onClose: () => void;
}) {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Fechar menu"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[#031b12]/60 backdrop-blur-sm lg:hidden"
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Navegação principal"
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 34,
        }}
        className="fixed inset-y-0 left-0 z-[60] flex w-[86%] max-w-[320px] flex-col overflow-hidden bg-gradient-to-b from-[#073c2b] to-[#063524] px-5 py-6 text-white shadow-2xl lg:hidden"
      >
        <SidebarDecoration />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-4">
            <Logo />

            <button
              type="button"
              aria-label="Fechar menu"
              autoFocus
              onClick={onClose}
              className="flex size-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72eca7] active:scale-95"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-8 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {navigationItems.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                active={isRouteActive(
                  pathname,
                  item.href,
                )}
                onNavigate={onClose}
              />
            ))}
          </nav>

          <div className="mt-5 shrink-0">
            <UserCard user={user} />
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function SidebarItem({
  item,
  active,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const className = `
    group flex min-h-12 w-full
    items-center gap-3 rounded-2xl px-4
    text-sm font-medium transition duration-200
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-[#72eca7]
    ${
      active
        ? "bg-[#168254] text-white shadow-[0_12px_30px_rgba(0,0,0,0.14)]"
        : "text-white/70 hover:bg-white/[0.08] hover:text-white"
    }
  `;

  const content = (
    <>
      <Icon
        className={`size-5 shrink-0 transition-transform group-hover:scale-105 ${
          active
            ? "text-white"
            : "text-white/60"
        }`}
      />
      <span className="min-w-0 flex-1 truncate text-left">
        {item.label}
      </span>

      {active ? (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-[#8af1b7]"
        />
      ) : null}
    </>
  );

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={className}
    >
      {content}
    </Link>
  );
}

function AppHeader({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe6e1]/80 bg-[#f2f5f2]/88 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="relative mx-auto flex h-12 max-w-[1600px] items-center gap-3">
        <button
          type="button"
          aria-label="Abrir menu principal"
          onClick={onOpenMenu}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#d9e2db] bg-white text-[#0c4f38] shadow-sm transition hover:border-[#bcd6c6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24b46b]/15 active:scale-95 lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <Link
          href="/dashboard"
          aria-label="Finance AI, ir para o dashboard"
          className="absolute left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-xl text-[#0c4f38] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24b46b]/15 sm:hidden"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#1eaf69] text-white shadow-sm">
            <Leaf className="size-4" />
          </span>
          <span className="text-sm font-bold tracking-[-0.035em]">
            Financ<span className="text-[#15935b]">AI</span>
          </span>
        </Link>

        <div className="relative hidden max-w-xl flex-1 sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#87928b]" />

          <input
            type="search"
            readOnly
            aria-label="Busca global, disponível em breve"
            title="Busca global disponível em breve"
            placeholder="Busca global em breve"
            className="min-h-11 w-full cursor-default rounded-2xl border border-[#dbe4dd] bg-white/75 pl-11 pr-4 text-sm outline-none placeholder:text-[#98a29c] focus:border-[#6db98c] focus:ring-4 focus:ring-[#24b46b]/10"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled
            aria-label="Notificações, disponíveis em breve"
            title="Notificações disponíveis em breve"
            className="relative hidden size-11 items-center justify-center rounded-2xl border border-[#dbe4dd] bg-white text-[#69766e] shadow-sm disabled:cursor-not-allowed disabled:opacity-65 sm:flex"
          >
            <Bell className="size-5" />
          </button>

          <Link
            href="/entries/new"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0c4f38] to-[#148457] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(12,79,56,0.2)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#24b46b]/20 active:translate-y-0 active:scale-[0.98] sm:inline-flex"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">
              Novo lançamento
            </span>
            <span className="sm:hidden">Novo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileBottomNavigation({
  pathname,
  hidden,
  onOpenMenu,
}: {
  pathname: string;
  hidden: boolean;
  onOpenMenu: () => void;
}) {
  const primaryAction =
    getMobilePrimaryAction(pathname);
  const moreSectionActive = [
    "/categories",
    "/budgets",
    "/goals",
    "/reports",
    "/ai",
  ].some((href) =>
    isRouteActive(pathname, href),
  );

  if (hidden) {
    return null;
  }

  return (
    <nav
      aria-label="Navegação rápida"
      className="fixed inset-x-3 bottom-3 z-40 grid h-[70px] grid-cols-5 items-center rounded-[1.5rem] border border-white/60 bg-[#073c2b]/95 px-2 text-white shadow-[0_20px_60px_rgba(5,42,28,0.30)] backdrop-blur-xl lg:hidden"
    >
      <MobileNavLink
        href="/dashboard"
        label="Início"
        icon={Grid2X2}
        active={isRouteActive(
          pathname,
          "/dashboard",
        )}
      />

      <MobileNavLink
        href="/entries"
        label="Lançamentos"
        icon={ReceiptText}
        active={isRouteActive(
          pathname,
          "/entries",
        )}
      />

      <div className="relative flex justify-center">
        <Link
          href={primaryAction.href}
          aria-label={primaryAction.label}
          className="absolute -top-9 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#21c875] to-[#14935b] text-white shadow-[0_16px_34px_rgba(33,200,117,0.38)] ring-4 ring-[#f2f5f2] transition focus-visible:outline-none focus-visible:ring-[6px] focus-visible:ring-[#96e8b8] active:scale-95"
        >
          <Plus className="size-7" />
        </Link>
      </div>

      <MobileNavLink
        href="/accounts"
        label="Contas"
        icon={WalletCards}
        active={isRouteActive(
          pathname,
          "/accounts",
        )}
      />

      <button
        type="button"
        aria-label="Abrir todos os módulos"
        aria-pressed={moreSectionActive}
        onClick={onOpenMenu}
        className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72eca7] ${
          moreSectionActive
            ? "bg-white/[0.08] text-[#67eca2]"
            : "text-white/60"
        }`}
      >
        <Menu className="size-5" />
        Mais
      </button>
    </nav>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72eca7] ${
        active
          ? "bg-white/[0.08] text-[#67eca2]"
          : "text-white/55 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}

function Logo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72eca7]"
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-[#28bd70] shadow-[0_14px_35px_rgba(36,180,107,0.25)]">
        <Leaf className="size-6 text-white" />
      </div>

      <span className="text-2xl font-bold tracking-[-0.05em]">
        Financ
        <span className="text-[#69eda4]">AI</span>
      </span>
    </Link>
  );
}

function UserCard({
  user,
}: {
  user: StoredUser | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#87efb5]">
        <UserRound className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {user?.name ?? "Minha conta"}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/50">
          {user?.email ?? "Sessão financeira"}
        </p>
      </div>

      <button
        type="button"
        aria-label="Sair da conta"
        title="Sair da conta"
        onClick={() => {
          clearStoredSession();
          window.location.replace("/login");
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72eca7] active:scale-95"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function SidebarDecoration() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-28 size-[28rem] rounded-full border border-white/10"
      />
    </>
  );
}

function isRouteActive(
  pathname: string,
  href: string,
) {
  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function getMobilePrimaryAction(pathname: string) {
  if (isRouteActive(pathname, "/accounts")) {
    return {
      href: "/accounts/new",
      label: "Adicionar conta",
    };
  }

  if (isRouteActive(pathname, "/categories")) {
    return {
      href: "/categories/new",
      label: "Adicionar categoria",
    };
  }

  if (isRouteActive(pathname, "/budgets")) {
    return {
      href: "/budgets/new",
      label: "Adicionar orçamento",
    };
  }

  if (isRouteActive(pathname, "/goals")) {
    return {
      href: "/goals/new",
      label: "Adicionar meta",
    };
  }

  return {
    href: "/entries/new",
    label: "Adicionar lançamento",
  };
}
