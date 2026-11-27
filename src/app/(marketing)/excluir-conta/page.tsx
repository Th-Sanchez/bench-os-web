import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageCircle, ShieldAlert, Trash2 } from 'lucide-react';
import { getMarketingHomePath } from '@/lib/server/marketingHost';
import { buildSupportWhatsappUrl, getSiteUrl, getSupportEmail } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Exclusão de Conta e Dados',
  description:
    'Como solicitar a exclusão definitiva da sua conta BenchOS e dos dados associados em conformidade com a LGPD e as políticas da Google Play.',
  alternates: {
    canonical: `${getSiteUrl()}/excluir-conta`,
  },
};

export default async function ExcluirContaPage() {
  const homePath = await getMarketingHomePath();
  const supportEmail = getSupportEmail();
  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(
    'Solicitação de exclusão de conta BenchOS'
  )}&body=${encodeURIComponent(
    'Olá, equipe BenchOS.\n\nSolicito a exclusão definitiva da minha conta e dos dados associados.\n\n- Nome da oficina:\n- E-mail de acesso (Dono):\n- CNPJ/CPF cadastrado:\n'
  )}`;
  const whatsappUrl = buildSupportWhatsappUrl(
    'Olá! Gostaria de solicitar a exclusão da minha conta BenchOS e dos dados associados.'
  );

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <article className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-10 space-y-6">
          <header className="border-b border-slate-200 pb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
              LGPD · Exclusão de Conta e Dados
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Solicitar exclusão da conta BenchOS
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Você tem controle total sobre os seus dados. Siga os passos abaixo para solicitar a
              exclusão definitiva da sua conta de oficina (ou do seu acesso de operador) no
              aplicativo Android e no Painel Web BenchOS.
            </p>
          </header>

          <section className="space-y-3 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              1. Como solicitar a exclusão
            </h2>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Envie um e-mail para{' '}
                <a
                  href={mailtoHref}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  {supportEmail}
                </a>{' '}
                usando o mesmo e-mail cadastrado na conta do <strong>Dono (OWNER)</strong> da
                oficina.
              </li>
              <li>
                Informe o <strong>nome da oficina</strong> e o <strong>e-mail de login</strong>{' '}
                para validação de titularidade e segurança.
              </li>
              <li>
                Se você for um <strong>Atendente</strong> ou <strong>Técnico</strong>, o responsável
                pela oficina pode desativar seu acesso imediatamente em{' '}
                <span className="font-mono text-xs">Ajustes &gt; Equipe</span>, ou você pode
                solicitar a exclusão do seu cadastro pelo e-mail acima.
              </li>
            </ol>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={mailtoHref}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700"
              >
                <Mail className="h-4 w-4" />
                Solicitar exclusão por e-mail
              </a>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  Atendimento via WhatsApp
                </a>
              )}
            </div>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              2. Quais dados são excluídos
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Cadastro da oficina (nome, documento, endereço, logo, chave Pix e parâmetros).</li>
              <li>Usuários operadores (nome, e-mail, credenciais e tokens de notificação push).</li>
              <li>
                Clientes, Ordens de Serviço, orçamentos, assinaturas digitais, histórico de peças e
                lançamentos financeiros internos.
              </li>
              <li>
                Fotos de aparelhos armazenadas em nuvem (S3) vinculadas às Ordens de Serviço da
                oficina.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              3. Prazo de processamento e retenção legal
            </h2>
            <p>
              Após a confirmação da titularidade, a exclusão definitiva dos dados nos bancos ativos
              e no armazenamento de arquivos é concluída em até <strong>15 dias úteis</strong>, com
              envio de confirmação por e-mail.
            </p>
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                <strong>Importante:</strong> a exclusão é permanente e irreversível. Caso deseje
                guardar histórico de recibos ou relatórios financeiros para obrigações fiscais da
                sua oficina, exporte/salve seus dados antes de confirmar a exclusão. Backups
                criptografados de segurança rotacionam automaticamente em até 30 dias.
              </p>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
            <Link href="/privacidade" className="font-semibold text-blue-600 hover:underline">
              Ver Política de Privacidade completa →
            </Link>
            <Link href={homePath} className="hover:text-slate-800">
              ← Voltar ao início
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
