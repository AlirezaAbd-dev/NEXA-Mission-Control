import React from "react";

interface NexaLogoProps {
  className?: string;
  size?: number;
}

export const NexaLogo: React.FC<NexaLogoProps> = ({
  className = "",
  size = 32,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient
          id="nexa-grad-main"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--nexa-brand-highlight, #34d399)" />
          <stop offset="50%" stopColor="var(--nexa-brand-main, #10b981)" />
          <stop offset="100%" stopColor="var(--nexa-brand-lowlight, #064e3b)" />
        </linearGradient>
        <linearGradient
          id="nexa-grad-accent"
          x1="64"
          y1="0"
          x2="0"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--nexa-brand-highlight, #6ee7b7)" />
          <stop offset="100%" stopColor="var(--nexa-brand-main, #059669)" />
        </linearGradient>
      </defs>

      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="14"
        fill="var(--nexa-brand-surface, #0b0c10)"
        stroke="url(#nexa-grad-main)"
        strokeWidth="2.5"
      />

      <path d="M19 44V20L28 35V44H19Z" fill="url(#nexa-grad-main)" />
      <path d="M26 23L45 44H37L19 23H26Z" fill="url(#nexa-grad-accent)" />
      <path d="M36 20H45V44L36 29V20Z" fill="url(#nexa-grad-main)" />
      <circle
        cx="32"
        cy="32"
        r="2.5"
        fill="var(--nexa-brand-highlight, #34d399)"
      />
    </svg>
  );
};

export default NexaLogo;
