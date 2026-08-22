import { useEffect, useState } from 'react';
import * as licencaService from '../services/licencaService';
import FormularioAtivacaoLicenca from '../components/FormularioAtivacaoLicenca';

const ROTULOS_TIPO = { mensal: 'Mensal', anual: 'Anual' };

export default function Licenca() {
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await licencaService.statusLicenca();
      setStatus(dados);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Licença do Sistema</h1>

      {carregando && <p className="text-sm text-gray-400">Carregando...</p>}

      {!carregando && (
        <div className="bg-white rounded-lg border border-gray-100 p-5 mb-6">
          {status?.ativada ? (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Cliente:</span>{' '}
                <span className="font-medium">{status.cliente}</span>
              </p>
              <p>
                <span className="text-gray-500">Tipo:</span>{' '}
                <span className="font-medium">{ROTULOS_TIPO[status.tipo] || status.tipo}</span>
              </p>
              <p>
                <span className="text-gray-500">Ativada em:</span>{' '}
                {new Date(status.ativada_em).toLocaleDateString('pt-BR')}
              </p>
              <p>
                <span className="text-gray-500">Expira em:</span>{' '}
                <span
                  className={
                    status.expirada
                      ? 'text-red-600 font-medium'
                      : status.aviso
                      ? 'text-yellow-700 font-medium'
                      : 'font-medium'
                  }
                >
                  {new Date(status.expira_em).toLocaleDateString('pt-BR')}
                </span>
              </p>
              <p className="text-gray-500">
                {status.expirada
                  ? 'Licença vencida.'
                  : `Faltam ${status.dias_restantes} ${
                      status.dias_restantes === 1 ? 'dia' : 'dias'
                    } para vencer.`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma licença ativada neste sistema ainda.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Ativar nova licença</h2>
        <FormularioAtivacaoLicenca aoAtivar={carregar} />
      </div>
    </div>
  );
}
