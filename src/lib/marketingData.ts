export interface PricingPlan {
  id: 'solo' | 'team';
  name: string;
  badge?: string;
  tagline: string;
  priceMonthly: string;
  periodLabel: string;
  trialNote: string;
  highlighted?: boolean;
  ctaLabel: string;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'solo',
    name: 'Solo',
    tagline: 'Para técnico autônomo ou oficina tocada pelo dono.',
    priceMonthly: 'R$ 49',
    periodLabel: '/mês',
    trialNote: '14 dias grátis · sem cartão',
    ctaLabel: 'Começar teste grátis',
    features: [
      '1 usuário (Dono / Técnico)',
      'OS ilimitadas com vários aparelhos por nota',
      'App Android + Painel Web sincronizados',
      'Link /track com aprovação e múltiplas opções de orçamento',
      'QR Code Pix nativo (zero taxa) + Caixa e margem real',
      'Fila de compras de peças, recibo PDF e pós-entrega Google 5★',
    ],
  },
  {
    id: 'team',
    name: 'Equipe',
    badge: 'Mais escolhido',
    tagline: 'Para assistências com balcão, técnicos e controle de comissões.',
    priceMonthly: 'R$ 99',
    periodLabel: '/mês',
    trialNote: '14 dias grátis · cancele quando quiser',
    highlighted: true,
    ctaLabel: 'Testar Equipe por 14 dias',
    features: [
      'Até 5 usuários (Dono, Atendentes e Técnicos)',
      'Tudo do plano Solo incluído',
      'Técnico responsável por aparelho e fechamento de comissões',
      'Painel de indicadores (aprovação, SLA, ticket e garantia)',
      'Logo, endereço, garantia e checklist personalizado da oficina',
      'Suporte prioritário na implantação',
    ],
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ: FaqItem[] = [
  {
    question: 'O cliente precisa baixar algum aplicativo?',
    answer:
      'Não. Ao abrir a OS você envia o link /track no WhatsApp. O cliente acompanha o status, aprova o orçamento e paga no Pix direto pelo navegador do celular.',
  },
  {
    question: 'Funciona no celular e no computador ao mesmo tempo?',
    answer:
      'Sim. O balcão pode usar o Painel Web no PC enquanto os técnicos usam o App Android na bancada para fotos, diagnóstico e pedidos de peças — tudo em tempo real.',
  },
  {
    question: 'O QR Code Pix cobra alguma taxa?',
    answer:
      'Zero taxa. O BenchOS gera o Pix padrão Banco Central com a chave da sua oficina — o valor cai direto na sua conta.',
  },
  {
    question: 'Se eu trabalhar sozinho, a tela fica cheia de opções de equipe?',
    answer:
      'Não. Técnico responsável, comissões e assinatura digital vêm desativados por padrão e só aparecem se você ligar nos Ajustes.',
  },
];

export interface GuideStep {
  title: string;
  detail: string;
}

export interface HowToGuide {
  id: string;
  category:
    | 'primeiros-passos'
    | 'balcao'
    | 'bancada'
    | 'pecas'
    | 'entrega'
    | 'financeiro'
    | 'mobile';
  categoryLabel: string;
  title: string;
  summary: string;
  duration: string;
  where: string;
  steps: GuideStep[];
  proTip: string;
}

export const HOW_TO_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'primeiros-passos', label: 'Início' },
  { id: 'balcao', label: 'Nova OS' },
  { id: 'bancada', label: 'Orçamento' },
  { id: 'pecas', label: 'Peças' },
  { id: 'entrega', label: 'Entrega & Pix' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'mobile', label: 'App Android' },
] as const;

