
"use client"

import React, { useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Droplets, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Plus,
  Activity,
  Package,
  ShoppingCart,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Wrench,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile, isLoading: loadingProfile } = useDoc(userProfileRef);

  // Queries con Guards estrictos para evitar errores de permisos en carga inicial
  const verificationsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'verifications'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [db, profile?.tenantId]);

  const incidentsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'logbook'),
      where('status', 'not-in', ['RESUELTO', 'CERRADO']),
      orderBy('status'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [db, profile?.tenantId]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'inventory'));
  }, [db, profile?.tenantId]);

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'orders'),
      where('status', 'in', ['DRAFT', 'SENT'])
    );
  }, [db, profile?.tenantId]);

  const { data: recentVerifications, isLoading: loadingVerif } = useCollection(verificationsQuery);
  const { data: pendingIncidents, isLoading: loadingIncidents, error: incidentsError } = useCollection(incidentsQuery);
  const { data: inventoryItems } = useCollection(inventoryQuery);
  const { data: activeOrders } = useCollection(ordersQuery);

  const lastVerification = recentVerifications?.[0];

  const lowStockItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(item => item.currentStock <= item.minStock);
  }, [inventoryItems]);

  const stats = [
    { 
      label: 'Estado Sanitario', 
      value: lastVerification ? (lastVerification.overallResult === 'PASS' ? 'APTO' : 'NO APTO') : 'PENDIENTE', 
      sub: lastVerification ? `Control: ${lastVerification.verificationDate}` : 'Sin registros hoy',
      icon: Droplets, 
      color: lastVerification?.overallResult === 'PASS' ? 'text-green-600' : lastVerification?.overallResult === 'FAIL' ? 'text-red-600' : 'text-blue-600', 
      bg: lastVerification?.overallResult === 'PASS' ? 'bg-green-50' : 'bg-blue-50', 
      bar: lastVerification?.overallResult === 'PASS' ? 'bg-green-600' : 'bg-red-600' 
    },
    { 
      label: 'Incidencias Activas', 
      value: pendingIncidents?.length.toString() || '0', 
      sub: 'Atención necesaria',
      icon: MessageSquare, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      bar: 'bg-blue-600' 
    },
    { 
      label: 'Alertas de Stock', 
      value: lowStockItems.length.toString(), 
      sub: lowStockItems.length > 0 ? 'Reponer urgente' : 'Almacén OK',
      icon: Package, 
      color: lowStockItems.length > 0 ? 'text-orange-600' : 'text-slate-600', 
      bg: lowStockItems.length > 0 ? 'bg-orange-50' : 'bg-slate-50', 
      bar: 'bg-orange-500' 
    },
    { 
      label: 'Pedidos', 
      value: activeOrders?.length.toString() || '0', 
      sub: 'En curso',
      icon: ShoppingCart, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      bar: 'bg-accent' 
    },
  ];

  if (loadingProfile) {
    return (
      <DashboardLayout>
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Cargando perfil técnico...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-primary uppercase">Panel de Control</h2>
            <p className="text-muted-foreground font-medium">
              Bienvenido, {profile?.displayName || 'Técnico'}. Resumen operativo de {profile?.tenantName || 'tu hotel'}.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none gap-2 border-primary text-primary font-bold" asChild>
              <Link href="/dashboard/logbook">
                <Plus className="w-4 h-4" /> Nueva Incidencia
              </Link>
            </Button>
            <Button className="flex-1 md:flex-none gap-2 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20" asChild>
              <Link href="/dashboard/verifications">
                <ShieldCheck className="w-4 h-4" /> Nuevo Control
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
              <div className={cn("h-1.5 w-full", stat.bar)} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {stat.label}
                </CardTitle>
                <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("text-3xl font-black tracking-tighter", stat.color)}>{stat.value}</div>
                <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase truncate">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Area: Priority Logbook Tasks (MÁXIMA IMPORTANCIA) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-xl flex flex-col overflow-hidden bg-white ring-1 ring-slate-200">
              <CardHeader className="bg-slate-50 border-b py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter text-primary">
                      <ClipboardList className="w-6 h-6 text-accent" />
                      Logbook Operativo: Tareas y Averías
                    </CardTitle>
                    <CardDescription className="text-sm font-medium mt-1">Intervenciones técnicas urgentes y mantenimiento correctivo.</CardDescription>
                  </div>
                  {pendingIncidents && pendingIncidents.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse px-3 py-1 font-black">
                      {pendingIncidents.length} PENDIENTES
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {incidentsError ? (
                    <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-red-800 text-sm">
                      <p className="font-bold mb-1">Error al cargar incidencias:</p>
                      <p className="opacity-80">{(incidentsError as any).message || 'Compruebe los índices de Firestore en la consola.'}</p>
                    </div>
                  ) : loadingIncidents ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl" />)}
                    </div>
                  ) : pendingIncidents && pendingIncidents.length > 0 ? (
                    <div className="space-y-3">
                      {pendingIncidents.map((inc) => (
                        <div key={inc.id} className={cn(
                          "p-5 border-l-4 rounded-2xl flex justify-between items-start transition-all bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-300",
                          inc.priority === 'CRITICA' ? "border-l-red-500" : "border-l-blue-400"
                        )}>
                          <div className="max-w-[85%] space-y-2">
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                                inc.priority === 'CRITICA' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                              )}>{inc.priority}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{inc.relatedArea || 'Área General'}</span>
                            </div>
                            <h4 className="font-bold text-base text-slate-900 leading-tight">{inc.title}</h4>
                            <p className="text-xs text-muted-foreground italic line-clamp-2">"{inc.description}"</p>
                            <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground font-bold uppercase">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> 
                                {inc.createdAt?.toDate ? inc.createdAt.toDate().toLocaleString() : 'Reciente'}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5" /> 
                                {inc.status}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent/10 hover:text-accent" asChild>
                            <Link href="/dashboard/logbook"><ArrowRight className="w-5 h-5" /></Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-16 text-center border-2 border-dashed rounded-[2rem] bg-slate-50/50">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="font-black text-slate-900 text-lg uppercase tracking-tight">Sin incidencias abiertas</p>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Todas las averías registradas han sido resueltas.</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-5 border-t flex justify-between items-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sincronización en tiempo real activa</p>
                <Button variant="link" size="sm" className="text-xs font-black text-accent p-0 h-auto gap-1" asChild>
                  <Link href="/dashboard/logbook">Ver historial completo <ArrowRight className="w-3.5 h-3.5" /></Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar: Compliance & Stock Alerts */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm overflow-hidden ring-1 ring-slate-200">
              <CardHeader className="bg-white border-b pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
                  <Activity className="w-5 h-5 text-accent" />
                  Estado Sanitario
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Verificación RD 3/2023</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingVerif ? (
                  <div className="h-32 flex items-center justify-center animate-pulse bg-slate-50 rounded-xl text-xs font-bold text-muted-foreground">Sincronizando...</div>
                ) : !lastVerification ? (
                  <div className="p-6 text-center border-2 border-dashed rounded-xl bg-slate-50 space-y-3">
                    <Droplets className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-[10px] text-muted-foreground font-bold italic leading-tight">No hay controles registrados recientemente.</p>
                    <Button variant="outline" size="sm" className="w-full text-[10px] font-black h-8 text-accent uppercase" asChild>
                      <Link href="/dashboard/verifications">Iniciar Control</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={cn(
                      "p-5 rounded-2xl text-center space-y-1 shadow-sm",
                      lastVerification.overallResult === 'PASS' ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                    )}>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Resultado Global</p>
                      <div className={cn(
                        "text-4xl font-black",
                        lastVerification.overallResult === 'PASS' ? "text-green-600" : "text-red-600"
                      )}>
                        {lastVerification.overallResult === 'PASS' ? 'APTO' : 'NO APTO'}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground mt-1">{lastVerification.verificationDate}</p>
                    </div>
                    
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground font-bold uppercase">Firma Digital:</span>
                        <span className="flex items-center gap-1 text-green-600 font-black"><ShieldCheck className="w-3.5 h-3.5" /> VALIDADA</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-muted-foreground font-bold uppercase">Instrumento:</span>
                        <span className="font-bold text-slate-700">{lastVerification.instrumentType}</span>
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" className="w-full text-[10px] font-black h-10 text-primary uppercase tracking-widest" asChild>
                      <Link href="/dashboard/verification-equipment?tab=history">Detalles del Control</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {lowStockItems.length > 0 && (
              <Card className="border-none shadow-sm border-orange-100 bg-orange-50/30 ring-1 ring-orange-100">
                <CardHeader className="pb-3 border-b border-orange-100/50">
                  <CardTitle className="text-sm font-black text-orange-600 flex items-center gap-2 uppercase tracking-widest">
                    <AlertTriangle className="w-4 h-4" /> Alerta de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-orange-100 shadow-sm">
                      <div className="max-w-[70%] space-y-0.5">
                        <p className="text-xs font-black text-slate-900 truncate uppercase">{item.name}</p>
                        <p className="text-[10px] font-bold text-orange-600">Quedan: {item.currentStock} {item.unit}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50" asChild>
                        <Link href="/dashboard/inventory"><Plus className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  ))}
                  <Button variant="link" size="sm" className="w-full text-[10px] font-black text-orange-700 p-0 h-auto uppercase tracking-tighter" asChild>
                    <Link href="/dashboard/inventory">Ver todo el almacén <ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="p-6 bg-primary rounded-[2rem] text-white relative overflow-hidden group shadow-lg shadow-primary/20">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-20 h-20" />
              </div>
              <h4 className="font-black text-[10px] mb-1 uppercase tracking-widest text-accent">Garantía Sanitaria</h4>
              <p className="text-[11px] text-white/80 font-medium leading-relaxed mb-5">
                Registros protegidos legalmente según los estándares de PrestoApp.
              </p>
              <Button size="sm" variant="secondary" className="w-full text-[10px] font-black h-10 text-primary uppercase shadow-md hover:bg-white" asChild>
                <Link href="/dashboard/pool-protocols?tab=manual">Manual Técnico V4</Link>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
