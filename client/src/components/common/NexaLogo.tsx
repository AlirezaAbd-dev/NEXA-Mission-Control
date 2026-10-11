import React from 'react';

interface NexaLogoProps {
  className?: string;
  size?: number;
}

export const NexaLogo: React.FC<NexaLogoProps> = ({ className = '', size = 32 }) => {
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
        <linearGradient id="nexa-grad-main" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#042f2e" />
        </linearGradient>
        <linearGradient id="nexa-grad-accent" x1="64" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <filter id="nexa-glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0d9488" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Futuristic NEXA Geometric Hex-Diamond Container */}
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="14"
        fill="#0d1a1d"
        stroke="url(#nexa-grad-main)"
        strokeWidth="2.5"
        filter="url(#nexa-glow)"
      />

      {/* Forward Cyber Flight / Task Flow Wings forming 'N' & Compass Arrow */}
      {/* Left Pillar */}
      <path
        d="M19 44V20L28 35V44H19Z"
        fill="url(#nexa-grad-main)"
      />

      {/* Cyber Diagonal Flow */}
      <path
        d="M26 23L45 44H37L19 23H26Z"
        fill="url(#nexa-grad-accent)"
      />

      {/* Right Mission Control Pillar & Orbit Accent */}
      <path
        d="M36 20H45V44L36 29V20Z"
        fill="url(#nexa-grad-main)"
      />

      {/* Central Cyber Core Pulse Dot */}
      <circle cx="32" cy="32" r="2.5" fill="#5eead4" />
    </svg>
  );
};

export default NexaLogo;
