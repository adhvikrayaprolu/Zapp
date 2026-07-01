import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X } from "lucide-react";
import { AppButton, AppInput, IconBadge, Surface } from "@/shared/components/system";

export function CfoChatbot() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [value, setValue] = React.useState(50);

  return (
    <div className="fixed bottom-10 right-10 z-[100]">
      <div className="relative">
        {/* Chatbot Character */}
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative cursor-pointer group"
          onClick={() => setIsOpen(!isOpen)}
        >
          {/* Lightning Bolt Body */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-full w-full fill-[var(--app-color-surface-base)] text-[var(--app-accent-cyan-soft)] drop-shadow-[0_0_8px_color-mix(in_srgb,var(--app-accent-cyan-soft)_35%,transparent)]">
              <path 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="1.5"
                d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
              />
              {/* Eyes */}
              <circle cx="9" cy="11" r="1.5" fill="#0B1220" />
              <circle cx="14" cy="11" r="1.5" fill="#0B1220" />
            </svg>
            
            {/* Expressive Eyes Overlay for blinking */}
            <motion.div 
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.95, 1] }}
              className="absolute top-[42%] left-[35%] h-1.5 w-1.5 rounded-full bg-[var(--app-color-surface-inset)]"
            />
            <motion.div 
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ repeat: Infinity, duration: 4, times: [0, 0.95, 1] }}
              className="absolute top-[42%] left-[55%] h-1.5 w-1.5 rounded-full bg-[var(--app-color-surface-inset)]"
            />
          </div>

          {/* Prompt Bubble */}
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-1/2 right-full mr-4 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-[var(--app-accent-cyan-soft)] px-4 py-2 text-xs font-bold text-[var(--app-color-text-inverse)] shadow-lg"
              >
                How can I help you today?
                <div className="absolute top-1/2 right-[-4px] h-2 w-2 -translate-y-1/2 rotate-45 bg-[var(--app-accent-cyan-soft)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Chat Window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-20 right-0 w-80 overflow-hidden"
            >
              <Surface variant="overlay" padding="lg" accentColor="var(--app-accent-cyan-soft)" className="space-y-6 rounded-[2.5rem]">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconBadge tone="green" size="sm" className="size-6 rounded-full [&_svg]:size-0" />
                  <span className="app-mini-label text-[var(--app-accent-cyan-soft)]">Zapp Assistant</span>
                </div>
                <AppButton onClick={() => setIsOpen(false)} variant="quiet" size="icon" className="size-9 rounded-xl">
                  <X className="w-4 h-4" />
                </AppButton>
              </div>

              <div className="space-y-6">
                <Surface variant="inset" padding="sm" className="rounded-2xl text-sm leading-relaxed">
                  Hey! How did that last coffee purchase feel? Was it high value or just a quick fix?
                </Surface>

                <div className="space-y-4">
                  <div className="flex justify-between app-mini-label">
                    <span>Low Value</span>
                    <span>High Value</span>
                  </div>
                  <AppInput
                    type="range" 
                    min="0" 
                    max="100" 
                    value={value} 
                    onChange={(e) => setValue(parseInt(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg border-0 bg-[var(--app-color-surface-inset)] px-0 accent-[var(--app-accent-cyan-soft)]"
                  />
                  <div className="text-center text-2xl font-black text-[var(--app-accent-cyan-soft)] drop-shadow-[0_0_8px_color-mix(in_srgb,var(--app-accent-cyan-soft)_35%,transparent)]">
                    {value}
                  </div>
                </div>

                <AppButton className="w-full" variant="info" size="lg">
                  Log Reflection
                </AppButton>
              </div>
              </Surface>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
