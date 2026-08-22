import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protege uma rota: exige login e, opcionalmente, uma lista de roles
 * permitidas. Uso:
 *   <RotaProtegida roles={['admin', 'recepcao']}><Pacientes /></RotaProtegida>
 */
export default function RotaProtegida({ children, roles }) {
  const { usuario, autenticado } = useAuth();

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(usuario.role)) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-gray-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return children;
}
