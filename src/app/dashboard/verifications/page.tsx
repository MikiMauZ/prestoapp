import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import VerificationForm from '@/components/verifications/VerificationForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewVerificationPage() {
  return (
    <DashboardLayout>
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </Button>
      </div>
      <VerificationForm />
    </DashboardLayout>
  );
}