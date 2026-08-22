import api from './api';

export async function listarAcompanhamentos(filtros = {}) {
  const { data } = await api.get('/acompanhamentos', { params: filtros });
  return data;
}

export async function buscarAcompanhamento(id) {
  const { data } = await api.get(`/acompanhamentos/${id}`);
  return data;
}

export async function criarAcompanhamento(registro) {
  const { data } = await api.post('/acompanhamentos', registro);
  return data;
}

export async function atualizarAcompanhamento(id, registro) {
  const { data } = await api.put(`/acompanhamentos/${id}`, registro);
  return data;
}

export async function excluirAcompanhamento(id) {
  await api.delete(`/acompanhamentos/${id}`);
}
