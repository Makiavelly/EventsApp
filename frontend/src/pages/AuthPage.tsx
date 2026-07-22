import { FormEvent, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { SlidingSelector } from "../components/SlidingSelector";
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
    <div className="mx-auto grid min-h-[calc(100dvh-2.5rem)] max-w-lg place-items-center">
      <Card className="w-full p-5 sm:p-7">
        <h1 className="sr-only">{mode === "login" ? "Вход" : "Регистрация"}</h1>
        <SlidingSelector
          value={mode}
          ariaLabel="Режим авторизации"
          className="mb-6 w-full"
          items={[
            { value: "login", label: "Вход", icon: <LogIn size={17} /> },
            { value: "register", label: "Регистрация", icon: <UserPlus size={17} /> },
          ]}
          onChange={changeMode}
        />

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
