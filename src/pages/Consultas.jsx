import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import * as consultasService from '../services/consultasService';
import * as pacientesService from '../services/pacientesService';
import * as usuariosService from '../services/usuariosService';
import * as examesService from '../services/examesService';
import * as laudosService from '../services/laudosService';
import * as termosService from '../services/termosService';
import * as configuracaoService from '../services/configuracaoService';
import { formatarMoeda, formatarDataHora } from '../utils/formatters';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ptBR }),
  getDay,
  locales: { 'pt-BR': ptBR },
});

const MENSAGENS_CALENDARIO = {
  next: 'Próximo',
  previous: 'Anterior',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  noEventsInRange: 'Nenhum agendamento neste período.',
};

const CORES_STATUS = {
  agendada: '#3b82f6',
  confirmada: '#8b5cf6',
  realizada: '#16a34a',
  cancelada: '#dc2626',
};

// Janela padrão exibida ao abrir a agenda: do 1º dia do mês anterior
// ao último dia do mês seguinte (visualização "semana" cabe folgada
// aqui). Evita buscar TODO agendamento já criado — a navegação no
// calendário (setas, "Hoje", trocar de mês) refaz a busca com o
// período realmente visível, via onRangeChange.
function janelaPadrao(dataBase) {
  const inicio = new Date(dataBase.getFullYear(), dataBase.getMonth() - 1, 1);
  const fim = new Date(dataBase.getFullYear(), dataBase.getMonth() + 2, 0);
  return { inicio, fim };
}

function formatarDataApi(data) {
  return data.toISOString().slice(0, 10);
}

const PAGAMENTO_VAZIO = { valor_dinheiro: '', valor_cartao: '', valor_pix: '', senha: '' };

const NOVA_CONSULTA_VAZIA = {
  tipo: 'consulta',
  paciente_id: '',
  medico_id: '',
  exame_id: '',
  data_hora: '',
  valor: '',
  observacoes: '',
};

const NOVO_PACIENTE_VAZIO = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  data_nascimento: '',
  observacoes: '',
};

