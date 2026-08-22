import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Injeta o token JWT em toda requisição, se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o token expirar/for inválido, o backend responde 401 -> deslogamos
// e mandamos pro login, evitando ficar preso numa tela quebrada.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // Licença vencida: qualquer chamada (menos login/status/ativar, que
    // ficam liberadas no backend) pode voltar com esse aviso. Em vez de
    // redirecionar aqui, avisamos o app inteiro — quem decide o que
    // mostrar é o LicencaGuard, que já sabe se é admin ou não.
    if (error.response?.status === 403 && error.response?.data?.licenca_expirada) {
      window.dispatchEvent(new CustomEvent('licenca:expirada'));
    }
    return Promise.reject(error);
  }
);

export default api;
