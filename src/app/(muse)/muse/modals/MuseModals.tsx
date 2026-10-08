"use client";

import React from "react";
import type { Match } from "../components/types";
import { ScreenErrorBoundary } from "../components/ScreenErrorBoundary";
import { PAGE_TOURS, tourSeenKey } from "../components/pageTourContent";
import { PublicProfileScreen } from "../screens/PublicProfileScreen";
import QuestPanel from "../screens/QuestPanel";
import { ReportModal } from "../components/ReportModal";
import DisclosureModal from "../components/DisclosureModal";
import AgeVerificationModal from "../components/AgeVerificationModal";
import UpsellModal from "../components/UpsellModal";
import SafetyCheckinModal from "../components/SafetyCheckinModal";
import PromptBankModal from "../components/PromptBankModal";
import ReferralPanel from "../components/ReferralPanel";
import ConnectPanel from "../components/ConnectPanel";
import PaymentHistory from "../components/PaymentHistory";
import { DailyLoginModal } from "../components/DailyLoginModal";
import PageTour from "../components/PageTour";
import CallOverlay from "../components/CallOverlay";
import { LikeNoteModal } from "./LikeNoteModal";
import { TermsModal } from "./TermsModal";
import { PrivacyModal } from "./PrivacyModal";
import { GuidelinesModal } from "./GuidelinesModal";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { DiscoveryPrefsModal } from "./DiscoveryPrefsModal";
import { UnmatchModal } from "./UnmatchModal";
import { BlockModal } from "./BlockModal";
import { StoryViewer } from "./StoryViewer";
import { ViewProfileModal } from "./ViewProfileModal";
import { SharePostModal } from "./SharePostModal";
import { EditProfileModal } from "./EditProfileModal";
import { ShareProfileSheet } from "./ShareProfileSheet";
import { IncomingCallModal } from "./IncomingCallModal";
import type { MuseModalsStackProps } from "./types";

