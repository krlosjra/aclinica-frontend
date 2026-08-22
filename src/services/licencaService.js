import api from './api';

export async function statusLicenca() {
  const { data } = await api.get('/licenca/status');
  return data;
}

export async function ativarLicenca(chave) {
  const { data } = await api.post('/licenca/ativar', { chave });
  return data;
}
