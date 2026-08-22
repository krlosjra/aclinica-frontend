import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as consultasService from '../services/consultasService';
import * as caixaService from '../services/caixaService';
import * as configuracaoService from '../services/configuracaoService';
import { formatarMoeda, formatarDataHora } from '../utils/formatters';

const ROTULOS_FORMA_PAGAMENTO = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'PIX' };

export default function ReciboPagamento() {
  const { consultaId } = useParams();
  const navigate = useNavigate();

  const [consulta, setConsulta] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [clinica, setClinica] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    setErro('');
    Promise.all([
      consultasService.buscarConsulta(consultaId),
      caixaService.listarCaixa({ consulta_id: consultaId }),
      configuracaoService.obterConfiguracao(),
    ])
      .then(([dadosConsulta, dadosCaixa, dadosClinica]) => {
        setConsulta(dadosConsulta);
        setLancamentos(dadosCaixa);
        setClinica(dadosClinica);
      })
      .catch((err) => {
        setErro(err.response?.data?.erro || 'Não foi possível carregar o recibo.');
      })
      .finally(() => setCarregando(false));
  }, [consultaId]);

  if (carregando) {
    return <p className="text-sm text-gray-400">Carregando...</p>;
  }

  if (erro) {
    return <p className="text-sm text-red-600">{erro}</p>;
  }

  if (!consulta) return null;

  const valorTotal = lancamentos.reduce((soma, l) => soma + Number(l.valor), 0);
  const procedimento = consulta.tipo === 'exame' ? consulta.exame_nome : 'Consulta médica';

  return (
    <div>
      {/* Barra de ações: some na hora de imprimir */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => navigate('/consultas')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar pra agenda
        </button>
        <button
          onClick={() => window.print()}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Imprimir
        </button>
      </div>

      {/* Área que efetivamente vai pro papel */}
      <div className="bg-white rounded-lg border border-gray-100 p-8 max-w-xl mx-auto print:border-0 print:p-0 print:max-w-none print:mx-0 print:rounded-none">
        <div className="text-center border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-lg font-bold text-gray-800">
            {clinica?.nome || 'Nome da clínica não configurado'}
          </h1>
          <div className="text-xs text-gray-500 mt-1 space-x-2">
            {clinica?.endereco && <span>{clinica.endereco}</span>}
            {clinica?.telefone && <span>· {clinica.telefone}</span>}
          </div>
          {clinica?.cnpj && <div className="text-xs text-gray-400 mt-0.5">CNPJ: {clinica.cnpj}</div>}
        </div>

        <h2 className="text-center text-sm font-semibold text-gray-600 uppercase tracking-wide mb-6">
          Recibo de Pagamento
        </h2>

        <div className="space-y-3 text-sm mb-6">
          <div>
            <span className="text-gray-500">Nome:</span>{' '}
            <span className="font-medium">{consulta.paciente_nome}</span>
          </div>
          <div>
            <span className="text-gray-500">CPF:</span>{' '}
            <span className="font-medium">{consulta.paciente_cpf || 'Não informado'}</span>
          </div>
          <div>
            <span className="text-gray-500">Procedimento:</span>{' '}
            <span className="font-medium">{procedimento}</span>
          </div>
          <div>
            <span className="text-gray-500">Valor:</span>{' '}
            <span className="font-medium">{formatarMoeda(valorTotal)}</span>
          </div>
          <div>
            <span className="text-gray-500">Data:</span>{' '}
            <span className="font-medium">{formatarDataHora(new Date())}</span>
          </div>
        </div>

        {lancamentos.length > 1 && (
          <div className="text-sm border-t border-gray-100 pt-4 mb-6">
            <p className="text-gray-500 mb-2">Pagamento dividido em:</p>
            <ul className="space-y-1">
              {lancamentos.map((l) => (
                <li key={l.id} className="flex justify-between">
                  <span>{ROTULOS_FORMA_PAGAMENTO[l.forma_pagamento] || l.forma_pagamento}</span>
                  <span className="font-medium">{formatarMoeda(l.valor)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center mt-16">
          <div className="inline-block border-t border-gray-400 pt-2 px-12 text-sm">
            Assinatura
          </div>
        </div>
      </div>
    </div>
  );
}
