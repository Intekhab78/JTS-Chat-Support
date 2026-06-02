import React from "react";

const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#f97316"];

export default function MagicCelebration({ duration = 4000 }) {
  const particles = Array.from({ length: 100 });

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((_, i) => {
        const size = Math.random() * 8 + 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 3 + "s";
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const isCircle = Math.random() > 0.5;

        return (
          <div
            key={i}
            className="animate-confetti absolute"
            style={{
              left: left + "%",
              top: "-20px",
              width: size + "px",
              height: size + "px",
              backgroundColor: color,
              borderRadius: isCircle ? "50%" : "2px",
              animationDelay: delay,
              boxShadow: `0 0 10px ${color}`
            }}
          />
        );
      })}
    </div>
  );
}
