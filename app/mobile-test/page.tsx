// app/mobile-test/page.tsx
'use client';

import React from 'react';
import { Card } from '../../src/modules/shared/components/Card';
import { Grid } from '../../src/modules/shared/components/Grid';

export default function MobileTestPage() {
  const cards = [
    {
      title: 'Corte Moderno',
      description:
        'Um corte degradê perfeito para o dia a dia, com acabamento impecável.',
      image:
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=400',
    },
    {
      title: 'Barba de Respeito',
      description:
        'Alinhamento e hidratação profunda para manter sua barba sempre alinhada.',
      image:
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=400',
    },
    {
      title: 'Tratamento Facial',
      description:
        'Limpeza de pele e relaxamento total com toalha quente e massagem.',
      image:
        'https://images.unsplash.com/photo-1512690196236-407425109f0a?auto=format&fit=crop&q=80&w=400',
    },
    {
      title: 'Combo Premium',
      description: 'Corte + Barba + Lavagem com produtos de alta performance.',
      image:
        'https://images.unsplash.com/photo-1621605815841-aa1567f2b604?auto=format&fit=crop&q=80&w=400',
    },
  ];

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <section style={{ padding: '40px 0' }}>
        <header
          style={{
            textAlign: 'center',
            marginBottom: '40px',
            padding: '0 20px',
          }}
        >
          <h1
            className="font-display"
            style={{
              fontSize: '2.5rem',
              marginBottom: '16px',
              color: 'var(--accent-gold)',
            }}
          >
            Nossos Serviços
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            Experimente o melhor da barbearia clássica com um toque de
            modernidade. (Teste de Responsividade Mobile-First)
          </p>
        </header>

        <Grid>
          {cards.map((card, index) => (
            <Card key={index} {...card} />
          ))}
        </Grid>
      </section>
    </main>
  );
}
