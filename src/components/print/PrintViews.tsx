'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toSignatureDataUri } from '@/components/orders/SignaturePad';
import type {
  ItemPaymentSummaryResponse,
  ServiceOrderResponse,
  TenantResponse,
} from '@/lib/types/api';
import type { LabelPrintFormat } from '@/lib/settings/PrintPreferencesContext';
import { formatBRL, formatDate, formatDateTime, maskCpfCnpj, maskPhoneBR } from '@/lib/utils/masks';
import { getWarrantyRemainingDays } from '@/lib/utils/permissions';

const TRACKING_BASE = (
  process.env.NEXT_PUBLIC_TRACKING_BASE_URL || 'http://localhost:8080/track'
).replace(/\/+$/, '');

export function PrintableOrderLabels({
  order,
  tenant,
  format,
}: {
  order: ServiceOrderResponse;
  tenant: TenantResponse | null;
  format: LabelPrintFormat;
}) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const entries = await Promise.all(
        order.items.map(async (item) => {
          const url = `${TRACKING_BASE}/${order.publicToken}?item=${item.itemIndex}`;
          const svg = await QRCode.toString(url, {
            type: 'svg',
            margin: 1,
            width: format === 'THERMAL_58MM' ? 110 : 120,
          });
          return [item.id, svg] as const;
        })
      );
      if (active) {
        setQrMap(Object.fromEntries(entries));
      }
    })();
    return () => {
      active = false;
    };
  }, [order, format]);

  if (format === 'THERMAL_58MM') {
    return (
      <div className="print-only mx-auto w-[54mm] text-black">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="print-break-avoid mb-4 border-b border-dashed border-black pb-3 text-center"
          >
            <p className="text-[11px] font-bold uppercase">{tenant?.name ?? 'BenchOS'}</p>
            <p className="mt-0.5 font-mono text-lg font-extrabold">#{item.tag}</p>
            <p className="text-[11px] font-semibold">
              {item.applianceType} · {item.brand}
            </p>
            {item.model && <p className="text-[10px]">{item.model}</p>}
            <p className="mt-0.5 text-[10px]">{order.customerName}</p>
            {qrMap[item.id] && (
              <div
                className="mx-auto my-2 flex justify-center"
                dangerouslySetInnerHTML={{ __html: qrMap[item.id] }}
              />
            )}
            <p className="text-[9px]">Acompanhe pelo QR Code</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="print-only text-black">
      <div className="grid grid-cols-2 gap-4">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="print-break-avoid flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-700 p-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {tenant?.name ?? 'BenchOS'}
              </p>
              <p className="font-mono text-xl font-extrabold leading-none">#{item.tag}</p>
              <p className="text-xs font-bold">
                {item.applianceType} · {item.brand}
              </p>
              {item.model && <p className="text-[11px] text-slate-700">{item.model}</p>}
              <p className="text-[11px] text-slate-700">
                {order.customerName} · {formatDate(order.createdAt)}
              </p>
              <p className="line-clamp-2 text-[10px] text-slate-600">{item.reportedIssue}</p>
            </div>
            {qrMap[item.id] && (
              <div
                className="shrink-0"
                dangerouslySetInnerHTML={{ __html: qrMap[item.id] }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrintableWarrantyReceipt({
  order,
  tenant,
  paymentsByItem,
}: {
  order: ServiceOrderResponse;
  tenant: TenantResponse | null;
  paymentsByItem: Record<string, ItemPaymentSummaryResponse[]>;
}) {
  const deliveredItems = order.items.filter((i) => i.status === 'DELIVERED');
  const itemsToRender = deliveredItems.length > 0 ? deliveredItems : order.items;
  const grandTotal = itemsToRender.reduce((acc, i) => acc + i.totalPrice, 0);

  const signedItem = [...itemsToRender]
    .filter((i) => Boolean(toSignatureDataUri(i.deliverySignatureSvg)))
    .sort(
      (a, b) =>
        new Date(b.deliveredAt ?? 0).getTime() - new Date(a.deliveredAt ?? 0).getTime()
    )[0];
  const signatureUri = signedItem ? toSignatureDataUri(signedItem.deliverySignatureSvg) : '';
  const signerLabel =
    signedItem?.deliverySignerName ||
    itemsToRender.find((i) => i.deliverySignerName)?.deliverySignerName ||
    order.customerName ||
    'Cliente';

  return (
    <div className="print-only text-black text-xs leading-relaxed">
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <h1 className="text-lg font-bold uppercase">{tenant?.name ?? 'BenchOS'}</h1>
          {tenant?.document && <p>CNPJ/CPF: {maskCpfCnpj(tenant.document)}</p>}
          {tenant?.phone && <p>Tel/WhatsApp: {maskPhoneBR(tenant.phone)}</p>}
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-bold">OS #{order.orderNumber}</p>
          <p>Emissão: {formatDate(new Date().toISOString())}</p>
          <p className="font-semibold uppercase">Comprovante &amp; Termo de Garantia</p>
        </div>
      </div>

      <div className="my-3 rounded border border-slate-400 p-2.5">
        <p>
          <strong>Cliente:</strong> {order.customerName ?? '—'} &nbsp;|&nbsp;{' '}
          <strong>Telefone:</strong> {order.customerPhone ? maskPhoneBR(order.customerPhone) : '—'}
        </p>
        <p>
          <strong>Entrada:</strong> {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="space-y-3">
        {itemsToRender.map((item) => {
          const warranty = getWarrantyRemainingDays(item);
          const payments = paymentsByItem[item.id] ?? [];
          return (
            <div key={item.id} className="print-break-avoid rounded border border-slate-400 p-3">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                <span className="font-mono font-bold">
                  #{item.tag} · {item.applianceType} {item.brand} {item.model ?? ''}
                </span>
                <span className="font-mono font-bold">{formatBRL(item.totalPrice)}</span>
              </div>
              <p className="mt-1.5">
                <strong>Defeito relatado:</strong> {item.reportedIssue}
              </p>
              {item.technicalDiagnosis && (
                <p>
                  <strong>Serviço / Diagnóstico:</strong> {item.technicalDiagnosis}
                </p>
              )}
              {payments.length > 0 && (
                <p>
                  <strong>Pagamento:</strong>{' '}
                  {payments.map((p) => `${p.paymentMethod} (${formatBRL(p.amount)})`).join(' + ')}
                </p>
              )}
              {item.status === 'DELIVERED' && item.warrantyDays > 0 && (
                <p className="mt-1 font-semibold">
                  Garantia: {item.warrantyDays} dias{' '}
                  {warranty.expiresAt
                    ? `(válida até ${formatDate(warranty.expiresAt.toISOString())})`
                    : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t-2 border-black pt-2 text-sm font-bold">
        <span>TOTAL CONSOLIDADO</span>
        <span className="font-mono">{formatBRL(grandTotal)}</span>
      </div>

      <p className="mt-4 text-[10px] text-slate-700">
        Termo de Garantia: A garantia cobre exclusivamente o defeito/serviço descrito acima pelo
        prazo indicado a contar da data de entrega, não cobrindo mau uso, quedas, ligação em
        voltagem incorreta ou violação do aparelho por terceiros.
      </p>

      <div className="mt-8 grid grid-cols-2 items-end gap-8 text-center text-[11px] print-break-avoid">
        <div>
          {signatureUri && <div className="h-16" />}
          <div className="border-t border-black pt-1">{tenant?.name ?? 'Oficina'}</div>
          <p className="text-[9.5px] text-slate-500">Responsável Técnico / Oficina</p>
        </div>
        <div>
          {signatureUri && (
            <div className="flex h-16 items-end justify-center pb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureUri}
                alt="Assinatura digital do cliente"
                className="max-h-15 max-w-full object-contain"
              />
            </div>
          )}
          <div className="border-t border-black pt-1">
            {signatureUri ? signerLabel : `Assinatura do Cliente (${signerLabel})`}
          </div>
          <p className="text-[9.5px] text-slate-500">
            {signatureUri && signedItem?.deliveredAt
              ? `Assinado digitalmente na retirada · ${formatDateTime(signedItem.deliveredAt)}`
              : 'Recebi os aparelhos em perfeitas condições'}
          </p>
        </div>
      </div>
    </div>
  );
}
