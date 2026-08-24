import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import logo from '../assets/logo.svg';

export default function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const dadosUsuario = await entrar(email, senha);
      navigate(dadosUsuario.role === 'paciente' ? '/minhas-consultas' : '/consultas');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível fazer login.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        <img src={logo} alt="Aclinika" className="w-14 h-14 mx-auto mb-3 rounded-xl" />
        <h1 className="text-xl font-bold text-center text-primary-700 mb-1">Aclinika</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Entre com seu email e senha
        </p>

        <form onSubmit={aoEnviar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-5">
          É paciente e ainda não tem acesso?{' '}
          <Link to="/cadastro" className="text-primary-600 font-medium hover:underline">
            Criar minha conta
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
