// The help assistant: a floating button that opens a small chat panel. It
// answers questions from the platform's own help topics (lib/helpKb.js) and,
// for a signed-in student, from their live data: matches, documents,
// deadlines and applications. No outside service is used.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LogoMark } from './Art.jsx';
import Icon from '../../../help_assistant_changed_files/frontend/src/components/icons.jsx';
import { formatDate, inr } from '../lib/format.js';
import { PERSONAL, TOPICS, normalize, pick, rank, suggestionsFor, tokens } from '../lib/helpKb.js';
import { summarize } from '../lib/insights.js';
import { useSession } from '../lib/session.jsx';
import { loadStudentData } from '../pages/Dashboard.jsx';

const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
const MAX_MESSAGES = 40;
const store = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ---------- Personal answers ----------

function personalIntent(question) {
  const t = normalize(question);
  if (/\b(why|how come)\b.*\b(not|cant|cannot|isnt|arent|dont)\b.*\b(eligible|qualify|apply)/.test(t) || /\bnot eligible\b|\bcannot apply\b|\bcant apply\b/.test(t)) return '@why';
  if (/\b(which|what|am i|do i|my|show)\b.*\b(eligible|qualify|matches|match)\b/.test(t)) return '@eligible';
  if (/\b(missing|need|pending|left|remaining)\b.*\bdoc|\bdoc\w*\b.*\b(missing|need|left|remaining|upload)/.test(t) && /\b(my|i|am|which|what)\b/.test(t)) return '@missing';
  if (/\b(my|next|upcoming|nearest)\b.*\b(deadline|deadlines|closing|due)\b|\bdeadlines?\b.*\b(soon|next|my)\b/.test(t)) return '@deadline';
  if (/\bmy\b.*\b(application|applications|status)\b|\bstatus of my\b|\bwhere (is|are) my\b/.test(t)) return '@status';
  if (/\bmy\b.*\bprofile\b|\bprofile\b.*\b(missing|incomplete)\b/.test(t)) return '@profile';
  return null;
}

// Finds the scholarship a question is about, by the words of its name.
function findScholarship(question, items, pathname) {
  const words = new Set(tokens(question));
  let best = null;
  for (const i of items) {
    const name = tokens(i.scholarship.name).filter((w) => w.length > 2);
    const hit = name.filter((w) => words.has(w)).length;
    const score = name.length ? hit / name.length : 0;
    if (hit >= 1 && (score >= 0.5 || hit >= 2) && (!best || score > best.score)) best = { item: i, score };
  }
  if (best) return best.item;
  const m = pathname.match(/^\/scholarships\/(\d+)/);
  return m ? items.find((i) => String(i.scholarship.id) === m[1]) : null;
}

