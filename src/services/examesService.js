import api from './api';

export async function listarExames(incluirInativos = false) {
  const { data } = await api.get('/exames', {
    params: incluirInativos ? { incluir_inativos: 'true' } : {},
  });
  return data;
}

export async function buscarExame(id) {
  const { data } = await api.get(`/exames/${id}`);
  return data;
}

export async function criarExame(exame) {
  const { data } = await api.post('/exames', exame);
  return data;
}

export async function atualizarExame(id, exame) {
  const { data } = await api.put(`/exames/${id}`, exame);
  return data;
}

export async function excluirExame(id) {
  await api.delete(`/exames/${id}`);
}
