"use client";

type Role = "owner" | "admin" | "member";
type RoleColors = Record<Role, string>;

const ROLE_LABELS: Record<Role, string> = {
  owner: "Владелец",
  admin: "Админ",
  member: "Участник",
};

export function GroupRoleStylesEditor({
  enabled,
  value,
  onChange,
}: {
  enabled: boolean;
  value: RoleColors;
  onChange: (value: RoleColors) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-[var(--app-border)] p-3" disabled={!enabled}>
      <legend className="px-1 text-xs font-medium">Цвета ролей</legend>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
          <label key={role} className="grid gap-1 text-center text-[10px] text-[var(--app-muted)]">
            {ROLE_LABELS[role]}
            <input
              type="color"
              value={value[role]}
              onChange={(event) => onChange({ ...value, [role]: event.target.value })}
              className="mx-auto h-9 w-full rounded-lg border border-[var(--app-border)] bg-transparent p-1 disabled:opacity-40"
              aria-label={`Цвет роли «${ROLE_LABELS[role]}»`}
            />
          </label>
        ))}
      </div>
      {!enabled ? (
        <p className="mt-2 text-[11px] text-[var(--app-muted)]">
          Расширенные стили ролей открываются на 24-м уровне.
        </p>
      ) : null}
    </fieldset>
  );
}
