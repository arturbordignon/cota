'use client';

import { useState } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

interface CheckoutButtonProps extends ButtonProps {
  planSlug: string;
  label: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export function CheckoutButton({ planSlug, label, onClick, ...props }: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!API_BASE) {
      window.alert('API base URL não configurado.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planSlug,
          successUrl: window.location.href,
          cancelUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao gerar checkout.' }));
        window.alert(error.message ?? 'Erro ao gerar checkout.');
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url as string;
      }
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível iniciar a cobrança agora. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button {...props} disabled={isLoading || props.disabled} onClick={handleClick}>
      {isLoading ? 'Redirecionando...' : label}
    </Button>
  );
}

interface PortalButtonProps extends ButtonProps {
  label: string;
}

export function PortalButton({ label, onClick, ...props }: PortalButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!API_BASE) {
      window.alert('API base URL não configurado.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro ao abrir portal.' }));
        window.alert(error.message ?? 'Erro ao abrir portal de cobrança.');
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url as string;
      }
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível abrir o portal de cobrança.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button {...props} disabled={isLoading || props.disabled} onClick={handleClick}>
      {isLoading ? 'Abrindo...' : label}
    </Button>
  );
}
