'use client';

import type { Route } from 'next';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, type ButtonProps } from '@/components/ui/button';
import { ApiError, useApi } from '@/hooks/use-api';

interface CheckoutButtonProps extends ButtonProps {
  planSlug: string;
  label: string;
  /** Receives a translated message; the page decides where to show it. */
  onFailure?: (message: string) => void;
}

function useMensagemDeCobranca() {
  const t = useTranslations('billing.errors');
  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 503) return t('unavailable');
    if (error instanceof ApiError && error.status === 403) return t('forbidden');
    return t('generic');
  };
}

export function CheckoutButton({ planSlug, label, onClick, onFailure, ...props }: CheckoutButtonProps) {
  const t = useTranslations('common');
  const mensagem = useMensagemDeCobranca();
  const api = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
    onClick?.(event);

    setIsLoading(true);
    try {
      const data = await api.post<{ url?: string }>('/billing/checkout', {
        planSlug,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      onFailure?.(mensagem(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      {...props}
      disabled={props.disabled}
      loading={isLoading}
      loadingText={t('loading.redirecting')}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}

interface PortalButtonProps extends ButtonProps {
  label: string;
  onFailure?: (message: string) => void;
}

export function PortalButton({ label, onClick, onFailure, ...props }: PortalButtonProps) {
  const t = useTranslations('common');
  const mensagem = useMensagemDeCobranca();
  const router = useRouter();
  const api = useApi();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
    onClick?.(event);

    setIsLoading(true);
    try {
      const data = await api.post<{ url?: string }>('/billing/portal', {});
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      // Accounts that never paid have no billing portal yet: show the plans.
      if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
        router.push('/plans' as Route);
        return;
      }
      onFailure?.(mensagem(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      {...props}
      disabled={props.disabled}
      loading={isLoading}
      loadingText={t('loading.opening')}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
