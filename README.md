# BenchOS Web — Painel Administrativo Desktop

Interface web administrativa do **BenchOS** para uso em computador de balcão e escritório, construída com **Next.js (App Router + BFF com cookie `HttpOnly` AES-256-GCM)**, **Tailwind CSS** (`Industrial Clean`), **TanStack Query** e **Recharts**.

## Principais Módulos
- **Autenticação Segura (BFF):** Login, Cadastro de Oficina e Recuperação de Senha (OTP) com sessão criptografada em cookie `HttpOnly` (o JWT nunca é exposto no `localStorage`).
- **Bancada (`/workbench`):** Alternância **Kanban (drag-and-drop com validação de máquina de estados e RBAC)** ↔ **Tabela Densa**, Quick Drawer lateral e busca rápida por etiqueta (`#1042-1`).
- **Ordens de Serviço (`/orders`, `/orders/new`, `/orders/[orderId]`):** Abertura rápida multi-aparelho, orçamento com **Peças Comuns (1 clique)** e lucro líquido interno, **Entrega com Split Payment**, **Retorno em Garantia**, **WhatsApp consolidado por estágio**, galeria de fotos e **impressão nativa** (Etiquetas QR Code A4 / Térmica 58mm e Comprovante/Termo de Garantia A4).
- **Parados & Descarte (`/orders/stale`):** Filtros `+30d`, `+90d`, `Elegíveis`, cobrança rápida no WhatsApp e descarte auditável.
- **Clientes (`/customers`, `/customers/[customerId]`):** CRUD completo e Ficha do Cliente com KPIs, garantias vigentes e histórico.
- **Financeiro (`OWNER` — `/finance`):** Gráficos (evolução 6 meses, forma de pagamento e categoria), Caixa de Hoje + Fechamento de Caixa do Dia (A4), Margem Real dos Reparos, lançamentos/fiado, fornecedores e exportação CSV Excel (`UTF-8 BOM`).
- **Catálogo de Peças & Ajustes (`/parts`, `/settings`):** Peças comuns (+ seed de 10 peças), templates WhatsApp, tipos de aparelho customizados, gestão de equipe (`OWNER`), preferências de impressão e idioma (`pt-BR` / `en`).

## Desenvolvimento Local

```powershell
# 1. Subir a API BenchOS em http://localhost:8080
# 2. Configurar .env.local (baseado em .env.example)
npm.cmd install
npm.cmd run dev
```

Acesse `http://localhost:3000`.

## Verificações

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```
