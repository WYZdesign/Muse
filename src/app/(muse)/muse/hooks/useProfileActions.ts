"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { getGeolocation } from "@/app/muse-realtime";
import { trackError } from "@/lib/errorTracker";
import type { OnboardingData } from "./useAuthOnboardingState";
import type { MuseToastInput } from "./useMuseActions";

/**
 * Profile action handlers, extracted verbatim from page.tsx: the edit-profile
 * save (`saveProfileEdits`, including the NSFW bio auto-detect and quest
 * tracking) and the two upload helpers (`uploadImage` for avatars/portfolio,
 * `uploadMedia` for voice/video notes). Pure relocation: the edit-form fields,
 * onboarding data, profile state, toast and quest helpers all arrive through
 * one options object. All useCallback dependency arrays are unchanged.
 */
export type UseProfileActionsArgs = {
  obData: OnboardingData;
  currentUser: { nsfw?: boolean };
  setObData: Dispatch<SetStateAction<OnboardingData>>;
  setCurrentUser: (updater: (prev: any) => any) => void;
  setShowEditProfile: Dispatch<SetStateAction<boolean>>;
  authFetch: (url: string, init?: RequestInit & { timeoutMs?: number }) => Promise<Response>;
  trackQuest: (...actionKeys: string[]) => void | Promise<void>;
  showToast: (msg: MuseToastInput) => void;
};

export function useProfileActions({
  obData,
  currentUser,
  setObData,
  setCurrentUser,
  setShowEditProfile,
  authFetch,
  trackQuest,
  showToast,
}: UseProfileActionsArgs) {
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editType, setEditType] = useState("");
  const [editCustomTypePending, setEditCustomTypePending] = useState(false);
  const [editLooking, setEditLooking] = useState<string[]>([]);
  const [editNsfw, setEditNsfw] = useState(false);
  const [editMediaKit, setEditMediaKit] = useState("");

  const uploadImage = useCallback(async (file: File, folder: string): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      // File uploads legitimately take longer than the 15s default on a
      // slow connection — give this call site more room before the
      // shared authFetch timeout would abort it.
      const r = await authFetch("/api/muse/upload", { method: "POST", body: fd, timeoutMs: 60000 });
      const j = await r.json();
      if (j.success && j.url) {
        if (folder === "portfolio") trackQuest("upload_photo");
        return j.url;
      }
      showToast("Upload failed: " + (j.error || "Unknown"));
      return null;
    } catch { trackError("upload_image_failed", { folder }); showToast("Upload failed"); return null; }
  }, [showToast, trackQuest]);

  // Recorded clips (voice / video notes). Same /api/muse/upload endpoint, but
  // the server must be told audio vs video — both are WebM containers with an
  // identical header, so it can't tell from the bytes.
  const uploadMedia = useCallback(async (file: File, folder: string, mediaKind: "voice" | "video"): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      fd.append("mediaKind", mediaKind);
      const r = await authFetch("/api/muse/upload", { method: "POST", body: fd, timeoutMs: 120000 });
      const j = await r.json();
      if (j.success && j.url) return j.url;
      showToast("Upload failed: " + (j.error || "Unknown"));
      return null;
    } catch { trackError("upload_media_failed", { folder, mediaKind }); showToast("Upload failed"); return null; }
  }, [showToast]);

  const saveProfileEdits = useCallback(async () => {
    setCurrentUser(prev => ({ ...prev, name: editName || prev.name, avatar: editAvatar || prev.avatar, type: editType || prev.type }));
    setObData(prev => ({ ...prev, bio: editBio, loc: editLoc, type: editType || prev.type, looking: editLooking.length ? editLooking : prev.looking, mediaKitUrl: editMediaKit }));
    let geo: { lat: number; long: number; city?: string } | null = null;
    try { geo = await getGeolocation(); } catch { console.debug("[muse] profile location lookup failed"); }
    setShowEditProfile(false);
    // Auto-detect NSFW from bio keywords (matches the chat disclosure trigger regex)
    const bioLower = (editBio || "").toLowerCase();
    const bioHasNsfw = /\bnude\b|\bnudity\b|\bnsfw\b|\bnsf[ww]\b|\bexplicit\b|\bboudoir\b|\bpenetrat\b|\bsexual\b|\berotic\b|\btopless\b|\bundressed\b|\bintimate\b|\bsensual\b|\badult\b/i.test(bioLower);
    const nsfwValue = editNsfw || bioHasNsfw;
    try {
      const r = await authFetch("/api/muse/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "update-profile",
          name: editName,
          bio: editBio,
          loc: editLoc,
          avatar: editAvatar,
          type: editType,
          looking: editLooking,
          nsfw: nsfwValue,
          media_kit_url: editMediaKit.trim(),
          // Torreé audit item 6: carry the "Other" custom-type review flag
          // through to the saved profile.
          ...(editCustomTypePending ? { custom_type_pending: true } : {}),
          ...(geo ? { lat: geo.lat, long: geo.long, city: geo.city } : {}),
        }),
      });
      if (!r.ok) throw new Error("save failed");
      if (nsfwValue && !currentUser.nsfw) showToast("Profile marked as NSFW — your content will be age-gated");
      else showToast("Saved!");
      trackQuest("update_profile", "complete_profile");
      if ((editBio || "").trim().length >= 50) trackQuest("write_bio");
      if ((obData.styles || []).length > 0) trackQuest("set_styles");
    } catch {
      showToast("Failed to save — try again");
    }
  }, [editName, editBio, editLoc, editAvatar, editType, editCustomTypePending, editLooking, editNsfw, editMediaKit, obData.styles, setObData, setShowEditProfile, showToast, currentUser.nsfw, trackQuest]);

  return {
    uploadImage,
    uploadMedia,
    saveProfileEdits,
    editName, setEditName,
    editBio, setEditBio,
    editLoc, setEditLoc,
    editAvatar, setEditAvatar,
    editType, setEditType,
    editCustomTypePending, setEditCustomTypePending,
    editLooking, setEditLooking,
    editNsfw, setEditNsfw,
    editMediaKit, setEditMediaKit,
  };
}
