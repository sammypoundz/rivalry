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

export const contestants: Contestant[] = [
  {
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
    rank: 1,
    prize: 50000,
    votingEndsAt:
      Date.now() + 2 * 24 * 3600 * 1000 + 7 * 3600 * 1000 + 42 * 60 * 1000,
  },
  {
    id: 2,
    number: 7,
    name: "Zainab Bello",
    state: "Abuja, Nigeria",
    age: 22,
    occupation: "Medical Student",
    bio: "Zainab is a final-year medical student who founded a rural health outreach program. She is competing to fund mobile clinics for northern communities.",
    heroImage:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=600&auto=format&fit=crop",
    ],
    votes: 18320,
    voteGoal: 25000,
    rank: 2,
    prize: 50000,
    votingEndsAt:
      Date.now() + 2 * 24 * 3600 * 1000 + 7 * 3600 * 1000 + 42 * 60 * 1000,
  },
  {
    id: 3,
    number: 21,
    name: "Tunde Adeyemi",
    state: "Ibadan, Nigeria",
    age: 26,
    occupation: "Tech Founder",
    bio: "Tunde built an ed-tech startup teaching coding to public school students. He is on a mission to make digital literacy a right, not a privilege.",
    heroImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop",
    ],
    votes: 15980,
    voteGoal: 25000,
    rank: 3,
    prize: 50000,
    votingEndsAt:
      Date.now() + 2 * 24 * 3600 * 1000 + 7 * 3600 * 1000 + 42 * 60 * 1000,
  },
  {
    id: 4,
    number: 3,
    name: "Ngozi Eze",
    state: "Enugu, Nigeria",
    age: 23,
    occupation: "Fashion Designer",
    bio: "Ngozi blends Igbo heritage with modern couture, employing over 40 local artisans. Winning would mean scaling her atelier across West Africa.",
    heroImage:
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?q=80&w=1200&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517365830460-955ce3ccd263?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop",
    ],
    votes: 12760,
    voteGoal: 25000,
    rank: 4,
    prize: 50000,
    votingEndsAt:
      Date.now() + 2 * 24 * 3600 * 1000 + 7 * 3600 * 1000 + 42 * 60 * 1000,
  },
];

export interface Contest {
  id: number;
  title: string;
  tagline: string;
  category: string;
  coverImage: string;
  endsAt: number; // epoch ms
  status: "voting-live" | "upcoming" | "ended";
  contestantIds: number[];
  totalVotes: number;
  rewards: { position: string; amount: number; perk: string }[];
}

export const contests: Contest[] = [
  {
    id: 1,
    title: "Face of Rivalry 2025",
    tagline: "The ultimate crown. One winner takes it all.",
    category: "Pageant",
    coverImage:
      "https://images.unsplash.com/photo-1516450360452-931468278214?q=80&w=1200&auto=format&fit=crop",
    endsAt:
      Date.now() + 2 * 24 * 3600 * 1000 + 7 * 3600 * 1000 + 42 * 60 * 1000,
    status: "voting-live",
    contestantIds: [1, 2, 3, 4],
    totalVotes: 67547,
    rewards: [
      { position: "1st Place", amount: 5000000, perk: "₦5M cash + brand ambassador deal" },
      { position: "2nd Place", amount: 2000000, perk: "₦2M cash + magazine feature" },
      { position: "3rd Place", amount: 1000000, perk: "₦1M cash + wardrobe grant" },
    ],
  },
  {
    id: 2,
    title: "Rising Star Challenge",
    tagline: "Fresh faces. Fierce competition. Big break.",
    category: "Talent",
    coverImage:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop",
    endsAt: Date.now() + 9 * 24 * 3600 * 1000,
    status: "voting-live",
    contestantIds: [2, 3, 4],
    totalVotes: 47060,
    rewards: [
      { position: "1st Place", amount: 2500000, perk: "₦2.5M cash + mentorship program" },
      { position: "2nd Place", amount: 1200000, perk: "₦1.2M cash + studio session" },
      { position: "3rd Place", amount: 600000, perk: "₦600K cash + headshot package" },
    ],
  },
  {
    id: 3,
    title: "Style Icon Awards",
    tagline: "Fashion-forward. Tradition-meets-couture showdown.",
    category: "Fashion",
    coverImage:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=1200&auto=format&fit=crop",
    endsAt: Date.now() + 16 * 24 * 3600 * 1000,
    status: "upcoming",
    contestantIds: [1, 4],
    totalVotes: 0,
    rewards: [
      { position: "1st Place", amount: 3000000, perk: "₦3M cash + runway contract" },
      { position: "2nd Place", amount: 1500000, perk: "₦1.5M cash + lookbook shoot" },
    ],
  },
];

export const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

// Back-compat export used by the profile view
export const contestant = contestants[0];

export const supporters: Supporter[] = [
  { id: 1, name: "Chidi Oke", votes: 4200, badge: "Diamond", initials: "CO" },
  { id: 2, name: "Zainab Bello", votes: 3250, badge: "Gold", initials: "ZB" },
  { id: 3, name: "Tunde Adeyemi", votes: 2100, badge: "Gold", initials: "TA" },
  { id: 4, name: "Ngozi Eze", votes: 1750, badge: "Silver", initials: "NE" },
];
