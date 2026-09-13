# Yin Yang Creative/Muse Duality - Complete Implementation Blueprint

## Objective
Implement a comprehensive role-based duality system where **Muses** (industry-facing: hiring, booking, creative direction) and **Creatives** (talent-facing: getting hired, performing, creating) have distinct, specialized experiences while sharing a unified foundation.

## Current State Analysis
- Existing: `viewerSide()` returns `"industry"` or `"creative"` based on `type` field
- Current types: 40+ creative types (Photographer, Director, Model, etc.) mapped to "creative"
- 6 industry types (Casting Director, Art Buyer, Producer, etc.) mapped to "industry"
- `audience` field exists in onboarding but underutilized
- Single profile rendering for all users via `PublicProfileScreen.tsx`

## Phase 1: Enhanced Role System Foundation

### 1.1 Core Role Types (src/lib/role.ts - REPLACE)
```typescript
// Muses (Industry-facing) - those who hire, book, direct, produce
export const MUSE_TYPES = new Set([
  // Direct Hiring/Booking
  "Casting Director", "Art Buyer", "Fine Art Agent", "Producer",
  "Creative Director", "Brand", "Agency", "Talent Agent", "Booking Agent",
  "Creative Recruiter", "HR / Creative Hiring", "Studio Executive",
  
  // Creative Direction & Production
  "Creative Director", "Art Director", "Design Director", "Content Director",
  "Video Producer", "Film Producer", "Executive Producer", "Line Producer",
  "Showrunner", "Creative Producer", "Brand Manager", "Marketing Director",
  
  // Industry Leadership
  "Studio Owner", "Agency Owner", "Production Company Owner",
  "Creative Studio Founder", "Record Label Executive", "Publisher",
  "Gallery Owner", "Curator", "Creative Consultant",
  
  // Specialized Industry
  "Music Supervisor", "Sync Agent", "Licensing Manager",
  "Fashion Director", "Editorial Director", "Photo Editor",
  "Video Editor (Lead)", "Post Producer", "VFX Supervisor"
]);

// Creatives (Talent-facing) - those who get hired, perform, create
export const CREATIVE_TYPES = new Set([
  // Performance & On-Camera
  "Actor", "Model", "Voice Actor", "Dancer", "Performer", "Influencer",
  "Content Creator", "Streamer", "Host", "Presenter", "Spokesperson",
  
  // Visual Creation
  "Photographer", "Videographer", "Cinematographer", "Director",
  "Camera Operator", "Drone Pilot", "FPV Pilot", "Steadicam Operator",
  
  // Audio & Music
  "Musician", "Singer", "Composer", "Producer (Music)", "Audio Engineer",
  "Sound Designer", "Voice Over Artist", "DJ", "Beat Maker",
  
  // Post-Production & Technical
  "Editor", "Colorist", "VFX Artist", "Motion Designer", "Animator",
  "3D Artist", "Retoucher", "Post Producer", "Finishing Artist",
  
  // Design & Creative Craft
  "Designer", "Graphic Designer", "UI/UX Designer", "Art Director (Hands-on)",
  "Illustrator", "Concept Artist", "Storyboard Artist", "Set Designer",
  "Costume Designer", "Makeup Artist", "Hair Stylist", "Wardrobe Stylist",
  "Prop Master", "Production Designer",
  
  // Writing & Narrative
  "Writer", "Screenwriter", "Copywriter", "Content Writer", "Journalist",
  "Script Supervisor", "Story Editor", "Creative Writer",
  
  // Creative Support
  "Production Assistant", "Production Coordinator", "Location Manager",
  "Casting Assistant", "Talent Manager", "Creative Assistant"
]);

export type MuseRole = "muse" | "creative";

export function isMuseType(type?: string | null): boolean {
  return MUSE_TYPES.has(String(type || "").trim());
}

export function isCreativeType(type?: string | null): boolean {
  return CREATIVE_TYPES.has(String(type || "").trim());
}

export function getMuseRole(profile?: { audience?: string | null; type?: string | null } | null): MuseRole {
  const a = String(profile?.audience || "").trim().toLowerCase();
  if (a === "muse" || a === "creative") return a as MuseRole;
  
  const t = String(profile?.type || "").trim();
  if (isMuseType(t)) return "muse";
  if (isCreativeType(t)) return "creative";
  
  // Default to creative for backward compatibility
  return "creative";
}

export function getViewerSide(profile?: { audience?: string | null; type?: string | null } | null): "industry" | "creative" {
  // Legacy compatibility - industry = muse, creative = creative
  const role = getMuseRole(profile);
  return role === "muse" ? "industry" : "creative";
}

// Role-specific capabilities and feature flags
export const ROLE_CAPABILITIES = {
  muse: {
    canPostBriefs: true,
    canHireBook: true,
    canViewAnalytics: true,
    canManageTeams: true,
    canAccessIndustryTools: true,
    canPostJobs: true,
    canReviewPortfolios: true,
    canManageBudgets: true,
    defaultTabs: ["discover", "briefs", "network", "teams", "analytics"],
    profileSections: ["portfolio", "briefs-posted", "team", "reviews-received", "hiring-history"],
    dashboardWidgets: ["active-briefs", "applications", "team-performance", "budget-tracking", "industry-insights"]
  },
  creative: {
    canApplyToBriefs: true,
    canShowcasePortfolio: true,
    canReceiveBookings: true,
    canTrackGigs: true,
    canAccessCreativeTools: true,
    canManageAvailability: true,
    canReceiveReviews: true,
    defaultTabs: ["discover", "portfolio", "gigs", "calendar", "growth"],
    profileSections: ["portfolio", "reel", "skills", "availability", "reviews", "collaborations"],
    dashboardWidgets: ["upcoming-gigs", "portfolio-views", "applications", "earnings", "skill-growth"]
  }
} as const;

export function getRoleCapabilities(role: MuseRole) {
  return ROLE_CAPABILITIES[role];
}
```

