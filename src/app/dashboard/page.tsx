
"use client"

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { 
  Droplets, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Plus,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, where } from 'firebase/firestore';

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const verificationsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'verifications'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
  }, [db, profile?.tenantId]);

  const incidentsQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(
      collection(db, 'tenants', profile.tenantId, 'logbook'),
      where('status', '==', 'ABIERTO')
    );
  }, [db, profile?.tenantId]);

  const { data: recentVerifications } = useCollection(verificationsQuery);
  const { data: openIncidents } = useCollection(incidentsQuery);

  const stats = [
    { 
      label: 'Verificaciones Mes', 
      value: recentVerifications?.length || '0', 
      icon: Droplets, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      bar: 'bg-blue-600' 
    },
    { 
      label: 'Incidencias Abiertas', 
      value: openIncidents?.length || '0', 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50', 
      bar: 'bg-red-600' 
    },
    { 
      label: 'Actividad Reciente', 
      value: recentVerifications ? 'Activa' : 'Pendiente', 
      icon: Activity, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      bar: 'bg-accent' 
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Panel de Control</h2>
          <p className="text-muted-foreground">Bienvenido, {profile?.displayName || 'Técnico'}. Resumen operativo de {profile?.tenantName || 'tu hotel'}.</p>
        </div>
        <Button className="gap-2 bg-accent hover:bg-accent/90" asChild>
          <Link href="/dashboard/verifications">
            <Plus className="w-4 h-4" />
            Nueva Verificación
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <div className={cn("h-1 w-full", stat.bar)} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </CardTitle>
              <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Historial Reciente de Verificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!recentVerifications || recentVerifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic bg-secondary/10 rounded-lg">
                  No hay verificaciones recientes registradas.
                </div>
              ) : recentVerifications.map((v) => (
                <div key={v.id} className="flex items-center gap-4 p-4 rounded-lg border bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border shadow-sm shrink-0">
                    <Droplets className="text-primary w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-bold truncate text-primary">Control {v.verificationDate}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Ref: {v.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {v.lockedAt ? new Date(v.lockedAt).toLocaleTimeString() : 'N/A'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Registro Bloqueado</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xs font-bold px-3 py-1 rounded",
                      v.overallResult === 'PASS' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                    )}>
                      {v.overallResult === 'PASS' ? 'APTO' : 'NO APTO'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Próximas Tareas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {openIncidents && openIncidents.length > 0 ? (
              openIncidents.slice(0, 3).map((inc) => (
                <div key={inc.id} className={cn(
                  "p-4 border-l-4 rounded-r-lg",
                  inc.priority === 'CRITICA' ? "border-red-500 bg-red-50" : "border-blue-400 bg-blue-50"
                )}>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mb-1",
                    inc.priority === 'CRITICA' ? "text-red-600" : "text-blue-500"
                  )}>{inc.priority}</p>
                  <h4 className="font-bold text-sm mb-1">{inc.title}</h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{inc.description}</p>
                </div>
              ))
            ) : (
              <div className="p-4 border-l-4 border-green-500 bg-green-50 rounded-r-lg">
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Todo al día</p>
                <h4 className="font-bold text-sm mb-1">Sin incidencias abiertas</h4>
                <p className="text-xs text-muted-foreground">Operativa técnica estable.</p>
              </div>
            )}
            
            <div className="p-6 bg-primary rounded-xl text-white mt-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-20">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <h4 className="font-bold text-sm mb-2">Estado Normativo</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                Recuerda que las fotos del patrón son obligatorias según RD 3/2023 para que el registro sea legalmente vinculante.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
