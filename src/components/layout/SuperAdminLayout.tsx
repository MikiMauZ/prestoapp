
"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShieldAlert, 
  Building2, 
  Users, 
  Settings, 
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Visión Global', href: '/super-admin', icon: Activity },
    { label: 'Gestionar Hoteles', href: '/super-admin/tenants', icon: Building2 },
    { label: 'Gestionar Usuarios', href: '/super-admin/users', icon: Users },
    { label: 'Configuración Sistema', href: '/super-admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      {/* Sidebar Super Admin */}
      <aside className="w-72 bg-slate-950 flex flex-col border-r border-slate-800 shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/40 rotate-3">
              <ShieldAlert className="text-white w-7 h-7" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight block">PrestoApp</span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Super Admin Console</span>
            </div>
          </div>
          
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 mb-6 gap-2" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="w-4 h-4" />
              Volver al Dashboard
            </Link>
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-red-600 text-white font-bold shadow-lg shadow-red-900/20 translate-x-1" 
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-600")} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto bg-slate-950/80 border-t border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-10 h-10 ring-2 ring-red-600/20">
              <AvatarFallback className="bg-red-600 text-white font-black">SA</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate">Root Admin</span>
              <span className="text-[10px] text-red-500 font-black uppercase">System Owner</span>
            </div>
          </div>
          <Button variant="outline" className="w-full border-slate-700 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all h-10 font-bold text-xs" asChild>
            <Link href="/login">
              <LogOut className="w-4 h-4 mr-2" />
              SALIR DEL SISTEMA
            </Link>
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0f18] overflow-hidden">
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 shrink-0">
          <h1 className="text-xl font-black text-slate-200 tracking-tight">
            {navItems.find(i => i.href === pathname)?.label || 'Consola de Control'}
          </h1>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Estado Global</span>
              <span className="text-[10px] font-bold text-green-500 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                SISTEMA OPERATIVO
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
