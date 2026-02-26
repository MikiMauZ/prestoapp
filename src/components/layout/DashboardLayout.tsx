
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Droplets, 
  ShieldCheck, 
  LogOut, 
  Menu,
  BookOpen,
  ClipboardList,
  BarChart3,
  ShieldAlert,
  Building2,
  ChevronDown,
  Waves,
  Package,
  ShoppingCart,
  User as UserIcon,
  Loader2,
  Contact
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: profileLoading } = useDoc(userProfileRef);

  const tenantsQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (profile.role === 'SUPER_ADMIN') {
      return query(collection(db, 'tenants'), orderBy('name', 'asc'));
    }
    return null;
  }, [db, profile?.role]);

  const { data: allTenants } = useCollection(tenantsQuery);

  const currentTenantRef = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return doc(db, 'tenants', profile.tenantId);
  }, [db, profile?.tenantId]);

  const { data: currentTenant, isLoading: tenantLoading } = useDoc(currentTenantRef);

  const navItems = [
    { label: 'Panel Principal', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Verificaciones', href: '/dashboard/verifications', icon: Droplets },
    { label: 'Protocolos Piscina', href: '/dashboard/pool-protocols', icon: Waves },
    { label: 'Gestión de Stock', href: '/dashboard/inventory', icon: Package },
    { label: 'Pedidos Técnicos', href: '/dashboard/orders', icon: ShoppingCart },
    { label: 'Proveedores', href: '/dashboard/suppliers', icon: Contact },
    { label: 'Logbook Técnico', href: '/dashboard/logbook', icon: ClipboardList },
    { label: 'Libro Técnico', href: '/dashboard/knowledge-base', icon: BookOpen },
    { label: 'Cumplimiento', href: '/dashboard/compliance', icon: ShieldCheck },
    { label: 'Métricas', href: '/dashboard/metrics', icon: BarChart3 },
    { label: 'Mi Perfil', href: '/dashboard/profile', icon: UserIcon },
  ];

  const handleSwitchTenant = async (tenantId: string) => {
    if (!db || !user?.uid) return;
    try {
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        tenantId: tenantId,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Entorno cambiado",
        description: "Ahora estás gestionando otro hotel.",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getPageTitle = () => {
    const item = navItems.find(item => item.href === pathname);
    return item ? item.label : 'Panel de Control';
  };

  if (profileLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse text-sm uppercase tracking-widest">Sincronizando PrestoApp...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col hidden md:flex border-r border-sidebar-border shadow-xl">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">PrestoApp</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group mb-1",
                  isActive 
                    ? "bg-accent text-white font-bold shadow-md shadow-accent/20 translate-x-1" 
                    : "hover:bg-sidebar-accent/10 text-sidebar-foreground/70 hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-sidebar-foreground/50 group-hover:text-white")} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}

          {profile?.role === 'SUPER_ADMIN' && (
            <div className="mt-8 pt-8 border-t border-sidebar-border">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500 px-4 mb-2 block">Administración Global</span>
              <Link
                href="/super-admin"
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group hover:bg-red-500/10 text-red-400 hover:text-red-500",
                  pathname.startsWith('/super-admin') && "bg-red-500/20 text-red-500"
                )}
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="text-sm font-bold tracking-tight">Consola Super Admin</span>
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-9 h-9 border border-sidebar-border shadow-sm ring-2 ring-accent/10">
              <AvatarFallback className="bg-primary text-white font-bold text-xs">
                {profile?.displayName?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate text-white">{profile?.displayName || user?.email}</span>
              <span className="text-[9px] text-sidebar-foreground/50 truncate uppercase tracking-widest font-black">
                {profile?.role || 'TECNICO'}
              </span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-xs text-sidebar-foreground/70 hover:text-white hover:bg-destructive/10 h-9 transition-colors" asChild>
            <Link href="/login">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Cerrar Sesión
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-primary tracking-tight">{getPageTitle()}</h1>
              <span className="text-muted-foreground/30 mx-2">|</span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary font-semibold">
                    <Building2 className="w-4 h-4" />
                    {tenantLoading ? 'Cargando hotel...' : currentTenant?.name || 'Hotel Independiente'}
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-[400px] overflow-y-auto">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground">Hoteles Asignados</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {profile?.tenantId && currentTenant ? (
                    <DropdownMenuItem onClick={() => handleSwitchTenant(profile.tenantId)} className="font-bold bg-accent/5">
                      <Building2 className="w-4 h-4 mr-2" />
                      <span className="truncate flex-1">{currentTenant.name}</span>
                      <Badge variant="secondary" className="ml-2 text-[9px] bg-green-50 text-green-600 border-green-100">Activo</Badge>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled className="text-xs italic text-muted-foreground">Sin hotel asignado</DropdownMenuItem>
                  )}

                  {profile?.role === 'SUPER_ADMIN' && allTenants?.filter(t => t.id !== profile.tenantId).map(t => (
                    <DropdownMenuItem key={t.id} onClick={() => handleSwitchTenant(t.id)}>
                      <Building2 className="w-4 h-4 mr-2" />
                      <span className="truncate">{t.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Cumplimiento Técnico</span>
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                SISTEMA PROTEGIDO
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
