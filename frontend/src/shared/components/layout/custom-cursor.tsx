import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap } from "lucide-react";

export function CustomCursor() {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);
  const [isClicked, setIsClicked] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, a, input, select, [role="button"]');
      setIsHovering(!!isInteractive);
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none hidden lg:block"
      animate={{
        x: mousePos.x - 12,
        y: mousePos.y - 12,
        scale: isClicked ? 0.8 : isHovering ? 1.2 : 1,
      }}
      transition={{ type: "spring", damping: 20, stiffness: 250, mass: 0.5 }}
    >
      <div className="relative">
        {/* The Lightning Bolt */}
        <motion.div
          animate={{
            color: isHovering ? "#22d3ee" : "#94a3b8",
            filter: isHovering ? "drop-shadow(0 0 8px #22d3ee)" : "none",
          }}
        >
          <Zap 
            className={isClicked ? "fill-cyan-400" : "fill-transparent"} 
            strokeWidth={2}
            size={24}
          />
        </motion.div>

        {/* Click Burst Effect */}
        <AnimatePresence>
          {isClicked && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-full border-2 border-cyan-400"
            />
          )}
        </AnimatePresence>

        {/* Crackle Effect on Hover */}
        {isHovering && !isClicked && (
          <motion.div
            animate={{ 
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.1, 1],
            }}
            transition={{ repeat: Infinity, duration: 0.2 }}
            className="absolute -inset-1 rounded-full bg-cyan-400/10 blur-sm"
          />
        )}
      </div>
    </motion.div>
  );
}
