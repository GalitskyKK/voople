import { NotFoundView } from "@/components/system/NotFoundView";

export default function PostNotFound() {
  return (
    <NotFoundView
      surface="post"
      title="Публикация не найдена"
      description="Возможно, автор удалил публикацию или доступ к ней изменился."
    />
  );
}
