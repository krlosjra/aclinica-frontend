/**
 * Sugestões de posologia usual (adulto) para os princípios ativos mais
 * comuns em prescrições de clínica geral.
 *
 * IMPORTANTE: são apenas sugestões de PONTO DE PARTIDA baseadas em
 * posologia padrão de bula — não substituem o julgamento clínico do
 * médico, que deve sempre ajustar conforme o quadro do paciente
 * (idade, peso, função renal/hepática, comorbidades, alergias etc.).
 * Os campos ficam editáveis depois de preenchidos.
 */

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim();
}

// Cada entrada é buscada por "inclui" no princípio ativo normalizado,
// então "amoxicilina + clavulanato de potássio" casa com a chave "amoxicilina + clavulanato".
const BASE_POSOLOGIA = [
  {
    chaves: ['paracetamol'],
    dosagem: '750mg',
    via_administracao: 'Oral',
    frequencia: '6/6h se dor ou febre',
    duracao: 'Uso conforme necessidade, máx. 4g/dia',
  },
  {
    chaves: ['dipirona'],
    dosagem: '1g (2 comprimidos ou 40 gotas)',
    via_administracao: 'Oral',
    frequencia: '6/6h se dor ou febre',
    duracao: 'Uso conforme necessidade',
  },
  {
    chaves: ['ibuprofeno'],
    dosagem: '400mg',
    via_administracao: 'Oral',
    frequencia: '8/8h',
    duracao: '3 a 5 dias',
    observacoes: 'Preferir tomar após as refeições.',
  },
  {
    chaves: ['diclofenaco'],
    dosagem: '50mg',
    via_administracao: 'Oral',
    frequencia: '8/8h',
    duracao: '3 a 5 dias',
    observacoes: 'Preferir tomar após as refeições.',
  },
  {
    chaves: ['nimesulida'],
    dosagem: '100mg',
    via_administracao: 'Oral',
    frequencia: '12/12h',
    duracao: 'Até 5 dias',
  },
  {
    chaves: ['acido acetilsalicilico', 'aas'],
    dosagem: '100mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: 'Uso contínuo (dose antiagregante)',
  },
  {
    chaves: ['amoxicilina + clavulanato', 'amoxicilina e clavulanato', 'amoxicilina/clavulanato'],
    dosagem: '875mg + 125mg',
    via_administracao: 'Oral',
    frequencia: '12/12h',
    duracao: '7 dias',
  },
  {
    chaves: ['amoxicilina'],
    dosagem: '500mg',
    via_administracao: 'Oral',
    frequencia: '8/8h',
    duracao: '7 dias',
  },
  {
    chaves: ['azitromicina'],
    dosagem: '500mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: '3 a 5 dias',
  },
  {
    chaves: ['cefalexina'],
    dosagem: '500mg',
    via_administracao: 'Oral',
    frequencia: '6/6h',
    duracao: '7 dias',
  },
  {
    chaves: ['ciprofloxacino'],
    dosagem: '500mg',
    via_administracao: 'Oral',
    frequencia: '12/12h',
    duracao: '7 a 10 dias',
  },
  {
    chaves: ['metronidazol'],
    dosagem: '400mg',
    via_administracao: 'Oral',
    frequencia: '8/8h',
    duracao: '7 dias',
    observacoes: 'Orientar evitar álcool durante o tratamento.',
  },
  {
    chaves: ['fluconazol'],
    dosagem: '150mg',
    via_administracao: 'Oral',
    frequencia: 'Dose única',
    duracao: 'Dose única (repetir em 72h se necessário)',
  },
  {
    chaves: ['omeprazol'],
    dosagem: '20mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia, em jejum',
    duracao: '30 dias',
  },
  {
    chaves: ['ranitidina'],
    dosagem: '150mg',
    via_administracao: 'Oral',
    frequencia: '12/12h',
    duracao: '30 dias',
  },
  {
    chaves: ['loratadina'],
    dosagem: '10mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: '7 dias',
  },
  {
    chaves: ['cetirizina'],
    dosagem: '10mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: '7 dias',
  },
  {
    chaves: ['prednisona'],
    dosagem: '20mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia, pela manhã',
    duracao: '5 dias',
    observacoes: 'Considerar desmame gradual se uso prolongado.',
  },
  {
    chaves: ['dexametasona'],
    dosagem: '4mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: '3 a 5 dias',
  },
  {
    chaves: ['metformina'],
    dosagem: '850mg',
    via_administracao: 'Oral',
    frequencia: '12/12h, após as refeições',
    duracao: 'Uso contínuo',
  },
  {
    chaves: ['losartana'],
    dosagem: '50mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: 'Uso contínuo',
  },
  {
    chaves: ['enalapril'],
    dosagem: '10mg',
    via_administracao: 'Oral',
    frequencia: '12/12h',
    duracao: 'Uso contínuo',
  },
  {
    chaves: ['hidroclorotiazida'],
    dosagem: '25mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia, pela manhã',
    duracao: 'Uso contínuo',
  },
  {
    chaves: ['sinvastatina'],
    dosagem: '20mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia, à noite',
    duracao: 'Uso contínuo',
  },
  {
    chaves: ['atorvastatina'],
    dosagem: '20mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: 'Uso contínuo',
  },
  {
    chaves: ['escopolamina', 'buscopan'],
    dosagem: '10mg',
    via_administracao: 'Oral',
    frequencia: '8/8h se dor',
    duracao: 'Uso conforme necessidade',
  },
  {
    chaves: ['domperidona'],
    dosagem: '10mg',
    via_administracao: 'Oral',
    frequencia: '8/8h, antes das refeições',
    duracao: '7 dias',
  },
  {
    chaves: ['ondansetrona'],
    dosagem: '8mg',
    via_administracao: 'Oral',
    frequencia: '8/8h se náusea/vômito',
    duracao: 'Uso conforme necessidade',
  },
  {
    chaves: ['acido folico'],
    dosagem: '5mg',
    via_administracao: 'Oral',
    frequencia: '1x ao dia',
    duracao: '30 dias',
  },
];

/**
 * Busca uma sugestão de posologia pelo princípio ativo (ou, na falta
 * dele, pelo nome do produto). Retorna null se não achar nenhuma
 * correspondência conhecida na base.
 */
export function sugerirPosologia(textoReferencia) {
  const normalizado = normalizar(textoReferencia);
  if (!normalizado) return null;

  const encontrado = BASE_POSOLOGIA.find((entrada) =>
    entrada.chaves.some((chave) => normalizado.includes(chave))
  );

  if (!encontrado) return null;

  const { chaves, ...sugestao } = encontrado;
  return sugestao;
}
