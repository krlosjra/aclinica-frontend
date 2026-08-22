import api from './api';

export async function listarCaixa(filtros = {}) {
  const { data } = await api.get('/caixa', { params: filtros });
  return data;
}

export async function resumoCaixa(filtros = {}) {
  const { data } = await api.get('/caixa/resumo', { params: filtros });
  return data;
}

export async function relatorioCaixa(dataReferencia) {
  const { data } = await api.get('/caixa/relatorio', {
    params: dataReferencia ? { data: dataReferencia } : {},
  });
  return data;
}

export async function criarLancamento(lancamento) {
  const { data } = await api.post('/caixa', lancamento);
  return data;
}

export async function excluirLancamento(id) {
  await api.delete(`/caixa/${id}`);
}

export async function statusCaixa() {
  const { data } = await api.get('/caixa/status');
  return data;
}

export async function abrirCaixa(dados) {
  const { data } = await api.post('/caixa/abrir', dados);
  return data;
}

export async function fecharCaixa(dados) {
  const { data } = await api.post('/caixa/fechar', dados);
  return data;
}
