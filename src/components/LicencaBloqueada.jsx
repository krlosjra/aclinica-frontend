import { useAuth } from '../context/AuthContext';
import FormularioAtivacaoLicenca from './FormularioAtivacaoLicenca';

export default function LicencaBloqueada({ status, aoAtivar }) {
  const { usuario, sair } = useAuth();
  const ehAdmin = usuario?.role === 'admin';

  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center">
        <h1 className="text-lg font-bold text-gray-800 mb-2">Licença do sistema vencida</h1>
        <p className="text-sm text-gray-600 mb-4">
          {status?.ativada
            ? `A licença deste sistema (${status.cliente}) venceu. O acesso fica bloqueado até renovar.`
            : 'Este sistema ainda não tem uma licença ativada.'}
        </p>

        {ehAdmin ? (
          <div className="text-left">
            <FormularioAtivacaoLicenca aoAtivar={aoAtivar} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Fale com o administrador do sistema para renovar o acesso.
          </p>
        )}

        <button onClick={sair} className="mt-5 text-xs text-gray-400 hover:text-gray-600">
          Sair
        </button>
      </div>
    </div>
  );
}
