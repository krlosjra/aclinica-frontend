import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as prescricoesService from '../services/prescricoesService';
import * as configuracaoService from '../services/configuracaoService';
import { formatarDataHora } from '../utils/formatters';

function Cabecalho({ clinica, titulo }) {
  return (
    <>
      <div className="text-center border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-lg font-bold text-gray-800">
          {clinica?.nome || 'Nome da clínica não configurado'}
        </h1>
        <div className="text-xs text-gray-500 mt-1 space-x-2">
          {clinica?.endereco && <span>{clinica.endereco}</span>}
          {clinica?.telefone && <span>· {clinica.telefone}</span>}
          {clinica?.email && <span>· {clinica.email}</span>}
        </div>
        {clinica?.cnpj && <div className="text-xs text-gray-400 mt-0.5">CNPJ: {clinica.cnpj}</div>}
      </div>
      <h2 className="text-center text-sm font-semibold text-gray-600 uppercase tracking-wide mb-6">
        {titulo}
      </h2>
    </>
  );
}

function DadosPaciente({ prescricao }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
      <div>
        <span className="text-gray-500">Paciente:</span>{' '}
        <span className="font-medium">{prescricao.paciente_nome}</span>
      </div>
      <div>
        <span className="text-gray-500">Data:</span>{' '}
        <span className="font-medium">{formatarDataHora(prescricao.data_emissao)}</span>
      </div>
    </div>
  );
}

function Assinatura({ prescricao }) {
  return (
    <div className="text-center mt-16">
      <div className="inline-block border-t border-gray-400 pt-2 px-12 text-sm">
        Dr(a). {prescricao.medico_nome}
      </div>
    </div>
  );
}

export default function PrescricaoImpressao() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescricao, setPrescricao] = useState(null);
  const [clinica, setClinica] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    setErro('');
    Promise.all([prescricoesService.buscarPrescricao(id), configuracaoService.obterConfiguracao()])
      .then(([dadosPrescricao, dadosClinica]) => {
        setPrescricao(dadosPrescricao);
        setClinica(dadosClinica);
      })
      .catch((err) => {
        setErro(err.response?.data?.erro || 'Não foi possível carregar a prescrição.');
      })
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) {
    return <p className="text-sm text-gray-400">Carregando...</p>;
  }

  if (erro) {
    return <p className="text-sm text-red-600">{erro}</p>;
  }

  if (!prescricao) return null;

  const temMedicamentos = prescricao.itens && prescricao.itens.length > 0;
  const temExames = prescricao.exames_solicitados && prescricao.exames_solicitados.trim();

  return (
    <div>
      {/* Barra de ações: some na hora de imprimir */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Imprimir
        </button>
      </div>

      {/* PÁGINA 1 — Medicamentos (só aparece se houver algum) */}
      {temMedicamentos && (
        <div className="bg-white rounded-lg border border-gray-100 p-8 max-w-2xl mx-auto mb-6 print:border-0 print:p-0 print:max-w-none print:mx-0 print:rounded-none print:mb-0">
          <Cabecalho clinica={clinica} titulo="Receita Médica" />
          <DadosPaciente prescricao={prescricao} />

          <div className="space-y-4 mb-8">
            {prescricao.itens.map((item, index) => (
              <div key={item.id} className="text-sm">
                <p className="font-medium text-gray-800">
                  {index + 1}. {item.medicamento}
                  {item.dosagem && ` — ${item.dosagem}`}
                </p>
                <p className="text-gray-600 ml-4">
                  {[item.via_administracao, item.frequencia, item.duracao && `por ${item.duracao}`]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                  {item.quantidade && ` (Qtd: ${item.quantidade})`}
                </p>
                {item.observacoes && (
                  <p className="text-gray-500 ml-4 italic">{item.observacoes}</p>
                )}
              </div>
            ))}
          </div>

          {prescricao.observacoes && (
            <div className="text-sm mb-8">
              <span className="text-gray-500">Observações: </span>
              {prescricao.observacoes}
            </div>
          )}

          <Assinatura prescricao={prescricao} />
        </div>
      )}

      {/* PÁGINA 2 — Exames solicitados (só aparece se houver).
          break-before-page força início em página nova na impressão,
          quando também existe a página de medicamentos antes dela. */}
      {temExames && (
        <div
          className={`bg-white rounded-lg border border-gray-100 p-8 max-w-2xl mx-auto print:border-0 print:p-0 print:max-w-none print:mx-0 print:rounded-none ${
            temMedicamentos ? 'break-before-page' : ''
          }`}
        >
          <Cabecalho clinica={clinica} titulo="Requisição de Exames" />
          <DadosPaciente prescricao={prescricao} />

          <div className="text-sm whitespace-pre-wrap mb-8">{prescricao.exames_solicitados}</div>

          <Assinatura prescricao={prescricao} />
        </div>
      )}
    </div>
  );
}
