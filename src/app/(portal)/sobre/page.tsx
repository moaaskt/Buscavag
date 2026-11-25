import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Filter, Globe } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Sobre o Buscavag | Portal Aberto de Vagas Tech',
  description:
    'Entenda como funciona a descoberta aberta e gratuita de vagas de tecnologia e desenvolvimento de software no Buscavag, com procedência transparente e curadoria anti-ruído.',
};

const PILLARS = [
  {
    icon: Globe,
    title: 'Acesso 100% gratuito e aberto',
    description:
      'Qualquer pessoa pode pesquisar oportunidades em engenharia de software, frontend, backend, fullstack, dados, mobile e DevOps sem criar conta, sem cadastro prévio e sem paywalls.',
  },
  {
    icon: ExternalLink,
    title: 'Transparência de procedência',
    description:
      'Cada vaga exibe claramente a fonte coletora original (Gupy, LinkedIn, Catho, GeekHunter, Programathor, Remotar e outras) com data de coleta e redirecionamento direto para candidatura.',
  },
  {
    icon: Filter,
    title: 'Curadoria anti-ruído e deduplicação',
    description:
      'Regras estritas filtram exclusivamente vagas reais de tecnologia e programação e aplicam deduplicação por fingerprint para evitar anúncios repetidos ou fora do setor.',
  },
];

export default function SobrePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <header className="space-y-2 border-b border-border/80 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Sobre o Buscavag
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Catálogo público aberto para descoberta rápida e direta de oportunidades em desenvolvimento de software e tecnologia no Brasil.
        </p>
      </header>

      <section className="rounded-xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Por que existe este portal público
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Encontrar vagas reais de programação muitas vezes exige navegar por dezenas de portais fragmentados, cadastros repetitivos e anúncios duplicados. O Buscavag centraliza oportunidades verificadas de tecnologia em uma interface neutra, rápida e indexável, levando você diretamente à fonte original da vaga.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2"
              >
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{pillar.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/60">
          <p className="text-xs text-muted-foreground font-mono">
            Sem cadastro obrigatório • Candidatura direta na fonte original
          </p>
          <Link href="/vagas" className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 w-fit')}>
            <span>Explorar vagas abertas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
