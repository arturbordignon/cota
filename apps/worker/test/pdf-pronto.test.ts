import { describe, expect, it, vi } from 'vitest';

import { registrarPdfPronto } from '../src/pdf-pronto.js';

function montar(count: number | Error) {
  const updateMany = vi.fn(async () => {
    if (count instanceof Error) throw count;
    return { count };
  });
  const logger = { warn: vi.fn(), error: vi.fn() };
  const notificar = vi.fn(async () => undefined);
  return { deps: { prisma: { proposal: { updateMany } }, logger, notificar }, updateMany, logger, notificar };
}

describe('registrarPdfPronto', () => {
  it('saves the PDF on the proposal and notifies its author', async () => {
    const { deps, updateMany, notificar } = montar(1);
    await expect(registrarPdfPronto(deps, { id: '7', proposalId: 'p1' }, 'contas/c/p1.pdf')).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { pdfObjectKey: 'contas/c/p1.pdf' } });
    expect(notificar).toHaveBeenCalledWith('p1');
  });

  it('only logs when the proposal was deleted meanwhile', async () => {
    const { deps, logger, notificar } = montar(0);
    await expect(registrarPdfPronto(deps, { id: '8', proposalId: 'apagada' }, 'x.pdf')).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(notificar).not.toHaveBeenCalled();
  });

  it('never throws, so the worker keeps running', async () => {
    const { deps, logger } = montar(new Error('database down'));
    await expect(registrarPdfPronto(deps, { id: '9', proposalId: 'p2' }, 'x.pdf')).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledOnce();

    const falhaAoNotificar = montar(1);
    falhaAoNotificar.notificar.mockRejectedValueOnce(new Error('smtp'));
    await expect(registrarPdfPronto(falhaAoNotificar.deps, { proposalId: 'p3' }, 'x.pdf')).resolves.toBe(false);
  });
});
