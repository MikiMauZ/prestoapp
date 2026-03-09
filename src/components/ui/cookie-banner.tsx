
"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('prestoapp-cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('prestoapp-cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl relative">
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-white/40 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex gap-4 items-start mb-4">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Privacidad y Cookies</h4>
            <p className="text-[11px] text-white/60 leading-relaxed">
              Utilizamos cookies propias y de terceros para mejorar tu experiencia técnica y cumplir con la normativa legal de seguridad.
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Button 
            onClick={handleAccept} 
            size="sm" 
            className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold h-9"
          >
            Aceptar Todas
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            asChild
            className="text-[10px] text-white/40 hover:text-white h-9"
          >
            <Link href="/privacy">Saber más</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
