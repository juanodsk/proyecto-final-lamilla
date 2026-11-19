import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api';
import './style.css';

const statuses = { OPEN: 'Abierta', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelta' };
const categories = { ACCESS: 'Acceso digital', ENROLLMENT: 'Matrícula', CAMPUS: 'Servicios de sede', OTHER: 'Otro' };
const campuses = { CENTRAL: 'Central', NORTE: 'Norte' };
const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = value => date.format(new Date(value));

function Brand() {
  return <div className="brand"><span className="mark" aria-hidden="true">PF</span><div><strong>Proyecto Final</strong><small>Soporte universitario</small></div></div>;
}

function ErrorMessage({ message }) {
  return message && <p className="error" role="alert">{message}</p>;
}

function Login({ onLogin, expired }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      onLogin(await api('/auth/login', { method: 'POST', body: data }));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <main id="main" className="login-layout">
    <section className="login-intro">
      <Brand />
      <div><p className="eyebrow">Central · Norte</p><h1>Soporte para tu vida universitaria.</h1><p>Solicita ayuda, consulta el estado de tus casos y resuelve dudas sobre matrícula y acceso digital.</p></div>
    </section>
    <section className="login-form">
      <h2>Inicia sesión</h2>
      <ErrorMessage message={error || (expired ? 'La sesión terminó. Vuelve a iniciar sesión.' : '')} />
      <form onSubmit={submit} className="stack">
        <label>Correo institucional<input required type="email" name="email" autoComplete="username" maxLength="150" /></label>
        <label>Contraseña<input required type="password" name="password" autoComplete="current-password" maxLength="128" /></label>
        <button className="primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </section>
  </main>;
}

function Status({ value }) {
  return <span className={'status-tag ' + value}>{statuses[value]}</span>;
}

function Queue({ request, open, revision, status, setStatus, page, setPage }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    request('/tickets?page=' + page + (status ? '&status=' + status : ''), { signal: controller.signal })
      .then(setResult).catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [page, status, revision, retry, request]);

  return <section className="card queue">
    <div className="section-head"><h2>Solicitudes</h2>
      <label className="filter">Estado<select value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}>
        <option value="">Todos</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    <ErrorMessage message={error} />
    {error && <button onClick={() => setRetry(retry + 1)}>Reintentar</button>}
    {!result && !error && <p role="status">Cargando solicitudes…</p>}
    {result?.items.length === 0 && <p className="muted">No hay solicitudes para este filtro.</p>}
    {result?.items.length > 0 && <ul className="tickets">{result.items.map(ticket => <li key={ticket.id}>
      <button className="ticket" onClick={() => open(ticket.id)}>
        <span><strong>{ticket.title}</strong><small>{categories[ticket.category]} · {formatDate(ticket.createdAt)}</small></span>
        <Status value={ticket.status} />
      </button>
    </li>)}</ul>}
    {result && (page > 1 || result.hasNext) && <nav className="pagination" aria-label="Páginas de solicitudes">
      <button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span>
      <button disabled={!result.hasNext} onClick={() => setPage(page + 1)}>Siguiente</button>
    </nav>}
  </section>;
}

function NewTicket({ request, onCreated, close }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      onCreated((await request('/tickets', { method: 'POST', body })).id);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="card">
    <div className="section-head"><h2>Nueva solicitud</h2><button onClick={close} disabled={busy}>Cancelar</button></div>
    <ErrorMessage message={error} />
    <form onSubmit={submit} className="stack">
      <label>Asunto<input autoFocus required name="title" minLength="5" maxLength="120" /></label>
      <label>Categoría<select required name="category" defaultValue=""><option value="" disabled>Elige una categoría</option>
        {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>Descripción<textarea required name="description" rows="5" minLength="10" maxLength="2000" aria-describedby="ticket-hint" /></label>
      <small id="ticket-hint">Describe el problema sin incluir contraseñas ni datos sensibles.</small>
      <button className="primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitud'}</button>
    </form>
  </section>;
}

function TicketDetail({ request, id, agent, close, changed }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const heading = React.useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    request('/tickets/' + id, { signal: controller.signal }).then(setTicket)
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [id, request, refresh]);
  async function advance() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const status = ticket.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED';
      const updated = await request('/tickets/' + id + '/status', { method: 'PATCH', body: { status } });
      setTicket(current => ({ ...current, ...updated }));
      setNote('Estado actualizado.');
      setRefresh(current => current + 1);
      changed();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="card detail">
    <div className="section-head"><h2 tabIndex="-1" ref={heading}>Detalle de solicitud</h2><button onClick={close} disabled={busy}>Cerrar</button></div>
    <ErrorMessage message={error} />
    {!ticket && !error && <p role="status">Cargando detalle…</p>}
    {ticket && <>
      <div className="detail-title"><h3>{ticket.title}</h3><Status value={ticket.status} /></div>
      <p className="muted">{ticket.owner.name} · {campuses[ticket.campus]} · {categories[ticket.category]}</p>
      <p className="description">{ticket.description}</p>
      {agent && ticket.status !== 'RESOLVED' && <button className="primary" onClick={advance} disabled={busy}>{busy ? 'Guardando…' : ticket.status === 'OPEN' ? 'Iniciar atención' : 'Marcar como resuelta'}</button>}
      <p className="muted" role="status">{note}</p>
      <div className="section-head"><h3>Notificaciones</h3><button onClick={() => { setError(''); setRefresh(refresh + 1); }}>Actualizar</button></div>
      {ticket.notifications.length ? <ul className="timeline">{ticket.notifications.map(item =>
        <li key={item.id}><span>{statuses[item.status]}</span><small>{formatDate(item.createdAt)}</small></li>)}</ul> : <p className="muted">Aún no hay cambios de estado registrados.</p>}
    </>}
  </section>;
}

