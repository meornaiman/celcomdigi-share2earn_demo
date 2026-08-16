/**
 * Configuration for the presenter dashboard.
 *
 * Everything the prototype can show is declared here rather than hard-coded
 * into the page, so a demo never depends on the presenter remembering a URL.
 */

export type TrackId = "share2earn" | "family" | "data";

export interface DemoScreen {
  label: string;
  path: string;
}

export interface DemoPerson {
  id: string;
  name: string;
  role: string;
  accent: string;
}

export interface TrackConfig {
  id: TrackId;
  label: string;
  /** One line naming what this track proves. */
  claim: string;
  left: DemoPerson;
  right: DemoPerson;
  /** Where each phone starts when the track is selected. */
  leftStart: string;
  rightStart: string;
  screens: DemoScreen[];
}

const MUM_OWNER: DemoPerson = {
  id: "u_mum",
  name: "Mum",
  role: "Account owner",
  accent: "#0057D9",
};

const MUM_PRINCIPAL: DemoPerson = {
  id: "u_mum",
  name: "Mum",
  role: "Family account owner",
  accent: "#0057D9",
};

const AINA_HELPER: DemoPerson = {
  id: "u_aina",
  name: "Aina",
  role: "Trusted helper",
  accent: "#FFD400",
};

const AINA_MEMBER: DemoPerson = {
  id: "u_aina",
  name: "Aina",
  role: "Supplementary line",
  accent: "#FFD400",
};

export const TRACKS: Record<TrackId, TrackConfig> = {
  share2earn: {
    id: "share2earn",
    label: "Share2Earn",
    claim: "Help me when I can't finish something digitally.",
    left: MUM_OWNER,
    right: AINA_HELPER,
    leftStart: "/home/",
    rightStart: "/home/",
    screens: [
      { label: "Home", path: "/home/" },
      { label: "Help", path: "/help/" },
      { label: "Roaming task", path: "/task/roaming/" },
      { label: "Bill task", path: "/task/bill/" },
      { label: "Plan task", path: "/task/plan/" },
      { label: "eSIM task", path: "/task/esim/" },
      { label: "Activity", path: "/activity/" },
      { label: "Rewards", path: "/rewards/" },
      { label: "Profile", path: "/profile/" },
    ],
  },
  family: {
    id: "family",
    label: "Family Mobility",
    claim: "Give me autonomy as my relationship with CelcomDigi changes.",
    left: AINA_MEMBER,
    right: MUM_PRINCIPAL,
    leftStart: "/family/",
    rightStart: "/family/",
    screens: [
      { label: "My family", path: "/family/" },
      { label: "Manage my line", path: "/family/manage/" },
      { label: "Independence", path: "/family/independence/" },
      { label: "Identity check", path: "/family/identity/" },
      { label: "Set up account", path: "/family/setup/" },
      { label: "Owner approval", path: "/family/approve/" },
      { label: "Success", path: "/family/success/" },
      { label: "Family data", path: "/family/data/" },
    ],
  },
  data: {
    id: "data",
    label: "Data sharing",
    claim: "Share the family's data without handing over control.",
    left: AINA_MEMBER,
    right: MUM_PRINCIPAL,
    leftStart: "/family/data/",
    rightStart: "/family/data/",
    screens: [
      { label: "Family data", path: "/family/data/" },
      { label: "My family", path: "/family/" },
      { label: "Manage my line", path: "/family/manage/" },
    ],
  },
};

export const TRACK_ORDER: TrackId[] = ["share2earn", "family", "data"];

/**
 * What the prototype covers, for the slide nobody has to build separately.
 * Grouped so a board can see breadth without clicking through every screen.
 */
export const FEATURE_COVERAGE: { group: string; items: string[] }[] = [
  {
    group: "Journeys",
    items: [
      "Trusted help across five task types",
      "Supplementary line to independent account",
      "Shared family data pool",
    ],
  },
  {
    group: "Trust and security",
    items: [
      "Three assurance levels, matched to the action",
      "Task-scoped permissions shown before consent",
      "Owner approval on every account change",
      "Audit log on every state transition",
      "Immediate revocation of trusted access",
    ],
  },
  {
    group: "Product",
    items: [
      "Rewards with monthly cap and anti-abuse",
      "Helper levels and XP",
      "Four exception states, none dead-ending",
      "English and Bahasa Melayu",
      "Installable PWA with offline shell",
      "Admin metrics dashboard",
    ],
  },
];
