"use client";
import { useState } from "react";

/**
 * Pure open/close modal-visibility flags, extracted from page.tsx. These are
 * the ~28 `useState(false)` pairs with no cross-dependencies on each other
 * (each modal opens/closes independently of the others, and several are
 * legitimately shown at the same time — e.g. the emoji picker over the new
 * post composer, or the disclosure modal over the hamburger menu — so this
 * intentionally keeps them as independent flags rather than a single
 * "one modal at a time" reducer). Same shape as useChatState/useBriefsState:
 * every showX/setShowX name is unchanged, so no call site in page.tsx or any
 * screen component needed to change.
 */
export function useModalVisibility() {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showNotificationsSettings, setShowNotificationsSettings] = useState(false);
  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [showLikesYou, setShowLikesYou] = useState(false);
  const [showDiscoveryPrefs, setShowDiscoveryPrefs] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [showSafetyCheckin, setShowSafetyCheckin] = useState(false);
  const [showPromptBank, setShowPromptBank] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showDailyLogin, setShowDailyLogin] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return {
    showFilterModal, setShowFilterModal,
    showEditProfile, setShowEditProfile,
    showShareProfile, setShowShareProfile,
    showReport, setShowReport,
    showNotificationsSettings, setShowNotificationsSettings,
    showConnectedAccounts, setShowConnectedAccounts,
    showTerms, setShowTerms,
    showPrivacy, setShowPrivacy,
    showGuidelines, setShowGuidelines,
    showDeleteConfirm, setShowDeleteConfirm,
    showNewPost, setShowNewPost,
    showLikesYou, setShowLikesYou,
    showDiscoveryPrefs, setShowDiscoveryPrefs,
    showActivityFeed, setShowActivityFeed,
    showHamburger, setShowHamburger,
    showDisclosureModal, setShowDisclosureModal,
    showAgeVerification, setShowAgeVerification,
    showSafetyCheckin, setShowSafetyCheckin,
    showPromptBank, setShowPromptBank,
    showReferral, setShowReferral,
    showConnect, setShowConnect,
    showPaymentHistory, setShowPaymentHistory,
    showQuests, setShowQuests,
    showDailyLogin, setShowDailyLogin,
    showFeatureTour, setShowFeatureTour,
    showAgeGate, setShowAgeGate,
    showIntentPicker, setShowIntentPicker,
    showStories, setShowStories,
    showEmojiPicker, setShowEmojiPicker,
  };
}
