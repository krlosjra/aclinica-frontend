import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RotaProtegida from './components/RotaProtegida';
import Layout from './components/Layout';

import Login from './pages/Login';
import CadastroPaciente from './pages/CadastroPaciente';
import Consultas from './pages/Consultas';
import MinhasConsultas from './pages/MinhasConsultas';
import Pacientes from './pages/Pacientes';
import Prontuario from './pages/Prontuario';
import Exames from './pages/Exames';
import Caixa from './pages/Caixa';
import RelatorioCaixa from './pages/RelatorioCaixa';
import Usuarios from './pages/Usuarios';
import Configuracoes from './pages/Configuracoes';
import Licenca from './pages/Licenca';
import PrescricaoImpressao from './pages/PrescricaoImpressao';
import LaudoImpressao from './pages/LaudoImpressao';
import TermoConsentimentoImpressao from './pages/TermoConsentimentoImpressao';
import LaudosExames from './pages/LaudosExames';
import ReciboPagamento from './pages/ReciboPagamento';

// Leva pra tela inicial certa conforme o perfil de quem está logado.
function Inicio() {
  const { usuario, autenticado } = useAuth();
  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={usuario.role === 'paciente' ? '/minhas-consultas' : '/consultas'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroPaciente />} />

        <Route
          element={
            <RotaProtegida>
              <Layout />
            </RotaProtegida>
          }
        >
          <Route
            path="/consultas"
            element={
              <RotaProtegida roles={['admin', 'medico', 'recepcao']}>
                <Consultas />
              </RotaProtegida>
            }
          />

          <Route
            path="/minhas-consultas"
            element={
              <RotaProtegida roles={['paciente']}>
                <MinhasConsultas />
              </RotaProtegida>
            }
          />

          <Route
            path="/pacientes"
            element={
              <RotaProtegida roles={['admin', 'recepcao']}>
                <Pacientes />
              </RotaProtegida>
            }
          />

          <Route
            path="/prontuario"
            element={
              <RotaProtegida roles={['admin', 'medico']}>
                <Prontuario />
              </RotaProtegida>
            }
          />

          <Route
            path="/exames"
            element={
              <RotaProtegida roles={['admin', 'recepcao', 'medico']}>
                <Exames />
              </RotaProtegida>
            }
          />

          <Route
            path="/caixa"
            element={
              <RotaProtegida roles={['admin', 'recepcao']}>
                <Caixa />
              </RotaProtegida>
            }
          />

          <Route
            path="/relatorio-caixa"
            element={
              <RotaProtegida roles={['admin', 'recepcao']}>
                <RelatorioCaixa />
              </RotaProtegida>
            }
          />

          <Route
            path="/usuarios"
            element={
              <RotaProtegida roles={['admin']}>
                <Usuarios />
              </RotaProtegida>
            }
          />

          <Route
            path="/configuracoes"
            element={
              <RotaProtegida roles={['admin']}>
                <Configuracoes />
              </RotaProtegida>
            }
          />

          <Route
            path="/licenca"
            element={
              <RotaProtegida roles={['admin']}>
                <Licenca />
              </RotaProtegida>
            }
          />

          <Route
            path="/prescricoes/:id"
            element={
              <RotaProtegida roles={['admin', 'medico']}>
                <PrescricaoImpressao />
              </RotaProtegida>
            }
          />

          <Route
            path="/laudos"
            element={
              <RotaProtegida roles={['admin', 'medico']}>
                <LaudosExames />
              </RotaProtegida>
            }
          />

          <Route
            path="/laudos/:id"
            element={
              <RotaProtegida roles={['admin', 'medico']}>
                <LaudoImpressao />
              </RotaProtegida>
            }
          />

          <Route
            path="/consultas/:id/termo-impressao"
            element={
              <RotaProtegida roles={['admin', 'recepcao']}>
                <TermoConsentimentoImpressao />
              </RotaProtegida>
            }
          />

          <Route
            path="/recibo/:consultaId"
            element={
              <RotaProtegida roles={['admin', 'recepcao']}>
                <ReciboPagamento />
              </RotaProtegida>
            }
          />

          <Route path="/" element={<Inicio />} />
        </Route>

        <Route path="*" element={<Inicio />} />
      </Routes>
    </AuthProvider>
  );
}
