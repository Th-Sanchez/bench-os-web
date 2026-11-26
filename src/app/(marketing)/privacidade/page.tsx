import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { getMarketingHomePath } from '@/lib/server/marketingHost';
import { getSiteUrl, getSupportEmail } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Como o BenchOS coleta, armazena, protege e trata dados pessoais no Painel Web, no App Android e no link público /track em conformidade com a LGPD.',
  alternates: {
    canonical: `${getSiteUrl()}/privacidade`,
  },
};

export default async function PrivacidadePage() {
  const homePath = await getMarketingHomePath();
  const supportEmail = getSupportEmail();

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <article className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-10 space-y-6">
          <header className="border-b border-slate-200 pb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              LGPD · Lei nº 13.709/2018
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Política de Privacidade do BenchOS
            </h1>
            <p className="mt-2 text-xs font-mono text-slate-500">
              Última atualização: Novembro de 2026 · Aplicável ao site benchos.app.br, Painel Web
              (app.benchos.app.br), API (/track) e Aplicativo Android BenchOS.
            </p>
          </header>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              1. Quem somos e papéis na LGPD
            </h2>
            <p>
              O <strong>BenchOS</strong> é uma plataforma de gestão operacional e financeira para
              assistências técnicas de bancada. Em relação aos dados cadastrais das oficinas
              assinantes e seus usuários (donos, atendentes e técnicos), o BenchOS atua como{' '}
              <strong>Controlador</strong>. Em relação aos dados dos clientes finais inseridos pela
              oficina nas Ordens de Serviço, a oficina assinante é a <strong>Controladora</strong>{' '}
              e o BenchOS atua como <strong>Operador</strong> de dados pessoais.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              2. Dados coletados e finalidades
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Dados de conta da oficina e equipe:</strong> nome da oficina, CPF/CNPJ,
                telefone, endereço, horário de atendimento, chave Pix (opcional), nome, e-mail,
                cargo e senha criptografada dos usuários — usados para autenticação, operação do
                sistema e emissão de recibos.
              </li>
              <li>
                <strong>Dados de clientes e Ordens de Serviço:</strong> nome, telefone/WhatsApp,
                dados do aparelho (marca, modelo, número de série, defeito), fotos registradas no
                recebimento ou diagnóstico, orçamento, avaliação pós-entrega e assinatura digital
                de retirada (quando habilitada pela oficina) — usados exclusivamente para gerenciar
                o reparo, disponibilizar o acompanhamento no link público{' '}
                <span className="font-mono">/track</span> e comprovar garantia/entrega.
              </li>
              <li>
                <strong>Dados financeiros internos:</strong> receitas, despesas, catálogo de peças,
                pedidos de compra e comissões — acessíveis somente ao perfil Dono da respectiva
                oficina.
              </li>
              <li>
                <strong>Telemetria técnica e estabilidade:</strong> identificadores técnicos de
                requisição, falhas de aplicação (via Sentry) e tokens de notificação push — usados
                para manter a disponibilidade, corrigir erros e entregar alertas operacionais, sem
                venda ou uso publicitário de dados pessoais.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              3. Permissões do Aplicativo Android
            </h2>
            <p>
              O aplicativo BenchOS para Android solicita apenas permissões estritamente ligadas à
              rotina da oficina, sempre sob ação do usuário:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Câmera:</strong> usada para fotografar aparelhos na entrada/bancada e para
                ler o QR Code de etiquetas de Ordens de Serviço.
              </li>
              <li>
                <strong>Fotos / Mídia:</strong> usada quando o usuário escolhe anexar imagens da
                galeria na OS ou enviar a logo da oficina.
              </li>
              <li>
                <strong>Notificações Push:</strong> usadas para avisar a equipe quando um cliente
                aprova orçamento no link <span className="font-mono">/track</span> ou em alertas
                operacionais configurados.
              </li>
              <li>
                <strong>Armazenamento local (cache offline):</strong> mantém cópia temporária no
                dispositivo para consulta de OS sem conexão Wi-Fi, podendo ser limpa a qualquer
                momento em Ajustes.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              4. Compartilhamento e operadores de infraestrutura
            </h2>
            <p>
              O BenchOS <strong>não vende, não aluga e não compartilha</strong> dados pessoais com
              terceiros para fins de publicidade. O tratamento utiliza provedores essenciais de
              infraestrutura em nuvem (hospedagem de servidores, banco de dados PostgreSQL,
              armazenamento de imagens S3 compatível, envio de notificações push Expo/Firebase e
              monitoramento técnico de erros), sempre sob criptografia em trânsito (HTTPS/TLS) e
              isolamento lógico por oficina (<span className="font-mono">tenant_id</span>).
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              5. Segurança, retenção e exclusão de dados
            </h2>
            <p>
              Adotamos senhas armazenadas com hash seguro, sessões web com cookies{' '}
              <span className="font-mono">HttpOnly</span> criptografados (AES-256-GCM), controle de
              acesso por perfil (Dono, Atendente e Técnico) e isolamento multi-tenant no banco de
              dados.
            </p>
            <p>
              Os dados permanecem armazenados enquanto a conta da oficina estiver ativa ou pelo
              prazo necessário ao cumprimento de obrigações legais e garantias de serviço. O titular
              ou responsável pela oficina pode solicitar a exportação ou exclusão definitiva da
              conta e dos dados associados enviando um e-mail para{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                {supportEmail}
              </a>
              . As solicitações de exclusão são processadas em até 15 dias úteis.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              6. Direitos do titular e contato
            </h2>
            <p>
              Nos termos do art. 18 da LGPD, você pode solicitar confirmação de tratamento, acesso,
              correção de dados incompletos/desatualizados, anonimização, portabilidade ou
              eliminação de dados. Para clientes finais de uma oficina, a solicitação deve ser
              direcionada diretamente à oficina responsável pela OS, que conta com total suporte do
              BenchOS para atendimento.
            </p>
            <p>
              Canal oficial de privacidade e suporte:{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                {supportEmail}
              </a>
              .
            </p>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
            <Link href="/termos" className="font-semibold text-blue-600 hover:underline">
              Ler também: Termos de Uso →
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