export function MuseModals(props: MuseModalsStackProps) {
  const {
    apiFetch, authFetch, showToast, handleImgError, uploadImage, uploadMedia, showScreen, safeSetItem,
    currentUser, authUser, matches, setMatches, doSwipe,
    showReport, setShowReport, reportTarget, reportTrap,
    showLikeNote, setShowLikeNote, noteTargetProfile, setNoteTargetProfile, likeNoteTrap, likeNoteAnchor, setLikeNoteAnchor, likeNoteText, setLikeNoteText,
    showTerms, setShowTerms, termsTrap,
    showPrivacy, setShowPrivacy, privacyTrap,
    showGuidelines, setShowGuidelines, guidelinesTrap,
    showDeleteConfirm, setShowDeleteConfirm, deleteConfirmTrap, setAuthUser, setScreen,
    showDiscoveryPrefs, setShowDiscoveryPrefs, discoveryPrefsTrap, discoveryPrefs, setDiscoveryPrefs, searchQuery, filterStyles, setFilterStyles, filterScore, setFilterScore, savedSearches, setSavedSearches, DEMO_MODE,
    unmatchTarget, setUnmatchTarget, unmatchTrap,
    blockTarget, setBlockTarget, blockTrap, setBlockedUsers,
    showStory, setShowStory, stories,
    viewProfile, setViewProfile, viewProfileTrap, viewProfilePhotoIdx, setViewProfilePhotoIdx, revealedNsfw, setRevealedNsfw, badgeInfo, setBadgeInfo, viewProfileReviews, setPublicProfileUser,
    publicProfileUser, setChatTarget, setReportTarget, lightboxPhotos, lightboxIdx, setLightboxPhotos, setLightboxIdx,
    shareTarget, setShareTarget, shareTargetTrap,
    showEditProfile, setShowEditProfile, editProfileTrap, editAvatar, setEditAvatar, editAvatarInputRef, editName, setEditName, editBio, setEditBio, editLoc, setEditLoc, editMediaKit, setEditMediaKit, editType, setEditType, editCustomTypePending, setEditCustomTypePending, editLooking, setEditLooking, editNsfw, setEditNsfw, obData, saveProfileEdits,
    showShareProfile, setShowShareProfile, shareProfileTrap,
    showDisclosureModal, setShowDisclosureModal, disclosureTarget, setDisclosureTarget, disclosureBookingId, existingDisclosure, ageVerified, setAgeVerified, pendingDisclosureConfirm, setPendingDisclosureConfirm, pendingDisclosureCreate, setPendingDisclosureCreate,
    showAgeVerification, setShowAgeVerification,
    upsell, closeUpsell,
    showSafetyCheckin, setShowSafetyCheckin, safetyCheckins, setSafetyCheckins, safetyProfile, setSafetyProfile,
    showPromptBank, setShowPromptBank, promptBankData, promptResponses, setPromptResponses,
    showReferral, setShowReferral, showConnect, setShowConnect, showPaymentHistory, setShowPaymentHistory,
    showDailyLogin, setShowDailyLogin, weeklyLogins, loginStreak, setShowQuests,
    activePageTour, setActivePageTour, showQuests, setClaimableQuests, handleQuestsChange,
    incomingCall, activeCall, declineCall, acceptCall, endCall, leaveVoicemail, callRecording, callPeerRecording, startCallRecording, stopCallRecording,
  } = props;

  return (
    <>
      {showReport && (
        <ReportModal
          target={reportTarget}
          dialogRef={reportTrap}
          apiFetch={apiFetch}
          onClose={() => { setShowReport(false); setReportTarget(null); }}
          onReported={showToast}
        />
      )}

      <LikeNoteModal
        showLikeNote={showLikeNote}
        setShowLikeNote={setShowLikeNote}
        noteTargetProfile={noteTargetProfile}
        setNoteTargetProfile={setNoteTargetProfile}
        likeNoteTrap={likeNoteTrap}
        likeNoteAnchor={likeNoteAnchor}
        setLikeNoteAnchor={setLikeNoteAnchor}
        likeNoteText={likeNoteText}
        setLikeNoteText={setLikeNoteText}
        handleImgError={handleImgError}
        doSwipe={doSwipe}
        apiFetch={apiFetch}
        authUser={authUser}
        setMatches={setMatches}
        showToast={showToast}
      />

      <TermsModal showTerms={showTerms} setShowTerms={setShowTerms} termsTrap={termsTrap} />
      <PrivacyModal showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} privacyTrap={privacyTrap} />
      <GuidelinesModal showGuidelines={showGuidelines} setShowGuidelines={setShowGuidelines} guidelinesTrap={guidelinesTrap} />
      <DeleteAccountModal
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        deleteConfirmTrap={deleteConfirmTrap}
        authFetch={authFetch}
        setAuthUser={setAuthUser}
        setScreen={setScreen}
        showToast={showToast}
      />
      <DiscoveryPrefsModal
        showDiscoveryPrefs={showDiscoveryPrefs}
        setShowDiscoveryPrefs={setShowDiscoveryPrefs}
        discoveryPrefsTrap={discoveryPrefsTrap}
        discoveryPrefs={discoveryPrefs}
        setDiscoveryPrefs={setDiscoveryPrefs}
        searchQuery={searchQuery}
        filterStyles={filterStyles}
        setFilterStyles={setFilterStyles}
        filterScore={filterScore}
        setFilterScore={setFilterScore}
        savedSearches={savedSearches}
        setSavedSearches={setSavedSearches}
        DEMO_MODE={DEMO_MODE}
        showToast={showToast}
        apiFetch={apiFetch}
      />
      <UnmatchModal
        unmatchTarget={unmatchTarget}
        setUnmatchTarget={setUnmatchTarget}
        unmatchTrap={unmatchTrap}
        matches={matches}
        setMatches={setMatches}
        showScreen={showScreen}
        showToast={showToast}
        apiFetch={apiFetch}
      />
      <BlockModal
        blockTarget={blockTarget}
        setBlockTarget={setBlockTarget}
        blockTrap={blockTrap}
        matches={matches}
        setMatches={setMatches}
        setBlockedUsers={setBlockedUsers}
        showScreen={showScreen}
        showToast={showToast}
        apiFetch={apiFetch}
      />
      <StoryViewer showStory={showStory} setShowStory={setShowStory} stories={stories} />
      <ViewProfileModal
        viewProfile={viewProfile}
        setViewProfile={setViewProfile}
        viewProfileTrap={viewProfileTrap}
        viewProfilePhotoIdx={viewProfilePhotoIdx}
        setViewProfilePhotoIdx={setViewProfilePhotoIdx}
        revealedNsfw={revealedNsfw}
        setRevealedNsfw={setRevealedNsfw}
        badgeInfo={badgeInfo}
        setBadgeInfo={setBadgeInfo}
        viewProfileReviews={viewProfileReviews}
        setPublicProfileUser={setPublicProfileUser}
      />
      {publicProfileUser && (
        <React.Suspense fallback={null}>
          <ScreenErrorBoundary name="PublicProfile">
            <PublicProfileScreen
              user={publicProfileUser}
              onBack={() => setPublicProfileUser(null)}
              onMessage={(u) => { setPublicProfileUser(null); setChatTarget(u as unknown as Match); showScreen("chat"); }}
              onReport={(u) => { setReportTarget({ id: u.id, type: "user", name: u.name || "Unknown" }); setShowReport(true); setPublicProfileUser(null); }}
              onBlock={(u) => { setBlockTarget({ id: u.id, name: u.name || "Unknown" }); setPublicProfileUser(null); }}
              handleImgError={handleImgError}
              currentUser={currentUser}
              apiFetch={apiFetch}
              showToast={showToast}
              lightboxPhotos={lightboxPhotos}
              lightboxIdx={lightboxIdx}
              setLightboxPhotos={setLightboxPhotos}
              setLightboxIdx={setLightboxIdx}
            />
          </ScreenErrorBoundary>
        </React.Suspense>
      )}
      <SharePostModal shareTarget={shareTarget} setShareTarget={setShareTarget} shareTargetTrap={shareTargetTrap} showToast={showToast} />
      <EditProfileModal
        showEditProfile={showEditProfile}
        setShowEditProfile={setShowEditProfile}
        editProfileTrap={editProfileTrap}
        editAvatar={editAvatar}
        setEditAvatar={setEditAvatar}
        editAvatarInputRef={editAvatarInputRef}
        editName={editName}
        setEditName={setEditName}
        editBio={editBio}
        setEditBio={setEditBio}
        editLoc={editLoc}
        setEditLoc={setEditLoc}
        editMediaKit={editMediaKit}
        setEditMediaKit={setEditMediaKit}
        editType={editType}
        setEditType={setEditType}
        editCustomTypePending={editCustomTypePending}
        setEditCustomTypePending={setEditCustomTypePending}
        editLooking={editLooking}
        setEditLooking={setEditLooking}
        editNsfw={editNsfw}
        setEditNsfw={setEditNsfw}
        currentUser={currentUser}
        obData={obData}
        handleImgError={handleImgError}
        uploadImage={uploadImage}
        saveProfileEdits={saveProfileEdits}
        showToast={showToast}
      />
      <ShareProfileSheet
        showShareProfile={showShareProfile}
        setShowShareProfile={setShowShareProfile}
        shareProfileTrap={shareProfileTrap}
        authUser={authUser}
        currentUser={currentUser}
        showToast={showToast}
      />
      {showDisclosureModal && disclosureTarget && (
        <DisclosureModal
          responderName={disclosureTarget.name}
          responderId={disclosureTarget.id}
          bookingId={disclosureBookingId}
          existingDisclosure={existingDisclosure}
          onSubmit={async (form) => {
            // Age gate: paid disclosures require verified 18+ identity before proposing
            const hasPayment = form.compensationAmount && form.compensationAmount !== "0" && form.compensationAmount !== "Free" && form.compensationAmount !== "TFP";
            if (hasPayment && !ageVerified) {
              setPendingDisclosureConfirm(null);
              setPendingDisclosureCreate(form as Record<string, unknown>);
              setShowDisclosureModal(false);
              setShowAgeVerification(true);
              return;
            }
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "create-disclosure", ...form, responderId: disclosureTarget.id, bookingId: disclosureBookingId }) });
            const d = await r.json();
            if (d.blocked) { setShowDisclosureModal(false); showToast("Request blocked — violates Musa by WYZ terms"); return; }
            if (d.success) { setShowDisclosureModal(false); showToast("Disclosure sent for review"); }
          }}
          onCancel={() => { setShowDisclosureModal(false); setDisclosureTarget(null); }}
          onConfirm={existingDisclosure ? async (discId) => {
            // Age gate: paid disclosure confirmation requires verified 18+ identity
            const disc = existingDisclosure;
            const compAmount = String(disc.compensation_amount || "");
            const hasPayment = compAmount && compAmount !== "0" && compAmount !== "Free" && compAmount !== "TFP";
            if (hasPayment && !ageVerified) {
              setPendingDisclosureConfirm(discId);
              setShowDisclosureModal(false);
              setShowAgeVerification(true);
              return;
            }
            await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "confirm-disclosure", disclosureId: discId }) });
            setShowDisclosureModal(false); showToast("Disclosure confirmed ✓");
          } : undefined}
        />
      )}
      {showAgeVerification && (
        <AgeVerificationModal
          purpose="age_gate"
          authFetch={authFetch}
          onVerified={async () => {
            setAgeVerified(true);
            setShowAgeVerification(false);
            // Resume the blocked action after verification
            if (pendingDisclosureConfirm) {
              const discId = pendingDisclosureConfirm;
              setPendingDisclosureConfirm(null);
              await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "confirm-disclosure", disclosureId: discId }) });
              showToast("Disclosure confirmed ✓");
            } else if (pendingDisclosureCreate) {
              const form = pendingDisclosureCreate;
              setPendingDisclosureCreate(null);
              const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "create-disclosure", ...form, responderId: disclosureTarget?.id, bookingId: disclosureBookingId }) });
              const d = await r.json();
              if (d.blocked) { showToast("Request blocked — violates Musa by WYZ terms"); return; }
              if (d.success) { showToast("Disclosure sent for review"); }
            }
          }}
          onClose={() => {
            setShowAgeVerification(false);
            setPendingDisclosureConfirm(null);
            setPendingDisclosureCreate(null);
          }}
        />
      )}
      <UpsellModal
        open={upsell !== null}
        onClose={closeUpsell}
        feature={upsell?.feature || ""}
        reason={upsell?.reason || ""}
        icon={upsell?.icon}
        currentUser={currentUser}
        showScreen={showScreen}
      />
      {showSafetyCheckin && (
        <SafetyCheckinModal
          checkins={safetyCheckins}
          safetyProfile={safetyProfile}
          onRespond={async (id, response, shared, reason) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "respond-checkin", checkinId: id, response, sharedWithContact: shared, reason }) });
            if (!r.ok) { showToast("Failed to save response"); return; }
            setSafetyCheckins(prev => prev.map(c => c.id === id ? { ...c, status: response, responded_at: new Date().toISOString() } : c));
          }}
          onSaveSafetyProfile={async (profile) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "save-safety-profile", ...profile }) });
            if (!r.ok) { showToast("Failed to save safety profile"); return; }
            setSafetyProfile(profile); showToast("Safety profile saved");
          }}
          onShareDetails={async (bookingId, method) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "share-safety-details", bookingId, shareMethod: method }) });
            if (!r.ok) { showToast("Failed to share details"); return; }
            showToast("Details shared with trusted contact");
          }}
          onFetchStrikes={async () => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-strikes" }) });
            const d = await r.json();
            return d.strikes || [];
          }}
          onFetchDisclosures={async () => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "get-disclosures" }) });
            const d = await r.json();
            return d.disclosures || [];
          }}
          onAppealStrike={async (strikeId, text) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "appeal-strike", strikeId, appealText: text }) });
            return r.ok;
          }}
          onClose={() => setShowSafetyCheckin(false)}
        />
      )}
      {showPromptBank && (
        <PromptBankModal
          prompts={promptBankData}
          responses={promptResponses}
          onSaveResponse={async (promptId, text, choices) => {
            const r = await authFetch("/api/muse", { method: "POST", body: JSON.stringify({ type: "save-prompt-response", promptId, responseText: text, responseChoices: choices }) });
            const d = await r.json();
            if (!d.success) throw new Error(d.error || "Failed to save");
            setPromptResponses(prev => {
              const existing = prev.findIndex(r => r.prompt_id === promptId);
              const newResp = { id: "new", prompt_id: promptId, response_text: text, response_choices: choices };
              if (existing >= 0) { const copy = [...prev]; copy[existing] = newResp; return copy; }
              return [...prev, newResp];
            });
          }}
          onClose={() => setShowPromptBank(false)}
        />
      )}
      {showReferral && (
        <ReferralPanel onClose={() => setShowReferral(false)} />
      )}
      {showConnect && (
        <ConnectPanel onClose={() => setShowConnect(false)} />
      )}
      {showPaymentHistory && (
        <PaymentHistory userId={authUser?.id || ""} onClose={() => setShowPaymentHistory(false)} />
      )}
      {showDailyLogin && (
        <DailyLoginModal
          name={currentUser.name}
          creativeType={currentUser.type}
          weeklyLogins={weeklyLogins}
          loginStreak={loginStreak}
          onClose={() => setShowDailyLogin(false)}
          onViewQuests={() => { setShowDailyLogin(false); setShowQuests(true); }}
        />
      )}
      {activePageTour && (
        <PageTour
          open
          onClose={() => {
            try { safeSetItem(tourSeenKey(activePageTour), "1"); } catch { console.debug("[muse] tour completion could not be persisted"); }
            setActivePageTour(null);
          }}
          icon={PAGE_TOURS[activePageTour].icon}
          from={PAGE_TOURS[activePageTour].from}
          to={PAGE_TOURS[activePageTour].to}
          slides={PAGE_TOURS[activePageTour].slides}
          orbitCount={PAGE_TOURS[activePageTour].orbitCount}
          sparkCount={PAGE_TOURS[activePageTour].sparkCount}
          ringStyle={PAGE_TOURS[activePageTour].ringStyle}
          ariaLabel={PAGE_TOURS[activePageTour].ariaLabel}
        />
      )}
      <ScreenErrorBoundary name="QuestPanel">
        <QuestPanel
          show={showQuests}
          onClose={() => setShowQuests(false)}
          apiFetch={apiFetch}
          showToast={showToast}
          onClaimablesChange={setClaimableQuests}
          onQuestsChange={handleQuestsChange}
          loginStreak={loginStreak}
          weeklyLogins={weeklyLogins}
        />
      </ScreenErrorBoundary>

      <IncomingCallModal incomingCall={incomingCall} activeCall={activeCall} declineCall={declineCall} acceptCall={acceptCall} />

      {activeCall && (
        <CallOverlay
          call={activeCall}
          onEnd={endCall}
          onVoicemail={leaveVoicemail}
          uploadMedia={uploadMedia}
          recording={!!callRecording}
          peerRecording={callPeerRecording}
          onToggleRecording={() => (callRecording ? stopCallRecording() : startCallRecording())}
          onReport={() => { setReportTarget({ id: activeCall.peerId, type: "user", name: activeCall.peerName }); setShowReport(true); }}
        />
      )}
    </>
  );
}
