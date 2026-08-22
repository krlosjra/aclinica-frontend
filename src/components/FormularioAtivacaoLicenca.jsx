import { useState } from 'react';
import * as licencaService from '../services/licencaService';

export default function FormularioAtivacaoLicenca({ aoAtivar }) {
  const [chave, setChave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function aoSubmeter(e) {
    e.preventDefault();
    if (!chave.trim()) return;

    setEnviando(true);
    setErro('');
    try {
      const status = await licencaService.ativarLicenca(chave.trim());
      setChave('');
      aoAtivar?.(status);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível ativar essa chave.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoSubmeter} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Chave de licença</label>
        <textarea
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          rows={3}
          placeholder="Cole aqui a chave enviada pelo fornecedor do sistema"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono"
        />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
      >
        {enviando ? 'Ativando...' : 'Ativar licença'}
      </button>
    </form>
  );
}
