'use client';

import React, { useState, useEffect, useId } from 'react';

interface UserAvatarProps {
  gender?: string | null;
  name?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

function inferGenderFromName(name?: string | null): string {
  if (!name) return 'male';
  const lowerName = name.toLowerCase();
  if (
    lowerName.includes('swathi') ||
    lowerName.includes('geetha') ||
    lowerName.includes('priya') ||
    lowerName.includes('ananya') ||
    lowerName.includes('sneha') ||
    lowerName.includes('pooja') ||
    lowerName.includes('kavya') ||
    lowerName.includes('mary') ||
    lowerName.includes('sarah') ||
    lowerName.includes('emily') ||
    lowerName.includes('jessica') ||
    lowerName.includes('sophia')
  ) {
    return 'female';
  }
  return 'male';
}

export function UserAvatar({
  gender,
  name,
  className = '',
  size = 'md',
}: UserAvatarProps) {
  const [mounted, setMounted] = useState(false);
  const [clientGender, setClientGender] = useState<string | null>(null);
  const rawId = useId();
  const idPrefix = rawId.replace(/:/g, '');

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('claimgpt_user_gender');
      if (saved) setClientGender(saved);
    } catch {
      /* ignore */
    }

    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('claimgpt_user_gender');
        setClientGender(saved);
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const baseGender = (gender || '').toLowerCase().trim();
  const effectiveGender = (
    mounted && clientGender ? clientGender : baseGender || inferGenderFromName(name)
  ).toLowerCase().trim();

  const isFemale = effectiveGender === 'female' || effectiveGender === 'f';

  const sizeClasses = {
    xs: 'h-7 w-7',
    sm: 'h-8 w-8',
    md: 'h-9 w-9 sm:h-10 sm:w-10',
    lg: 'h-11 w-11 sm:h-12 sm:w-12',
    xl: 'h-14 w-14 sm:h-16 sm:w-16',
  }[size];

  const bgGradientId = `bg-${idPrefix}`;
  const hairGradientId = `hair-${idPrefix}`;
  const clothGradientId = `cloth-${idPrefix}`;
  const skinGradientId = `skin-${idPrefix}`;

