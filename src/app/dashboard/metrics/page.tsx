
"use client"

import React, { useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Users,
  Calendar
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';

const COLORS = ['#28ACDA', '#1F4AA8', '#3b82f6', '#94a3b8'];

export default function MetricsPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'userProfiles', user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userProfileRef);

  const logbookQuery = useMemoFirebase(() => {
    if (!db || !profile?.tenantId) return null;
    return query(collection(db, 'tenants', profile.tenantId, 'logbook'), orderBy('createdAt', 'desc'));
  }, [db, profile?.tenantId]);

  const { data: logbookEntries } = useCollection(logbookQuery);

  const stats = useMemo(() => {
    if (!logbookEntries) return { total: 0, critical: 0, resolved: 0 };
    return {
      total: logbookEntries.length,
      critical: logbookEntries.filter(e => e.priority === 'CRITICA').length,
      resolved: logbookEntries.filter(e => e.status === 'RESUELTO' || e.status === 'CERRADO').length,
    };
  }, [logbookEntries]);

  const areaData = useMemo(() => {
    if (!logbookEntries) return [];
    const counts: Record<string, number> = {};
    logbookEntries.forEach(e => {
      const area = e.relatedArea || 'Otras';
      counts[area] = (counts[area] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [logbookEntries]);

  const priorityData = useMemo(() => {
    if (!logbookEntries) return [];
    const counts: Record<string, number> = {};
    logbookEntries.forEach(e => {
      counts[e.priority] = (counts[e.priority] || 0) + 1;
    });
    const colors: Record<string, string> = {
      'CRITICA': '#ef4444',
      'ALTA': '#f97316',
      'MEDIA': '#3b82f6',
      'BAJA': '#94a3b8'
    };
    return Object.entries(counts).map(([name, value]) => ({ 
      name, 
      value,
      fill: colors[name] || '#94a3b8'
    }));
  }, [logbookEntries]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary">Métricas de Rendimiento</h2>
            <p className="text-muted-foreground">Analítica basada en la operativa real del hotel.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Incidencias Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-xs font-bold text-muted-foreground mt-1">Acumuladas en sistema</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resueltas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-xs font-bold text-muted-foreground mt-1">Eficacia operativa técnica</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Críticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs font-bold text-muted-foreground mt-1">Requieren atención inmediata</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Distribución por Área</CardTitle>
              <CardDescription>Volumen de intervenciones por departamento</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" fill="#28ACDA" radius={[0, 4, 4, 0]} barSize={30}>
                      {areaData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">Sin datos de áreas todavía</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Prioridad de Carga</CardTitle>
              <CardDescription>Desglose por severidad de las incidencias</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">Sin datos de prioridad</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
