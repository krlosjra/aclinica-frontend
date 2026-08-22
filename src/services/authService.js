import api from './api';

export async function login(email, senha) {
  const { data } = await api.post('/auth/login', { email, senha });
  return data; // { token, usuario }
}

export async function registrar(dadosUsuario) {
  const { data } = await api.post('/auth/registrar', dadosUsuario);
  return data;
}

export async function registrarPaciente(dadosPaciente) {
  const { data } = await api.post('/auth/registrar-paciente', dadosPaciente);
  return data; // { token, usuario }
}
