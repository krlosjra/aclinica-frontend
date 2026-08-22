import api from './api';

export async function listarPrescricoes(filtros = {}) {
  const { data } = await api.get('/prescricoes', { params: filtros });
  return data;
}

export async function buscarPrescricao(id) {
  const { data } = await api.get(`/prescricoes/${id}`);
  return data;
}

export async function criarPrescricao(prescricao) {
  const { data } = await api.post('/prescricoes', prescricao);
  return data;
}

export async function atualizarPrescricao(id, prescricao) {
  const { data } = await api.put(`/prescricoes/${id}`, prescricao);
  return data;
}

export async function excluirPrescricao(id) {
  await api.delete(`/prescricoes/${id}`);
}
