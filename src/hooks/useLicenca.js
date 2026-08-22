import { useCallback, useEffect, useState } from 'react';
import * as licencaService from '../services/licencaService';

const INTERVALO_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Mantém o status da licença (dias restantes, aviso, expirada) sempre
 * atualizado: consulta ao montar, a cada 5 minutos, e também na hora
 * (via evento global) quando alguma chamada da API já voltou dizendo
 * que a licença venceu — sem esperar o próximo ciclo do intervalo.
 */
export default function useLicenca() {
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const consultar = useCallback(async () => {
    try {
      const dados = await licencaService.statusLicenca();
      setStatus(dados);
    } catch {
      // Se nem der pra consultar (ex: rede fora do ar), não trava o
      // app por causa disso — o resto da aplicação já lida com erro
      // de rede normalmente.
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    consultar();
    const intervalo = setInterval(consultar, INTERVALO_MS);

    function aoReceberBloqueio() {
      setStatus((atual) => (atual ? { ...atual, expirada: true } : atual));
    }
    window.addEventListener('licenca:expirada', aoReceberBloqueio);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('licenca:expirada', aoReceberBloqueio);
    };
  }, [consultar]);

  return { status, carregando, recarregar: consultar };
}
