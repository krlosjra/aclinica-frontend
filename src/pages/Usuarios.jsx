import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import * as usuariosService from '../services/usuariosService';
import * as authService from '../services/authService';
import * as pacientesService from '../services/pacientesService';

const ROTULOS_ROLE = {
  admin: 'Administrador',
  medico: 'Médico(a)',
  recepcao: 'Recepção',
  paciente: 'Paciente',
};

const NOVO_USUARIO_VAZIO = {
  nome: '',
  email: '',
  senha: '',
  role: 'recepcao',
  crm: '',
  especialidade: '',
  paciente_id: '',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [erro, setErro] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(NOVO_USUARIO_VAZIO);
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setErro('');
    try {
      const dados = await usuariosService.listarUsuarios();
      setUsuarios(dados);
    } catch (err) {
      setErro('Não foi possível carregar os usuários.');
    }
  }

  useEffect(() => {
    carregar();
    pacientesService.listarPacientes().then(setPacientes).catch(() => {});
  }, []);

  // Pacientes que ainda não têm conta de acesso vinculada
  const pacientesSemAcesso = pacientes.filter(
    (p) => !usuarios.some((u) => u.paciente_id === p.id)
  );

  async function alternarStatus(usuarioLinha) {
    try {
      await usuariosService.alterarStatusUsuario(usuarioLinha.id, !usuarioLinha.ativo);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível alterar o status.');
    }
  }

  function abrirNovo() {
    setForm(NOVO_USUARIO_VAZIO);
    setErroForm('');
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErroForm('');

    if (form.senha.length < 6) {
      setErroForm('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (form.role === 'paciente' && !form.paciente_id) {
      setErroForm('Selecione qual paciente vai receber esse acesso.');
      return;
    }

    setSalvando(true);
    try {
      const dados = { ...form };
      if (dados.role !== 'medico') {
        delete dados.crm;
        delete dados.especialidade;
      }
      if (dados.role !== 'paciente') {
        delete dados.paciente_id;
      }
      await authService.registrar(dados);
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível cadastrar o usuário.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Usuários</h1>
        <button
          onClick={abrirNovo}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Novo Usuário
        </button>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Perfil</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-800">{u.nome}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{ROTULOS_ROLE[u.role] || u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => alternarStatus(u)}
                    className="text-primary-600 hover:underline text-xs"
                  >
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal titulo="Novo Usuário" aberto={modalAberto} aoFechar={() => setModalAberto(false)}>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
            <select
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="recepcao">Recepção</option>
              <option value="medico">Médico(a)</option>
              <option value="admin">Administrador</option>
              <option value="paciente">Paciente</option>
            </select>
          </div>

          {form.role === 'paciente' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qual paciente vai receber este acesso? *
              </label>
              <select
                required
                value={form.paciente_id}
                onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Selecione...</option>
                {pacientesSemAcesso.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.cpf ? `— ${p.cpf}` : ''}
                  </option>
                ))}
              </select>
              {pacientesSemAcesso.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Todos os pacientes cadastrados já têm acesso, ou nenhum paciente foi
                  cadastrado ainda em "Pacientes".
                </p>
              )}
            </div>
          )}

          {form.role === 'medico' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
                <input
                  type="text"
                  value={form.crm}
                  onChange={(e) => setForm({ ...form, crm: e.target.value })}
                  placeholder="CRM-PA 12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidade
                </label>
                <input
                  type="text"
                  value={form.especialidade}
                  onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          )}

          {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Cadastrar Usuário'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
