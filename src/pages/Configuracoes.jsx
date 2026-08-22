import { useEffect, useState } from 'react';
import * as configuracaoService from '../services/configuracaoService';

const CONFIG_VAZIA = { nome: '', cnpj: '', endereco: '', telefone: '', email: '', site: '' };

export default function Configuracoes() {
  const [form, setForm] = useState(CONFIG_VAZIA);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    configuracaoService
      .obterConfiguracao()
      .then((dados) => setForm({ ...CONFIG_VAZIA, ...dados }))
      .catch(() => setErro('Não foi possível carregar a configuração atual.'))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSucesso(false);
    setSalvando(true);
    try {
      const atualizado = await configuracaoService.atualizarConfiguracao(form);
      setForm({ ...CONFIG_VAZIA, ...atualizado });
      setSucesso(true);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível salvar a configuração.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-gray-400">Carregando...</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-1">Configurações da Clínica</h1>
      <p className="text-sm text-gray-500 mb-6">
        Esses dados aparecem no cabeçalho das receitas e outros documentos impressos.
      </p>

      <form
        onSubmit={salvar}
        className="bg-white rounded-lg border border-gray-100 p-6 max-w-xl space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da clínica *
          </label>
          <input
            type="text"
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
          <input
            type="text"
            value={form.cnpj || ''}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input
            type="text"
            value={form.endereco || ''}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={form.telefone || ''}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
          <input
            type="text"
            value={form.site || ''}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
            placeholder="www.suaclinica.com.br"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {sucesso && <p className="text-sm text-green-600">Configuração salva com sucesso.</p>}

        <button
          type="submit"
          disabled={salvando}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
