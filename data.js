/* ============================================================
   FIRST 10 DAYS — content file
   ------------------------------------------------------------
   This is the ONLY file you should need to touch to update the
   study. Everything here is plain data — no code logic lives in
   this file.

   WRITING A DAY'S STUDY:
   Each day has a `study` field. Write it between the two backtick
   marks ( ` ) — it can run as many lines as you like. Each line of
   text becomes its own paragraph (blank lines are optional), and a
   few simple marks at the start of a line add formatting:

     ## Heading              a section heading
     * item   or   - item    a bullet point
     1. item                 a numbered list
     > Text                  a big poster-size pull quote
     **words**               bold, anywhere in a line
     [label](https://...)    a link (opens in a new tab)
     [label](#/resources)    a link to a page inside the app

   Two things to avoid inside the backticks: another backtick ( ` ),
   and a dollar sign right before a curly brace ( ${ ). Either one
   cuts the text off. Typed HTML tags (like <p>) show up as plain
   text, so the marks above are the way to format.

   The `reading` field is the "Read" box at the top of a day. Leave
   it out and the day says "Open your Bible to [passage] and read it
   through." Write your own the same way as `study`.

   THE GIANT WORDS:
   HOME_WORDS (below) are the big sliding words on the home page —
   one row per word. Each day can have its own with `words`, like:
     words: ["Light", "Walk"],
   Type them in normal case; the app makes them capitals. A day
   without `words` uses HOME_WORDS.

   BOOK_NAME is the book shown across the top of the home page.

   THE WELCOME VIDEO:
   WELCOME_VIDEO_ID (below) is the video behind the "Welcome video"
   button on the home page — it's the only video in the app now.
   Set it to the YouTube ID in quotes, or null for none. For
   https://www.youtube.com/watch?v=dQw4w9WgXcQ the ID is
   "dQw4w9WgXcQ"; for https://www.youtube.com/shorts/XXXXXXXX it's
   the XXXXXXXX part. Only copy the part BEFORE any "?" — links
   often add tracking text after "?si=" that isn't part of the ID.

   A quick gut-check before saving: every piece of text sits inside
   quote marks or backticks, and every entry ends with a comma. If
   this file has a typo, the site shows a message saying so instead
   of the study.

   NOTE ON "speaker": this field is intentionally NOT shown
   anywhere on the live site. It's kept here only for your own
   reference. If you want it removed entirely that's fine, but
   it isn't a bug that it's missing from the page.
   ============================================================ */

// The video behind the "Welcome video" button on the home page.
const WELCOME_VIDEO_ID = null;

// The book across the top of the home page.
const BOOK_NAME = "1 John";

// The big sliding words on the home page, one row each.
const HOME_WORDS = ["Light", "Love"];

// The Google Sheet behind the leader dashboard. The Student Progress
// page reads the sheet directly now, so this link is only offered as a
// backup if that page can't load. Set it to null to hide it entirely.
const PROGRESS_SHEET_URL = "https://docs.google.com/spreadsheets/d/1zABmtpJDszh-znI6sj-QYeBx6c0gApEx8o9wTPE9Qro/edit?usp=sharing";

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
    prompt: "How does God’s word change the way you live your life? How does this passage transform your thoughts (head), your desires (heart), and/or your actions (hands)?"
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
// a given day to ask something specific to that day's study — changing
// one day's question will NOT affect any other day.

const DAYS = [
  {
    day: 1,
    passage: "1 John 1:1-4",
    topic: "How to Study the Bible",
    speaker: "Seth Peacock",
    words: ["Context", "Is key"],
    reading: `If you haven't done today's reading yet, hit the brakes! Go read 1 John 1:1-4 before you go any further. You wouldn't try to make a proper three-bean chili without the beans, and you shouldn't start a Bible study without the Scripture!`,
    study: `
## Making Sense of It
If you finished those first four verses and your brain feels a bit like a can of mashed refried beans, congratulations—you are completely normal. When I first became a Christian, I had no idea what John was talking about either.
The Bible was written a long, long time ago. Sometimes, things the original audience understood perfectly can seem totally foreign to us. But we can figure it out! Today, we are learning a super important step in Bible study: Whenever you start a new book of the Bible, always do a little background research.
Why? Because
> CONTEXT IS KEY.
Think about it like reading a random letter you found on the street. If you don't know who wrote it or who they were writing to, it's easy to misunderstand it. For example, imagine you see a note left on the floor between classes: "She completely ate, and left no crumbs."
* Today: That is a high compliment! I have no idea what she was doing, but whatever it was, she sure did an incredible job!
* Back in my teenage years: It meant someone literally devoured all the snacks. This was an insult.
The time frame, the author, and the audience totally change how we understand the message. So before we dive deeper into 1 John, we need to gather our context.
## Finding the Right Tools
It's easy to get overwhelmed trying to find reliable historical background, but we aren't going to give up. To keep things simple, I want to point you to one fantastic, reliable place to look: The Bible Project.
They are basically the magical beanstalk of biblical context. They have an app, a website, and a YouTube channel, and they produce incredible overview videos for every single book of the Bible.
Your Assignment For Today: Head over to [The Bible Project](https://bibleproject.com/videos/1-3-john/) and watch their overview video for 1-3 John. As you watch, take some notes and answer these three crucial questions:
1. Who wrote the book?
2. Who was the original audience?
3. What was the purpose for writing the book?
Figure those out, write down your answers, and we'll see you tomorrow for the next step, Big Dog!
`,
    reflections: [
      { id: "author", label: "Who wrote the book?", prompt: "" },
      { id: "audience", label: "Who was the original audience?", prompt: "" },
      { id: "purpose", label: "What was the purpose for writing the book?", prompt: "" }
    ],
    reflectionQuestion: null
  },
  {
    day: 2,
    passage: "1 John 1:5-2:6",
    topic: "What’s the Point of Doing a Bible Study?",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    // Reflection Question turned off for Day 2 — set back to an object
    // (see other days for the shape) to bring it back.
    reflectionQuestion: null
  },
  {
    day: 3,
    passage: "1 John 2:7-11",
    topic: "The Purpose of Church",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 4,
    passage: "1 John 2:12-17",
    topic: "What Do I Do When I Don’t Feel Like It?",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 5,
    passage: "1 John 2:18-29",
    topic: "Why Is Life Still Hard?",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 6,
    passage: "1 John 3:1-24",
    topic: "How Do I Deal With Friends Who Think Differently Than Me Now?",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 7,
    passage: "1 John 4:1-6",
    topic: "Sharing Your Story",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 8,
    passage: "1 John 4:7-5:5",
    topic: "Joy, Hope, and Peace of God",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 9,
    passage: "1 John 5:6-15",
    topic: "The Power of Prayer",
    speaker: null,
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
    }
  },
  {
    day: 10,
    passage: "1 John 5:16-21",
    topic: "Abiding in Christ",
    speaker: "Seth Peacock",
    study: ``,
    reflections: MAPS_PROMPTS,
    reflectionQuestion: {
      id: "reflection",
      label: "Reflection Question",
      prompt: "Now that you've read today's study, what's one specific way you'll put this into practice this week?"
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
  },
  {
    slug: "leader-dashboard",
    title: "Leader Dashboard",
    body: "<p>See who's completed which days.</p><p><a class=\"pdf-link\" href=\"#/progress\">View student progress</a></p>"
  }
];