### 1.2 Role Context Provider (src/components/RoleContext.tsx - NEW)
```typescript
"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { getMuseRole, getRoleCapabilities, MuseRole } from "@/lib/role";

interface RoleContextValue {
  currentRole: MuseRole;
  capabilities: ReturnType<typeof getRoleCapabilities>;
  setRole: (role: MuseRole) => void;
  isMuse: boolean;
  isCreative: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children, initialRole }: { children: ReactNode; initialRole?: MuseRole }) {
  const [currentRole, setCurrentRole] = useState<MuseRole>(initialRole || "creative");
  
  const capabilities = useMemo(() => getRoleCapabilities(currentRole), [currentRole]);
  const isMuse = currentRole === "muse";
  const isCreative = currentRole === "creative";
  
  return (
    <RoleContext.Provider value={{ currentRole, capabilities, setRole: setCurrentRole, isMuse, isCreative }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

// Role-specific hook for components
export function useRoleSpecific<T>(museValue: T, creativeValue: T): T {
  const { currentRole } = useRole();
  return currentRole === "muse" ? museValue : creativeValue;
}
```

### 1.3 User Profile Role Persistence (src/hooks/useRoleProfile.ts - NEW)
```typescript
"use client";

import { useEffect, useState } from "react";
import { getMuseRole, MuseRole } from "@/lib/role";

export function useRoleProfile(currentUser: any) {
  const [role, setRole] = useState<MuseRole>("creative");
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      const detectedRole = getMuseRole({
        audience: currentUser.audience,
        type: currentUser.type
      });
      setRole(detectedRole);
    }
    setIsLoaded(true);
  }, [currentUser?.audience, currentUser?.type]);
  
  const switchRole = (newRole: MuseRole) => {
    setRole(newRole);
    // Persist to localStorage for session
    localStorage.setItem("muse_preferred_role", newRole);
    // Optionally sync to server
  };
  
  return { role, switchRole, isLoaded };
}
```

---

## Phase 2: Role-Specific UI Components

### 2.1 Muse-Specific Components

#### MuseDashboard.tsx (src/screens/MuseDashboard.tsx - NEW)
- Active briefs management
- Applications review pipeline
- Team collaboration hub
- Budget & project tracking
- Industry insights & trends

