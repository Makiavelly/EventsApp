import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { errorMessage } from "../utils/format";

type Mode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { user, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? "/";

  if (!isLoading && user) {
    return <Navigate to={destination} replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "register") {
        await register({ name: name.trim(), email: email.trim(), password });
      } else {
        await login({ email: email.trim(), password });
      }
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
  }

  return (
    <div className="mx-auto grid max-w-lg gap-6 py-4 sm:py-10">
      <section className="text-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-meadow">Аккаунт</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          {mode === "login" ? "С возвращением" : "Присоединяйтесь"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink/60">
          {mode === "login" ? "Войдите, чтобы создавать события и участвовать в них." : "Создайте аккаунт за несколько секунд."}
        </p>
      </section>

      <Card className="p-5 sm:p-7">
        <div className="mb-6 grid grid-cols-2 rounded-lg bg-ink/[0.05] p-1">
          <Button variant={mode === "login" ? "primary" : "ghost"} onClick={() => changeMode("login")}>Вход</Button>
          <Button variant={mode === "register" ? "primary" : "ghost"} onClick={() => changeMode("register")}>Регистрация</Button>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          {mode === "register" ? (
            <Input label="Имя" name="name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          ) : null}
          <Input label="Email" name="email" type="email" autoComplete="email" required maxLength={100} value={email} onChange={(event) => setEmail(event.target.value)} hint="Поддерживаются адреса mail.ru и gmail.com" />
          <Input label="Пароль" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} />

          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <Button type="submit" disabled={pending} icon={mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}>
            {pending ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