function answerPersonal(intent, question, data, meta, pathname) {
  const x = summarize({ ...data, meta });
  const link = (s) => ({ label: s.name.length > 28 ? `${s.name.slice(0, 26)}…` : s.name, to: `/scholarships/${s.id}` });

  if (intent === '@eligible') {
    if (!x.eligible.length) {
      return {
        text: x.profilePct < 100
          ? `You don't qualify for any open scholarship yet, and your profile is ${x.profilePct}% complete. Filling in the missing details often unlocks matches.`
          : `You don't qualify for any open scholarship right now.${x.partial.length ? ` ${x.partial.length} ${x.partial.length === 1 ? 'is' : 'are'} within reach.` : ''}`,
        links: x.profilePct < 100 ? [{ label: 'Complete my profile', to: '/profile' }] : [{ label: 'Open Recovery', to: '/recovery' }],
        follow: ['@why', 'partial'],
      };
    }
    return {
      text: `You qualify for **${x.eligible.length}** open scholarship${x.eligible.length === 1 ? '' : 's'}, worth up to **${inr(x.potential)}** in total:\n${x.eligible.slice(0, 5).map((i) => `- **${i.scholarship.name}**: ${inr(i.scholarship.amount)}, closes ${formatDate(i.scholarship.deadline)}`).join('\n')}${x.partial.length ? `\n\n${x.partial.length} more ${x.partial.length === 1 ? 'is' : 'are'} within reach.` : ''}`,
      links: x.eligible.slice(0, 3).map((i) => link(i.scholarship)),
      follow: ['@missing', '@deadline'],
    };
  }

  if (intent === '@why') {
    const item = findScholarship(question, x.items, pathname);
    if (!item) {
      if (!x.partial.length) return { text: 'Tell me which scholarship you mean, for example "why am I not eligible for Merit Award".', follow: ['@eligible'] };
      return {
        text: `Which scholarship do you mean? These are within reach, with the main gap:\n${x.partial.slice(0, 4).map((i) => `- **${i.scholarship.name}**: ${i.match.checks.find((c) => c.mandatory && c.status !== 'pass')?.reason || 'one rule not met'}`).join('\n')}`,
        links: x.partial.slice(0, 3).map((i) => link(i.scholarship)),
      };
    }
    const s = item.scholarship;
    if (s.closed) return { text: `**${s.name}** closed on ${formatDate(s.deadline)}, so it can no longer be applied for.`, links: [{ label: 'Find open scholarships', to: '/scholarships' }] };
    if (item.match.result === 'ELIGIBLE') {
      return {
        text: `Good news: you **do** qualify for **${s.name}**. You meet every mandatory rule.${item.application ? '' : ' You can start the application now.'}`,
        links: [link(s)],
      };
    }
    const gaps = item.match.checks.filter((c) => c.mandatory && c.status !== 'pass');
    return {
      text: `For **${s.name}**, ${gaps.length === 1 ? 'one mandatory rule is' : `${gaps.length} mandatory rules are`} not met yet:\n${gaps.map((g) => `- ${g.status === 'unknown' ? `**${g.rule}**: add this detail to your profile` : g.reason}`).join('\n')}`,
      links: [link(s), ...(gaps.some((g) => g.status === 'unknown') ? [{ label: 'Complete my profile', to: '/profile' }] : [])],
      follow: ['partial'],
    };
  }

  if (intent === '@missing') {
    const lines = [];
    if (x.missingDocs.length) lines.push(`You're missing **${x.missingDocs.length}** document${x.missingDocs.length === 1 ? '' : 's'} that your matches need:\n${x.missingDocs.map((n) => `- **${n.label}**: needed by ${n.relevant.length} scholarship${n.relevant.length === 1 ? '' : 's'}`).join('\n')}`);
    if (x.mismatched.length) lines.push(`${x.mismatched.length} uploaded document${x.mismatched.length === 1 ? ' has' : 's have'} a mismatch with your profile: ${x.mismatched.map((d) => d.label).join(', ')}.`);
    if (!lines.length) return { text: 'Nothing is missing. Every document your current matches need is uploaded. 🎉', links: [{ label: 'Open Documents', to: '/documents' }] };
    return { text: lines.join('\n\n'), links: [{ label: 'Upload documents', to: '/documents' }], follow: ['documents', 'file-size'] };
  }

  if (intent === '@deadline') {
    const soon = x.open.filter((i) => i.match.result !== 'NOT_ELIGIBLE').sort((a, b) => a.scholarship.daysLeft - b.scholarship.daysLeft).slice(0, 4);
    if (!soon.length) return { text: 'No open scholarship you qualify for or are close to has a deadline coming up.', follow: ['@eligible'] };
    const when = (d) => (d === 0 ? 'closes today' : d === 1 ? 'closes tomorrow' : `${d} days left`);
    return {
      text: `Your next deadlines:\n${soon.map((i) => `- **${i.scholarship.name}**: ${formatDate(i.scholarship.deadline)} (${when(i.scholarship.daysLeft)})${i.application ? `, ${i.application.status === 'DRAFT' ? 'draft not submitted' : 'applied'}` : ''}`).join('\n')}`,
      links: soon.slice(0, 2).map((i) => link(i.scholarship)),
      follow: ['deadline'],
    };
  }

  if (intent === '@status') {
    const apps = data.applications;
    if (!apps.length) return { text: 'You haven\'t started any applications yet.', links: [{ label: 'Find scholarships', to: '/scholarships' }], follow: ['apply'] };
    return {
      text: `Your applications:\n${apps.slice(0, 6).map((a) => `- **${a.scholarship.name}**: ${meta.statuses[a.status] || a.status}`).join('\n')}${apps.some((a) => a.status === 'DOCUMENTS_PENDING') ? '\n\nOne needs your attention: a document was not accepted.' : ''}`,
      links: [{ label: 'My applications', to: '/applications' }],
      follow: ['statuses'],
    };
  }

  if (intent === '@profile') {
    const missing = data.matches.missingProfileFields || [];
    if (!missing.length) return { text: 'Your profile is complete. Every rule can be checked.', links: [{ label: 'Review my profile', to: '/profile' }] };
    return {
      text: `Your profile is **${x.profilePct}%** complete. Missing:\n${missing.map((k) => `- ${meta.fields[k]?.label || k}`).join('\n')}\n\nRules that need these can't be checked until you add them.`,
      links: [{ label: 'Complete my profile', to: '/profile' }],
    };
  }
  return null;
}

