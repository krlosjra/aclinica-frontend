import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import * as pacientesService from '../services/pacientesService';

const PACIENTE_VAZIO = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  data_nascimento: '',
  cep: '',
  observacoes: '',
};

export default function Pacientes() {
  const { usuario } = useAuth();
  const podeEditar = ['admin', 'recepcao'].includes(usuario.role);
  const podeExcluir = usuario.role === 'admin';

  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMITE_POR_PAGINA = 50;

  const [modalAberto, setModalAberto] = useState(false);
  const [pacienteEmEdicao, setPacienteEmEdicao] = useState(null);
  const [form, setForm] = useState(PACIENTE_VAZIO);
  const [erroForm, setErroForm] = useState('');

  async function carregarPacientes(termoBusca = busca, paginaAlvo = 1) {
    setCarregando(true);
    setErro('');
    try {
      const dados = await pacientesService.listarPacientesPaginado(
        paginaAlvo,
        LIMITE_POR_PAGINA,
        termoBusca
      );
      setPacientes(dados.pacientes);
      setTotal(dados.total);
      setTotalPaginas(dados.totalPaginas);
      setPagina(dados.pagina);
    } catch (err) {
      setErro('Não foi possível carregar os pacientes.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPacientes('', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function irParaPagina(novaPagina) {
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    carregarPacientes(busca, novaPagina);
  }

  function abrirNovo() {
    setPacienteEmEdicao(null);
    setForm(PACIENTE_VAZIO);
    setErroForm('');
    setModalAberto(true);
  }

  function abrirEdicao(paciente) {
    setPacienteEmEdicao(paciente);
    setForm({
      nome: paciente.nome || '',
      cpf: paciente.cpf || '',
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      data_nascimento: paciente.data_nascimento?.slice(0, 10) || '',
      cep: paciente.cep || '',
      observacoes: paciente.observacoes || '',
    });
    setErroForm('');
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErroForm('');
    try {
      if (pacienteEmEdicao) {
        await pacientesService.atualizarPaciente(pacienteEmEdicao.id, form);
      } else {
        await pacientesService.criarPaciente(form);
      }
      setModalAberto(false);
      carregarPacientes(busca, pagina);
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível salvar o paciente.');
    }
  }

  async function excluir(paciente) {
    if (!confirm(`Excluir o paciente "${paciente.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await pacientesService.excluirPaciente(paciente.id);
      // Se era o último da página (e não é a página 1), volta uma
      // página pra não ficar numa tela vazia depois de excluir.
      const ficaVazia = pacientes.length === 1 && pagina > 1;
      carregarPacientes(busca, ficaVazia ? pagina - 1 : pagina);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível excluir o paciente.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Pacientes</h1>
        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
          >
            + Novo Paciente
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          carregarPacientes(busca, 1);
        }}
        className="mb-4 flex gap-2"
      >
        <input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
        >
          Buscar
        </button>
      </form>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">CPF</th>
              <th className="text-left px-4 py-3">Telefone</th>
              <th className="text-left px-4 py-3">Email</th>
              {podeEditar && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!carregando && pacientes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  Nenhum paciente encontrado.
                </td>
              </tr>
            )}
            {pacientes.map((paciente) => (
              <tr key={paciente.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-800">{paciente.nome}</td>
                <td className="px-4 py-3 text-gray-500">{paciente.cpf || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{paciente.telefone || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{paciente.email || '—'}</td>
                {podeEditar && (
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => abrirEdicao(paciente)}
                      className="text-primary-600 hover:underline"
                    >
                      Editar
                    </button>
                    {podeExcluir && (
                      <button
                        onClick={() => excluir(paciente)}
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

      {!carregando && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Mostrando {(pagina - 1) * LIMITE_POR_PAGINA + 1}–
            {Math.min(pagina * LIMITE_POR_PAGINA, total)} de {total} pacientes
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

      <Modal
        titulo={pacienteEmEdicao ? 'Editar Paciente' : 'Novo Paciente'}
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
      >
        <form onSubmit={salvar} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              value={form.cep}
              onChange={(e) => setForm({ ...form, cep: e.target.value })}
              placeholder="00000-000"
              maxLength={9}
              className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              rows={3}
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
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
    </div>
  );
}
