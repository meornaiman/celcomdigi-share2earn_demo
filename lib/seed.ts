import type { Database } from "./types";

export const DB_VERSION = 1;

const ISO = (daysAgo: number) =>
  new Date(Date.UTC(2026, 4, 1) - daysAgo * 86400000).toISOString();

/**
 * Demo accounts from DESIGN.md §17, plus two extra trusted contacts so the
 * helper picker shows a realistic list rather than a single name.
 */
export function seedDatabase(): Database {
  return {
    version: DB_VERSION,
    users: [
      {
        id: "u_mum",
        name: "Mum",
        mobile_number: "0123 333 444",
        email: "mum@example.my",
        avatar_url: "",
        customer_id: "CD-8841203",
        created_at: ISO(900),
        accent: "#0057D9",
        account_type: "Postpaid",
        plan_name: "Postpaid 65",
        plan_price: 65,
        data_balance_gb: 42.5,
      },
      {
        id: "u_aina",
        name: "Aina",
        mobile_number: "0123 111 222",
        email: "aina@example.my",
        avatar_url: "",
        customer_id: "CD-7729114",
        created_at: ISO(1200),
        accent: "#082B75",
        account_type: "Postpaid",
        plan_name: "Postpaid 100",
        plan_price: 100,
        data_balance_gb: 88.0,
      },
      {
        id: "u_ayah",
        name: "Ayah",
        mobile_number: "0123 555 666",
        email: "ayah@example.my",
        avatar_url: "",
        customer_id: "CD-5510882",
        created_at: ISO(1500),
        accent: "#1976F3",
        account_type: "Postpaid",
        plan_name: "Postpaid 40",
        plan_price: 40,
        data_balance_gb: 12.0,
      },
      {
        id: "u_faiz",
        name: "Faiz",
        mobile_number: "0123 777 888",
        email: "faiz@example.my",
        avatar_url: "",
        customer_id: "CD-3390457",
        created_at: ISO(400),
        accent: "#32C85A",
        account_type: "Prepaid",
        plan_name: "Prepaid Freedom",
        plan_price: 35,
        data_balance_gb: 6.2,
      },
    ],

    trusted_relationships: [
      {
        id: "tr_1",
        owner_user_id: "u_mum",
        trusted_user_id: "u_aina",
        relationship_label: "Daughter",
        status: "ACTIVE",
        created_at: ISO(300),
      },
      {
        id: "tr_2",
        owner_user_id: "u_mum",
        trusted_user_id: "u_ayah",
        relationship_label: "Husband",
        status: "ACTIVE",
        created_at: ISO(300),
      },
      {
        id: "tr_3",
        owner_user_id: "u_mum",
        trusted_user_id: "u_faiz",
        relationship_label: "Neighbour",
        status: "ACTIVE",
        created_at: ISO(120),
      },
      {
        id: "tr_4",
        owner_user_id: "u_aina",
        trusted_user_id: "u_mum",
        relationship_label: "Mum",
        status: "ACTIVE",
        created_at: ISO(300),
      },
      {
        id: "tr_5",
        owner_user_id: "u_aina",
        trusted_user_id: "u_faiz",
        relationship_label: "Friend",
        status: "ACTIVE",
        created_at: ISO(90),
      },
      {
        id: "tr_6",
        owner_user_id: "u_ayah",
        trusted_user_id: "u_aina",
        relationship_label: "Daughter",
        status: "ACTIVE",
        created_at: ISO(300),
      },
      {
        id: "tr_7",
        owner_user_id: "u_faiz",
        trusted_user_id: "u_aina",
        relationship_label: "Friend",
        status: "ACTIVE",
        created_at: ISO(90),
      },
    ],

    help_requests: [],
    task_options: [],
    recommendations: [],
    notifications: [],
    rewards: [],

    helper_progress: [
      // Aina is "Digital Buddy Level 2" with 620 of the 1000 XP toward Level 3
      // (DESIGN.md §17), which is 1620 XP on the cumulative scale.
      { user_id: "u_aina", successful_assists: 12, xp: 1620, level: 2 },
      { user_id: "u_mum", successful_assists: 1, xp: 100, level: 1 },
      { user_id: "u_ayah", successful_assists: 0, xp: 0, level: 1 },
      { user_id: "u_faiz", successful_assists: 3, xp: 450, level: 1 },
    ],

    audit_log: [],
    events: [],
  };
}
