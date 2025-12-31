"use client";

import React, { useEffect, useState } from 'react';
import { CompanySettings } from '../types';
import { getCompanySettings } from '../lib/api';

interface LogoProps {
  className?: string;
  showText?: boolean;
  light?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "h-8", showText = true, light = false }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await getCompanySettings();
        if (isMounted) {
          setSettings(data);
        }
      } catch {
        if (isMounted) {
          setSettings(null);
        }
      }
    };
    load();
    const handler = () => {
      load();
    };
    window.addEventListener("company-settings-updated", handler);
    return () => {
      isMounted = false;
      window.removeEventListener("company-settings-updated", handler);
    };
  }, []);

  const displayName = settings
    ? [settings.legalForm, settings.name].filter(Boolean).join(' ')
    : 'EURL JAMAE';

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <img
        src={settings?.logoUrl || "/logo.png"}
        alt={displayName}
        className={`h-full w-auto object-contain ${light ? 'brightness-0 invert' : ''}`}
      />
      {showText && (
        <div className="flex flex-col justify-center select-none">
          <h1 className={`text-2xl font-black tracking-tighter ${light ? 'text-white' : 'text-[#B08D47]'} leading-none uppercase`}>{settings?.name || 'JAMAE'}</h1>
          <p className={`text-[8px] font-bold uppercase tracking-[0.2em] ${light ? 'text-slate-300' : 'text-[#8C6A30]'} mt-1`}>
            {displayName}
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;
