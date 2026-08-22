import api from './api';

export async function listarMedicos() {
  const { data } = await api.get('/usuarios/medicos');
  return data;
}

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios');
  return data;
}

export async function alterarStatusUsuario(id, ativo) {
  const { data } = await api.patch(`/usuarios/${id}/status`, { ativo });
  return data;
}
