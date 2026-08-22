import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useLicenca from '../hooks/useLicenca';
import AvisoLicenca from './AvisoLicenca';
import LicencaBloqueada from './LicencaBloqueada';

const ROTULOS_ROLE = {
  admin: 'Administrador',
  medico: 'Médico(a)',
  recepcao: 'Recepção',
  paciente: 'Paciente',
};

export default function Layout() {
  const { usuario, sair } = useAuth();
  const { status, recarregar } = useLicenca();

  const itensMenu = [
    { rota: '/consultas', label: 'Consultas', roles: ['admin', 'medico', 'recepcao'] },
    { rota: '/minhas-consultas', label: 'Minhas Consultas', roles: ['paciente'] },
    { rota: '/pacientes', label: 'Pacientes', roles: ['admin', 'recepcao'] },
    { rota: '/prontuario', label: 'Prontuário', roles: ['admin', 'medico'] },
    { rota: '/exames', label: 'Exames', roles: ['admin', 'recepcao', 'medico'] },
    { rota: '/laudos', label: 'Laudos de Exames', roles: ['admin', 'medico'] },
    { rota: '/caixa', label: 'Caixa', roles: ['admin', 'recepcao'] },
    { rota: '/relatorio-caixa', label: 'Relatório de Caixa', roles: ['admin', 'recepcao'] },
    { rota: '/usuarios', label: 'Usuários', roles: ['admin'] },
    { rota: '/configuracoes', label: 'Configurações', roles: ['admin'] },
    { rota: '/licenca', label: 'Licença', roles: ['admin'] },
  ];

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-primary-700">Clínica</h1>
          <p className="text-xs text-gray-500 mt-1">
            {usuario?.nome} · {ROTULOS_ROLE[usuario?.role] || usuario?.role}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {itensMenu
            .filter((item) => item.roles.includes(usuario?.role))
            .map((item) => (
              <NavLink
                key={item.rota}
                to={item.rota}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={sair}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col print:overflow-visible print:bg-white">
        <AvisoLicenca status={status} />
        <div className="p-6 max-w-6xl mx-auto w-full flex-1 print:p-0 print:max-w-none">
          {status?.expirada ? (
            <LicencaBloqueada status={status} aoAtivar={recarregar} />
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

