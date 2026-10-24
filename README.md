# TimeLine — Video Editing & Creative Studio

A high-performance, cinematic portfolio and intake website for **TimeLine**, a video editing, post-production, and visual design studio led by Jayanth S.

## ✨ Features

- **Interactive Showreel & Video Highlights**: Fluid video playback with custom controls and HTTP 206 range request support.
- **Dynamic Project Filtering**: Filter by Video Editing, Shorts / Reels, Colour & Sound, and Posters & Thumbnails.
- **Client Project Intake**: Interactive intake form sending client briefs directly to `studiotimelinee@gmail.com`.
- **Integrated Scheduling**: 1-click booking via Calendly for 20-minute client discovery calls.
- **Cinematic Animations**: Smooth transitions powered by GSAP and Lenis smooth scrolling.
- **Dark / Light Mode**: Auto-persisted theme switcher with custom cursor styling.

## 🚀 Running Locally

To run the site locally:

```bash
# Start the local server
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **HTML5 & Modern CSS** (Responsive design, custom properties, animations)
- **Vanilla JavaScript** (Modular, dependency-free core)
- **Libraries**: [GSAP](https://greensock.com/gsap/) (ScrollTrigger, SplitText), [Lenis](https://lenis.darkroom.engineering/), [Plyr](https://plyr.io/)
- **Backend / Delivery**: Node.js static server with range-requests; FormSubmit integration for briefs
