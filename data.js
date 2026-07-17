/* ============================================================
   FIRST 10 DAYS — content file
   ------------------------------------------------------------
   This is the ONLY file you should need to touch to update
   text, add videos, or finish unwritten sections. Everything
   here is plain data — no code logic lives in this file.

   HOW TO ADD A VIDEO:
   Change videoId from null to the video's YouTube ID, in quotes.
   Example: for https://www.youtube.com/watch?v=dQw4w9WgXcQ
   the videoId is:  "dQw4w9WgXcQ"
   (For YouTube Shorts: https://www.youtube.com/shorts/XXXXXXXX
   the ID is the XXXXXXXX part.)

   IMPORTANT: only copy the part of the URL BEFORE any "?" —
   links often have extra tracking text after a "?si=" that is
   NOT part of the ID and should be left out.
   Example: https://youtube.com/shorts/CTgMaBdATBo?si=rjQWhkI...
   becomes:  videoId: "CTgMaBdATBo",
   (with the quote marks kept, and nothing after the ID)

   A quick gut-check before saving: every videoId should be
   either the word null, or text inside "quote marks" — never
   bare letters/numbers with no quotes. A mistake here can make
   the ENTIRE site go blank, not just one day, since this file
   holds every day's content.

   HOW TO FINISH A DAY'S CONTENT:
   Replace any "Content coming soon." placeholder text with
   your real writing. You can use basic HTML tags like <p>,
   <strong>, <em>, and <a href="..."> inside these strings.
   ============================================================ */

// Reusable MAPS reflection prompts (Meditate / Apply / Pray / Share).
// Used on every day except Day 1, which has its own intro questions.
const MAPS_PROMPTS = [
  {
    id: "meditate",
    label: "Meditate",
    prompt: "After reading the Word, spend some time reflecting on what it says and means. What stuck out to you, and why?"
  },
  {
    id: "apply",
    label: "Apply",
    prompt: "How does God\u2019s word change the way you live your life? How does this passage transform your thoughts (head), your desires (heart), and/or your actions (hands)?"
  },
  {
    id: "pray",
    label: "Pray",
    prompt: "Write out a prayer, asking the Lord to help you live out what you read and learned today."
  },
  {
    id: "share",
    label: "Share",
    prompt: "Write out how you could share what you learned today with someone in your life."
  }
];

// Note: each day has its own "reflectionQuestion" below (after the MAPS
// prompts), independent from every other day. Edit the "prompt" text for
// a given day to ask something specific to that day's video — changing
// one day's question will NOT affect any other day.

const DAYS = [
  {
    day: 1,
    passage: "1 John 1:1-4",
    topic: "How to Study the Bible",
    speaker: "Seth Peacock",
    videoId: "CTgMaBdATBo",
    intro: "<p>Content coming soon.</p>",
    reflections: [
      { id: "author", label: "Who wrote the book?", prompt: "" },
      { id: "audience", label: "Who was the original audience?", prompt: "" },
      { id: "purpose", label: "What was the purpose for writing the book?", prompt: "" }
    ],
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 2,
    passage: "1 John 1:5-2:6",
    topic: "What\u2019s the Point of Doing a Bible Study?",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 3,
    passage: "1 John 2:7-11",
    topic: "The Purpose of Church",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 4,
    passage: "1 John 2:12-17",
    topic: "What Do I Do When I Don\u2019t Feel Like It?",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 5,
    passage: "1 John 2:18-29",
    topic: "Why Is Life Still Hard?",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 6,
    passage: "1 John 3:1-24",
    topic: "How Do I Deal With Friends Who Think Differently Than Me Now?",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 7,
    passage: "1 John 4:1-6",
    topic: "Sharing Your Story",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 8,
    passage: "1 John 4:7-5:5",
    topic: "Joy, Hope, and Peace of God",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 9,
    passage: "1 John 5:6-15",
    topic: "The Power of Prayer",
    speaker: null,
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  },
  {
    day: 10,
    passage: "1 John 5:16-21",
    topic: "Abiding in Christ",
    speaker: "Seth Peacock",
    videoId: null,
    intro: "<p>Content coming soon.</p>",
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you’ve watched today’s video, what’s one specific way you’ll put this into practice this week?"
    }
  }
];

const RESOURCES = [
  {
    slug: "maps-bible-study-method",
    title: "MAPS Bible Study Method",
    body: "<p>Download the guide below.</p>",
    pdf: "resources/MAPS-GUIDE.pdf"
  },
  {
    slug: "what-is-the-gospel",
    title: "What is the Gospel?",
    body: "<p>Content coming soon.</p>"
  },
  {
    slug: "what-is-the-trinity",
    title: "What is the Trinity?",
    body: "<p>Content coming soon.</p>"
  },
  {
    slug: "christianity-and-social-media",
    title: "Christianity and Social Media",
    body: "<p>Content coming soon.</p>"
  },
  {
    slug: "gender-and-sexuality",
    title: "Gender and Sexuality",
    body: "<p>Content coming soon.</p>"
  },
  {
    slug: "bible-study-tools",
    title: "Bible Study Tools",
    body: "<p>Olive Tree Bible App</p><p>Bible Project App / YouTube videos</p>"
  },
  {
    slug: "spiritual-disciplines",
    title: "Spiritual Disciplines",
    body: "<p>Content coming soon.</p>"
  }
];