#### MuseProfile.tsx (src/screens/MuseProfile.tsx - NEW)
- Company/brand showcase
- Posted briefs history
- Team members & roles
- Hiring reviews & ratings
- Industry credentials & verifications

#### BriefManagement.tsx (src/components/BriefManagement.tsx - NEW)
- Create/edit briefs with industry templates
- Application review workflow
- Candidate comparison tools
- Budget allocation tracker
- Timeline & milestone management

#### IndustryInbox.tsx (src/components/IndustryInbox.tsx - NEW)
- Separate messaging for industry communications
- Brief-related threads
- Contract & offer management
- Payment & invoice tracking

### 2.2 Creative-Specific Components

#### CreativeDashboard.tsx (src/screens/CreativeDashboard.tsx - NEW)
- Upcoming gigs & bookings
- Portfolio performance analytics
- Application tracking
- Availability calendar
- Skill development progress

#### CreativeProfile.tsx (src/screens/CreativeProfile.tsx - NEW)
- Portfolio/reel showcase (primary)
- Skills & specializations
- Availability & rates
- Client reviews & testimonials
- Collaboration history

#### GigTracker.tsx (src/components/GigTracker.tsx - NEW)
- Application status pipeline
- Booking confirmations
- Schedule & logistics
- Payment tracking
- Post-gig reviews

#### CreativeTools.tsx (src/components/CreativeTools.tsx - NEW)
- Portfolio builder with templates
- Rate calculator
- Contract templates
- Invoice generator
- Tax helper

---

## Phase 3: Professional Role-Specific Tools & Workflows

### 3.1 Muse Tools (Industry-Facing)

#### 3.1.1 Brief Builder Pro
- Industry-standard brief templates
- Budget breakdown builder
- Requirement checklist
- Legal/compliance checkboxes
- Team collaboration on briefs

#### 3.1.2 Candidate Evaluation Suite
- Side-by-side portfolio comparison
- Skill matching algorithm
- Availability checking
- Rate negotiation tools
- Reference checking workflow

#### 3.1.3 Project Management Hub
- Multi-project dashboard
- Team task assignment
- Timeline visualization
- Budget vs actual tracking
- Client communication log

#### 3.1.4 Industry Analytics
- Hiring funnel analytics
- Talent pool insights
- Market rate benchmarks
- Diversity & inclusion metrics
- ROI tracking

### 3.2 Creative Tools (Talent-Facing)

#### 3.2.1 Portfolio Studio Pro
- Multi-format portfolio (images, video, audio, 3D)
- Industry-specific templates
- SEO-optimized public profiles
- Private client-sharing links
- Version control & history

#### 3.2.2 Audition & Application Suite
- One-click brief applications
- Custom cover letter builder
- Rate proposal calculator
- Availability conflict checker
- Application status tracking

#### 3.2.3 Booking & Schedule Manager
- Calendar integration (Google, Outlook, Apple)
- Conflict detection
- Travel & logistics planner
- Day-of checklist generator
- Post-wrap documentation

#### 3.2.4 Business Management
- Invoice generator (industry-standard formats)
- Expense tracker
- Tax estimation (1099/W-2)
- Contract review checklist
- Client CRM lite

---

## Phase 4: Cross-Role Integration & Shared Foundation

### 4.1 Unified Search & Discovery
- Role-aware filtering (Muses see talent, Creatives see opportunities)
- Mutual match algorithm
- Saved searches & alerts
- Advanced filters per role

### 4.2 Universal Messaging
- Role-contextual conversations
- Brief-linked threads
- File sharing with permissions
- Calendar integration
- Video call integration

### 4.3 Shared Professional Features
- Verification system (both roles)
- Review system (bidirectional)
- Payment escrow
- Dispute resolution
- Legal document templates

### 4.4 Community Features (Both Roles)
- Industry forums (role-specific sections)
- Educational content
- Networking events
- Mentorship program
- Peer groups

---

## Phase 5: Role-Aware Onboarding & Navigation

### 5.1 Onboarding Flow (src/screens/OnboardScreen.tsx - ENHANCE)
- Role selection as first step
- Role-specific profile setup
- Role-specific tutorial
- Feature discovery per role

