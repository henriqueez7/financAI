"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { api } from "../src/lib/api";

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

interface ApiErrorResponse {
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [rememberMe, setRememberMe] =
    useState(true);

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Informe seu e-mail.");
      return;
    }

    if (!password) {
      setErrorMessage("Informe sua senha.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "A senha deve possuir pelo menos 6 caracteres.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const response =
        await api<LoginResponse>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        });

      const storage = rememberMe
        ? window.localStorage
        : window.sessionStorage;

      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");

      window.sessionStorage.removeItem("token");
      window.sessionStorage.removeItem("user");

      storage.setItem("token", response.token);

      storage.setItem(
        "user",
        JSON.stringify(response.user),
      );

      setSuccessMessage(
        `Bem-vindo, ${response.user.name}!`,
      );

      await new Promise((resolve) => {
        window.setTimeout(resolve, 700);
      });

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      className="
        relative min-h-dvh overflow-x-hidden
        bg-[#f4f6f3]
        lg:h-dvh lg:overflow-hidden
      "
    >
      <BackgroundDecoration />

      <div
        className="
          relative mx-auto grid min-h-dvh
          max-w-[1600px]
          lg:h-full lg:min-h-0
          lg:grid-cols-[1.05fr_0.95fr]
        "
      >
        <HeroSection />

        <section
          className="
            flex min-h-dvh items-center justify-center
            overflow-y-auto px-5 py-6
            sm:px-8
            lg:h-full lg:min-h-0
            lg:px-10 lg:py-4
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 24,
              scale: 0.985,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full max-w-md"
          >
            <MobileLogo />

            <div
              className="
                rounded-[2rem]
                border border-[#dbe4dd]
                bg-white/90 p-6
                shadow-[0_24px_70px_rgba(20,55,38,0.10)]
                backdrop-blur-xl
                sm:p-7
              "
            >
              <LoginHeading />

              <AnimatePresence mode="wait">
                {errorMessage && (
                  <FeedbackMessage
                    key="error"
                    variant="error"
                    message={errorMessage}
                  />
                )}

                {successMessage && (
                  <FeedbackMessage
                    key="success"
                    variant="success"
                    message={successMessage}
                  />
                )}
              </AnimatePresence>

              <form
                className="mt-6 space-y-4"
                onSubmit={handleSubmit}
                noValidate
              >
                <div>
                  <label
                    htmlFor="email"
                    className="
                      mb-2 block text-sm font-semibold
                      text-[#26342d]
                    "
                  >
                    E-mail
                  </label>

                  <div className="group relative">
                    <Mail
                      aria-hidden="true"
                      className="
                        pointer-events-none absolute
                        left-4 top-1/2 size-5
                        -translate-y-1/2
                        text-[#839088]
                        transition-colors
                        group-focus-within:text-[#0c4f38]
                      "
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="voce@email.com"
                      value={email}
                      disabled={isLoading}
                      onChange={(event) => {
                        setEmail(event.target.value);

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      className="
                        min-h-14 w-full rounded-2xl
                        border border-[#d8e1da]
                        bg-[#f9fbf9]
                        pl-12 pr-4
                        text-base text-[#17211c]
                        outline-none
                        transition duration-200
                        placeholder:text-[#9ba69f]
                        focus:border-[#5dbb84]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#24b46b]/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    />
                  </div>
                </div>

                <div>
                  <div
                    className="
                      mb-2 flex items-center
                      justify-between gap-4
                    "
                  >
                    <label
                      htmlFor="password"
                      className="
                        text-sm font-semibold
                        text-[#26342d]
                      "
                    >
                      Senha
                    </label>

                    <Link
                      href="/forgot-password"
                      className="
                        text-sm font-semibold
                        text-[#0c6b48]
                        transition
                        hover:text-[#24a96a]
                      "
                    >
                      Esqueci minha senha
                    </Link>
                  </div>

                  <div className="group relative">
                    <LockKeyhole
                      aria-hidden="true"
                      className="
                        pointer-events-none absolute
                        left-4 top-1/2 size-5
                        -translate-y-1/2
                        text-[#839088]
                        transition-colors
                        group-focus-within:text-[#0c4f38]
                      "
                    />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={password}
                      disabled={isLoading}
                      onChange={(event) => {
                        setPassword(event.target.value);

                        if (errorMessage) {
                          setErrorMessage("");
                        }
                      }}
                      className="
                        min-h-14 w-full rounded-2xl
                        border border-[#d8e1da]
                        bg-[#f9fbf9]
                        pl-12 pr-12
                        text-base text-[#17211c]
                        outline-none
                        transition duration-200
                        placeholder:text-[#9ba69f]
                        focus:border-[#5dbb84]
                        focus:bg-white
                        focus:ring-4
                        focus:ring-[#24b46b]/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                    />

                    <button
                      type="button"
                      disabled={isLoading}
                      aria-label={
                        showPassword
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                      onClick={() => {
                        setShowPassword(
                          (currentValue) =>
                            !currentValue,
                        );
                      }}
                      className="
                        absolute right-3 top-1/2
                        flex size-10
                        -translate-y-1/2
                        items-center justify-center
                        rounded-xl text-[#748079]
                        transition
                        hover:bg-[#e8f2eb]
                        hover:text-[#0c4f38]
                        active:scale-95
                        disabled:pointer-events-none
                        disabled:opacity-50
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className="
                    flex items-center
                    justify-between gap-3
                  "
                >
                  <button
                    type="button"
                    role="switch"
                    disabled={isLoading}
                    aria-checked={rememberMe}
                    onClick={() => {
                      setRememberMe(
                        (currentValue) =>
                          !currentValue,
                      );
                    }}
                    className="
                      flex items-center gap-3
                      text-left text-sm
                      text-[#5f6d65]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    <span
                      className={`
                        relative block h-6 w-11
                        shrink-0 rounded-full
                        transition duration-200
                        ${
                          rememberMe
                            ? "bg-[#0c7a50]"
                            : "bg-[#cad4cd]"
                        }
                      `}
                    >
                      <motion.span
                        layout
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 32,
                        }}
                        className={`
                          absolute top-1 size-4
                          rounded-full bg-white
                          shadow-sm
                          ${
                            rememberMe
                              ? "left-6"
                              : "left-1"
                          }
                        `}
                      />
                    </span>

                    <span>
                      Manter minha conta conectada
                    </span>
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={
                    isLoading ? undefined : { y: -2 }
                  }
                  whileTap={
                    isLoading
                      ? undefined
                      : { scale: 0.98 }
                  }
                  transition={{ duration: 0.16 }}
                  className="
                    relative flex min-h-14 w-full
                    items-center justify-center
                    overflow-hidden rounded-2xl
                    bg-gradient-to-r
                    from-[#0c4f38] to-[#0f704b]
                    px-5 text-base font-semibold
                    text-white
                    shadow-[0_15px_35px_rgba(12,79,56,0.24)]
                    transition
                    hover:shadow-[0_20px_42px_rgba(12,79,56,0.30)]
                    disabled:cursor-not-allowed
                    disabled:opacity-80
                  "
                >
                  <motion.span
                    aria-hidden="true"
                    className="
                      absolute inset-y-0
                      -left-1/2 w-1/3
                      skew-x-[-20deg]
                      bg-gradient-to-r
                      from-transparent
                      via-white/20
                      to-transparent
                    "
                    animate={
                      isLoading
                        ? { x: ["0%", "500%"] }
                        : { x: "-100%" }
                    }
                    transition={{
                      duration: 1.2,
                      repeat: isLoading
                        ? Infinity
                        : 0,
                      ease: "linear",
                    }}
                  />

                  <span
                    className="
                      relative flex items-center
                      justify-center gap-2
                    "
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle
                          className="
                            size-5 animate-spin
                          "
                        />
                        Verificando seus dados...
                      </>
                    ) : (
                      <>
                        Entrar na minha conta
                        <ArrowRight
                          className="size-5"
                        />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div
                className="
                  my-5 flex items-center gap-4
                "
              >
                <div
                  className="
                    h-px flex-1 bg-[#e2e8e3]
                  "
                />

                <span
                  className="
                    text-xs font-medium
                    text-[#8b968f]
                  "
                >
                  NOVO POR AQUI?
                </span>

                <div
                  className="
                    h-px flex-1 bg-[#e2e8e3]
                  "
                />
              </div>

              <Link
                href="/register"
                className="
                  flex min-h-14 w-full
                  items-center justify-center
                  rounded-2xl
                  border border-[#cbd8cf]
                  bg-white px-5
                  text-base font-semibold
                  text-[#0c4f38]
                  transition duration-200
                  hover:-translate-y-0.5
                  hover:border-[#8fc6a5]
                  hover:bg-[#f4faf6]
                  active:translate-y-0
                  active:scale-[0.98]
                "
              >
                Criar uma conta grátis
              </Link>
            </div>

            <p
              className="
                mx-auto mt-4 max-w-sm
                text-center text-xs
                leading-5 text-[#7b8780]
              "
            >
              Ao continuar, você concorda com nossos{" "}
              <Link
                href="/terms"
                className="
                  font-semibold text-[#0c6042]
                "
              >
                Termos de Uso
              </Link>{" "}
              e nossa{" "}
              <Link
                href="/privacy"
                className="
                  font-semibold text-[#0c6042]
                "
              >
                Política de Privacidade
              </Link>
              .
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function BackgroundDecoration() {
  return (
    <>
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -left-24 -top-24 size-80
          rounded-full bg-[#b9f1d0]/40
          blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -bottom-32 -right-24
          size-[28rem] rounded-full
          bg-[#0c4f38]/10 blur-3xl
        "
      />
    </>
  );
}

function HeroSection() {
  return (
    <section
      className="
        relative hidden overflow-hidden
        bg-gradient-to-br
        from-[#073c2b]
        via-[#0c4f38]
        to-[#116b49]
        px-10 py-8 text-white
        lg:flex
        xl:px-16 xl:py-10
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute inset-0 opacity-[0.12]
          [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)]
          [background-size:28px_28px]
        "
      />

      <motion.div
        aria-hidden="true"
        animate={{
          x: [0, 20, 0],
          y: [0, -14, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="
          absolute right-12 top-20
          size-52 rounded-full
          bg-[#45db8d]/10 blur-2xl
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute -bottom-40 -left-20
          size-[34rem] rounded-full
          border border-white/10
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute -bottom-52 -left-8
          size-[34rem] rounded-full
          border border-white/10
        "
      />

      <div
        className="
          relative z-10 flex w-full
          flex-col justify-between
        "
      >
        <Logo variant="light" />

        <div className="max-w-xl py-8 xl:py-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.08,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              inline-flex items-center gap-2
              rounded-full
              border border-white/15
              bg-white/10 px-4 py-2
              text-sm font-medium
              text-[#c8f8dc]
              backdrop-blur
            "
          >
            <Sparkles className="size-4" />
            Finanças simples e inteligentes
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.14,
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              mt-5 max-w-xl
              text-4xl font-bold
              leading-[1.04]
              tracking-[-0.055em]
              xl:text-5xl
            "
          >
            Clareza para cuidar do seu dinheiro.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.22,
              duration: 0.5,
            }}
            className="
              mt-5 max-w-lg
              text-base leading-7
              text-white/70
              xl:text-lg xl:leading-8
            "
          >
            Acompanhe receitas, despesas e metas em um
            só lugar, com uma experiência rápida,
            bonita e inteligente.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.5,
            }}
            className="
              mt-7 grid max-w-lg gap-3
              sm:grid-cols-2
            "
          >
            <FeatureCard
              icon={
                <TrendingUp className="size-5" />
              }
              title="Visão completa"
              description="Veja sua evolução financeira em tempo real."
            />

            <FeatureCard
              icon={
                <ShieldCheck className="size-5" />
              }
              title="Dados protegidos"
              description="Sua conta e seus lançamentos ficam isolados."
            />
          </motion.div>
        </div>

        <p className="text-sm text-white/45">
          © 2026 FinancAI. Seu dinheiro, mais
          inteligente.
        </p>
      </div>
    </section>
  );
}

function MobileLogo() {
  return (
    <div
      className="
        mb-7 flex items-center gap-3
        lg:hidden
      "
    >
      <Logo variant="dark" />
    </div>
  );
}

function Logo({
  variant,
}: {
  variant: "light" | "dark";
}) {
  const isLight = variant === "light";

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex items-center gap-3"
    >
      <div
        className={`
          flex size-12 items-center
          justify-center rounded-2xl
          ${
            isLight
              ? "bg-white/12 ring-1 ring-white/15 backdrop-blur"
              : "bg-[#0c4f38] shadow-[0_14px_30px_rgba(12,79,56,0.2)]"
          }
        `}
      >
        <Leaf
          className={`
            size-7
            ${
              isLight
                ? "text-[#78eead]"
                : "text-[#70eaa7]"
            }
          `}
        />
      </div>

      <span
        className={`
          text-2xl font-bold
          tracking-[-0.04em]
          ${
            isLight
              ? "text-white"
              : "text-[#0c4f38]"
          }
        `}
      >
        Financ
        <span
          className={
            isLight
              ? "text-[#60e59d]"
              : "text-[#24b46b]"
          }
        >
          AI
        </span>
      </span>
    </motion.div>
  );
}

function LoginHeading() {
  return (
    <div>
      <span
        className="
          inline-flex items-center gap-2
          rounded-full bg-[#e3f5ea]
          px-3 py-1.5
          text-xs font-semibold
          text-[#0c4f38]
        "
      >
        <LockKeyhole className="size-3.5" />
        Ambiente seguro
      </span>

      <h1
        className="
          mt-4 text-3xl font-bold
          tracking-[-0.045em]
          text-[#17211c]
          sm:text-4xl
        "
      >
        Bem-vindo de volta
      </h1>

      <p
        className="
          mt-2 text-sm leading-6
          text-[#65716a]
        "
      >
        Entre para acompanhar sua vida financeira.
      </p>
    </div>
  );
}

function FeedbackMessage({
  variant,
  message,
}: {
  variant: "error" | "success";
  message: string;
}) {
  const isError = variant === "error";

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -8,
        height: 0,
      }}
      animate={{
        opacity: 1,
        y: 0,
        height: "auto",
      }}
      exit={{
        opacity: 0,
        y: -6,
        height: 0,
      }}
      className={`
        mt-5 flex items-start gap-3
        rounded-2xl border p-4
        text-sm
        ${
          isError
            ? "border-[#f1c8c5] bg-[#fff1f0] text-[#a73535]"
            : "border-[#bde5cd] bg-[#eaf8ef] text-[#0b7046]"
        }
      `}
    >
      {isError ? (
        <AlertCircle
          className="mt-0.5 size-5 shrink-0"
        />
      ) : (
        <CheckCircle2
          className="mt-0.5 size-5 shrink-0"
        />
      )}

      <p className="leading-5">{message}</p>
    </motion.div>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="
        rounded-3xl
        border border-white/12
        bg-white/[0.08] p-4
        backdrop-blur-sm
        transition-colors duration-300
        hover:bg-white/[0.12]
      "
    >
      <div
        className="
          flex size-10 items-center
          justify-center rounded-2xl
          bg-[#77efa9]/15
          text-[#88f3b4]
        "
      >
        {icon}
      </div>

      <h2 className="mt-3 font-semibold">
        {title}
      </h2>

      <p
        className="
          mt-1 text-sm leading-5
          text-white/60
        "
      >
        {description}
      </p>
    </motion.div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(
        error.message,
      ) as ApiErrorResponse;

      if (parsedError.message) {
        return parsedError.message;
      }

      if (parsedError.errors?.length) {
        return parsedError.errors[0].message;
      }
    } catch {
      if (
        error.message &&
        error.message !== "Erro na API"
      ) {
        return error.message;
      }
    }
  }

  return (
    "Não foi possível entrar. Verifique seu e-mail " +
    "e sua senha e tente novamente."
  );
}