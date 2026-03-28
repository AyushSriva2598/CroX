'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function DemoPage() {
  const router = useRouter();

  useEffect(() => {
    // The AI demo is now integrated into the main contract flow
    router.replace('/contracts/new');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ padding: 80, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Redirecting...</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          The AI features have been fully integrated into the contract creation flow.
          Taking you there now...
        </p>
      </div>
    </div>
  );
}
