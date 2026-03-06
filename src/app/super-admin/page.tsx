
"use client"

import React from 'react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  HardDrive, 
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export default function SuperAdminDashboard() {
  const db = useFirestore();

  const tenantsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'tenants'));
  }, [db]);

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'userProfiles'));
  }, [db]);

  const { data: tenants } = useCollection(tenantsQuery);
  const { data: users } = useCollection(usersQuery);

  const stats = [
    { label: 'Hoteles Activos', val: tenants?.length || '0', icon: Building2, color: 'text-blue-500', trend: 'Gestión Multi-tenant' },
    { label: 'Usuarios Totales', val: users?.length || '0', icon: Users, color: 'text-purple-500', trend: 'Control de Acceso' },
    { label: 'Estado Sistema', val: '100%', icon: HardDrive, color: 'text-amber-500', trend: 'Operativo' },
  ];

  return (
    <SuperAdminLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((s) => (
          <Card key={s.label} className="bg-slate-900/50 border-slate-800 text-slate-200 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">{s.label}</CardTitle>
              <s.icon className={cn("w-5 h-5", s.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{s.val}</div>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{s.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-slate-900/50 border-slate-800 text-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Estado del Sistema</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Resumen de infraestructura global</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-slate-400">
            <div className="flex flex-col items-center gap-4">
              <Activity className="w-12 h-12 text-green-500 animate-pulse" />
              <p className="font-bold uppercase tracking-widest text-xs">Todos los servicios operativos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
