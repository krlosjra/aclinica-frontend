import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as consultasService from '../services/consultasService';
import * as configuracaoService from '../services/configuracaoService';
import { formatarDataHora } from '../utils/formatters';

export default function TermoConsentimentoImpressao() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [consulta, setConsulta] = useState(null);
  const [clinica, setClinica] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    setErro('');
    Promise.all([consultasService.buscarConsulta(id), configuracaoService.obterConfiguracao()])
      .then(([dadosConsulta, dadosClinica]) => {
        setConsulta(dadosConsulta);
        setClinica(dadosClinica);
      })
      .catch((err) => {
        setErro(err.response?.data?.erro || 'Não foi possível carregar o termo.');
      })
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) {
    return <p className="text-sm text-gray-400">Carregando...</p>;
  }

  if (erro) {
    return <p className="text-sm text-red-600">{erro}</p>;
  }

  if (!consulta) return null;

  if (!consulta.exame_termo_consentimento || !consulta.exame_termo_consentimento.trim()) {
    return (
      <p className="text-sm text-gray-500">
        O exame "{consulta.exame_nome}" não tem termo de consentimento cadastrado.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Imprimir
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-8 max-w-2xl mx-auto print:border-0 print:p-0 print:max-w-none print:mx-0 print:rounded-none">
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
          Termo de Consentimento — {consulta.exame_nome}
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-500">Paciente:</span>{' '}
            <span className="font-medium">{consulta.paciente_nome}</span>
          </div>
          <div>
            <span className="text-gray-500">CPF:</span>{' '}
            <span className="font-medium">{consulta.paciente_cpf || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Exame:</span>{' '}
            <span className="font-medium">{consulta.exame_nome}</span>
          </div>
          <div>
            <span className="text-gray-500">Data:</span>{' '}
            <span className="font-medium">{formatarDataHora(consulta.data_hora)}</span>
          </div>
        </div>

        <div className="text-sm whitespace-pre-wrap mb-12">
          {consulta.exame_termo_consentimento}
        </div>

        <div className="text-center mt-16">
          <div className="inline-block border-t border-gray-400 pt-2 px-16 text-sm">
            Assinatura do paciente (ou responsável)
          </div>
        </div>
      </div>
    </div>
  );
}
