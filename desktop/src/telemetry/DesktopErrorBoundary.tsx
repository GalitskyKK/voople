import { Component, type ErrorInfo, type ReactNode } from "react";

import { reportClientError } from "@/lib/telemetry/client";

type State = { error: Error | null };

export class DesktopErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const reportable = new Error(error.message, { cause: error });
    reportable.name = error.name;
    reportable.stack = [error.stack, info.componentStack].filter(Boolean).join("\n");
    reportClientError(reportable);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="status-page" role="alert">
        <section className="setup-card">
          <p className="eyebrow">VOOPLE DESKTOP</p>
          <h1>Не удалось открыть этот экран</h1>
          <p>
            Ошибка уже записана без содержимого переписки и данных аккаунта.
            Перезапустите интерфейс; активный звонок при возможности останется подключённым.
          </p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            Перезапустить интерфейс
          </button>
        </section>
      </main>
    );
  }
}
