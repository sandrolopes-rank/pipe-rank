// ============================================
// GERADO AUTOMATICAMENTE — não editar à mão
// ============================================
// Fonte: scripts/gen-privileges-pages.mjs (roda em predev/prebuild).
// Lista todas as rotas reais de src/app; o registry manual em
// src/lib/privileges.ts fornece labels/funções e tem prioridade.

export interface AutoPage {
  key: string;
  href: string;
  label: string;
}

export const AUTO_PAGES: AutoPage[] = [
  {
    "key": "alertas",
    "href": "/alertas",
    "label": "Alertas"
  },
  {
    "key": "analytics",
    "href": "/analytics",
    "label": "Analytics"
  },
  {
    "key": "elephan",
    "href": "/elephan",
    "label": "Elephan"
  },
  {
    "key": "gerencial",
    "href": "/gerencial",
    "label": "Gerencial"
  },
  {
    "key": "overview",
    "href": "/overview",
    "label": "Overview"
  },
  {
    "key": "planos",
    "href": "/planos",
    "label": "Planos"
  },
  {
    "key": "recupera",
    "href": "/recupera",
    "label": "Recupera"
  },
  {
    "key": "renovacoes",
    "href": "/renovacoes",
    "label": "Renovacoes"
  }
];