// ---------- Rendering ----------

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

function RichText({ text }) {
  return text.split('\n\n').map((block, b) => {
    const lines = block.split('\n');
    const bullets = lines.filter((l) => l.startsWith('- '));
    const lead = lines.filter((l) => !l.startsWith('- '));
    return (
      <div key={b} className={b ? 'mt-2' : ''}>
        {lead.map((l, i) => <p key={i}>{inline(l)}</p>)}
        {bullets.length > 0 && <ul className="mt-1 space-y-0.5 pl-4 [list-style:disc]">{bullets.map((l, i) => <li key={i}>{inline(l.slice(2))}</li>)}</ul>}
      </div>
    );
  });
}

const label = (id) => PERSONAL[id] || byId[id]?.title || id;

// ---------- The widget ----------

export default function HelpAssistant() {
  const { user, meta } = useSession();
  const { pathname } = useLocation();
  const role = user?.role || 'guest';
  const key = `vidyasutra.help.${user?.id || 'guest'}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => store.get(key) || []);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem('vidyasutra.helpSeen') === '1'; } catch { return true; } });
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const busy = useRef(false);

  // A different person (sign in / out) gets their own conversation.
  useEffect(() => { setMessages(store.get(key) || []); }, [key]);
  useEffect(() => { store.set(key, messages.slice(-MAX_MESSAGES)); }, [key, messages]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, typing, open]);
  useEffect(() => {
    if (!open) return undefined;
    setTimeout(() => inputRef.current?.focus(), 150);
    if (!seen) { setSeen(true); try { localStorage.setItem('vidyasutra.helpSeen', '1'); } catch { /* ignore */ } }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, seen]);

  const suggestions = useMemo(() => suggestionsFor(pathname, role).filter((id) => role === 'STUDENT' || !id.startsWith('@')), [pathname, role]);

  const respond = useCallback(async (question, forcedId) => {
    let reply;
    const personal = role === 'STUDENT' && (forcedId?.startsWith('@') ? forcedId : !forcedId && personalIntent(question));
    if (personal) {
      try {
        const data = await loadStudentData();
        reply = answerPersonal(personal, question, data, meta, pathname);
      } catch {
        reply = { text: 'I couldn\'t load your details just now. Check your connection and try again.' };
      }
    } else {
      const topic = forcedId ? byId[forcedId] : null;
      const ranked = topic ? [{ topic, score: 99 }] : rank(question, role);
      const best = pick(ranked);
      if (best) {
        const t = best.topic;
        const related = ranked.slice(0, 3).filter((r) => r.topic !== best.topic && r.score >= Math.max(2, best.score - 1) && !r.topic.hidden).map((r) => r.topic.id);
        reply = {
          text: t.answer,
          links: (t.links || []).filter((l) => !l.roles || l.roles.includes(role)),
          follow: [...new Set([...related, ...(t.follow || [])])].filter((id) => byId[id]?.roles.includes(role)).slice(0, 3),
        };
      } else {
        const maybe = ranked.filter((r) => !r.topic.hidden).slice(0, 3).map((r) => r.topic.id);
        reply = {
          text: maybe.length
            ? 'I\'m not completely sure what you mean. Did you mean one of these?'
            : 'I don\'t have an answer for that yet. Try asking in a different way, or pick a topic below.',
          follow: maybe.length ? maybe : suggestionsFor(pathname, role).filter((id) => role === 'STUDENT' || !id.startsWith('@')).slice(0, 3),
          fallback: true,
        };
      }
    }
    return reply;
  }, [role, meta, pathname]);

  async function ask(question, forcedId) {
    const q = String(question || '').trim().slice(0, 300);
    if (!q || busy.current) return;
    busy.current = true;
    setDraft('');
    setMessages((m) => [...m, { from: 'me', text: q }]);
    setTyping(true);
    const started = Date.now();
    const reply = await respond(q, forcedId);
    const wait = Math.max(0, 450 - (Date.now() - started));
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { from: 'bot', ...reply }]);
      busy.current = false;
    }, wait);
  }

  const first = user?.name?.split(' ')[0];
  const greeting = role === 'ADMIN'
    ? `Hi ${first}! Ask me about reviewing applications, scholarships or finding students.`
    : role === 'STUDENT'
      ? `Hi ${first}! I can explain how VidyaSutra works, and answer questions about your own matches, documents and deadlines.`
      : 'Hi! I can answer questions about how VidyaSutra works: eligibility, documents, deadlines and applying.';

  // Keep clear of the sticky action bar on scholarship pages.
  const lift = /^\/scholarships\/\d+/.test(pathname) ? 'bottom-24' : 'bottom-5';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section role="dialog" aria-label="Help assistant"
            initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            style={{ transformOrigin: 'bottom right' }}
            className={`fixed z-[65] flex flex-col overflow-hidden border border-line bg-paper shadow-[0_30px_70px_-20px_rgba(6,31,34,0.55)]
              inset-x-2 top-16 bottom-2 rounded-2xl xs:inset-x-auto xs:top-auto xs:right-5 xs:h-[34rem] xs:max-h-[calc(100vh-7.5rem)] xs:w-[23.5rem] ${lift === 'bottom-24' ? 'xs:bottom-[10.5rem]' : 'xs:bottom-24'}`}>
            <header className="flex items-center gap-3 bg-[linear-gradient(120deg,#061f22,#0a3034_55%,#0f4c4d)] px-4 py-3 text-white">
              <LogoMark className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">VidyaSutra Help</p>
                <p className="text-[0.75rem] text-white/65">Answers about the platform{role === 'STUDENT' ? ' and your account' : ''}</p>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={() => setMessages([])} className="rounded-lg px-2 py-1 text-[0.75rem] text-white/70 hover:bg-white/10 hover:text-white" title="Clear conversation">Clear</button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-white/80 hover:bg-white/10"><Icon name="x" className="h-4 w-4" /><span className="sr-only">Close help</span></button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-wash/50 px-3.5 py-4" aria-live="polite">
              <Bot><p>{greeting}</p></Bot>
              {messages.map((m, i) => (m.from === 'me' ? (
                <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[0.9rem] text-white">{m.text}</motion.div>
              ) : (
                <Bot key={i}>
                  <RichText text={m.text} />
                  {m.links?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <Link key={l.to + l.label} to={l.to} onClick={() => { if (window.innerWidth < 500) setOpen(false); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 text-[0.8rem] font-semibold text-brand no-underline hover:bg-brand/20">
                          {l.label}<Icon name="arrowRight" className="h-3.5 w-3.5" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.follow?.length > 0 && i === messages.length - 1 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.follow.map((id) => <Chip key={id} onClick={() => ask(label(id), id)}>{label(id)}</Chip>)}
                    </div>
                  )}
                </Bot>
              )))}
              {typing && (
                <Bot><span className="flex gap-1 py-1" aria-label="Typing">{[0, 1, 2].map((d) => <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-ink-2" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.12 }} />)}</span></Bot>
              )}
              {messages.length === 0 && !typing && (
                <div className="pl-9">
                  <p className="mb-1.5 text-[0.75rem] font-bold uppercase tracking-wide text-ink-2">Try asking</p>
                  <div className="flex flex-wrap gap-1.5">{suggestions.map((id) => <Chip key={id} onClick={() => ask(label(id), id)}>{label(id)}</Chip>)}</div>
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); ask(draft); }} className="flex items-center gap-2 border-t border-line bg-paper p-2.5">
              <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300}
                placeholder="Ask a question…" aria-label="Your question"
                className="min-h-[2.6rem] flex-1 rounded-xl border-[1.5px] border-line bg-paper px-3 text-[0.92rem] outline-none focus:border-brand" />
              <button className="grid h-[2.6rem] w-[2.6rem] place-items-center rounded-xl bg-brand text-white transition-transform hover:scale-105 disabled:opacity-40" disabled={!draft.trim() || typing} aria-label="Send">
                <Icon name="send" className="h-4.5 w-4.5" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close help' : 'Open help'}
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className={`fixed right-5 z-[64] grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#17897e,#0a3034)] text-white shadow-[0_16px_34px_-12px_rgba(10,48,52,0.75)] ring-2 ring-white/70 transition-[bottom] ${lift} ${open ? 'max-xs:hidden' : ''}`}>
        {!seen && !open && <span className="absolute inset-0 animate-ping rounded-full bg-mint/40" aria-hidden="true" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? 'x' : 'q'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <Icon name={open ? 'x' : 'chat'} className="h-6 w-6" />
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}

function Bot({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2">
      <LogoMark className="mt-0.5 h-7 w-7 flex-none" />
      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2.5 text-[0.88rem] leading-relaxed text-ink shadow-sm">{children}</div>
    </motion.div>
  );
}

function Chip({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-full border border-brand/30 bg-paper px-3 py-1 text-left text-[0.8rem] font-semibold text-brand transition-colors hover:border-brand hover:bg-brand/5">
      {children}
    </button>
  );
}
