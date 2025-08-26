export const sampleCampaigns = [
  {
    id: "cmp_001",
    productDescription:
      "Eco-friendly water bottle with temperature indicator and ergonomic design.",
    generatedContent:
      "Stay hydrated sustainably! Our eco bottle keeps drinks at the perfect temperature.",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "Scheduled",
    imageUrl: "",
    activity: [
      { time: Date.now() - 1000 * 60 * 30, text: "Campaign created" },
      { time: Date.now() - 1000 * 60 * 10, text: "Scheduled for posting" },
    ],
  },
  {
    id: "cmp_002",
    productDescription:
      "Wireless earbuds with active noise cancellation and 30-hour battery life.",
    generatedContent:
      "Lose the noise, keep the music. Tap-and-go ANC with marathon battery.",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: "Posted",
    imageUrl: "",
    activity: [
      { time: Date.now() - 1000 * 60 * 60 * 4, text: "Campaign created" },
      { time: Date.now() - 1000 * 60 * 60 * 2, text: "Post published" },
    ],
  },
  {
    id: "cmp_003",
    productDescription:
      "Minimalist leather wallet with RFID protection in multiple colors.",
    generatedContent: "Slim form, maximum security. Tap to see the colorways.",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    status: "Scheduled",
    imageUrl: "",
    activity: [{ time: Date.now() - 1000 * 60 * 15, text: "Campaign created" }],
  },
  {
    id: "cmp_004",
    productDescription:
      "Smart desk lamp with adaptive brightness and wireless charging base.",
    generatedContent: "Bright ideas need smart light. Charge while you work.",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "Failed",
    imageUrl: "",
    activity: [
      {
        time: Date.now() - 1000 * 60 * 60 * 24 * 3,
        text: "Posting failed (API error)",
      },
    ],
  },
  {
    id: "cmp_005",
    productDescription:
      "Organic coffee beans from single-origin farms with chocolatey notes.",
    generatedContent: "Brew better mornings. Limited roast now in stock.",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    status: "Scheduled",
    imageUrl: "",
    activity: [
      { time: Date.now() - 1000 * 60 * 60, text: "Campaign created" },
      { time: Date.now() - 1000 * 60 * 30, text: "Content generated" },
    ],
  },
];

export const sampleAnalytics = {
  totals: {
    impressions: 128_430,
    engagementRate: 4.8,
    reach: 95_210,
    bestPost: "cmp_002",
  },
  engagementOverTime: Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    engagement: Math.floor(100 + Math.random() * 400),
  })),
  performanceByPost: [
    { id: "cmp_001", likes: 220, comments: 34, shares: 12 },
    { id: "cmp_002", likes: 740, comments: 82, shares: 50 },
    { id: "cmp_003", likes: 180, comments: 20, shares: 7 },
    { id: "cmp_004", likes: 40, comments: 7, shares: 2 },
    { id: "cmp_005", likes: 310, comments: 41, shares: 19 },
  ],
  heatmap: Array.from({ length: 7 }).map((_, day) =>
    Array.from({ length: 24 }).map((_, hour) => ({
      day,
      hour,
      value: Math.floor(Math.random() * 10),
    }))
  ),
};
