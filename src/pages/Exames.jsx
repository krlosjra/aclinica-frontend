import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import * as examesService from '../services/examesService';
import { formatarMoeda } from '../utils/formatters';

const EXAME_VAZIO = {
  nome: '',
  descricao: '',
  preparo: '',
  valor_padrao: '',
  termo_consentimento: '',
};

export default function Exames() {
  const { usuario } = useAuth();
  const podeEditar = ['admin', 'recepcao'].includes(usuario.role);
  const podeExcluir = usuario.role === 'admin';

  const [exames, setExames] = useState([]);
  const [erro, setErro] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [exameEmEdicao, setExameEmEdicao] = useState(null);
  const [form, setForm] = useState(EXAME_VAZIO);
  const [erroForm, setErroForm] = useState('');

  async function carregar() {
    setErro('');
    try {
      const dados = await examesService.listarExames(true);
      setExames(dados);
    } catch (err) {
      setErro('Não foi possível carregar os exames.');
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setExameEmEdicao(null);
    setForm(EXAME_VAZIO);
    setErroForm('');
    setModalAberto(true);
  }

  function abrirEdicao(exame) {
    setExameEmEdicao(exame);
    setForm({
      nome: exame.nome || '',
      descricao: exame.descricao || '',
      preparo: exame.preparo || '',
      valor_padrao: exame.valor_padrao ?? '',
      termo_consentimento: exame.termo_consentimento || '',
    });
    setErroForm('');
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErroForm('');
    try {
      if (exameEmEdicao) {
        await examesService.atualizarExame(exameEmEdicao.id, form);
      } else {
        await examesService.criarExame(form);
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível salvar o exame.');
    }
  }

  async function alternarAtivo(exame) {
    try {
      await examesService.atualizarExame(exame.id, { ativo: !exame.ativo });
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível alterar o status.');
    }
  }

  async function excluir(exame) {
    if (!confirm(`Excluir o exame "${exame.nome}"?`)) return;
    try {
      await examesService.excluirExame(exame.id);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível excluir o exame.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Exames</h1>
        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
          >
            + Novo Exame
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Valor padrão</th>
              <th className="text-left px-4 py-3">Termo</th>
              <th className="text-left px-4 py-3">Status</th>
              {podeEditar && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {exames.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  Nenhum exame cadastrado.
                </td>
              </tr>
            )}
            {exames.map((exame) => (
              <tr key={exame.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-800">{exame.nome}</td>
                <td className="px-4 py-3 text-gray-500">{formatarMoeda(exame.valor_padrao)}</td>
                <td className="px-4 py-3">
                  {exame.termo_consentimento && exame.termo_consentimento.trim() ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Exige termo
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      exame.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {exame.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                {podeEditar && (
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => abrirEdicao(exame)}
                      className="text-primary-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarAtivo(exame)}
                      className="text-gray-500 hover:underline"
                    >
                      {exame.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    {podeExcluir && (
                      <button
                        onClick={() => excluir(exame)}
                        className="text-red-600 hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        titulo={exameEmEdicao ? 'Editar Exame' : 'Novo Exame'}
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
      >
        <form onSubmit={salvar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              required
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor padrão (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_padrao}
              onChange={(e) => setForm({ ...form, valor_padrao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preparo necessário
            </label>
            <textarea
              rows={2}
              value={form.preparo}
              onChange={(e) => setForm({ ...form, preparo: e.target.value })}
              placeholder="Ex: jejum de 8 horas"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Termo de consentimento
            </label>
            <textarea
              rows={5}
              value={form.termo_consentimento}
              onChange={(e) => setForm({ ...form, termo_consentimento: e.target.value })}
              placeholder="Texto específico deste exame — se preenchido, o termo é impresso e a assinatura digitalizada é exigida antes de confirmar o pagamento."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Deixe em branco se este exame não exige termo de consentimento.
            </p>
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
    </div>
  );
}
