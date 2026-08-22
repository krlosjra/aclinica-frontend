import { useEffect, useRef, useState } from 'react';
import * as caixaService from '../services/caixaService';
import { formatarMoeda } from '../utils/formatters';

const TITULOS_PERIODO = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
  anual: 'Anual',
};

const ROTULOS_FORMA_PAGAMENTO = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'PIX' };

const ORDEM_PERIODOS = ['diario', 'semanal', 'mensal', 'anual'];

function hojeISO() {
  const hoje = new Date();
  const offset = hoje.getTimezoneOffset();
  return new Date(hoje.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function formatarData(dataIso) {
  if (!dataIso) return '';
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHoraLancamento(dataIso) {
  return new Date(dataIso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TabelaLancamentos({ lancamentos }) {
  if (!lancamentos || lancamentos.length === 0) {
    return <p className="text-xs text-gray-400 py-3">Nenhum lançamento neste período.</p>;
  }

  return (
    <table className="w-full text-xs mt-2">
      <thead className="text-gray-500 uppercase">
        <tr className="border-b border-gray-100">
          <th className="text-left py-2 pr-2 font-medium">Data</th>
          <th className="text-left py-2 pr-2 font-medium">Tipo</th>
          <th className="text-left py-2 pr-2 font-medium">Descrição</th>
          <th className="text-left py-2 pr-2 font-medium">Forma</th>
          <th className="text-right py-2 font-medium">Valor</th>
        </tr>
      </thead>
      <tbody>
        {lancamentos.map((l) => (
          <tr key={l.id} className="border-b border-gray-50">
            <td className="py-1.5 pr-2 text-gray-500 whitespace-nowrap">
              {formatarDataHoraLancamento(l.data_lancamento)}
            </td>
            <td className="py-1.5 pr-2">
              <span className={l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </span>
            </td>
            <td className="py-1.5 pr-2 text-gray-800">{l.descricao}</td>
            <td className="py-1.5 pr-2 text-gray-500">
              {l.forma_pagamento ? ROTULOS_FORMA_PAGAMENTO[l.forma_pagamento] : '—'}
            </td>
            <td
              className={`py-1.5 text-right font-medium whitespace-nowrap ${
                l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {l.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(l.valor)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PeriodoCard({ periodo, aoImprimir }) {
  const saldoPositivo = Number(periodo.saldo) >= 0;

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-5 break-inside-avoid print:break-after-page">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">{TITULOS_PERIODO[periodo.periodo]}</h2>
          <span className="text-xs text-gray-400">
            {periodo.inicio === periodo.fim
              ? formatarData(periodo.inicio)
              : `${formatarData(periodo.inicio)} – ${formatarData(periodo.fim)}`}
          </span>
        </div>
        {aoImprimir && (
          <button
            onClick={aoImprimir}
            className="print:hidden text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Imprimir esta aba
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Entradas</p>
          <p className="text-base font-bold text-green-600">
            {formatarMoeda(periodo.total_entradas)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Saídas</p>
          <p className="text-base font-bold text-red-600">{formatarMoeda(periodo.total_saidas)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className={`text-base font-bold ${saldoPositivo ? 'text-primary-700' : 'text-red-600'}`}>
            {formatarMoeda(periodo.saldo)}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-1">
        <p className="text-xs font-medium text-gray-500 mb-2">Lançamentos</p>
        <TabelaLancamentos lancamentos={periodo.lancamentos} />
      </div>

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Entradas por forma de pagamento</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Dinheiro</p>
            <p className="text-sm font-semibold text-gray-700">
              {formatarMoeda(periodo.total_dinheiro)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Cartão</p>
            <p className="text-sm font-semibold text-gray-700">
              {formatarMoeda(periodo.total_cartao)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">PIX</p>
            <p className="text-sm font-semibold text-gray-700">{formatarMoeda(periodo.total_pix)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RelatorioCaixa() {
  const [dataReferencia, setDataReferencia] = useState(hojeISO());
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('diario');

  // Enquanto true, ignora a aba selecionada e renderiza os 4 períodos
  // juntos — só pra impressão do relatório completo.
  const [imprimindoTudo, setImprimindoTudo] = useState(false);
  const imprimirTudoRef = useRef(false);

  async function carregar(data) {
    setCarregando(true);
    setErro('');
    try {
      const dados = await caixaService.relatorioCaixa(data);
      setRelatorio(dados);
    } catch (err) {
      setErro('Não foi possível carregar o relatório de caixa.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar(dataReferencia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dispara a impressão só depois que o DOM já refletiu os 4 cards
  // juntos (senão window.print() pega a tela ainda só com a aba ativa).
  useEffect(() => {
    if (imprimindoTudo && imprimirTudoRef.current) {
      imprimirTudoRef.current = false;
      window.print();
    }
  }, [imprimindoTudo]);

  useEffect(() => {
    function aoTerminarImpressao() {
      setImprimindoTudo(false);
    }
    window.addEventListener('afterprint', aoTerminarImpressao);
    return () => window.removeEventListener('afterprint', aoTerminarImpressao);
  }, []);

  function aoMudarData(e) {
    const novaData = e.target.value;
    setDataReferencia(novaData);
    carregar(novaData);
  }

  function imprimirTudo() {
    imprimirTudoRef.current = true;
    setImprimindoTudo(true);
  }

  function imprimirAbaAtiva() {
    window.print();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-xl font-bold text-gray-800">Relatório de Caixa</h1>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data de referência</label>
            <input
              type="date"
              value={dataReferencia}
              onChange={aoMudarData}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <button
            onClick={imprimirTudo}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
          >
            Imprimir tudo
          </button>
        </div>
      </div>

      {/* Abas — somem na impressão da aba atual (o card já tem o próprio
          botão) e também quando o relatório completo está sendo impresso */}
      {!imprimindoTudo && (
        <div className="flex gap-1 mb-4 border-b border-gray-200 print:hidden">
          {ORDEM_PERIODOS.map((chave) => (
            <button
              key={chave}
              onClick={() => setAbaAtiva(chave)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                abaAtiva === chave
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TITULOS_PERIODO[chave]}
            </button>
          ))}
        </div>
      )}

      <h1 className="hidden print:block text-xl font-bold text-gray-800 mb-4">
        Relatório de Caixa — {formatarData(dataReferencia)}
      </h1>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {carregando && <p className="text-sm text-gray-400">Carregando relatório...</p>}

      {!carregando && relatorio && !imprimindoTudo && relatorio.periodos[abaAtiva] && (
        <PeriodoCard periodo={relatorio.periodos[abaAtiva]} aoImprimir={imprimirAbaAtiva} />
      )}

      {!carregando && relatorio && imprimindoTudo && (
        <div className="grid grid-cols-1 gap-4">
          {ORDEM_PERIODOS.map((chave) =>
            relatorio.periodos[chave] ? (
              <PeriodoCard key={chave} periodo={relatorio.periodos[chave]} />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
