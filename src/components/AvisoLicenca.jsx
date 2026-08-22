import { useAuth } from '../context/AuthContext';

export default function AvisoLicenca({ status }) {
  const { usuario } = useAuth();

  if (!status?.aviso) return null;

  const dias = status.dias_restantes;
  const textoDias = dias <= 0 ? 'vence hoje' : `vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm px-6 py-2 print:hidden">
      A licença deste sistema {textoDias} ({new Date(status.expira_em).toLocaleDateString('pt-BR')}).
      {usuario?.role === 'admin' ? (
        <>
          {' '}
          Renove em{' '}
          <a href="/licenca" className="underline font-medium">
            Licença
          </a>
          .
        </>
      ) : (
        ' Avise o administrador do sistema.'
      )}
    </div>
  );
}