export default function Consultas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const podeGerenciar = ['admin', 'recepcao'].includes(usuario.role);

  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [exames, setExames] = useState([]);
  const [erro, setErro] = useState('');

  const [modalDetalheAberto, setModalDetalheAberto] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState(null);

  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [novaConsulta, setNovaConsulta] = useState(NOVA_CONSULTA_VAZIA);
  const [erroForm, setErroForm] = useState('');
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [pacienteSelecionadoNome, setPacienteSelecionadoNome] = useState('');
  const [indiceAtivoPaciente, setIndiceAtivoPaciente] = useState(-1);

  const [modalNovoPacienteAberto, setModalNovoPacienteAberto] = useState(false);
  const [novoPaciente, setNovoPaciente] = useState(NOVO_PACIENTE_VAZIO);
  const [erroNovoPaciente, setErroNovoPaciente] = useState('');

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [pagamento, setPagamento] = useState(PAGAMENTO_VAZIO);
  const [erroPagamento, setErroPagamento] = useState('');
  const [arquivoTermo, setArquivoTermo] = useState(null);
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);
  const [incluirImposto, setIncluirImposto] = useState(true);
  const [configClinica, setConfigClinica] = useState(null);

  const [modalLaudoAberto, setModalLaudoAberto] = useState(false);
  const [conteudoLaudo, setConteudoLaudo] = useState('');
  const [erroLaudo, setErroLaudo] = useState('');
  const [salvandoLaudo, setSalvandoLaudo] = useState(false);

  // Antes buscava TODAS as consultas já criadas, sem filtro nenhum —
  // ficava mais lento a cada mês de uso da clínica. Agora busca uma
  // janela de 3 meses (mês anterior ao mês seguinte) e refaz a busca
  // quando o usuário navega pro calendário pra fora dessa janela —
  // ver aoMudarPeriodoVisivel logo abaixo.
  const [periodoVisivel, setPeriodoVisivel] = useState(() => janelaPadrao(new Date()));

  const carregarConsultas = useCallback(async (periodo) => {
    try {
      const dados = await consultasService.listarConsultas({
        data_inicio: formatarDataApi(periodo.inicio),
        data_fim: formatarDataApi(periodo.fim),
      });
      setConsultas(dados);
    } catch (err) {
      setErro('Não foi possível carregar os agendamentos.');
    }
  }, []);

  // Disparado pelo react-big-calendar toda vez que o usuário navega
  // (mês/semana/dia seguinte, "Hoje", etc.) ou troca de visualização.
  // O formato de "range" varia: mês devolve um array de dias,
  // semana/dia/agenda devolvem { start, end }.
  function aoMudarPeriodoVisivel(range) {
    const inicio = Array.isArray(range) ? range[0] : range.start;
    const fim = Array.isArray(range) ? range[range.length - 1] : range.end;
    const novoPeriodo = { inicio, fim };
    setPeriodoVisivel(novoPeriodo);
    carregarConsultas(novoPeriodo);
  }

  useEffect(() => {
    carregarConsultas(periodoVisivel);
    if (podeGerenciar) {
      pacientesService.listarPacientes().then(setPacientes).catch(() => {});
    }
    usuariosService.listarMedicos().then(setMedicos).catch(() => {});
    examesService.listarExames().then(setExames).catch(() => {});
    configuracaoService.obterConfiguracao().then(setConfigClinica).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregarConsultas, podeGerenciar]);

  const eventos = useMemo(
    () =>
      consultas.map((c) => ({
        id: c.id,
        title:
          c.tipo === 'exame'
            ? `[Exame] ${c.exame_nome} — ${c.senha ? `Senha ${c.senha} — ` : ''}${c.paciente_nome}`
            : `Consulta — ${c.senha ? `Senha ${c.senha} — ` : ''}${c.paciente_nome} — Dr(a). ${c.medico_nome}`,
        start: new Date(c.data_hora),
        end: new Date(new Date(c.data_hora).getTime() + 30 * 60000), // slots de 30min
        resource: c,
      })),
    [consultas]
  );

  function estiloEvento(evento) {
    return {
      style: {
        backgroundColor: CORES_STATUS[evento.resource.status] || '#3b82f6',
        borderRadius: '4px',
        border: evento.resource.tipo === 'exame' ? '2px solid #0f766e' : 'none',
        fontSize: '0.75rem',
      },
    };
  }

  function aoClicarEvento(evento) {
    setConsultaSelecionada(evento.resource);
    setModalDetalheAberto(true);
  }

  const pacientesFiltrados = useMemo(() => {
    const termo = buscaPaciente.trim().toLowerCase();
    if (!termo) return [];
    return pacientes.filter((p) => p.nome.toLowerCase().includes(termo)).slice(0, 8);
  }, [buscaPaciente, pacientes]);

  function selecionarPaciente(paciente) {
    setNovaConsulta((atual) => ({ ...atual, paciente_id: paciente.id }));
    setPacienteSelecionadoNome(paciente.nome);
    setBuscaPaciente('');
    setIndiceAtivoPaciente(-1);
  }

  function aoTecladoPaciente(e) {
    if (pacientesFiltrados.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivoPaciente((atual) => Math.min(atual + 1, pacientesFiltrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivoPaciente((atual) => Math.max(atual - 1, 0));
    } else if (e.key === 'Enter') {
      if (indiceAtivoPaciente >= 0 && pacientesFiltrados[indiceAtivoPaciente]) {
        e.preventDefault();
        selecionarPaciente(pacientesFiltrados[indiceAtivoPaciente]);
      }
    } else if (e.key === 'Escape') {
      setBuscaPaciente('');
      setIndiceAtivoPaciente(-1);
    }
  }

  function trocarPacienteSelecionado() {
    setNovaConsulta((atual) => ({ ...atual, paciente_id: '' }));
    setPacienteSelecionadoNome('');
    setBuscaPaciente('');
    setIndiceAtivoPaciente(-1);
  }

  function aoClicarSlotVazio({ start }) {
    if (!podeGerenciar) return;
    setErroForm('');
    setBuscaPaciente('');
    setIndiceAtivoPaciente(-1);
    setPacienteSelecionadoNome('');
    setNovaConsulta({
      ...NOVA_CONSULTA_VAZIA,
      data_hora: format(start, "yyyy-MM-dd'T'HH:mm"),
    });
    setModalNovaAberto(true);
  }

  async function salvarNovaConsulta(e) {
    e.preventDefault();
    setErroForm('');
    try {
      const payload = {
        tipo: novaConsulta.tipo,
        paciente_id: novaConsulta.paciente_id,
        medico_id: novaConsulta.medico_id || null,
        data_hora: novaConsulta.data_hora,
        observacoes: novaConsulta.observacoes,
        valor: novaConsulta.valor ? Number(novaConsulta.valor) : undefined,
      };
      if (novaConsulta.tipo === 'exame') {
        payload.exame_id = novaConsulta.exame_id;
      }
      await consultasService.criarConsulta(payload);
      setModalNovaAberto(false);
      carregarConsultas(periodoVisivel);
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível marcar o agendamento.');
    }
  }

  // Ao escolher um exame, sugere o valor padrão do catálogo (editável).
  function selecionarExame(exameId) {
    const exame = exames.find((e) => String(e.id) === String(exameId));
    setNovaConsulta((atual) => ({
      ...atual,
      exame_id: exameId,
      valor: exame ? String(exame.valor_padrao) : atual.valor,
    }));
  }

  function abrirCadastroRapidoPaciente() {
    setNovoPaciente(NOVO_PACIENTE_VAZIO);
    setErroNovoPaciente('');
    setModalNovaAberto(false);
    setModalNovoPacienteAberto(true);
  }

  function cancelarCadastroRapidoPaciente() {
    setModalNovoPacienteAberto(false);
    setModalNovaAberto(true);
  }

  async function salvarNovoPacienteRapido(e) {
    e.preventDefault();
    setErroNovoPaciente('');
    try {
      const pacienteCriado = await pacientesService.criarPaciente(novoPaciente);
      setPacientes((atual) => [...atual, pacienteCriado].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovaConsulta((atual) => ({ ...atual, paciente_id: pacienteCriado.id }));
      setPacienteSelecionadoNome(pacienteCriado.nome);
      setBuscaPaciente('');
      setIndiceAtivoPaciente(-1);
      setModalNovoPacienteAberto(false);
      setModalNovaAberto(true);
    } catch (err) {
      setErroNovoPaciente(err.response?.data?.erro || 'Não foi possível cadastrar o paciente.');
    }
  }

  async function mudarStatus(novoStatus) {
    try {
      await consultasService.atualizarStatusConsulta(consultaSelecionada.id, novoStatus);
      setModalDetalheAberto(false);
      carregarConsultas(periodoVisivel);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível atualizar o status.');
    }
  }

  // "Confirmar" agora é o momento do pagamento: abre um modal pedindo
  // quanto foi recebido em cada meio (pode dividir entre os três).
  function abrirModalPagamento() {
    setPagamento({
      ...PAGAMENTO_VAZIO,
      // sugere o valor total em dinheiro por padrão — o usuário ajusta
      // se o pagamento vier dividido entre os meios.
      valor_dinheiro: consultaSelecionada.valor ? String(consultaSelecionada.valor) : '',
    });
    setErroPagamento('');
    setArquivoTermo(null);
    setIncluirImposto(true);
    setModalDetalheAberto(false);
    setModalPagamentoAberto(true);
  }

  // Exames com termo de consentimento cadastrado exigem a digitalização
  // da assinatura antes de confirmar o pagamento (ver termosController
  // no backend, que também trava isso do lado do servidor).
  const exigeTermoConsentimento =
    consultaSelecionada?.tipo === 'exame' &&
    !!consultaSelecionada?.exame_termo_consentimento?.trim();

  // Preparação IBS/CBS: cartão ou PIX sempre incluem o imposto; só
  // 100% dinheiro é que vira opcional. O valor final quem calcula de
  // verdade é o servidor (ver atualizarStatus) — isso aqui é só pra
  // mostrar a prévia certa pro atendente antes de confirmar.
  const impostosAtivos = !!configClinica?.impostos_ativos;
  const valorProcedimento = Number(consultaSelecionada?.valor) || 0;
  const aliquotaIbs = Number(configClinica?.aliquota_ibs) || 0;
  const aliquotaCbs = Number(configClinica?.aliquota_cbs) || 0;
  const pagamentoTemCartaoOuPix =
    (Number(pagamento.valor_cartao) || 0) > 0 || (Number(pagamento.valor_pix) || 0) > 0;
  const incluirImpostoEfetivo = pagamentoTemCartaoOuPix ? true : incluirImposto;
  const valorIbsPrevisto = incluirImpostoEfetivo
    ? Math.round(valorProcedimento * (aliquotaIbs / 100) * 100) / 100
    : 0;
  const valorCbsPrevisto = incluirImpostoEfetivo
    ? Math.round(valorProcedimento * (aliquotaCbs / 100) * 100) / 100
    : 0;
  const totalComImposto = valorProcedimento + valorIbsPrevisto + valorCbsPrevisto;

  function cancelarModalPagamento() {
    setModalPagamentoAberto(false);
    setModalDetalheAberto(true);
  }

  const totalPagamento =
    (Number(pagamento.valor_dinheiro) || 0) +
    (Number(pagamento.valor_cartao) || 0) +
    (Number(pagamento.valor_pix) || 0);

  async function confirmarComPagamento(e) {
    e.preventDefault();
    setErroPagamento('');
    if (totalPagamento <= 0) {
      setErroPagamento('Informe ao menos um valor recebido (dinheiro, cartão ou PIX).');
      return;
    }
    if (!pagamento.senha.trim()) {
      setErroPagamento('Informe a senha de atendimento.');
      return;
    }
    if (exigeTermoConsentimento && !arquivoTermo) {
      setErroPagamento(
        'Envie a foto do termo de consentimento assinado antes de confirmar o pagamento.'
      );
      return;
    }

    setConfirmandoPagamento(true);
    try {
      // Envia o termo assinado ANTES de confirmar o pagamento — se o
      // envio falhar, o pagamento nem chega a ser registrado (o backend
      // também recusa a confirmação sem o termo, mas checar aqui evita
      // uma chamada extra desnecessária pro servidor).
      if (exigeTermoConsentimento && arquivoTermo) {
        const base64 = await termosService.arquivoParaBase64(arquivoTermo);
        await termosService.enviarTermoAssinado(consultaSelecionada.id, base64);
      }

      await consultasService.atualizarStatusConsulta(consultaSelecionada.id, 'confirmada', {
        valor_dinheiro: Number(pagamento.valor_dinheiro) || 0,
        valor_cartao: Number(pagamento.valor_cartao) || 0,
        valor_pix: Number(pagamento.valor_pix) || 0,
        incluir_imposto: incluirImpostoEfetivo,
        senha: pagamento.senha.trim(),
      });
      setModalPagamentoAberto(false);
      navigate(`/recibo/${consultaSelecionada.id}`);
    } catch (err) {
      setErroPagamento(
        err.response?.data?.erro ||
          err.message ||
          'Não foi possível confirmar o pagamento.'
      );
    } finally {
      setConfirmandoPagamento(false);
    }
  }

  // Botão "Consultar" do médico: só libera quando já foi confirmado
  // (ou seja, já foi pago) — marca como realizada e leva pro prontuário
  // do paciente, já preenchido.
  async function iniciarAtendimento() {
    const { id, paciente_id, status } = consultaSelecionada;
    try {
      if (status !== 'realizada') {
        await consultasService.atualizarStatusConsulta(id, 'realizada');
      }
      setModalDetalheAberto(false);
      navigate(`/prontuario?paciente_id=${paciente_id}`);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível atualizar o status da consulta.');
    }
  }

  // ---------- Laudo do exame (só exame já realizado, sem laudo ainda) ----------
  function abrirModalLaudo() {
    setConteudoLaudo('');
    setErroLaudo('');
    setModalDetalheAberto(false);
    setModalLaudoAberto(true);
  }

  function cancelarModalLaudo() {
    setModalLaudoAberto(false);
    setModalDetalheAberto(true);
  }

  async function verTermoAssinado() {
    try {
      await termosService.abrirTermoAssinado(consultaSelecionada.id);
    } catch (err) {
      alert(err.response?.data?.erro || 'Não foi possível abrir o termo assinado.');
    }
  }

  async function salvarLaudo(e) {
    e.preventDefault();
    if (!conteudoLaudo.trim()) {
      setErroLaudo('Escreva o laudo antes de salvar.');
      return;
    }
    setSalvandoLaudo(true);
    setErroLaudo('');
    try {
      const novoLaudo = await laudosService.criarLaudo({
        consulta_id: consultaSelecionada.id,
        conteudo: conteudoLaudo.trim(),
      });
      setModalLaudoAberto(false);
      navigate(`/laudos/${novoLaudo.id}`);
    } catch (err) {
      setErroLaudo(err.response?.data?.erro || 'Não foi possível salvar o laudo.');
    } finally {
      setSalvandoLaudo(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Consultas e Exames</h1>
        <div className="flex gap-3 text-xs items-center">
          {Object.entries(CORES_STATUS).map(([status, cor]) => (
            <span key={status} className="flex items-center gap-1 text-gray-500">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: cor }}
              />
              {status}
            </span>
          ))}
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full inline-block border-2 border-teal-700" />
            exame
          </span>
        </div>
      </div>

      {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

      {podeGerenciar && (
        <p className="text-xs text-gray-400 mb-3">
          Dica: clique em um horário vazio no calendário pra marcar uma nova consulta ou exame.
        </p>
      )}

      <div className="bg-white rounded-lg border border-gray-100 p-4" style={{ height: 650 }}>
        <Calendar
          localizer={localizer}
          culture="pt-BR"
          events={eventos}
          startAccessor="start"
          endAccessor="end"
          messages={MENSAGENS_CALENDARIO}
          eventPropGetter={estiloEvento}
          onSelectEvent={aoClicarEvento}
          onSelectSlot={aoClicarSlotVazio}
          onRangeChange={aoMudarPeriodoVisivel}
          selectable={podeGerenciar}
          defaultView="week"
          views={['month', 'week', 'day', 'agenda']}
        />
      </div>

      {/* Modal de detalhes / mudança de status */}
      <Modal
        titulo={consultaSelecionada?.tipo === 'exame' ? 'Detalhes do Exame' : 'Detalhes da Consulta'}
        aberto={modalDetalheAberto}
        aoFechar={() => setModalDetalheAberto(false)}
      >
        {consultaSelecionada && (
          <div className="space-y-3 text-sm">
            {consultaSelecionada.tipo === 'exame' && (
              <div>
                <span className="text-gray-500">Exame:</span>{' '}
                <span className="font-medium">{consultaSelecionada.exame_nome}</span>
              </div>
            )}
            {consultaSelecionada.senha && (
              <div>
                <span className="text-gray-500">Senha:</span>{' '}
                <span className="font-medium">{consultaSelecionada.senha}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Paciente:</span>{' '}
              <span className="font-medium">{consultaSelecionada.paciente_nome}</span>
            </div>
            <div>
              <span className="text-gray-500">
                {consultaSelecionada.tipo === 'exame' ? 'Médico(a) solicitante:' : 'Médico(a):'}
              </span>{' '}
              <span className="font-medium">{consultaSelecionada.medico_nome || 'Nenhum'}</span>
            </div>
            <div>
              <span className="text-gray-500">Data/Hora:</span>{' '}
              <span className="font-medium">
                {formatarDataHora(consultaSelecionada.data_hora)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Valor:</span>{' '}
              <span className="font-medium">{formatarMoeda(consultaSelecionada.valor)}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>{' '}
              <span
                className="font-medium capitalize px-2 py-0.5 rounded text-white text-xs"
                style={{ backgroundColor: CORES_STATUS[consultaSelecionada.status] }}
              >
                {consultaSelecionada.status}
              </span>
            </div>
            {consultaSelecionada.observacoes && (
              <div>
                <span className="text-gray-500">Observações:</span>
                <p className="mt-1">{consultaSelecionada.observacoes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
              {usuario.role === 'medico' &&
                ['confirmada', 'realizada'].includes(consultaSelecionada.status) && (
                  <button
                    onClick={iniciarAtendimento}
                    className="px-3 py-1.5 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-700"
                  >
                    Consultar (abrir prontuário)
                  </button>
                )}
              {usuario.role === 'medico' && consultaSelecionada.status === 'agendada' && (
                <span className="text-xs text-gray-400 self-center">
                  Aguardando confirmação e pagamento na recepção
                </span>
              )}
              {consultaSelecionada.status === 'agendada' && (
                <button
                  onClick={abrirModalPagamento}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700"
                >
                  Confirmar (registrar pagamento)
                </button>
              )}
              {consultaSelecionada.status === 'confirmada' && (
                <button
                  onClick={() => mudarStatus('realizada')}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                >
                  Marcar como Realizada
                </button>
              )}
              {['admin', 'medico'].includes(usuario.role) &&
                consultaSelecionada.tipo === 'exame' &&
                consultaSelecionada.status === 'realizada' &&
                (consultaSelecionada.laudo_id ? (
                  <button
                    onClick={() => navigate(`/laudos/${consultaSelecionada.laudo_id}`)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-50"
                  >
                    Ver Laudo
                  </button>
                ) : (
                  <button
                    onClick={abrirModalLaudo}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
                  >
                    Laudar Exame
                  </button>
                ))}
              {consultaSelecionada.tipo === 'exame' && consultaSelecionada.termo_assinado_id && (
                <button
                  onClick={verTermoAssinado}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-50"
                >
                  Ver Termo Assinado
                </button>
              )}
              {['agendada', 'confirmada'].includes(consultaSelecionada.status) && (
                <button
                  onClick={() => mudarStatus('cancelada')}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de pagamento (aberto ao clicar em "Confirmar") */}
      <Modal
        titulo="Registrar Pagamento"
        aberto={modalPagamentoAberto}
        aoFechar={cancelarModalPagamento}
      >
        <p className="text-xs text-gray-500 mb-3">
          Confirmar o agendamento registra a entrada no caixa. Se o pagamento veio dividido,
          preencha mais de um campo — o valor total do agendamento era{' '}
          <strong>{formatarMoeda(consultaSelecionada?.valor)}</strong>.
        </p>

        {exigeTermoConsentimento && (
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-3 space-y-2">
            <p className="text-xs text-blue-800">
              Este exame exige o termo de consentimento assinado. Imprima, colha a assinatura do
              paciente e envie a foto/digitalização abaixo antes de confirmar o pagamento.
            </p>
            <button
              type="button"
              onClick={() =>
                window.open(`/consultas/${consultaSelecionada.id}/termo-impressao`, '_blank')
              }
              className="text-xs font-medium text-blue-700 underline"
            >
              Imprimir Termo de Consentimento
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termo assinado (foto ou digitalização) *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(e) => setArquivoTermo(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm"
              />
              {arquivoTermo && (
                <p className="text-xs text-green-700 mt-1">✓ {arquivoTermo.name} selecionado</p>
              )}
            </div>
          </div>
        )}

        {impostosAtivos && valorProcedimento > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-md p-3 mb-3 space-y-2">
            <div className="text-xs text-amber-900 space-y-1">
              <div className="flex justify-between">
                <span>Procedimento</span>
                <span className="font-medium">{formatarMoeda(valorProcedimento)}</span>
              </div>
              <div className="flex justify-between">
                <span>IBS ({aliquotaIbs}%)</span>
                <span className="font-medium">{formatarMoeda(valorIbsPrevisto)}</span>
              </div>
              <div className="flex justify-between">
                <span>CBS ({aliquotaCbs}%)</span>
                <span className="font-medium">{formatarMoeda(valorCbsPrevisto)}</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-1 font-semibold">
                <span>Total a cobrar</span>
                <span>{formatarMoeda(totalComImposto)}</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={incluirImpostoEfetivo}
                disabled={pagamentoTemCartaoOuPix}
                onChange={(e) => setIncluirImposto(e.target.checked)}
                className="rounded border-gray-300"
              />
              Incluir imposto neste pagamento
              {pagamentoTemCartaoOuPix && ' (obrigatório em cartão/PIX)'}
            </label>
          </div>
        )}

        <form onSubmit={confirmarComPagamento} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha de atendimento
            </label>
            <input
              type="text"
              autoFocus
              value={pagamento.senha}
              onChange={(e) => setPagamento({ ...pagamento, senha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Ex: A12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recebido em dinheiro (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pagamento.valor_dinheiro}
              onChange={(e) => setPagamento({ ...pagamento, valor_dinheiro: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recebido no cartão (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pagamento.valor_cartao}
              onChange={(e) => setPagamento({ ...pagamento, valor_cartao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recebido no PIX (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={pagamento.valor_pix}
              onChange={(e) => setPagamento({ ...pagamento, valor_pix: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2">
            <span className="text-gray-500">Total recebido</span>
            <span className="font-semibold text-gray-800">{formatarMoeda(totalPagamento)}</span>
          </div>

          {erroPagamento && <p className="text-sm text-red-600">{erroPagamento}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelarModalPagamento}
              disabled={confirmandoPagamento}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={confirmandoPagamento}
              className="flex-1 bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {confirmandoPagamento ? 'Enviando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de laudo (aberto ao clicar em "Laudar Exame") */}
      <Modal titulo="Laudar Exame" aberto={modalLaudoAberto} aoFechar={cancelarModalLaudo}>
        <p className="text-xs text-gray-500 mb-3">
          {consultaSelecionada?.exame_nome} · {consultaSelecionada?.paciente_nome} ·{' '}
          {consultaSelecionada && formatarDataHora(consultaSelecionada.data_hora)}
        </p>
        <form onSubmit={salvarLaudo} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resultado / Laudo
            </label>
            <textarea
              rows={10}
              autoFocus
              value={conteudoLaudo}
              onChange={(e) => setConteudoLaudo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Descreva o resultado do exame..."
            />
          </div>

          {erroLaudo && <p className="text-sm text-red-600">{erroLaudo}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelarModalLaudo}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={salvandoLaudo}
              className="flex-1 bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {salvandoLaudo ? 'Salvando...' : 'Salvar Laudo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de nova consulta/exame */}
      <Modal
        titulo="Novo Agendamento"
        aberto={modalNovaAberto}
        aoFechar={() => setModalNovaAberto(false)}
      >
        <form onSubmit={salvarNovaConsulta} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNovaConsulta({ ...novaConsulta, tipo: 'consulta' })}
                className={`flex-1 py-2 rounded-md text-sm border ${
                  novaConsulta.tipo === 'consulta'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Consulta
              </button>
              <button
                type="button"
                onClick={() => setNovaConsulta({ ...novaConsulta, tipo: 'exame' })}
                className={`flex-1 py-2 rounded-md text-sm border ${
                  novaConsulta.tipo === 'exame'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Exame
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
            {novaConsulta.paciente_id ? (
              <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50">
                <span className="text-gray-800">{pacienteSelecionadoNome}</span>
                <button
                  type="button"
                  onClick={trocarPacienteSelecionado}
                  className="text-primary-600 text-xs font-medium hover:underline"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite o nome do paciente..."
                  value={buscaPaciente}
                  onChange={(e) => {
                    setBuscaPaciente(e.target.value);
                    setIndiceAtivoPaciente(-1);
                  }}
                  onKeyDown={aoTecladoPaciente}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  autoComplete="off"
                />
                {pacientesFiltrados.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {pacientesFiltrados.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selecionarPaciente(p)}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 ${
                          indiceAtivoPaciente === i ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        {p.nome}
                        {p.cpf && <span className="text-gray-400 text-xs"> — {p.cpf}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {buscaPaciente.trim() && pacientesFiltrados.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Nenhum paciente encontrado.</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={abrirCadastroRapidoPaciente}
              className="text-primary-600 text-xs font-medium hover:underline mt-1"
            >
              Paciente não encontrado? Cadastrar novo
            </button>
          </div>

          {novaConsulta.tipo === 'exame' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exame *</label>
              <select
                required
                value={novaConsulta.exame_id}
                onChange={(e) => selecionarExame(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Selecione...</option>
                {exames.map((exame) => (
                  <option key={exame.id} value={exame.id}>
                    {exame.nome} — {formatarMoeda(exame.valor_padrao)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {novaConsulta.tipo === 'exame' ? 'Médico(a) solicitante (opcional)' : 'Médico(a) *'}
            </label>
            <select
              required={novaConsulta.tipo !== 'exame'}
              value={novaConsulta.medico_id}
              onChange={(e) => setNovaConsulta({ ...novaConsulta, medico_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">
                {novaConsulta.tipo === 'exame' ? 'Nenhum' : 'Selecione...'}
              </option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={novaConsulta.valor}
              onChange={(e) => setNovaConsulta({ ...novaConsulta, valor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              rows={2}
              value={novaConsulta.observacoes}
              onChange={(e) => setNovaConsulta({ ...novaConsulta, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {erroForm && <p className="text-sm text-red-600">{erroForm}</p>}

          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700"
          >
            Marcar {novaConsulta.tipo === 'exame' ? 'Exame' : 'Consulta'}
          </button>
        </form>
      </Modal>

      {/* Modal de cadastro rápido de paciente (aberto a partir da marcação) */}
      <Modal
        titulo="Cadastrar Novo Paciente"
        aberto={modalNovoPacienteAberto}
        aoFechar={cancelarCadastroRapidoPaciente}
      >
        <p className="text-xs text-gray-500 mb-3">
          Ao salvar, você volta direto pra marcação com esse paciente já selecionado.
        </p>
        <form onSubmit={salvarNovoPacienteRapido} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              required
              autoFocus
              value={novoPaciente.nome}
              onChange={(e) => setNovoPaciente({ ...novoPaciente, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                value={novoPaciente.cpf}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de nascimento
              </label>
              <input
                type="date"
                value={novoPaciente.data_nascimento}
                onChange={(e) =>
                  setNovoPaciente({ ...novoPaciente, data_nascimento: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={novoPaciente.telefone}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, telefone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={novoPaciente.email}
                onChange={(e) => setNovoPaciente({ ...novoPaciente, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {erroNovoPaciente && <p className="text-sm text-red-600">{erroNovoPaciente}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelarCadastroRapidoPaciente}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary-600 text-white py-2 rounded-md text-sm font-medium hover:bg-primary-700"
            >
              Salvar e voltar pra marcação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
