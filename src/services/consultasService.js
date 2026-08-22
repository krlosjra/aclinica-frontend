import api from './api';

export async function listarConsultas(filtros = {}) {
  const { data } = await api.get('/consultas', { params: filtros });
  return data;
}

// Usado por listas sem recorte de data natural (ex: histórico de
// exames já laudados) — sem isso cresceriam pra sempre. A agenda
// (calendário) continua usando listarConsultas() de cima, filtrada
// por período.
export async function listarConsultasPaginado(pagina = 1, limite = 50, filtros = {}) {
  const { data } = await api.get('/consultas', { params: { pagina, limite, ...filtros } });
  return data; // { consultas, total, pagina, limite, totalPaginas }
}

export async function buscarConsulta(id) {
  const { data } = await api.get(`/consultas/${id}`);
  return data;
}

export async function criarConsulta(consulta) {
  const { data } = await api.post('/consultas', consulta);
  return data;
}

export async function atualizarConsulta(id, consulta) {
  const { data } = await api.put(`/consultas/${id}`, consulta);
  return data;
}

export async function atualizarStatusConsulta(id, status, extras = {}) {
  const { data } = await api.patch(`/consultas/${id}/status`, { status, ...extras });
  return data;
}

export async function excluirConsulta(id) {
  await api.delete(`/consultas/${id}`);
}
