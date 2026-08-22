import api from './api';

export async function enviarTermoAssinado(consultaId, arquivoBase64) {
  const { data } = await api.post(`/consultas/${consultaId}/termo-assinado`, {
    arquivo_base64: arquivoBase64,
  });
  return data;
}

export async function buscarTermoAssinado(consultaId) {
  try {
    const { data } = await api.get(`/consultas/${consultaId}/termo-assinado`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

// A imagem é servida por uma rota autenticada (não é arquivo estático
// público — é documento de paciente), então uma <img src="..."> comum
// não funciona: o navegador não manda o token JWT nessa requisição.
// Por isso baixamos como blob (com o axios, que já anexa o header) e
// abrimos numa aba nova a partir de um object URL.
export async function abrirTermoAssinado(consultaId) {
  const resposta = await api.get(`/consultas/${consultaId}/termo-assinado/arquivo`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(resposta.data);
  window.open(url, '_blank');
}

/**
 * Converte um File (input type="file") pra data URL base64, formato
 * que o backend espera ("data:image/jpeg;base64,....").
 */
export function arquivoParaBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}
