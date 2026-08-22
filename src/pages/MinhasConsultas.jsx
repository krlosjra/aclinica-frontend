import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import * as consultasService from '../services/consultasService';
import * as usuariosService from '../services/usuariosService';
import { formatarMoeda, formatarDataHora } from '../utils/formatters';

const NOVA_CONSULTA_VAZIA = { medico_id: '', data_hora: '', observacoes: '' };
const HORAS_MINIMAS_CANCELAMENTO = 24;

const CORES_STATUS = {
  agendada: 'bg-blue-100 text-blue-700',
  confirmada: 'bg-purple-100 text-purple-700',
  realizada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
};

function podeCancelar(consulta) {
  if (!['agendada', 'confirmada'].includes(consulta.status)) return false;
  const horasAteConsulta = (new Date(consulta.data_hora) - new Date()) / (1000 * 60 * 60);
  return horasAteConsulta >= HORAS_MINIMAS_CANCELAMENTO;
}

export default function MinhasConsultas() {
  const { usuario } = useAuth();

  const [consultas, setConsultas] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [novaConsulta, setNovaConsulta] = useState(NOVA_CONSULTA_VAZIA);
  const [erroForm, setErroForm] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const dados = await consultasService.listarConsultas();
      setConsultas(dados);
    } catch (err) {
      setErro('Não foi possível carregar suas consultas.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    usuariosService.listarMedicos().then(setMedicos).catch(() => {});
  }, []);

  const { proximas, passadas } = useMemo(() => {
    const agora = new Date();
    const ordenadas = [...consultas].sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));
    return {
      proximas: ordenadas.filter(
        (c) => new Date(c.data_hora) >= agora && c.status !== 'cancelada'
      ),
      passadas: ordenadas
        .filter((c) => new Date(c.data_hora) < agora || c.status === 'cancelada')
        .reverse(),
    };
  }, [consultas]);

  function abrirNovaConsulta() {
    setNovaConsulta(NOVA_CONSULTA_VAZIA);
    setErroForm('');
    setModalNovaAberto(true);
  }

  async function salvarNovaConsulta(e) {
    e.preventDefault();
    setErroForm('');
    try {
      await consultasService.criarConsulta(novaConsulta);
      setModalNovaAberto(false);
      carregar();
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível marcar a consulta.');
    }
  }

  async function cancelar(consulta) {
    if (!confirm('Cancelar esta consulta? Essa ação não pode ser desfeita.')) return;
    try {
      await consultasService.atualizarStatusConsulta(consulta.id, 'cancelada');
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível cancelar a consulta.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Minhas Consultas</h1>
          <p className="text-sm text-gray-500">Olá, {usuario.nome}</p>
        </div>
        <button
          onClick={abrirNovaConsulta}
          className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + Marcar Consulta
        </button>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}
      {carregando && <p className="text-sm text-gray-400">Carregando...</p>}

      {!carregando && (
        <>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Próximas
          </h2>
          <div className="space-y-3 mb-8">
            {proximas.length === 0 && (
              <p className="text-sm text-gray-400">Você não tem consultas marcadas.</p>
            )}
            {proximas.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">{formatarDataHora(c.data_hora)}</p>
                  <p className="text-sm text-gray-500">Dr(a). {c.medico_nome}</p>
                  {c.observacoes && (
                    <p className="text-xs text-gray-400 mt-1">{c.observacoes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${CORES_STATUS[c.status]}`}
                  >
                    {c.status}
                  </span>
                  {podeCancelar(c) ? (
                    <button
                      onClick={() => cancelar(c)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <span
                      className="text-xs text-gray-300"
                      title="Só é possível cancelar com no mínimo 1 dia de antecedência"
                    >
                      Cancelar
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Histórico
          </h2>
          <div className="space-y-3">
            {passadas.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum histórico ainda.</p>
            )}
            {passadas.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between opacity-75"
              >
                <div>
                  <p className="font-medium text-gray-800">{formatarDataHora(c.data_hora)}</p>
                  <p className="text-sm text-gray-500">Dr(a). {c.medico_nome}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full capitalize ${CORES_STATUS[c.status]}`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        titulo="Marcar Consulta"
        aberto={modalNovaAberto}
        aoFechar={() => setModalNovaAberto(false)}
      >
        <form onSubmit={salvarNovaConsulta} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Médico(a) *</label>
            <select
              required
              value={novaConsulta.medico_id}
              onChange={(e) => setNovaConsulta({ ...novaConsulta, medico_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Selecione...</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} {m.especialidade ? `— ${m.especialidade}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora *</label>
            <input
              type="datetime-local"
              required
              value={novaConsulta.data_hora}
              onChange={(e) => setNovaConsulta({ ...novaConsulta, data_hora: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={novaConsulta.observacoes}
              onChange={(e) => setNovaConsulta({ ...novaConsulta, observacoes: e.target.value })}
              placeholder="Ex: motivo da consulta"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}

          <p className="text-xs text-gray-400">
            Cancelamentos só podem ser feitos com no mínimo 1 dia de antecedência.
          </p>

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Marcar Consulta
          </button>
        </form>
      </Modal>
    </div>
  );
}