### 5.2 Navigation System
- Role-specific bottom nav / sidebar
- Quick-switch role toggle (for dual-role users)
- Contextual shortcuts
- Notification preferences per role

### 5.3 Settings & Preferences
- Role-specific settings sections
- Notification granularity per role
- Privacy controls per role
- Data export per role

---

## Phase 6: Testing & Validation

### 6.1 Unit Tests
- Role detection logic
- Capability flags
- Component rendering per role
- Data persistence

### 6.2 Integration Tests
- Cross-role interactions
- Brief application flow
- Booking workflow
- Payment flow

### 6.3 E2E Tests
- Complete Muse journey
- Complete Creative journey
- Dual-role user journey
- Admin moderation

### 6.4 Visual Regression
- Role-specific UI states
- Responsive layouts
- Theme variants
- Animation consistency

---

## File Structure Changes

### New Files
```
src/
├── lib/
│   └── role.ts                    # REPLACED - enhanced role system
├── components/
│   ├── RoleContext.tsx            # NEW - role context provider
│   ├── MuseBadge.tsx              # NEW - muse role indicator
│   ├── CreativeBadge.tsx          # NEW - creative role indicator
│   ├── RoleSwitcher.tsx           # NEW - role toggle component
│   ├── BriefManagement.tsx        # NEW - muse brief tools
│   ├── IndustryInbox.tsx          # NEW - muse messaging
│   ├── GigTracker.tsx             # NEW - creative gig tools
│   ├── CreativeTools.tsx          # NEW - creative business tools
│   └── RoleSpecificWrapper.tsx    # NEW - conditional rendering
├── screens/
│   ├── MuseDashboard.tsx          # NEW - muse home
│   ├── MuseProfile.tsx            # NEW - muse profile
│   ├── CreativeDashboard.tsx      # NEW - creative home
│   ├── CreativeProfile.tsx        # NEW - creative profile
│   ├── OnboardScreen.tsx          # ENHANCED - role-aware onboarding
│   └── SettingsScreen.tsx         # ENHANCED - role-specific settings
├── hooks/
│   ├── useRoleProfile.ts          # NEW - role persistence
│   ├── useMuseTools.ts            # NEW - muse-specific hooks
│   └── useCreativeTools.ts        # NEW - creative-specific hooks
└── types/
    └── role-types.ts              # NEW - shared type definitions
```

### Modified Files
```
src/
├── app/(muse)/muse/page.tsx       # Role-aware routing & rendering
├── screens/
│   ├── DiscoverScreen.tsx         # Role-aware discovery
│   ├── MusesScreen.tsx            # Role-aware connections
│   ├── NetworkScreen.tsx          # Role-aware networking
│   ├── ProfileScreen.tsx          # Role-aware self-profile
│   └── PublicProfileScreen.tsx    # Role-aware public profiles
├── components/
│   ├── Nav.tsx                    # Role-aware navigation
│   └── MatchCard.tsx              # Role-aware match display
```

---

## Implementation Order & Dependencies

### Parallelizable Groups
```
Group A (Foundation - Sequential):
  1.1 → 1.2 → 1.3

Group B (UI Components - Parallel after Group A):
  2.1 (Muse)     2.2 (Creative)

Group C (Tools - Parallel after Group B):
  3.1 (Muse)     3.2 (Creative)

Group D (Integration - After Group C):
  4.1 → 4.2 → 4.3 → 4.4

Group E (Onboarding - After Group A):
  5.1 → 5.2 → 5.3

Group F (Testing - After all):
  6.1 → 6.2 → 6.3 → 6.4
```

---

## Verification Commands
```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Build
npm run build

# Visual regression
npm run test:visual
```

---

## Exit Criteria
- [ ] All role detection logic tested and verified
- [ ] Muse dashboard fully functional with all tools
- [ ] Creative dashboard fully functional with all tools
- [ ] Cross-role interactions work seamlessly
- [ ] Onboarding correctly assigns and teaches role
- [ ] Navigation adapts to current role
- [ ] All existing tests pass
- [ ] New tests achieve >90% coverage for role system
- [ ] Visual regression tests pass
- [ ] Performance benchmarks met
- [ ] Handover documentation complete