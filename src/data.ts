export interface Contestant {
  id: number;
  number: number;
  name: string;
  state: string;
  age: number;
  occupation: string;
  bio: string;
  heroImage: string;
  gallery: string[];
  votes: number;
  voteGoal: number;
  rank: number;
  prize: number;
  votingEndsAt: number; // epoch ms
}

export interface Supporter {
  id: number;
  name: string;
  votes: number;
  badge: "Diamond" | "Gold" | "Silver" | "Rising";
  initials: string;
}

export const contestant: Contestant = {
  id: 1,
  number: 12,
  name: "Amara Okafor",
  state: "Lagos, Nigeria",
  age: 24,
  occupation: "Architect & Model",
  bio: "Amara is a visionary architect turned pageant contestant, passionate about sustainable design and youth empowerment. She believes beauty is a platform for change — building classrooms across underserved communities, one keynote at a time.",
  heroImage:
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1200&auto=format&fit=crop",
  gallery: [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&auto=format&fit=crop",
  ],
  votes: 20487,
  voteGoal: 25000,
  rank: 3,
  prize: 50000,
  votingEndsAt:
    Date.now() + 2 * 24 * 3600 * 1000 + 7 * 3600 * 1000 + 42 * 60 * 1000,
};

export const supporters: Supporter[] = [
  { id: 1, name: "Chidi Oke", votes: 4200, badge: "Diamond", initials: "CO" },
  { id: 2, name: "Zainab Bello", votes: 3250, badge: "Gold", initials: "ZB" },
  { id: 3, name: "Tunde Adeyemi", votes: 2100, badge: "Gold", initials: "TA" },
  { id: 4, name: "Ngozi Eze", votes: 1750, badge: "Silver", initials: "NE" },
];
