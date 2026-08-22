import api from './api';

export async function obterConfiguracao() {
  const { data } = await api.get('/configuracao');
  return data;
}

export async function atualizarConfiguracao(dados) {
  const { data } = await api.put('/configuracao', dados);
  return data;
}
