import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as laudosService from '../services/laudosService';
import * as configuracaoService from '../services/configuracaoService';
import { formatarDataHora } from '../utils/formatters';

function Cabecalho({ clinica }) {
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
        Laudo de Exame
      </h2>
    </>
  );
}

export default function LaudoImpressao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [laudo, setLaudo] = useState(null);
  const [clinica, setClinica] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [conteudoEdicao, setConteudoEdicao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState('');

  function carregar() {
    setCarregando(true);
    setErro('');
    Promise.all([laudosService.buscarLaudo(id), configuracaoService.obterConfiguracao()])
      .then(([dadosLaudo, dadosClinica]) => {
        setLaudo(dadosLaudo);
        setClinica(dadosClinica);
      })
      .catch((err) => {
        setErro(err.response?.data?.erro || 'Não foi possível carregar o laudo.');
      })
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function abrirEdicao() {
    setConteudoEdicao(laudo.conteudo);
    setErroEdicao('');
    setEditando(true);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    if (!conteudoEdicao.trim()) {
      setErroEdicao('O laudo não pode ficar vazio.');
      return;
    }
    setSalvando(true);
    setErroEdicao('');
    try {
      const atualizado = await laudosService.atualizarLaudo(id, conteudoEdicao.trim());
      setLaudo(atualizado);
      setEditando(false);
    } catch (err) {
      setErroEdicao(err.response?.data?.erro || 'Não foi possível salvar o laudo.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-gray-400">Carregando...</p>;
  }

  if (erro) {
    return <p className="text-sm text-red-600">{erro}</p>;
  }

  if (!laudo) return null;

  const podeEditar = usuario.role === 'admin' || usuario.id === laudo.medico_id;

  return (
    <div>
      {/* Barra de ações: some na hora de imprimir */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">
          ← Voltar
        </button>
        <div className="flex gap-2">
          {podeEditar && !editando && (
            <button
              onClick={abrirEdicao}
              className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-50"
            >
              Editar
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Imprimir
          </button>
        </div>
      </div>

      {editando ? (
        <div className="bg-white rounded-lg border border-gray-100 p-8 max-w-2xl mx-auto print:hidden">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Editar laudo</h2>
          <form onSubmit={salvarEdicao} className="space-y-3">
            <textarea
              rows={14}
              autoFocus
              value={conteudoEdicao}
              onChange={(e) => setConteudoEdicao(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            {erroEdicao && <p className="text-sm text-red-600">{erroEdicao}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 p-8 max-w-2xl mx-auto print:border-0 print:p-0 print:max-w-none print:mx-0 print:rounded-none">
          <Cabecalho clinica={clinica} />

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <span className="text-gray-500">Paciente:</span>{' '}
              <span className="font-medium">{laudo.paciente_nome}</span>
            </div>
            <div>
              <span className="text-gray-500">Exame:</span>{' '}
              <span className="font-medium">{laudo.exame_nome || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Data do exame:</span>{' '}
              <span className="font-medium">{formatarDataHora(laudo.consulta_data_hora)}</span>
            </div>
            <div>
              <span className="text-gray-500">Data do laudo:</span>{' '}
              <span className="font-medium">{formatarDataHora(laudo.data_emissao)}</span>
            </div>
          </div>

          <div className="text-sm whitespace-pre-wrap mb-8">{laudo.conteudo}</div>

          {laudo.atualizado_em && (
            <p className="text-xs text-gray-400 mb-8 print:hidden">
              Editado em {formatarDataHora(laudo.atualizado_em)}
            </p>
          )}

          <div className="text-center mt-16">
            <div className="inline-block border-t border-gray-400 pt-2 px-12 text-sm">
              Dr(a). {laudo.medico_nome}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
