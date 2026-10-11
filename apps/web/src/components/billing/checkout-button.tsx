'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button, type ButtonProps } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';

interface CheckoutButtonProps extends ButtonProps {
  planSlug: string;
  label: string;
}

function buscarMensagemErro(error: unknown, mensagemPadrao: string) {
  if (error instanceof Error) {
    return error.message;
  }
  return mensagemPadrao;
}

export function CheckoutButton({ planSlug, label, onClick, ...props }: CheckoutButtonProps) {
  const t = useTranslations('common');
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
      window.alert(buscarMensagemErro(error, 'Não foi possível iniciar a cobrança agora.'));
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
}

export function PortalButton({ label, onClick, ...props }: PortalButtonProps) {
  const t = useTranslations('common');
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
      window.alert(buscarMensagemErro(error, 'Não foi possível abrir o portal de cobrança.'));
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
