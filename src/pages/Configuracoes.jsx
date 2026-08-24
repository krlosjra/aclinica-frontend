import { useEffect, useState } from 'react';
import * as configuracaoService from '../services/configuracaoService';

const CONFIG_VAZIA = {
  nome: '',
  cnpj: '',
  endereco: '',
  telefone: '',
  email: '',
  site: '',
  impostos_ativos: false,
  aliquota_ibs: '',
  aliquota_cbs: '',
};

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

        <div className="border-t border-gray-100 pt-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Impostos (IBS/CBS — Reforma Tributária)
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            As alíquotas oficiais ainda não foram definidas em lei — deixe zerado até ter os
            valores corretos com seu contador. Quando ativado, o pagamento em cartão ou PIX
            sempre inclui o imposto; em dinheiro, quem recebe pode optar por incluir ou não.
          </p>

          <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={form.impostos_ativos}
              onChange={(e) => setForm({ ...form, impostos_ativos: e.target.checked })}
              className="rounded border-gray-300"
            />
            Ativar cobrança de IBS/CBS nos pagamentos
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alíquota IBS (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.aliquota_ibs}
                onChange={(e) => setForm({ ...form, aliquota_ibs: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alíquota CBS (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.aliquota_cbs}
                onChange={(e) => setForm({ ...form, aliquota_cbs: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
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
