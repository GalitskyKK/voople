import { AudioWaveform, LoaderCircle } from "lucide-react";

export function GroupPeopleVoopAction({
  displayName,
  disabled,
  onSelect,
  waiting,
}: {
  displayName: string;
  disabled: boolean;
  onSelect: () => void;
  waiting: boolean;
}) {
  return (
    <button
      type="button"
      className="voople-group-people-voop"
      disabled={disabled}
      onClick={onSelect}
      aria-label={waiting
        ? `Отменить Вуп для ${displayName}`
        : `Вуп: позвать ${displayName} в отдельный разговор`}
    >
      <span className="voople-group-people-voop__signal" aria-hidden="true">
        {waiting ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
        ) : (
          <AudioWaveform className="h-3.5 w-3.5" />
        )}
      </span>
      <span>
        <strong>{waiting ? "Отменить" : "Вуп"}</strong>
        <small>{waiting ? "ожидаем ответ" : "отдельный разговор"}</small>
      </span>
    </button>
  );
}
