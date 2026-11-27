'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { buildVagasHref } from '@/utils/publicJobFormatters';

export interface PublicSearchBarProps {
  initialQuery?: string;
}

export function PublicSearchBar({ initialQuery }: PublicSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get('q') ?? '').trim();

  const [query, setQuery] = useState(initialQuery ?? '');
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlQueryRef = useRef<string>(urlQuery);

  // Sync local query state when URL searchParams change externally (e.g. Back/Forward or empty-state pill click)
  useEffect(() => {
    if (prevUrlQueryRef.current !== urlQuery) {
      prevUrlQueryRef.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  // 400ms debounced reactive search for >= 3 characters or clearing an active URL query (D-06)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = query.trim();
    if (trimmed === urlQuery) {
      return;
    }

    const shouldAutoSync =
      trimmed.length >= 3 || (trimmed.length === 0 && urlQuery.length > 0);

    if (!shouldAutoSync) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      prevUrlQueryRef.current = trimmed;
      startTransition(() => {
        router.replace(buildVagasHref({ q: trimmed, page: 1 }), {
          scroll: false,
        });
      });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query, urlQuery, router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const trimmed = query.trim();
    prevUrlQueryRef.current = trimmed;
    startTransition(() => {
      router.push(buildVagasHref({ q: trimmed, page: 1 }));
    });
  };

  const handleClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setQuery('');
    if (urlQuery.length > 0) {
      prevUrlQueryRef.current = '';
      startTransition(() => {
        router.replace(buildVagasHref({ q: '', page: 1 }), { scroll: false });
      });
    }
  };

  return (
    <form
      role="search"
      aria-label="Buscar oportunidades de tecnologia"
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-2"
    >
      <div className="min-w-0 flex-1 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
          placeholder="Buscar por cargo, tecnologia (React, Node.js, Python) ou empresa..."
          aria-label="Buscar vagas por cargo, tecnologia ou empresa"
          className="h-10 pl-9 pr-9 bg-background"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca"
            title="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="h-10 sm:w-auto gap-1.5 px-4"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span>Buscar</span>
      </Button>
    </form>
  );
}
