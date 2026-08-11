"use client";

import { motion } from "motion/react";

export function SplashScreen() {
  return (
    <div
      className="
        fixed inset-0 z-[9999]
        flex min-h-dvh items-center justify-center
        bg-[#f4f6f3]
        px-6
      "
    >
      <div className="w-full max-w-xs text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
            mx-auto flex size-20 items-center justify-center
            rounded-[1.75rem]
            bg-gradient-to-br
            from-[#0c4f38] to-[#168657]
            shadow-[0_20px_50px_rgba(12,79,56,0.22)]
          "
        >
          <motion.svg
            viewBox="0 0 64 64"
            className="size-11 text-white"
            fill="none"
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.6 }}
            aria-hidden="true"
          >
            <path
              d="M15 42V29M27 42V21M39 42V14M51 42V8"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M12 51H54"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </motion.svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="
            mt-6 text-3xl font-bold
            tracking-[-0.04em]
            text-[#0c4f38]
          "
        >
          FinancAI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.4 }}
          className="mt-2 text-sm text-[#65716a]"
        >
          Organizando sua vida financeira
        </motion.p>

        <div
          className="
            mt-8 h-1.5 overflow-hidden
            rounded-full bg-[#dce5de]
          "
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{
              duration: 1.1,
              ease: [0.65, 0, 0.35, 1],
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="
              h-full w-full rounded-full
              bg-gradient-to-r
              from-[#0c4f38] via-[#24b46b] to-[#0c4f38]
            "
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{
            delay: 0.4,
            duration: 1.5,
            repeat: Infinity,
          }}
          className="
            mt-3 text-xs font-medium
            text-[#718078]
          "
        >
          Preparando seu painel...
        </motion.p>
      </div>
    </div>
  );
}