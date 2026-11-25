'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { Button, Modal, Spinner } from '@/components/ui/Primitives';
import { ordersApi } from '@/lib/api/endpoints';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { WhatsappMessageStage } from '@/lib/types/api';

const STAGES: { key: WhatsappMessageStage; pt: string; en: string }[] = [
  { key: 'INTAKE', pt: 'Entrada / Recebimento', en: 'Intake' },
  { key: 'QUOTE', pt: 'Orçamento', en: 'Quote' },
  { key: 'READY', pt: 'Pronto p/ Retirada', en: 'Ready' },
];

function WhatsappStageInner({
  onClose,
  orderId,
  orderNumber,
  initialStage,
}: {
  onClose: () => void;
  orderId: string;
  orderNumber: number;
  initialStage?: WhatsappMessageStage;
}) {
  const { locale, t } = useI18n();
  const [stage, setStage] = useState<WhatsappMessageStage>(initialStage ?? 'QUOTE');
  const [copied, setCopied] = useState(false);

  const linkQuery = useQuery({
    queryKey: ['order-whatsapp', orderId, stage],
    queryFn: () => ordersApi.getOrderWhatsappLink(orderId, stage),
  });

  async function handleCopy() {
    if (!linkQuery.data?.message) return;
    await navigator.clipboard.writeText(linkQuery.data.message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`WhatsApp · OS #${orderNumber}`}
      subtitle={
        locale === 'en'
          ? 'Choose stage template to preview and send'
          : 'Escolha o estágio da mensagem consolidada'
      }
      footer={
        <>
          <Button variant="outline" onClick={handleCopy} disabled={!linkQuery.data}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? t.common.copied : t.common.copy}
          </Button>
          <Button
            variant="success"
            disabled={!linkQuery.data}
            onClick={() => {
              if (linkQuery.data?.whatsappUrl) {
                window.open(linkQuery.data.whatsappUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <MessageCircle className="h-4 w-4" />
            {t.common.openWhatsapp}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {STAGES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setStage(option.key)}
              className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${
                stage === option.key
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {locale === 'en' ? option.en : option.pt}
            </button>
          ))}
        </div>

        {linkQuery.isLoading ? (
          <Spinner />
        ) : linkQuery.data ? (
          <pre className="whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 font-sans text-xs leading-relaxed text-slate-800">
            {linkQuery.data.message}
          </pre>
        ) : null}
      </div>
    </Modal>
  );
}

export function WhatsappStageModal({
  open,
  onClose,
  orderId,
  orderNumber,
  initialStage,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: number;
  initialStage?: WhatsappMessageStage;
}) {
  if (!open) return null;
  return (
    <WhatsappStageInner
      key={`${orderId}-${initialStage ?? 'QUOTE'}`}
      onClose={onClose}
      orderId={orderId}
      orderNumber={orderNumber}
      initialStage={initialStage}
    />
  );
}