function Chat({ request }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(message) {
    if (busy || message.trim().length < 2) return;
    setBusy(true);
    setError('');
    setDraft('');
    try {
      const response = await request('/chat', { method: 'POST', body: { message } });
      setMessages(items => [...items.slice(-9), { message, ...response }]);
    } catch (failure) {
      setDraft(message);
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return <aside className="card chat" aria-labelledby="chat-title">
    <div className="assistant-symbol" aria-hidden="true">✦</div>
    <h2 id="chat-title">Asistente universitario</h2>
    <p className="muted">Pregunta por matrícula, acceso digital, sedes o seguimiento.</p>
    <div className="suggestions">
      {['¿Cómo recupero mi contraseña?', '¿Dónde consulto la matrícula?'].map(question =>
        <button key={question} disabled={busy} onClick={() => send(question)}>{question}</button>)}
    </div>
    <div className="conversation" role="log" aria-label="Conversación">
      {messages.map(({ message, answer, source }, index) => <div className="exchange" key={index}>
        <p className="question">{message}</p><p className="answer">{answer}<small>{source === 'faq' ? 'Guía de Proyecto Final' : 'Respuesta de IA'}</small></p>
      </div>)}
    </div>
    <ErrorMessage message={error} />
    <form className="stack" onSubmit={event => { event.preventDefault(); void send(draft); }}>
      <label>Tu pregunta<textarea rows="2" required minLength="2" maxLength="500" value={draft} onChange={event => setDraft(event.target.value)} disabled={busy} aria-describedby="chat-hint" /></label>
      <small id="chat-hint">Evita incluir datos personales. Con IA activa, la pregunta se envía a OpenRouter.</small>
      <button className="primary" disabled={busy || draft.trim().length < 2}>{busy ? 'Consultando…' : 'Enviar pregunta'}</button>
    </form>
  </aside>;
}

function Portal({ session, leave, request }) {
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const agent = session.user.role === 'AGENT';
  function created(id) {
    setPage(1);
    setStatus('');
    setCreating(false);
    setSelected(id);
    setRevision(value => value + 1);
  }
  return <>
    <header className="topbar"><div className="wrap topbar-inner"><Brand /><div className="profile">
      <div><strong>{session.user.name}</strong><small>{agent ? 'Agente' : 'Estudiante'} · Sede {campuses[session.user.campus]}</small></div>
      <button onClick={leave}>Cerrar sesión</button>
    </div></div></header>
    <main id="main" className="wrap">
      <section className="hero"><div><p className="eyebrow">Sede {campuses[session.user.campus]}</p>
        <h1>{agent ? 'Bandeja de atención' : 'Mis solicitudes'}</h1>
        <p>{agent ? 'Revisa y actualiza los casos de tu sede.' : 'Solicita ayuda y sigue el estado de tus casos.'}</p>
      </div>{!agent && <button className="primary" onClick={() => { setSelected(null); setCreating(true); }}>+ Nueva solicitud</button>}</section>
      <div className="workspace">
        <div className="stack">
          {creating && <NewTicket request={request} onCreated={created} close={() => setCreating(false)} />}
          {selected && <TicketDetail key={selected} id={selected} request={request} agent={agent} close={() => setSelected(null)} changed={() => setRevision(value => value + 1)} />}
          <Queue request={request} revision={revision} status={status} setStatus={setStatus} page={page} setPage={setPage}
            open={id => { setCreating(false); setSelected(id); }} />
        </div>
        <Chat request={request} />
      </div>
    </main>
  </>;
}

function App() {
  const [session, setSession] = useState(null);
  const [expired, setExpired] = useState(false);
  const request = React.useCallback(async (path, options) => {
    try {
      return await api(path, { ...options, token: session?.token });
    } catch (error) {
      if (error.status === 401) {
        setExpired(true);
        setSession(current => current === session ? null : current);
      }
      throw error;
    }
  }, [session]);
  return <><a className="skip" href="#main">Ir al contenido</a>
    {session ? <Portal session={session} request={request} leave={() => setSession(null)} />
      : <Login onLogin={value => { setExpired(false); setSession(value); }} expired={expired} />}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
