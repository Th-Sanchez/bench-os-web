import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { getMarketingHomePath } from '@/lib/server/marketingHost';
import { getSiteUrl, getSupportEmail } from '@/lib/siteConfig';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Condições gerais de uso do BenchOS — plataforma SaaS para gestão de assistências técnicas de bancada.',
  alternates: {
    canonical: `${getSiteUrl()}/termos`,
  },
};

export default async function TermosPage() {
  const homePath = await getMarketingHomePath();
  const supportEmail = getSupportEmail();

  return (
    <div className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <article className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-10 space-y-6">
          <header className="border-b border-slate-200 pb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <FileText className="h-3.5 w-3.5" />
              Termos de Uso do Serviço
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Termos de Uso do BenchOS
            </h1>
            <p className="mt-2 text-xs font-mono text-slate-500">
              Última atualização: Novembro de 2026
            </p>
          </header>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">1. Aceitação e Objeto</h2>
            <p>
              Ao criar uma conta ou utilizar o <strong>BenchOS</strong> (Painel Web, Aplicativo
              Android e páginas públicas <span className="font-mono">/track</span> e{' '}
              <span className="font-mono">/receipt</span>), você concorda com estes Termos de Uso e
              com a nossa{' '}
              <Link href="/privacidade" className="font-semibold text-blue-600 hover:underline">
                Política de Privacidade
              </Link>
              . O BenchOS oferece software como serviço (SaaS) voltado à gestão de Ordens de
              Serviço, bancada, peças e controle financeiro de assistências técnicas.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              2. Conta, Segurança e Responsabilidades da Oficina
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                O responsável pela oficina (perfil Dono) responde pela veracidade das informações
                cadastradas e pela guarda das credenciais de acesso de sua equipe.
              </li>
              <li>
                A oficina é integralmente responsável pela prestação dos serviços técnicos, prazos,
                orçamentos, termos de garantia, emissão fiscal e atendimento aos seus clientes
                finais.
              </li>
              <li>
                Quando a oficina configura uma chave Pix, o BenchOS apenas gera o código BR Code
                padrão Banco Central para conveniência no recebimento; o BenchOS não intermedia,
                custodia ou garante transações financeiras entre a oficina e seus clientes.
              </li>
              <li>
                É proibido utilizar a plataforma para armazenar conteúdo ilícito, tentar acessar
                dados de outras oficinas ou realizar engenharia reversa/ataques automatizados.
              </li>
            </ul>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              3. Planos, Teste Grátis e Cancelamento
            </h2>
            <p>
              Novas oficinas podem experimentar o sistema durante o período de teste gratuito
              informado na página comercial. Após a contratação de um plano pago, a cobrança ocorre
              de forma recorrente conforme o plano escolhido, sem multa de fidelidade. Você pode
              cancelar a qualquer momento, mantendo acesso até o fim do ciclo já pago.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              4. Disponibilidade e Evolução Contínua
            </h2>
            <p>
              Empregamos boas práticas de nuvem, backups e monitoramento para manter o BenchOS
              disponível e estável. Eventuais janelas de manutenção, atualizações de segurança e
              melhorias contínuas podem ser aplicadas para evoluir o produto.
            </p>
          </section>

          <section className="space-y-2.5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-display text-lg font-bold text-slate-900">
              5. Propriedade Intelectual e Contato
            </h2>
            <p>
              O código, interface, marca e documentação do BenchOS pertencem exclusivamente aos
              seus titulares. Os dados inseridos pela oficina (clientes, OS, fotos e financeiro)
              continuam pertencendo integralmente à oficina.
            </p>
            <p>
              Dúvidas sobre estes termos podem ser enviadas para{' '}
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
            <Link href="/privacidade" className="font-semibold text-blue-600 hover:underline">
              Ler também: Política de Privacidade →
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
