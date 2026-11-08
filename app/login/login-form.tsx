'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ missingConfig = false }: { missingConfig?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage((error.status ?? 0) >= 500 || error.name === 'AuthRetryableFetchError'
          ? 'O Supabase Auth não está respondendo. Verifique o status do projeto e tente novamente.'
          : 'Não foi possível entrar. Confira seu e-mail, senha e a configuração do Supabase.');
        return;
      }
      const check = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!check.ok) {
        if (check.status === 403) {
          await supabase.auth.signOut();
          setMessage('Esta conta não está autorizada a acessar o RYVMO.');
        } else if (check.status === 503 || check.status >= 500) {
          // Keep the valid session: server outage is not an invalid password.
          setMessage('O servidor não conseguiu confirmar o acesso. Confira os logs da Vercel e as cinco variáveis do Supabase.');
        } else {
          setMessage('A sessão não foi confirmada. Atualize a página e tente novamente.');
        }
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setMessage('Não foi possível conectar ao Supabase. Confira as variáveis na Vercel e sua conexão.');
    } finally { setBusy(false); }
  }

  return <main className="login-screen">
    <div className="login-orbit login-orbit-one" aria-hidden="true" />
    <div className="login-orbit login-orbit-two" aria-hidden="true" />
    <div className="login-layout">
      <section className="login-story">
        <div className="login-logo"><span className="brand-symbol">R</span><strong>ryvmo<span>.</span></strong></div>
        <div className="login-story-copy"><span className="login-chip"><Sparkles size={14} /> SEU ESPAÇO PESSOAL</span>
          <h1>Construa sua<br />melhor <em>versão.</em></h1>
          <p>Hábitos, alimentação, estudos e treinos em um só ritmo. Uma evolução que começa hoje.</p>
          <div className="login-accent-line" />
        </div>
        <div className="login-story-footer"><span className="live-dot" /> Progresso real, todos os dias.</div>
      </section>
      <section className="login-form-card">
        <span className="login-card-icon"><LockKeyhole size={23} /></span>
        <span className="login-card-eyebrow">ACESSO PRIVADO</span>
        <h2>Bem-vindo de volta.</h2>
        <p className="login-form-subtitle">Entre na sua conta para continuar de onde parou.</p>
        <form onSubmit={onSubmit}>
          <label className="login-field"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoCapitalize="none" autoCorrect="off" placeholder="seu@email.com" /></label>
          <label className="login-field"><span>Senha</span><span className="login-password-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Sua senha" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          {missingConfig ? <p role="alert" className="login-error">Configuração do servidor incompleta. Confira NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e OWNER_USER_ID na Vercel e faça Redeploy.</p> : null}
          {message ? <p role="alert" className="login-error">{message}</p> : null}
          <button className="login-submit" type="submit" disabled={busy || missingConfig}>{busy ? 'Verificando...' : 'Entrar no meu espaço'}<ArrowRight size={19} /></button>
        </form>
        <p className="login-privacy"><ShieldCheck size={16} /> Conta pessoal. Seus registros permanecem privados.</p>
      </section>
    </div>
  </main>;
}
