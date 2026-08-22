import api from './api';

export async function listarLaudos(filtros = {}) {
  const { data } = await api.get('/laudos', { params: filtros });
  return data;
}

export async function buscarLaudo(id) {
  const { data } = await api.get(`/laudos/${id}`);
  return data;
}

export async function criarLaudo(laudo) {
  const { data } = await api.post('/laudos', laudo);
  return data;
}

export async function atualizarLaudo(id, conteudo) {
  const { data } = await api.put(`/laudos/${id}`, { conteudo });
  return data;
}

export async function excluirLaudo(id) {
  await api.delete(`/laudos/${id}`);
}
