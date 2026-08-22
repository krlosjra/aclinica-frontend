import api from './api';

export async function buscarMedicamentos(busca) {

    const resposta = await api.get('/medicamentos', {
        params: {
            busca
        }
    });

    return resposta.data;
}