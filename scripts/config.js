/*
 * Site-wide settings. Everything a non-developer may need to change lives here.
 * Empty strings hide the related UI (e.g. no Calendly URL -> no "Book a call" button).
 */
window.TL_CONFIG = {
  email: "studiotimelinee@gmail.com",
  calendlyUrl: "https://calendly.com/studiotimelinee", // Calendly booking URL (update if your slug differs)
  // Form endpoint for project briefs. Uses FormSubmit to deliver submissions directly to studiotimelinee@gmail.com.
  formEndpoint: "https://formsubmit.co/ajax/studiotimelinee@gmail.com",
  socials: {
    instagram: "https://www.instagram.com/",
    x: "https://x.com/",
    linkedin: "https://www.linkedin.com/",
    youtube: "https://www.youtube.com/",
  },
  // Shown in the About counters. Projects and brands are counted from the portfolio data.
  stats: {
    views: { value: 10, suffix: "M+", label: "Views generated" },
  },
  // Landscape clips (by work id) used for the hero loop and the showreel, in play order.
  showreel: [
    "x-2097001967734366288",
    "x-2039737847545209042",
    "x-2048665954318536792",
    "x-2090514450139009270",
    "x-2028870988386214191",
    "x-2047337199171973293",
    "x-2041073620399669543",
    "x-2044436235918479717",
  ],
};
