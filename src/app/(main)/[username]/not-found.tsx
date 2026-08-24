import { NotFoundView } from "@/components/system/NotFoundView";

export default function ProfileNotFound() {
  return (
    <NotFoundView
      surface="profile"
      title="Профиль не найден"
      description="Пользователь мог сменить имя или ограничить доступ к профилю."
    />
  );
}
