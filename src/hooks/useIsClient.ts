import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * SSR-безопасный признак «мы на клиенте после гидрации». Возвращает false на
 * сервере и при первом рендере, true — после монтирования. Замена паттерну
 * `useState(false)` + `useEffect(() => setMounted(true), [])` без setState в эффекте
 * (совместимо с правилами react-hooks/React Compiler).
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
