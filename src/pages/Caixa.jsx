import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import * as caixaService from '../services/caixaService';
import { formatarMoeda, formatarDataHora } from '../utils/formatters';

const LANCAMENTO_VAZIO = { tipo: 'entrada', descricao: '', valor: '', forma_pagamento: 'dinheiro' };

const ROTULOS_FORMA_PAGAMENTO = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'PIX' };

// Primeiro e último dia do mês atual, no formato que a API espera
// (YYYY-MM-DD) — usado como filtro padrão pra não carregar o histórico
// inteiro de lançamentos toda vez que a tela abre. O usuário ainda
// pode apagar as datas manualmente se quiser ver tudo.
function mesAtualComoFiltro() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const paraIso = (d) => d.toISOString().slice(0, 10);
  return { data_inicio: paraIso(primeiroDia), data_fim: paraIso(ultimoDia) };
}

export default function Caixa() {
  const { usuario } = useAuth();
  const podeExcluir = usuario.role === 'admin';

  const [lancamentos, setLancamentos] = useState([]);
  const [resumo, setResumo] = useState({
    total_entradas: 0,
    total_saidas: 0,
    saldo: 0,
    total_dinheiro: 0,
    total_cartao: 0,
    total_pix: 0,
  });
  const [filtros, setFiltros] = useState({
    ...mesAtualComoFiltro(),
    tipo: '',
    forma_pagamento: '',
  });
  const [erro, setErro] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(LANCAMENTO_VAZIO);
  const [erroForm, setErroForm] = useState('');

  // Status da sessão de caixa (aberto/fechado)
  const [statusCaixa, setStatusCaixa] = useState({
    aberto: false,
    sessao: null,
    ultima_sessao_fechada: null,
  });
  const [carregandoStatus, setCarregandoStatus] = useState(true);

  const [modalAbrirAberto, setModalAbrirAberto] = useState(false);
  const [formAbrir, setFormAbrir] = useState({ valor_abertura: '', observacoes: '' });
  const [erroAbrir, setErroAbrir] = useState('');

  const [modalFecharAberto, setModalFecharAberto] = useState(false);
  const [formFechar, setFormFechar] = useState({ observacoes: '' });
  const [erroFechar, setErroFechar] = useState('');

  async function carregar() {
    setErro('');
    const filtrosLimpos = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v)
    );
    try {
      const [dadosLancamentos, dadosResumo] = await Promise.all([
        caixaService.listarCaixa(filtrosLimpos),
        caixaService.resumoCaixa(filtrosLimpos),
      ]);
      setLancamentos(dadosLancamentos);
      setResumo(dadosResumo);
    } catch (err) {
      setErro('Não foi possível carregar o caixa.');
    }
  }

  async function carregarStatusCaixa() {
    setCarregandoStatus(true);
    try {
      const dados = await caixaService.statusCaixa();
      setStatusCaixa(dados);
    } catch (err) {
      // silencioso — a tela ainda funciona, só sem o banner de status
    } finally {
      setCarregandoStatus(false);
    }
  }

  useEffect(() => {
    carregar();
    carregarStatusCaixa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    if (!statusCaixa.aberto) return;
    setForm(LANCAMENTO_VAZIO);
    setErroForm('');
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErroForm('');
    try {
      const payload = { ...form, valor: Number(form.valor) };
      if (payload.tipo !== 'entrada') {
        delete payload.forma_pagamento;
      }
      await caixaService.criarLancamento(payload);
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível salvar o lançamento.');
    }
  }

  async function excluir(lancamento) {
    if (!confirm(`Excluir o lançamento "${lancamento.descricao}"?`)) return;
    try {
      await caixaService.excluirLancamento(lancamento.id);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível excluir o lançamento.');
    }
  }

  function abrirModalAbertura() {
    setFormAbrir({ valor_abertura: '', observacoes: '' });
    setErroAbrir('');
    setModalAbrirAberto(true);
  }

  async function confirmarAbertura(e) {
    e.preventDefault();
    setErroAbrir('');
    try {
      await caixaService.abrirCaixa({
        valor_abertura: Number(formAbrir.valor_abertura) || 0,
        observacoes: formAbrir.observacoes || undefined,
      });
      setModalAbrirAberto(false);
      await carregarStatusCaixa();
      carregar();
    } catch (err) {
      setErroAbrir(err.response?.data?.erro || 'Não foi possível abrir o caixa.');
    }
  }

  function abrirModalFechamento() {
    setFormFechar({ observacoes: '' });
    setErroFechar('');
    setModalFecharAberto(true);
  }

  async function confirmarFechamento(e) {
    e.preventDefault();
    setErroFechar('');
    try {
      const resultado = await caixaService.fecharCaixa({
        observacoes: formFechar.observacoes || undefined,
      });
      setModalFecharAberto(false);
      await carregarStatusCaixa();
      carregar();

      const r = resultado.resumo;
      alert(
        `Caixa fechado.\n\n` +
          `Entradas: ${formatarMoeda(r.total_entradas)}\n` +
          `  Dinheiro: ${formatarMoeda(r.total_dinheiro)}\n` +
          `  Cartão: ${formatarMoeda(r.total_cartao)}\n` +
          `  PIX: ${formatarMoeda(r.total_pix)}\n` +
          `Saídas: ${formatarMoeda(r.total_saidas)}\n` +
          `Saldo movimentado: ${formatarMoeda(r.saldo_movimentado)}`
      );
    } catch (err) {
      setErroFechar(err.response?.data?.erro || 'Não foi possível fechar o caixa.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Caixa</h1>
        <div className="flex gap-2">
          {statusCaixa.aberto ? (
            <button
              onClick={abrirModalFechamento}
              className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-red-700"
            >
              Fechar Caixa
            </button>
          ) : (
            !carregandoStatus && (
              <button
                onClick={abrirModalAbertura}
                className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-green-700"
              >
                Abrir Caixa
              </button>
            )
          )}
          <button
            onClick={abrirNovo}
            disabled={!statusCaixa.aberto}
            title={!statusCaixa.aberto ? 'Abra o caixa para lançar' : undefined}
            className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
          >
            + Novo Lançamento
          </button>
        </div>
      </div>

      {/* Banner de status do caixa */}
      {!carregandoStatus && statusCaixa.aberto && statusCaixa.sessao && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Caixa aberto desde {formatarDataHora(statusCaixa.sessao.aberto_em)}
          {statusCaixa.sessao.valor_abertura > 0 &&
            ` · fundo de abertura: ${formatarMoeda(statusCaixa.sessao.valor_abertura)}`}
          .
        </div>
      )}
      {!carregandoStatus && !statusCaixa.aberto && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          O caixa está fechado. Abra o caixa para começar a lançar entradas e saídas do dia.
          {statusCaixa.ultima_sessao_fechada?.fechamento_automatico &&
            ' O caixa anterior foi fechado automaticamente pelo sistema porque não foi fechado manualmente.'}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Entradas</p>
          <p className="text-lg font-bold text-green-600">
            {formatarMoeda(resumo.total_entradas)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Saídas</p>
          <p className="text-lg font-bold text-red-600">{formatarMoeda(resumo.total_saidas)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p
            className={`text-lg font-bold ${
              Number(resumo.saldo) >= 0 ? 'text-primary-700' : 'text-red-600'
            }`}
          >
            {formatarMoeda(resumo.saldo)}
          </p>
        </div>
      </div>

      {/* Cards de entradas por forma de pagamento */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Entradas em Dinheiro</p>
          <p className="text-base font-semibold text-gray-700">
            {formatarMoeda(resumo.total_dinheiro)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Entradas em Cartão</p>
          <p className="text-base font-semibold text-gray-700">
            {formatarMoeda(resumo.total_cartao)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-xs text-gray-500 mb-1">Entradas em PIX</p>
          <p className="text-base font-semibold text-gray-700">{formatarMoeda(resumo.total_pix)}</p>
        </div>
      </div>

      {/* Filtros */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          carregar();
        }}
        className="mb-4 flex flex-wrap gap-2 items-end"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input
            type="date"
            value={filtros.data_inicio}
            onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input
            type="date"
            value={filtros.data_fim}
            onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Forma de pagamento</label>
          <select
            value={filtros.forma_pagamento}
            onChange={(e) => setFiltros({ ...filtros, forma_pagamento: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todas</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
            <option value="pix">PIX</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
        >
          Filtrar
        </button>
      </form>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Forma</th>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-right px-4 py-3">Valor</th>
              {podeExcluir && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {lancamentos.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
            {lancamentos.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-500">{formatarDataHora(l.data_lancamento)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      l.tipo === 'entrada'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {l.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {l.forma_pagamento ? ROTULOS_FORMA_PAGAMENTO[l.forma_pagamento] : '—'}
                </td>
                <td className="px-4 py-3 text-gray-800">{l.descricao}</td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {l.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(l.valor)}
                </td>
                {podeExcluir && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => excluir(l)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal titulo="Novo Lançamento" aberto={modalAberto} aoFechar={() => setModalAberto(false)}>
        <form onSubmit={salvar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              required
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>

          {form.tipo === 'entrada' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de pagamento *
              </label>
              <select
                required
                value={form.forma_pagamento}
                onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="pix">PIX</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <input
              type="text"
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Salvar
          </button>
        </form>
      </Modal>

      <Modal titulo="Abrir Caixa" aberto={modalAbrirAberto} aoFechar={() => setModalAbrirAberto(false)}>
        <form onSubmit={confirmarAbertura} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor de abertura / fundo de troco (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formAbrir.valor_abertura}
              onChange={(e) => setFormAbrir({ ...formAbrir, valor_abertura: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formAbrir.observacoes}
              onChange={(e) => setFormAbrir({ ...formAbrir, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={2}
            />
          </div>

          {erroAbrir && <p className="text-sm text-red-600">{erroAbrir}</p>}

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700"
          >
            Abrir Caixa
          </button>
        </form>
      </Modal>

      <Modal titulo="Fechar Caixa" aberto={modalFecharAberto} aoFechar={() => setModalFecharAberto(false)}>
        <form onSubmit={confirmarFechamento} className="space-y-3">
          <p className="text-sm text-gray-500">
            O sistema vai somar automaticamente todas as entradas e saídas lançadas desde a abertura
            do caixa. Confira o dinheiro na gaveta antes de confirmar.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formFechar.observacoes}
              onChange={(e) => setFormFechar({ ...formFechar, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              rows={2}
              placeholder="Ex: diferença de troco, ocorrências do dia..."
            />
          </div>

          {erroFechar && <p className="text-sm text-red-600">{erroFechar}</p>}

          <button
            type="submit"
            className="w-full bg-red-600 text-white py-2 rounded-md text-sm font-medium hover:bg-red-700"
          >
            Confirmar Fechamento
          </button>
        </form>
      </Modal>
    </div>
  );
}
