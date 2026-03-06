
"use client"

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { History } from 'lucide-react';

export default function RemovedPage() {
  const router = useRouter();
  
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <History className="w-12 h-12 text-muted-foreground opacity-20" />
        </div>
        <h2 className="text-xl font-bold">Módulo no disponible</h2>
        <p className="text-muted-foreground">Esta sección ha sido retirada del sistema.</p>
        <Button onClick={() => router.push('/dashboard')}>Volver al Panel</Button>
      </div>
    </DashboardLayout>
  );
}
