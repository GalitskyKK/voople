"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import type { ProfileViewModel } from "@/types/domain";

import { ProfileEditTrigger } from "./ProfileEditTrigger";
import { ProfileEditorShopLink } from "./ProfileEditorShopLink";
import { ProfileEditorBannerPanel, ProfileEditorFeedPanel, ProfileEditorFramePanel } from "./editor/ProfileEditorAppearancePanels";
import { ProfileEditorAvatarPanel, ProfileEditorProfilePanel } from "./editor/ProfileEditorIdentityPanels";
import { ProfileEditorNamePanel } from "./editor/ProfileEditorNamePanel";
import { PROFILE_EDITOR_PANELS } from "./editor/profile-editor-models";
import { ProfileEditorPreview } from "./editor/ProfileEditorPreview";
import { ProfileEditorTagPanel } from "./editor/ProfileEditorTagPanel";
import { useProfileEditorController } from "./editor/useProfileEditorController";

export function ProfileEditSheet({
  profile,
  onUpdated,
  onNavigate,
  triggerVariant = "icon",
}: {
  profile: ProfileViewModel;
  onUpdated?: () => void;
  onNavigate?: (href: string) => void;
  triggerVariant?: "icon" | "button";
}) {
  const controller = useProfileEditorController({ profile, onUpdated });
  const activePanel = useMemo(
    () => PROFILE_EDITOR_PANELS.find((entry) => entry.id === controller.panel) ?? PROFILE_EDITOR_PANELS[0],
    [controller.panel],
  );

  const beforeShopNavigation = () => {
    if (controller.dirty) {
      controller.setPanel("profile");
      controller.notify("Сначала сохраните имя и описание или закройте редактор без сохранения.");
      return false;
    }
    controller.closeEditor(true);
    return true;
  };
  const commonPanelProps = { controller, hasVooplePlus: Boolean(profile.hasVooplePlus), onOpenShop: beforeShopNavigation };

  return (
    <>
      <ProfileEditTrigger variant={triggerVariant} onClick={controller.openEditor} />
      <Sheet open={controller.open} onClose={() => controller.closeEditor()} ariaLabel="Редактор профиля" className="profile-editor-dialog max-w-[1240px] overflow-hidden p-0">
        <div className="profile-editor-layout">
          <aside className="profile-editor-sidebar">
            <p className="profile-editor-title">Редактор профиля</p>
            <nav className="profile-editor-tabs" aria-label="Разделы редактора">
              {PROFILE_EDITOR_PANELS.map((entry) => (
                <button key={entry.id} type="button" onClick={() => controller.setPanel(entry.id)} aria-current={controller.panel === entry.id ? "page" : undefined} className={cn("profile-editor-tab", controller.panel === entry.id && "profile-editor-tab--active")}>
                  <span><span className="block text-sm font-medium">{entry.label}</span><span className="profile-editor-tab__hint">{entry.hint}</span></span>
                  <ChevronRight className="hidden h-4 w-4 opacity-40 lg:block" />
                </button>
              ))}
            </nav>
            <ProfileEditorShopLink onNavigate={onNavigate} onBeforeNavigate={beforeShopNavigation} />
          </aside>

          <main className="profile-editor-main voople-scroll">
            <div className="profile-editor-content">
              <div className="profile-editor-preview-column">
                <ProfileEditorPreview
                  profile={profile}
                  customization={controller.previewCustomization}
                  groupTag={controller.selectedGroupTag}
                  avatarUrl={controller.avatarUrl}
                  name={controller.draft.name}
                  bio={controller.draft.bio}
                  editing={controller.editing}
                  onEditingChange={(next) => { controller.setPanel("profile"); controller.setEditing(next); }}
                  onNameChange={controller.setName}
                  onBioChange={controller.setBio}
                  onAvatarClick={() => controller.setPanel("avatar")}
                />
                <p className="mt-3 text-xs leading-5 text-[var(--app-muted)]">Предпросмотр использует ту же карточку и те же токены, что web и desktop.</p>
              </div>

              <section className="profile-editor-controls">
                <header className="pr-10"><h2 className="text-xl font-semibold">{activePanel.label}</h2><p className="mt-1 text-sm text-[var(--app-muted)]">{activePanel.hint}</p></header>
                {controller.panel === "profile" ? <ProfileEditorProfilePanel controller={controller} /> : null}
                {controller.panel === "tag" ? <ProfileEditorTagPanel tags={controller.groupTags} selected={controller.selectedGroupTag} loading={controller.chats.isLoading} busy={controller.tagBusy} onSelect={(tag) => void controller.selectGroupTag(tag)} /> : null}
                {controller.panel === "avatar" ? <ProfileEditorAvatarPanel controller={controller} profileHasPlus={Boolean(profile.hasVooplePlus)} onOpenShop={beforeShopNavigation} /> : null}
                {controller.panel === "banner" ? <ProfileEditorBannerPanel {...commonPanelProps} /> : null}
                {controller.panel === "frame" ? <ProfileEditorFramePanel {...commonPanelProps} /> : null}
                {controller.panel === "feed" ? <ProfileEditorFeedPanel {...commonPanelProps} avatarUrl={controller.avatarUrl} name={controller.draft.name} /> : null}
                {controller.panel === "name" ? <ProfileEditorNamePanel controller={controller} hasVooplePlus={Boolean(profile.hasVooplePlus)} /> : null}

                <div className="profile-editor-footer" aria-live="polite">
                  {controller.panel === "profile" ? (
                    <Button type="button" className="w-full" disabled={!controller.dirty || controller.savePending} onClick={() => void controller.saveProfile()}>
                      {controller.savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {controller.dirty ? "Сохранить имя и описание" : "Имя и описание сохранены"}
                    </Button>
                  ) : <p className="text-center text-xs text-[var(--app-muted)]">Оформление и тег сохраняются сразу после выбора.</p>}
                  {controller.message ? <p className="mt-2 text-center text-sm text-[var(--app-muted)]">{controller.message}</p> : null}
                  {controller.avatarUpload.error || controller.bannerUpload.error ? <p className="mt-2 text-center text-sm text-red-400">{controller.avatarUpload.error ?? controller.bannerUpload.error}</p> : null}
                </div>
              </section>
            </div>
          </main>
        </div>
      </Sheet>

      <Sheet open={controller.discardOpen} onClose={controller.cancelDiscard} closeOnEscape={false} ariaLabel="Несохранённые изменения" className="max-w-md">
        <h2 className="pr-10 text-lg font-semibold">Закрыть без сохранения?</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">Имя или описание изменены. Оформление и тег уже сохранены отдельно и не будут отменены.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={controller.cancelDiscard}>Продолжить редактирование</Button><Button type="button" className="bg-red-600 text-white hover:bg-red-500" onClick={controller.confirmDiscard}>Закрыть без сохранения</Button></div>
      </Sheet>
    </>
  );
}
