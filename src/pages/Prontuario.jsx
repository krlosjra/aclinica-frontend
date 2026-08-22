import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import * as pacientesService from '../services/pacientesService';
import * as acompanhamentosService from '../services/acompanhamentosService';
import * as prescricoesService from '../services/prescricoesService';
import * as laudosService from '../services/laudosService';
import { formatarDataHora } from '../utils/formatters';
import * as medicamentosService from '../services/medicamentosService';
import { sugerirPosologia } from '../utils/posologiaSugerida';

const ACOMPANHAMENTO_VAZIO = {
  queixa_principal: '',
  historia_clinica: '',
  exame_fisico: '',
  diagnostico: '',
  conduta: '',
  observacoes: '',
};

const ITEM_VAZIO = {
  medicamento: '',
  dosagem: '',
  via_administracao: '',
  frequencia: '',
  duracao: '',
  quantidade: '',
  observacoes: '',
};

export default function Prontuario() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);

  const [acompanhamentos, setAcompanhamentos] = useState([]);
  const [prescricoes, setPrescricoes] = useState([]);
  const [laudos, setLaudos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const [modalAcompAberto, setModalAcompAberto] = useState(false);
  const [formAcomp, setFormAcomp] = useState(ACOMPANHAMENTO_VAZIO);
  const [erroFormAcomp, setErroFormAcomp] = useState('');

  const [modalPrescAberto, setModalPrescAberto] = useState(false);
  const [acompanhamentoVinculado, setAcompanhamentoVinculado] = useState('');
  const [observacoesPresc, setObservacoesPresc] = useState('');
  const [examesSolicitados, setExamesSolicitados] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [sugestoesMedicamentos, setSugestoesMedicamentos] = useState({});
  const [indiceAtivoMedicamento, setIndiceAtivoMedicamento] = useState({});
  const [posologiaAplicada, setPosologiaAplicada] = useState({});
  const [erroFormPresc, setErroFormPresc] = useState('');

  useEffect(() => {
    pacientesService.listarPacientes().then((dados) => {
      setPacientes(dados);
      const idNaUrl = searchParams.get('paciente_id');
      if (idNaUrl) {
        const paciente = dados.find((p) => String(p.id) === String(idNaUrl));
        if (paciente) {
          setPacienteId(paciente.id);
          setBuscaPaciente(paciente.nome);
          carregarDadosPaciente(paciente.id);
        }
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selecionarPaciente(paciente) {
    setPacienteId(paciente.id);
    setBuscaPaciente(paciente.nome);
    setSugestoesAbertas(false);
    carregarDadosPaciente(paciente.id);
  }

  const sugestoesPacientes =
    buscaPaciente.trim().length > 0
      ? pacientes.filter((p) => p.nome.toLowerCase().includes(buscaPaciente.trim().toLowerCase()))
      : pacientes;

  async function carregarDadosPaciente(id) {
    if (!id) {
      setAcompanhamentos([]);
      setPrescricoes([]);
      setLaudos([]);
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const [dadosAcomp, dadosPresc, dadosLaudos] = await Promise.all([
        acompanhamentosService.listarAcompanhamentos({ paciente_id: id }),
        prescricoesService.listarPrescricoes({ paciente_id: id }),
        laudosService.listarLaudos({ paciente_id: id }),
      ]);
      setAcompanhamentos(dadosAcomp);
      setPrescricoes(dadosPresc);
      setLaudos(dadosLaudos);
    } catch (err) {
      setErro('Não foi possível carregar o prontuário deste paciente.');
    } finally {
      setCarregando(false);
    }
  }

  // ---------- Acompanhamentos ----------
  function abrirNovoAcompanhamento() {
    setFormAcomp(ACOMPANHAMENTO_VAZIO);
    setErroFormAcomp('');
    setModalAcompAberto(true);
  }

  async function salvarAcompanhamento(e) {
    e.preventDefault();
    setErroFormAcomp('');
    try {
      await acompanhamentosService.criarAcompanhamento({
        paciente_id: pacienteId,
        ...formAcomp,
      });
      setModalAcompAberto(false);
      carregarDadosPaciente(pacienteId);
    } catch (err) {
      setErroFormAcomp(err.response?.data?.erro || 'Não foi possível salvar o registro.');
    }
  }

  async function excluirAcompanhamento(registro) {
    if (!confirm('Excluir este registro de acompanhamento? Essa ação não pode ser desfeita.')) return;
    try {
      await acompanhamentosService.excluirAcompanhamento(registro.id);
      carregarDadosPaciente(pacienteId);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível excluir o registro.');
    }
  }

  // ---------- Prescrições ----------
  function abrirNovaPrescricao() {
    setAcompanhamentoVinculado('');
    setObservacoesPresc('');
    setExamesSolicitados('');
    setItens([{ ...ITEM_VAZIO }]);
    setPosologiaAplicada({});
    setErroFormPresc('');
    setModalPrescAberto(true);
  }

  function atualizarItem(index, campo, valor) {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItens(novosItens);
  }

  // Preenche dosagem/via/frequência/duração com a sugestão encontrada,
  // mas só nos campos que ainda estão vazios — não sobrescreve o que
  // o médico já digitou na mão.
  function aplicarSugestaoPosologia(index, referenciaBusca, viaDaAnvisa) {
    const sugestao = sugerirPosologia(referenciaBusca);
    if (!sugestao) {
      setPosologiaAplicada((atual) => ({ ...atual, [index]: false }));
      return;
    }

    setItens((atual) => {
      const novosItens = [...atual];
      const itemAtual = novosItens[index];
      novosItens[index] = {
        ...itemAtual,
        dosagem: itemAtual.dosagem || sugestao.dosagem || '',
        // via de administração real do produto (base ANVISA) tem prioridade
        // sobre a sugestão genérica, quando disponível.
        via_administracao: itemAtual.via_administracao || viaDaAnvisa || sugestao.via_administracao || '',
        frequencia: itemAtual.frequencia || sugestao.frequencia || '',
        duracao: itemAtual.duracao || sugestao.duracao || '',
        observacoes: itemAtual.observacoes || sugestao.observacoes || '',
      };
      return novosItens;
    });

    setPosologiaAplicada((atual) => ({ ...atual, [index]: true }));
  }

  function adicionarItem() {
    setItens([...itens, { ...ITEM_VAZIO }]);
  }

  function removerItem(index) {
    if (itens.length === 1) return; // sempre precisa ter pelo menos 1 medicamento
    setItens(itens.filter((_, i) => i !== index));
    setPosologiaAplicada((atual) => {
      const { [index]: _removido, ...resto } = atual;
      return resto;
    });
  }

  async function salvarPrescricao(e) {
    e.preventDefault();
    setErroFormPresc('');

    const itensPreenchidos = itens.filter((item) => item.medicamento.trim());
    if (itensPreenchidos.length === 0 && !examesSolicitados.trim()) {
      setErroFormPresc('Informe ao menos um medicamento ou uma solicitação de exame.');
      return;
    }

    try {
      await prescricoesService.criarPrescricao({
        paciente_id: pacienteId,
        acompanhamento_id: acompanhamentoVinculado || null,
        observacoes: observacoesPresc,
        exames_solicitados: examesSolicitados.trim() || null,
        itens: itensPreenchidos,
      });
      setModalPrescAberto(false);
      carregarDadosPaciente(pacienteId);
    } catch (err) {
      setErroFormPresc(err.response?.data?.erro || 'Não foi possível salvar a prescrição.');
    }
  }

  async function excluirPrescricao(prescricao) {
    if (!confirm('Excluir esta prescrição?')) return;
    try {
      await prescricoesService.excluirPrescricao(prescricao.id);
      carregarDadosPaciente(pacienteId);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível excluir a prescrição.');
    }
  }

  // ---------- Laudos ----------
  async function excluirLaudo(laudo) {
    if (!confirm('Excluir este laudo?')) return;
    try {
      await laudosService.excluirLaudo(laudo.id);
      carregarDadosPaciente(pacienteId);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível excluir o laudo.');
    }
  }

  const pacienteSelecionado = pacientes.find((p) => String(p.id) === String(pacienteId));

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Prontuário</h1>

      <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Selecione o paciente
        </label>
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Digite o nome do paciente..."
            value={buscaPaciente}
            onChange={(e) => {
              setBuscaPaciente(e.target.value);
              setSugestoesAbertas(true);
              if (!e.target.value) {
                setPacienteId('');
                carregarDadosPaciente('');
              }
            }}
            onFocus={() => setSugestoesAbertas(true)}
            onBlur={() => setTimeout(() => setSugestoesAbertas(false), 150)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            autoComplete="off"
          />

          {sugestoesAbertas && sugestoesPacientes.length > 0 && (
            <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
              {sugestoesPacientes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={() => selecionarPaciente(p)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 text-sm"
                >
                  {p.nome}
                  {p.cpf && <span className="text-gray-400 text-xs ml-2">{p.cpf}</span>}
                </button>
              ))}
            </div>
          )}

          {sugestoesAbertas &&
            buscaPaciente.trim().length > 0 &&
            sugestoesPacientes.length === 0 && (
              <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 px-3 py-2 text-sm text-gray-400">
                Nenhum paciente encontrado.
              </div>
            )}
        </div>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {pacienteId && (
        <>
          {/* ---------- Acompanhamentos ---------- */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              Acompanhamentos de {pacienteSelecionado?.nome}
            </h2>
            <button
              onClick={abrirNovoAcompanhamento}
              className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
            >
              + Novo Acompanhamento
            </button>
          </div>

          {carregando && <p className="text-sm text-gray-400 mb-4">Carregando...</p>}

          <div className="space-y-3 mb-8">
            {!carregando && acompanhamentos.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum acompanhamento registrado ainda.</p>
            )}
            {acompanhamentos.map((a) => (
              <div key={a.id} className="bg-white rounded-lg border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {formatarDataHora(a.data_atendimento)} · Dr(a). {a.medico_nome}
                  </span>
                  {(usuario.role === 'admin' || usuario.id === a.medico_id) && (
                    <button
                      onClick={() => excluirAcompanhamento(a)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Excluir
                    </button>
                  )}
                </div>
                {a.queixa_principal && (
                  <p className="text-sm mb-1">
                    <span className="font-medium text-gray-700">Queixa principal: </span>
                    {a.queixa_principal}
                  </p>
                )}
                {a.diagnostico && (
                  <p className="text-sm mb-1">
                    <span className="font-medium text-gray-700">Diagnóstico: </span>
                    {a.diagnostico}
                  </p>
                )}
                {a.conduta && (
                  <p className="text-sm mb-1">
                    <span className="font-medium text-gray-700">Conduta: </span>
                    {a.conduta}
                  </p>
                )}
                {a.observacoes && (
                  <p className="text-sm text-gray-500 mt-2">{a.observacoes}</p>
                )}
              </div>
            ))}
          </div>

          {/* ---------- Prescrições ---------- */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              Prescrições de {pacienteSelecionado?.nome}
            </h2>
            <button
              onClick={abrirNovaPrescricao}
              className="bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
            >
              + Nova Prescrição
            </button>
          </div>

          <div className="space-y-3">
            {!carregando && prescricoes.length === 0 && (
              <p className="text-sm text-gray-400">Nenhuma prescrição registrada ainda.</p>
            )}
            {prescricoes.map((presc) => (
              <div
                key={presc.id}
                onClick={() => navigate(`/prescricoes/${presc.id}`)}
                className="bg-white rounded-lg border border-gray-100 p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {formatarDataHora(presc.data_emissao)} · Dr(a). {presc.medico_nome}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-primary-600 text-xs">Ver / Imprimir →</span>
                    {(usuario.role === 'admin' || usuario.id === presc.medico_id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirPrescricao(presc);
                        }}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
                {presc.exames_solicitados && (
                  <p className="text-xs text-teal-700 mb-1">📋 Exames solicitados</p>
                )}
                {presc.itens && (
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    {presc.itens.map((item) => (
                      <li key={item.id}>
                        <span className="font-medium">{item.medicamento}</span>
                        {item.dosagem && ` — ${item.dosagem}`}
                        {item.via_administracao && `, ${item.via_administracao}`}
                        {item.frequencia && `, ${item.frequencia}`}
                        {item.duracao && `, por ${item.duracao}`}
                      </li>
                    ))}
                  </ul>
                )}
                {presc.observacoes && (
                  <p className="text-sm text-gray-500 mt-2">{presc.observacoes}</p>
                )}
              </div>
            ))}
          </div>

          {/* ---------- Laudos de exames ---------- */}
          <div className="flex items-center justify-between mb-3 mt-8">
            <h2 className="text-base font-semibold text-gray-800">
              Laudos de exames de {pacienteSelecionado?.nome}
            </h2>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Um laudo é criado a partir do exame já realizado, na tela de Consultas e Exames.
          </p>

          <div className="space-y-3">
            {!carregando && laudos.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum laudo registrado ainda.</p>
            )}
            {laudos.map((laudo) => (
              <div
                key={laudo.id}
                onClick={() => navigate(`/laudos/${laudo.id}`)}
                className="bg-white rounded-lg border border-gray-100 p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {formatarDataHora(laudo.data_emissao)} · Dr(a). {laudo.medico_nome}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-primary-600 text-xs">Ver / Imprimir →</span>
                    {(usuario.role === 'admin' || usuario.id === laudo.medico_id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          excluirLaudo(laudo);
                        }}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-700">{laudo.exame_nome || 'Exame'}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{laudo.conteudo}</p>
              </div>
            ))}
          </div>
        </>
      )}


      {/* Modal: novo acompanhamento */}
      <Modal
        titulo="Novo Acompanhamento"
        aberto={modalAcompAberto}
        aoFechar={() => setModalAcompAberto(false)}
      >
        <form onSubmit={salvarAcompanhamento} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Queixa principal
            </label>
            <textarea
              rows={2}
              value={formAcomp.queixa_principal}
              onChange={(e) => setFormAcomp({ ...formAcomp, queixa_principal: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              História clínica
            </label>
            <textarea
              rows={2}
              value={formAcomp.historia_clinica}
              onChange={(e) => setFormAcomp({ ...formAcomp, historia_clinica: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exame físico</label>
            <textarea
              rows={2}
              value={formAcomp.exame_fisico}
              onChange={(e) => setFormAcomp({ ...formAcomp, exame_fisico: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
            <textarea
              rows={2}
              value={formAcomp.diagnostico}
              onChange={(e) => setFormAcomp({ ...formAcomp, diagnostico: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conduta</label>
            <textarea
              rows={2}
              value={formAcomp.conduta}
              onChange={(e) => setFormAcomp({ ...formAcomp, conduta: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              rows={2}
              value={formAcomp.observacoes}
              onChange={(e) => setFormAcomp({ ...formAcomp, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {erroFormAcomp && <p className="text-sm text-red-600">{erroFormAcomp}</p>}

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Salvar
          </button>
        </form>
      </Modal>

      {/* Modal: nova prescrição */}
      <Modal
        titulo="Nova Prescrição"
        aberto={modalPrescAberto}
        aoFechar={() => setModalPrescAberto(false)}
      >
        <form onSubmit={salvarPrescricao} className="space-y-4">
          {acompanhamentos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vincular a um acompanhamento (opcional)
              </label>
              <select
                value={acompanhamentoVinculado}
                onChange={(e) => setAcompanhamentoVinculado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Nenhum</option>
                {acompanhamentos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatarDataHora(a.data_atendimento)}
                    {a.diagnostico ? ` — ${a.diagnostico}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Medicamentos</label>
            {itens.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    Medicamento {index + 1}
                  </span>
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerItem(index)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="relative">

    <input
        type="text"
        placeholder="Nome do medicamento"
        value={item.medicamento}
        onChange={(e) =>
            buscarMedicamentos(index, e.target.value)
        }
        onKeyDown={(e) => aoTecladoMedicamento(e, index)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        autoComplete="off"
    />

    {sugestoesMedicamentos[index]?.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">

            {sugestoesMedicamentos[index].map((medicamento, i) => (

                <button
                    key={medicamento.id}
                    type="button"
                    onClick={() => selecionarMedicamento(index, medicamento)}
                    className={`w-full text-left px-3 py-2 border-b border-gray-100 ${
                        indiceAtivoMedicamento[index] === i ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                >

                    <div className="font-medium text-sm">
                        {medicamento.nome_produto}
                    </div>

                    {medicamento.principio_ativo && (
                        <div className="text-xs text-gray-500">
                            {medicamento.principio_ativo}
                        </div>
                    )}

                    {medicamento.concentracao && (
                        <div className="text-xs text-gray-400">
                            {medicamento.concentracao}
                        </div>
                    )}

                </button>

            ))}

        </div>
    )}

</div>

                <div className="flex items-center justify-between -mt-1">
                  <button
                    type="button"
                    onClick={() => aplicarSugestaoPosologia(index, item.medicamento, null)}
                    disabled={!item.medicamento.trim()}
                    className="text-primary-600 text-xs font-medium hover:underline disabled:text-gray-300 disabled:no-underline"
                  >
                    Sugerir posologia
                  </button>
                  {posologiaAplicada[index] && (
                    <span className="text-xs text-gray-400">
                      Sugestão aplicada — confira e ajuste conforme avaliação clínica
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Dosagem (ex: 500mg)"
                    value={item.dosagem}
                    onChange={(e) => atualizarItem(index, 'dosagem', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Via (ex: oral)"
                    value={item.via_administracao}
                    onChange={(e) => atualizarItem(index, 'via_administracao', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Frequência (ex: 8/8h)"
                    value={item.frequencia}
                    onChange={(e) => atualizarItem(index, 'frequencia', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Duração (ex: 7 dias)"
                    value={item.duracao}
                    onChange={(e) => atualizarItem(index, 'duracao', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Quantidade (ex: 1 caixa)"
                  value={item.quantidade}
                  onChange={(e) => atualizarItem(index, 'quantidade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={adicionarItem}
              className="text-primary-600 text-sm font-medium hover:underline"
            >
              + Adicionar outro medicamento
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exames solicitados
            </label>
            <textarea
              rows={3}
              value={examesSolicitados}
              onChange={(e) => setExamesSolicitados(e.target.value)}
              placeholder="Ex: Hemograma completo, Glicemia de jejum, Raio-X de tórax..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Texto livre — na impressão, sai numa página separada da lista de medicamentos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações gerais
            </label>
            <textarea
              rows={2}
              value={observacoesPresc}
              onChange={(e) => setObservacoesPresc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {erroFormPresc && <p className="text-sm text-red-600">{erroFormPresc}</p>}

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Salvar Prescrição
          </button>
        </form>
      </Modal>
    </div>
  );
  async function buscarMedicamentos(index, valor) {

    atualizarItem(index, 'medicamento', valor);
    setIndiceAtivoMedicamento((anterior) => ({ ...anterior, [index]: -1 }));

    if (valor.trim().length < 2) {

        setSugestoesMedicamentos((anterior) => ({
            ...anterior,
            [index]: []
        }));

        return;
    }

    try {

        const resultados =
            await medicamentosService.buscarMedicamentos(valor);

        setSugestoesMedicamentos((anterior) => ({
            ...anterior,
            [index]: resultados
        }));

    } catch (err) {

        console.error(
            'Erro ao buscar medicamentos:',
            err
        );
    }
}

  function selecionarMedicamento(index, medicamento) {
    atualizarItem(index, 'medicamento', medicamento.nome_produto);
    aplicarSugestaoPosologia(
      index,
      medicamento.principio_ativo || medicamento.nome_produto,
      medicamento.via_administracao
    );
    setSugestoesMedicamentos((anterior) => ({ ...anterior, [index]: [] }));
    setIndiceAtivoMedicamento((anterior) => ({ ...anterior, [index]: -1 }));
  }

  function aoTecladoMedicamento(e, index) {
    const lista = sugestoesMedicamentos[index] || [];
    if (lista.length === 0) return;
    const atual = indiceAtivoMedicamento[index] ?? -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivoMedicamento((anterior) => ({
        ...anterior,
        [index]: Math.min(atual + 1, lista.length - 1),
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivoMedicamento((anterior) => ({
        ...anterior,
        [index]: Math.max(atual - 1, 0),
      }));
    } else if (e.key === 'Enter') {
      if (atual >= 0 && lista[atual]) {
        e.preventDefault();
        selecionarMedicamento(index, lista[atual]);
      }
    } else if (e.key === 'Escape') {
      setSugestoesMedicamentos((anterior) => ({ ...anterior, [index]: [] }));
    }
  }
}
