'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
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
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setMessage('E-mail ou senha incorretos. Confira os dados e tente novamente.'); return; }
      const check = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!check.ok) {
        await supabase.auth.signOut();
        setMessage('Esta conta não está autorizada a acessar o RYVMO.');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setMessage('Não foi possível conectar agora. Verifique sua internet e tente novamente.');
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
          {message ? <p role="alert" className="login-error">{message}</p> : null}
          <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Verificando...' : 'Entrar no meu espaço'}<ArrowRight size={19} /></button>
        </form>
        <p className="login-privacy"><ShieldCheck size={16} /> Conta pessoal. Seus registros permanecem privados.</p>
      </section>
    </div>
  </main>;
}