  if (isFemale) {
    return (
      <div
        className={`relative flex-none rounded-full overflow-hidden shadow-sm ring-2 ring-pink-300/60 ${sizeClasses} ${className}`}
        title="User Avatar (Female)"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full object-cover select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Soft Pastel Light Pink Circular Background */}
          <circle cx="50" cy="50" r="50" fill="#fce7f3" />

          {/* Female Back Hair: Shoulder-Length Flared Jagged Layers (Exact Reference) */}
          <path
            d="M 28 36 C 22 48 18 56 16 66 L 22 64 C 18 72 17 80 20 86 C 26 84 32 76 36 68 L 64 68 C 68 76 74 84 80 86 C 83 80 82 72 78 64 L 84 66 C 82 56 78 48 72 36 Z"
            fill="#8c4a26"
          />

          {/* Dark Charcoal Blazer Jacket */}
          <path
            d="M 12 100 C 15 76 28 66 50 66 C 72 66 85 76 88 100 Z"
            fill="#2d3748"
          />

          {/* Blazer Notched Lapels */}
          <path
            d="M 24 74 L 38 78 L 44 92 L 46 100 L 32 100 Z"
            fill="#374151"
          />
          <path
            d="M 76 74 L 62 78 L 56 92 L 54 100 L 68 100 Z"
            fill="#374151"
          />

          {/* Scoop-Neck White Blouse */}
          <path
            d="M 36 66 C 36 82 64 82 64 66 Z"
            fill="#ffffff"
          />

          {/* Neck */}
          <path
            d="M 43 48 L 57 48 L 57 68 C 50 72 50 72 43 68 Z"
            fill="#f6ad7b"
          />
          {/* Soft Chin Shadow */}
          <path
            d="M 43 52 C 47 57 53 57 57 52 L 57 56 C 53 61 47 61 43 56 Z"
            fill="#e08a55"
            opacity="0.8"
          />

          {/* Ears */}
          <ellipse cx="33" cy="46" rx="2.5" ry="3.5" fill="#f6ad7b" />
          <ellipse cx="67" cy="46" rx="2.5" ry="3.5" fill="#f6ad7b" />

          {/* Soft Oval Face Shape */}
          <ellipse cx="50" cy="45" rx="16" ry="17.5" fill="#f6ad7b" />

          {/* Pretty Almond Eyes with Pupils & Catchlights */}
          <ellipse cx="42" cy="43" rx="2.2" ry="2.4" fill="#1e1b4b" />
          <ellipse cx="58" cy="43" rx="2.2" ry="2.4" fill="#1e1b4b" />
          <circle cx="43" cy="42" r="0.8" fill="#ffffff" />
          <circle cx="59" cy="42" r="0.8" fill="#ffffff" />

          {/* Arched Eyebrows */}
          <path
            d="M 37 38 Q 42 36 46 38"
            stroke="#451a03"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M 54 38 Q 58 36 63 38"
            stroke="#451a03"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Delicate Nose */}
          <path
            d="M 49.5 44 L 49.5 48 Q 50 49 51.5 48.5"
            stroke="#d97706"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Cheerful Friendly Smile */}
          <path
            d="M 44.5 52.5 Q 50 56.5 55.5 52.5"
            stroke="#e11d48"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Female Front Crown Hair */}
          <path
            d="M 30 42 C 28 20 38 12 50 12 C 63 12 72 20 70 42 C 69 32 64 26 56 25 C 46 25 38 31 30 42 Z"
            fill="#8c4a26"
          />

          {/* Diagonal Side-Swept Bangs across forehead (Exact match to right image) */}
          <path
            d="M 32 38 C 42 26 56 25 66 33 L 62 36 C 54 30 44 32 36 42 Z"
            fill="#8c4a26"
          />
          <path
            d="M 48 28 L 62 37 L 58 39 C 52 34 47 31 44 30 Z"
            fill="#7a3f1d"
          />
        </svg>
      </div>
    );
  }

  // Male Avatar (Exact Match to Left Reference Image with Crested Quiff, Suit, White Shirt & Orange Tie)
  return (
    <div
      className={`relative flex-none rounded-full overflow-hidden shadow-sm ring-2 ring-sky-300/60 ${sizeClasses} ${className}`}
      title="User Avatar (Male)"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full object-cover select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft Sky Blue/Teal Circular Background from Reference */}
        <circle cx="50" cy="50" r="50" fill="#dbeafe" />

        {/* Dark Charcoal Suit Jacket */}
        <path
          d="M 12 100 C 15 76 28 66 50 66 C 72 66 85 76 88 100 Z"
          fill="#2d3748"
        />

        {/* Notched Jacket Lapels */}
        <path
          d="M 22 74 L 37 77 L 45 92 L 46 100 L 32 100 Z"
          fill="#374151"
        />
        <path
          d="M 78 74 L 63 77 L 55 92 L 54 100 L 68 100 Z"
          fill="#374151"
        />

        {/* Crisp White Collared Dress Shirt */}
        <path
          d="M 37 66 L 50 88 L 63 66 Z"
          fill="#ffffff"
        />
        {/* Left Collar Wing */}
        <path
          d="M 37 66 L 47 77 L 47 66 Z"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.6"
        />
        {/* Right Collar Wing */}
        <path
          d="M 63 66 L 53 77 L 53 66 Z"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.6"
        />

        {/* Sharp Amber/Orange Tie */}
        {/* Tie Knot */}
        <path
          d="M 47 69 L 53 69 L 52 76 L 48 76 Z"
          fill="#f97316"
        />
        {/* Tie Body */}
        <path
          d="M 48 76 L 52 76 L 53.5 98 L 50 100 L 46.5 98 Z"
          fill="#ea580c"
        />

        {/* Proportional Masculine Neck */}
        <path
          d="M 41 48 L 59 48 L 59 68 C 50 72 50 72 41 68 Z"
          fill="#f6ad7b"
        />
        {/* Defined Chin Shadow */}
        <path
          d="M 41 52 C 46 58 54 58 59 52 L 59 57 C 54 62 46 62 41 57 Z"
          fill="#e08a55"
          opacity="0.8"
        />

        {/* Ears */}
        <ellipse cx="32.5" cy="46" rx="2.8" ry="4.5" fill="#f6ad7b" />
        <ellipse cx="67.5" cy="46" rx="2.8" ry="4.5" fill="#f6ad7b" />

        {/* Masculine Head Shape */}
        <path
          d="M 34 38 C 34 49 37 57 43 63 C 47 66.5 53 66.5 57 63 C 63 57 66 49 66 38 C 66 26 60 18 50 18 C 40 18 34 26 34 38 Z"
          fill="#f6ad7b"
        />

        {/* Confident Masculine Eyebrows */}
        <path
          d="M 35 37 Q 42 34.5 47 37"
          stroke="#451a03"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 53 37 Q 58 34.5 65 37"
          stroke="#451a03"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Sharp Intelligent Eyes with Pupils & Bright Catchlights */}
        <ellipse cx="42" cy="42.5" rx="2.4" ry="2.2" fill="#1e1b4b" />
        <ellipse cx="58" cy="42.5" rx="2.4" ry="2.2" fill="#1e1b4b" />
        <circle cx="43" cy="41.5" r="0.7" fill="#ffffff" />
        <circle cx="59" cy="41.5" r="0.7" fill="#ffffff" />

        {/* Subtle Eyelid Line */}
        <path d="M 37.5 41 Q 42 39.5 46.5 41" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
        <path d="M 53.5 41 Q 58 39.5 62.5 41" stroke="#1e1b4b" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />

        {/* Refined Nose Bridge */}
        <path
          d="M 49.5 43.5 L 49.5 48 Q 50 49.5 52 48.5"
          stroke="#d97706"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Warm Confident Masculine Smile */}
        <path
          d="M 44 53.5 Q 50 57.5 56 53.5"
          stroke="#0f172a"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Male Hair Style (Exact Match to Left Image: Tapered Sides, Clean Brow Hairline, Crested Top Spikes) */}
        {/* Main Hair Mass */}
        <path
          d="M 29 42 C 27 24 36 12 50 12 C 55 12 60 14 64 18 C 69 23 71 30 71 42 C 69 34 66 26 56 26 C 46 26 38 26 35 36 C 33 38 31 40 29 42 Z"
          fill="#8c4a26"
        />

        {/* Top Right Crown Crest Spikes (Exact connected spikes from image) */}
        <path
          d="M 46 13 L 53 7 L 51 14 Z"
          fill="#8c4a26"
        />
        <path
          d="M 53 11 L 62 8 L 58 15 Z"
          fill="#8c4a26"
        />

        {/* Short Neat Sideburns */}
        <path d="M 31 38 L 31 45 L 34 43 L 34 36 Z" fill="#8c4a26" />
        <path d="M 69 38 L 69 45 L 66 43 L 66 36 Z" fill="#8c4a26" />

        {/* Subtle Highlight Contour */}
        <path
          d="M 34 26 C 40 18 50 18 58 20 C 49 21 42 25 37 32 Z"
          fill="#a15830"
        />
      </svg>
    </div>
  );
}
