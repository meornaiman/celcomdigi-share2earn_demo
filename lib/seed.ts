import type { Database } from "./types";

/**
 * Bumped when the shape changes; old demo data is discarded rather than
 * migrated. Forgetting to bump leaves a stored blob missing a new collection,
 * and the first selector to touch it throws.
 */
export const DB_VERSION = 3;

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
        mobile_number: "012-333 4444",
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
        // Aina is 23, working, and still on a supplementary line under Mum's
        // family account — the persona the Family Mobility journey is built for.
        id: "u_aina",
        name: "Aina",
        mobile_number: "012-111 2222",
        email: "aina@example.my",
        avatar_url: "",
        customer_id: "CD-7729114",
        created_at: ISO(1200),
        accent: "#082B75",
        account_type: "Postpaid",
        plan_name: "Postpaid 5G",
        plan_price: 0,
        data_balance_gb: 18.4,
      },
      {
        id: "u_ayah",
        name: "Ayah",
        mobile_number: "012-555 6666",
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
        mobile_number: "012-777 8888",
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

    family_groups: [
      {
        id: "fam_1",
        principal_user_id: "u_mum",
        monthly_total: 145,
        // 120GB shared, 110GB handed out, 10GB still unallocated.
        shared_pool_gb: 120,
        members: [
          {
            user_id: "u_mum",
            msisdn: "012-333 4444",
            role: "PRINCIPAL",
            plan_name: "Postpaid 65",
            bill_contribution: 65,
            data_used_gb: 22.5,
            data_quota_gb: 65,
            data_limit_gb: 40,
          },
          {
            // Aina is near her limit — the reason she has to ask.
            user_id: "u_aina",
            msisdn: "012-111 2222",
            role: "SUPPLEMENTARY",
            plan_name: "Postpaid 5G",
            bill_contribution: 40,
            data_used_gb: 44.2,
            data_quota_gb: 50,
            data_limit_gb: 50,
          },
          {
            user_id: "u_ayah",
            msisdn: "012-555 6666",
            role: "SUPPLEMENTARY",
            plan_name: "Postpaid 40",
            bill_contribution: 40,
            data_used_gb: 8.2,
            data_quota_gb: 20,
            data_limit_gb: 20,
          },
        ],
      },
    ],

    transfer_requests: [],
    data_requests: [],

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
