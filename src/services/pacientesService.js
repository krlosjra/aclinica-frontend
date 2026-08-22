import api from './api';

export async function listarPacientes(busca = '') {
  const { data } = await api.get('/pacientes', { params: busca ? { busca } : {} });
  return data;
}

// Usado só pela tela de listagem (Pacientes.jsx) — as outras telas
// (busca-seleção em Consultas, Prontuário, Usuários) continuam usando
// listarPacientes() de cima, que devolve a lista inteira.
export async function listarPacientesPaginado(pagina = 1, limite = 50, busca = '') {
  const { data } = await api.get('/pacientes', {
    params: { pagina, limite, ...(busca ? { busca } : {}) },
  });
  return data; // { pacientes, total, pagina, limite, totalPaginas }
}

export async function buscarPaciente(id) {
  const { data } = await api.get(`/pacientes/${id}`);
  return data;
}

export async function criarPaciente(paciente) {
  const { data } = await api.post('/pacientes', paciente);
  return data;
}

export async function atualizarPaciente(id, paciente) {
  const { data } = await api.put(`/pacientes/${id}`, paciente);
  return data;
}

export async function excluirPaciente(id) {
  await api.delete(`/pacientes/${id}`);
}
