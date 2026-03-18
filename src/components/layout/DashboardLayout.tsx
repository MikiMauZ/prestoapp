
"use client"

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  Menu,
  BookOpen,
  ClipboardList,
  ShieldAlert,
  Building2,
  ChevronDown,
  ChevronRight,
  Waves,
  Package,
  ShoppingCart,
  User as UserIcon,
  Loader2,
  Contact,
  FileBadge,
  Wrench,
  X,
  HardHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, useAuth } from '@/firebase';
import { doc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirección si no hay usuario (Protección de ruta)
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    setMounted(true);
    if (pathname.includes('pool-protocols')) setOpenMenus(prev => Array.from(new Set([...prev, '/dashboard/pool-protocols'])));
    if (pathname.includes('verification-equipment')) setOpenMenus(prev => Array.from(new Set([...prev, '/dashboard/verification-equipment'])));
  }, [pathname]);

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
    { 
      label: 'Protocolos Aguas', 
      href: '/dashboard/pool-protocols', 
      icon: Waves,
      children: [
        { label: '💧 Inventario Aguas', tab: 'water-inventory' },
        { label: '🚨 Emergencias CT', tab: 'emergency' },
        { label: '🧪 Correcciones FQ', tab: 'correction' },
        { label: '📝 Crear Memoria', tab: 'memorias-form' },
        { label: '📚 Historial', tab: 'memorias-history' },
        { label: '📖 Manual Técnico', tab: 'manual' },
      ]
    },
    { 
      label: 'Equipos Verificación', 
      href: '/dashboard/verification-equipment', 
      icon: Wrench,
      children: [
        { label: '⚙️ Inventario', tab: 'inventory' },
        { label: '📋 Verificaciones', tab: 'history' },
      ]
    },
    { label: 'Mejoras / CAPEX', href: '/dashboard/capex', icon: HardHat },
    { label: 'Logbook', href: '/dashboard/logbook', icon: ClipboardList },
    { label: 'Libro Técnico', href: '/dashboard/knowledge-base', icon: BookOpen },
    { label: 'Pedidos', href: '/dashboard/orders', icon: ShoppingCart },
    { label: 'Stock', href: '/dashboard/inventory', icon: Package },
    { label: 'Certificados', href: '/dashboard/documents', icon: FileBadge },
    { label: 'Proveedores', href: '/dashboard/suppliers', icon: Contact },
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const toggleMenu = (href: string) => {
    setOpenMenus(prev => 
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  };

  const getPageTitle = () => {
    const item = navItems.find(item => item.href === pathname);
    return item ? item.label : 'Panel de Control';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">PrestoApp</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus.includes(item.href);

          if (hasChildren) {
            return (
              <Collapsible key={item.href} open={isOpen} onOpenChange={() => toggleMenu(item.href)} className="w-full">
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group mb-1 cursor-pointer",
                    isActive ? "bg-accent/10 text-white font-bold" : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/10"
                  )}>
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", isActive ? "text-accent" : "text-sidebar-foreground/50 group-hover:text-white")} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-9 mb-4">
                  {item.children?.map((child) => (
                    <Link
                      key={child.tab}
                      href={`${item.href}?tab=${child.tab}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                        searchParams.get('tab') === child.tab && pathname === item.href
                          ? "bg-accent text-white font-bold"
                          : "text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent/5"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
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
              onClick={() => setIsMobileMenuOpen(false)}
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
        <Button 
          variant="ghost" 
          className="w-full justify-start text-xs text-sidebar-foreground/70 hover:text-white hover:bg-destructive/10 h-9 transition-colors" 
          onClick={handleLogout}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  if (isUserLoading || profileLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse text-sm uppercase tracking-widest">Sincronizando PrestoApp...</p>
      </div>
    );
  }

  // Si no hay usuario y ya cargó, mostramos vacío mientras el useEffect redirige
  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col hidden md:flex border-r border-sidebar-border shadow-xl">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-sidebar border-none w-72">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menú de Navegación PrestoApp</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-lg font-bold text-primary tracking-tight truncate max-w-[120px] md:max-w-none">
                {getPageTitle()}
              </h1>
              <span className="text-muted-foreground/30 mx-1 md:mx-2">|</span>
              
              {mounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 md:gap-2 text-muted-foreground hover:text-primary font-semibold text-xs md:text-sm px-1 md:px-3">
                      <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="truncate max-w-[80px] md:max-w-none">
                        {tenantLoading ? '...' : currentTenant?.name || 'Hotel'}
                      </span>
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
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Cumplimiento Técnico</span>
              <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                SISTEMA PROTEGIDO
              </span>
            </div>
            <div className="sm:hidden w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" title="Sistema Protegido" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
