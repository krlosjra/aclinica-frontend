import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import * as consultasService from '../services/consultasService';
import * as laudosService from '../services/laudosService';
import { formatarDataHora } from '../utils/formatters';

const LIMITE_POR_PAGINA = 50;

const FILTROS = [
  { chave: 'pendentes', label: 'Faltam laudar' },
  { chave: 'laudados', label: 'Já laudados' },
  { chave: 'todos', label: 'Todos' },
];

function situacaoExame(exame) {
  if (exame.status !== 'realizada') {
    return { chave: 'nao_realizado', rotulo: exame.status, cor: 'bg-gray-100 text-gray-500' };
  }
  if (!exame.laudo_id) {
    return { chave: 'pendente', rotulo: 'Falta laudar', cor: 'bg-red-100 text-red-700' };
  }
  return { chave: 'laudado', rotulo: 'Laudado', cor: 'bg-green-100 text-green-700' };
}

export default function LaudosExames() {
  const navigate = useNavigate();

  const [filtro, setFiltro] = useState('pendentes');
  const [exames, setExames] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Só as abas "Já laudados" e "Todos" paginam — o histórico de exames
  // cresce pra sempre. "Faltam laudar" busca sem paginação de propósito:
  // filtrando por laudado=false no servidor, essa fila fica pequena
  // (é trabalho pendente, não histórico) — se algum dia isso deixar de
  // ser verdade numa clínica com muito volume, também dá pra paginar.
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const [contagemPendentes, setContagemPendentes] = useState(0);

  const [modalAberto, setModalAberto] = useState(false);
  const [exameSelecionado, setExameSelecionado] = useState(null);
  const [conteudoLaudo, setConteudoLaudo] = useState('');
  const [erroLaudo, setErroLaudo] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar(filtroAlvo = filtro, paginaAlvo = 1) {
    setCarregando(true);
    setErro('');
    try {
      if (filtroAlvo === 'pendentes') {
        const dados = await consultasService.listarConsultas({
          tipo: 'exame',
          status: 'realizada',
          laudado: 'false',
        });
        const ordenados = dados.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora));
        setExames(ordenados);
        setContagemPendentes(ordenados.length);
        setTotal(ordenados.length);
        setTotalPaginas(1);
        setPagina(1);
      } else {
        const filtrosApi = { tipo: 'exame' };
        if (filtroAlvo === 'laudados') filtrosApi.laudado = 'true';
        const dados = await consultasService.listarConsultasPaginado(
          paginaAlvo,
          LIMITE_POR_PAGINA,
          filtrosApi
        );
        setExames(dados.consultas);
        setTotal(dados.total);
        setTotalPaginas(dados.totalPaginas);
        setPagina(dados.pagina);
      }
    } catch (err) {
      setErro('Não foi possível carregar os exames.');
    } finally {
      setCarregando(false);
    }
  }

  // A contagem do badge "faltam laudar" no topo precisa existir mesmo
  // quando a aba ativa é outra — busca isso à parte, sem paginação
  // (é o mesmo motivo de sempre: essa lista fica pequena de propósito).
  async function carregarContagemPendentes() {
    try {
      const dados = await consultasService.listarConsultas({
        tipo: 'exame',
        status: 'realizada',
        laudado: 'false',
      });
      setContagemPendentes(dados.length);
    } catch (err) {
      // Falha silenciosa aqui: o badge é só um indicador a mais, não
      // vale mostrar erro pra isso se o resto da página carregou bem.
    }
  }

  useEffect(() => {
    carregar('pendentes', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mudarFiltro(novoFiltro) {
    setFiltro(novoFiltro);
    if (novoFiltro !== 'pendentes') {
      carregarContagemPendentes();
    }
    carregar(novoFiltro, 1);
  }

  function irParaPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    carregar(filtro, novaPagina);
  }

  function abrirModalLaudo(exame) {
    setExameSelecionado(exame);
    setConteudoLaudo('');
    setErroLaudo('');
    setModalAberto(true);
  }

  async function salvarLaudo(e) {
    e.preventDefault();
    if (!conteudoLaudo.trim()) {
      setErroLaudo('Escreva o laudo antes de salvar.');
      return;
    }
    setSalvando(true);
    setErroLaudo('');
    try {
      const novoLaudo = await laudosService.criarLaudo({
        consulta_id: exameSelecionado.id,
        conteudo: conteudoLaudo.trim(),
      });
      setModalAberto(false);
      navigate(`/laudos/${novoLaudo.id}`);
    } catch (err) {
      setErroLaudo(err.response?.data?.erro || 'Não foi possível salvar o laudo.');
    } finally {
      setSalvando(false);
    }
  }

  const mostrandoDe = total === 0 ? 0 : (pagina - 1) * LIMITE_POR_PAGINA + 1;
  const mostrandoAte = filtro === 'pendentes' ? total : Math.min(pagina * LIMITE_POR_PAGINA, total);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Laudos de Exames</h1>
        {contagemPendentes > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full">
            {contagemPendentes} {contagemPendentes === 1 ? 'exame falta' : 'exames faltam'} laudar
          </span>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => mudarFiltro(f.chave)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filtro === f.chave
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}
      {carregando && <p className="text-sm text-gray-400">Carregando...</p>}

      {!carregando && exames.length === 0 && (
        <p className="text-sm text-gray-400">Nenhum exame nesta lista.</p>
      )}

      <div className="space-y-2">
        {exames.map((exame) => {
          const situacao = situacaoExame(exame);
          return (
            <div
              key={exame.id}
              className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${situacao.cor}`}>
                    {situacao.rotulo}
                  </span>
                  <span className="text-xs text-gray-400">{formatarDataHora(exame.data_hora)}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">
                  {exame.exame_nome || 'Exame'} · {exame.paciente_nome}
                </p>
              </div>

              <div className="shrink-0">
                {situacao.chave === 'pendente' && (
                  <button
                    onClick={() => abrirModalLaudo(exame)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                  >
                    Laudar
                  </button>
                )}
                {situacao.chave === 'laudado' && (
                  <button
                    onClick={() => navigate(`/laudos/${exame.laudo_id}`)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-50"
                  >
                    Ver Laudo
                  </button>
                )}
                {situacao.chave === 'nao_realizado' && (
                  <span className="text-xs text-gray-400">Aguardando realização</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!carregando && filtro !== 'pendentes' && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Mostrando {mostrandoDe}–{mostrandoAte} de {total} exames
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => irParaPagina(pagina - 1)}
              disabled={pagina <= 1}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              onClick={() => irParaPagina(pagina + 1)}
              disabled={pagina >= totalPaginas}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal de laudo (aberto ao clicar em "Laudar") */}
      <Modal titulo="Laudar Exame" aberto={modalAberto} aoFechar={() => setModalAberto(false)}>
        <p className="text-xs text-gray-500 mb-3">
          {exameSelecionado?.exame_nome} · {exameSelecionado?.paciente_nome} ·{' '}
          {exameSelecionado && formatarDataHora(exameSelecionado.data_hora)}
        </p>
        <form onSubmit={salvarLaudo} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resultado / Laudo
            </label>
            <textarea
              rows={10}
              autoFocus
              value={conteudoLaudo}
              onChange={(e) => setConteudoLaudo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Descreva o resultado do exame..."
            />
          </div>

          {erroLaudo && <p className="text-sm text-red-600">{erroLaudo}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Laudo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