export const HOW_TO_GUIDES: HowToGuide[] = [
  {
    id: 'configurar-oficina',
    category: 'primeiros-passos',
    categoryLabel: 'Primeiros Passos',
    title: 'Configure sua oficina em 5 minutos',
    summary: 'Deixe logo, Pix, mensagens e garantia prontos antes da primeira OS.',
    duration: '5 min',
    where: 'Ajustes (Web ou App)',
    steps: [
      {
        title: 'Mão de obra e prazos',
        detail: 'Defina valor padrão de mão de obra, prazo de avaliação e dias de abandono.',
      },
      {
        title: 'Marca e termo de garantia',
        detail: 'Envie sua logo, endereço e garantia para aparecerem no /track e no recibo.',
      },
      {
        title: 'Chave Pix e Google 5★',
        detail: 'Cadastre sua chave Pix (0% taxa) e cole o link de avaliação do Google.',
      },
      {
        title: 'Mensagens de WhatsApp',
        detail: 'Personalize os textos de Entrada, Orçamento e Pronto com variáveis automáticas.',
      },
    ],
    proTip:
      'Assinatura digital e Técnico Responsável vêm desligados por padrão — ative só quando precisar.',
  },
  {
    id: 'abrir-nova-os',
    category: 'balcao',
    categoryLabel: 'Nova OS',
    title: 'Abrir OS com 1 ou vários aparelhos',
    summary: 'Entrada rápida no balcão com checklist opcional e link /track na hora.',
    duration: '2 min',
    where: 'Botão Nova OS (Web) · Botão + (App)',
    steps: [
      {
        title: 'Escolha ou cadastre o cliente',
        detail: 'Busque por nome ou telefone — ou cadastre um cliente novo sem sair da tela.',
      },
      {
        title: 'Adicione os aparelhos',
        detail: 'Selecione o tipo no dropdown, marca, voltagem e defeito. Adicione quantos itens precisar.',
      },
      {
        title: 'Marque o checklist (opcional)',
        detail: 'Registre em 1 toque se ficou prato, aro ou se chegou sem amassados.',
      },
      {
        title: 'Envie o link no WhatsApp',
        detail: 'Cada item ganha tag (#1042-1, #1042-2) e um link /track pronto para enviar.',
      },
    ],
    proTip:
      'Os itens sugeridos do checklist de cada aparelho podem ser editados em Ajustes.',
  },
  {
    id: 'diagnostico-orcamento',
    category: 'bancada',
    categoryLabel: 'Orçamento',
    title: 'Orçamento único ou com múltiplas opções',
    summary: 'Envie o valor (ou até 4 opções) e receba a aprovação direto pelo /track.',
    duration: '3 min',
    where: 'Detalhe da OS > Orçamento',
    steps: [
      {
        title: 'Abra o item pela Bancada',
        detail: 'Use a busca rápida pela tag (#1042-1) ou toque no card do aparelho.',
      },
      {
        title: 'Informe diagnóstico e valores',
        detail: 'Selecione peças do catálogo para calcular custo real e repasse, ou digite direto.',
      },
      {
        title: 'Ative múltiplas opções (se quiser)',
        detail: 'Ofereça até 4 alternativas — ex.: peça paralela vs. original + limpeza.',
      },
      {
        title: 'Cliente aprova em 1 toque',
        detail: 'Pelo link /track, o cliente escolhe a opção, aprova e a bancada atualiza sozinha.',
      },
    ],
    proTip:
      'Se o cliente aprovar por áudio no WhatsApp, você também pode aprovar a opção escolhida por dentro da OS.',
  },
  {
    id: 'fila-pecas',
    category: 'pecas',
    categoryLabel: 'Peças',
    title: 'Fila de compras de peças por OS',
    summary: 'Organize o que falta comprar e dê baixa somando no custo real da OS.',
    duration: '2 min',
    where: 'Detalhe da OS > Pedir Peça · Tela Peças',
    steps: [
      {
        title: 'Peça a peça dentro da OS',
        detail: 'Escolha do catálogo ou digite nome, custo estimado, fornecedor e link de compra.',
      },
      {
        title: 'Mova para Aguardando Peça',
        detail: 'Deixe a opção marcada para sinalizar o status automaticamente na bancada.',
      },
      {
        title: 'Acompanhe na Fila de Compras',
        detail: 'Veja tudo que está "A pedir" em uma lista única e marque "Pedido feito" ao comprar.',
      },
      {
        title: 'Dê baixa em 1 clique ao chegar',
        detail: 'Confirme o custo real: soma na margem da OS, lança no Financeiro e volta para Em Reparo.',
      },
    ],
    proTip:
      'Salve o link do anúncio do fornecedor no pedido para refazer a compra em segundos.',
  },
  {
    id: 'entrega-pix-garantia',
    category: 'entrega',
    categoryLabel: 'Entrega & Pix',
    title: 'Entregar, cobrar no Pix e controlar garantia',
    summary: 'Receba à vista ou dividido, emita o recibo e dispare o pós-entrega automático.',
    duration: '3 min',
    where: 'Item Pronto > Entregar',
    steps: [
      {
        title: 'Avise que ficou pronto',
        detail: 'Envie o aviso no WhatsApp — o QR Code Pix já aparece no link /track do cliente.',
      },
      {
        title: 'Receba em 1 ou mais formas',
        detail: 'Feche o valor total ou divida entre Pix, Cartão e Dinheiro com QR Code dinâmico.',
      },
      {
        title: 'Recibo e pós-entrega',
        detail: 'Após a entrega, o /track exibe dicas de cuidado e avaliação 5★ com botão para o Google.',
      },
      {
        title: 'Retorno em garantia vinculado',
        detail: 'Se o aparelho voltar no prazo, abra um Retorno em Garantia ligado à OS original.',
      },
    ],
    proTip:
      'No pagamento dividido, cada parcela entra separada no Financeiro com a forma correta.',
  },
  {
    id: 'financeiro-indicadores-comissoes',
    category: 'financeiro',
    categoryLabel: 'Financeiro',
    title: 'Caixa real, indicadores e comissões',
    summary: 'Visão exclusiva do dono: lucro líquido, taxa de aprovação e repasse de técnicos.',
    duration: '3 min',
    where: 'Menu Financeiro (somente Dono)',
    steps: [
      {
        title: 'Entradas e saídas automáticas',
        detail: 'Entregas e baixas de peças entram sozinhas no caixa. Lance apenas despesas fixas.',
      },
      {
        title: 'Indicadores da Oficina',
        detail: 'Acompanhe taxa de aprovação, prazo médio (SLA), ticket, margem real e garantias.',
      },
      {
        title: 'Ative Técnico & Comissões',
        detail: 'Em Ajustes, ligue o recurso, escolha a base (mão de obra, total ou lucro) e o % de cada técnico.',
      },
      {
        title: 'Feche comissões em 1 clique',
        detail: 'Na aba Comissões, confira o acumulado do período e lance o pagamento direto no caixa.',
      },
    ],
    proTip:
      'Atendentes e Técnicos não visualizam faturamento, margem interna nem o menu Financeiro.',
  },
  {
    id: 'etiquetas-mobile-offline',
    category: 'mobile',
    categoryLabel: 'App Android',
    title: 'App Android na bancada (fotos, push e offline)',
    summary: 'Trabalhe com o celular na bancada sincronizado em tempo real com o computador.',
    duration: '2 min',
    where: 'App Android BenchOS',
    steps: [
      {
        title: 'Fotos direto na OS',
        detail: 'Fotografe o estado de entrada ou o defeito na placa direto pela câmera do celular.',
      },
      {
        title: 'Notificações em tempo real',
        detail: 'Receba aviso push assim que o cliente aprovar o orçamento no link /track.',
      },
      {
        title: 'Consulta mesmo sem Wi-Fi',
        detail: 'O cache offline mantém suas OS e clientes acessíveis se a internet da oficina oscilar.',
      },
      {
        title: 'Leitor de QR Code (opcional)',
        detail: 'Se usar etiquetas na bancada, ative o leitor nos Ajustes para abrir a OS pela câmera.',
      },
    ],
    proTip:
      'Você pode alternar o idioma (PT-BR / EN) ou limpar o cache local a qualquer hora nos Ajustes do app.',
  },
];
