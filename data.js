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
     > Text                  a big poster-size pull quote (keep its
                             words to about ten letters or fewer, or
                             they break across lines on a phone)
     -- item                 a smaller bullet under the one above
     **words**               bold, anywhere in a line
     _words_                 italic, anywhere in a line
     ==words==               a highlighter sweep across the words
                             (inside it, [circle]…[/circle], [underline]…[/underline],
                             [squiggle]…[/squiggle] and [double]…[/double] add red pen
                             marks once the highlighter is done)
     {{word|meaning}}        a word students can tap for its meaning
     [label](https://...)    a link (opens in a new tab)
     [label](#/resources)    a link to a page inside the app

   EFFECTS: a line like "::: stack" starts one and a line of just
   ":::" ends it — flip, swap, scripture, hold, light, reveal, typewriter,
   terms, together, type, retype, stack and closing. "::: video YOUTUBE-ID" and
   "::: trinity" stand on one line. README.md ("Effects") shows what
   each one does and which day uses it.

   Two things to avoid inside the backticks: another backtick ( ` ),
   and a dollar sign right before a curly brace ( ${ ). Either one
   breaks the whole file, and the site shows its typo message instead
   of the study. Typed HTML tags (like <p>) show up as plain text, so
   the marks above are the way to format.

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

// How each day is laid out:
//   reflectFirst: true   MAPS comes right after the Read box, before the
//                        study (Days 3-10). Leave it out to teach first.
//   reflectTitle         the heading over the reflection boxes.
//   questions            the Application Question boxes after the study,
//                        one box each. Add  size: "large"  for a tall
//                        box, or  type: "scale"  for a 1-10 slider, with
//                        low  and  high  labels for its ends.
// A reflection or question can also have  question  (a bold, day-specific
// question under the prompt) and  hint  (hidden behind "Need a hint?").

const DAYS = [
  {
    day: 1,
    passage: "1 John 1:1-4",
    topic: "How to Study the Bible",
    speaker: "Seth Peacock",
    words: ["Context", "Is key"],
    study: `
## Making Sense of It
If you haven't done today's reading yet, hit the brakes! Go read 1 John 1:1-4 before you read anything here!
If you have finished those first four verses and you feel totally lost, don't worry about it. In fact, congratulations! You did it! Look, being confused is completely normal. When I first became a Christian I had no idea what any of this meant either. That is why this 2-week Bible study was written. I want to help teach you how to study the Word, and this is your first lesson.
The Bible was written a long, long time ago. Sometimes things the original audience understood perfectly don't make any sense to us at all. But you can figure it out! Today, we are going to learn a super important step in Bible study: Whenever you start a new book of the Bible, always do a little background research.
Why? Because
> CONTEXT IS KEY.
Let me show you what I mean. Not too long ago I walked up to a few students talking with one another, when one girl said, "she completely ate, and left no crumbs." Well, I had to stop the conversation right there… See, back when I was in middle school, those were the words of a bully! These students had to fill ME in on some context:
::: flip "Ate, and left no crumbs."
+ My context
Okay, I'll admit it... I am a certified unc. I was born in the 1900s. And back in the stone ages when I was in middle school, "ate and left no crumbs" would be like calling someone a fatty! I thought this student was being mean!
+ Students' context
As it turns out, "ate and left no crumbs" is a compliment now! I have no idea why. This makes no sense to me. But it is the truth. So, this student was actually talking about how awesome her friend was.
:::
Think about it. The context completely changed how I understood what was happening, and we are only a few decades apart in age... Add a few thousand years, and there will definitely be some confusion. So, if we want to understand what we are reading, we can't just open this Bible up to a random page and walk in halfway through the conversation… We need to _select a text_ (not just a chapter, but a whole book), _figure out the context_, and then _read through the book slowly_. That's how you read the Bible. And wouldn't you know it, that's exactly what we are doing right now!
## Finding the Right Tools
It's easy to get overwhelmed trying to find reliable historical background, but we aren't going to give up! To keep things simple, I want to point you to one fantastic, reliable place to look: The Bible Project.
They have an app, a website, and a YouTube page. And you can use them to find all kinds of information about the context of the Bible. Be sure to check them out.
Today, to keep it super simple, I have the video right here for you. As you watch it, be sure to fill in the reflection questions at the bottom.
::: video l3QkE6nKylM
`,
    reflectTitle: "Context",
    reflections: [
      {
        id: "author",
        label: "Who wrote the book?",
        prompt: "If we don't know for sure, what do we know about this person?",
        hint: "Check the first 40 seconds of the video."
      },
      {
        id: "audience",
        label: "Who was the original audience?",
        prompt: "Is there anything important happening in the community of the original audience that we should be aware of?",
        hint: "Check 0:40-1:00 of the video."
      },
      {
        id: "purpose",
        label: "What was the purpose for writing the book?",
        prompt: "Why did the author want to write it? What was the big idea or message he wanted to communicate?",
        hint: "Check 2:17 of the video."
      }
    ]
  },
  {
    day: 2,
    passage: "1 John 1:5-2:6",
    topic: "What’s the Point of Doing a Bible Study?",
    speaker: null,
    words: ["Word", "Of God"],
    study: `
So, you have just read today's passage (bonus points if you marked up a few verses or phrases that stood out to you!), but what I want to talk about today is this:
> GRACE VS SIN
Specifically, what is the point of doing good things like reading my Bible? Because if God's grace really is SO good, then what's so bad about sin? And if God is ALWAYS faithful to forgive, then why do we need to stop sinning?
If you ever have that thought, be warned: this line of thinking comes straight from Satan's playbook. Thankfully the Bible addresses it many times. Look what Paul says here:
::: scripture Romans 6:1-2
"What shall we say then? Shall we go on sinning so that grace may increase? BY NO MEANS! We are those who have died to sin; how can we live in it any longer?"
:::
In today's reading, John came at it from a different angle. Check out how he builds this helpful image of light and darkness.
::: scripture 1 John 1:5-6
**5** This is the message we have heard from him and declare to you: God is light; in him there is no darkness at all. **6** If we claim to have fellowship with him and yet walk in the darkness, we lie and do not live out the truth.
:::
If you have a pen or a highlighter, that is a verse to mark up! And here is the big takeaway: If you have truly become a Christian, it is because you have tasted the LIGHT of God and come to savor it. So the Christian life is not a list of dos and don'ts, it's a journey of walking further into the light.
::: hold Embrace the light!
Sometimes this is uncomfortable. You might feel exposed and vulnerable before God and your friends | God is not going to turn his back on you.
Sometimes this is scary. All you have ever known is darkness, and change is really scary! | But God is good.
Sometimes the darkness tries to tempt us and lure us back in… | But friend, the light is better than the darkness.
:::
## So, How Do We Draw Nearer to the Light?
There are many spiritual disciplines that can help draw us into the light (check out the [Extra Resources](#/resources) tab for that), but today we are going to wrap up with the most foundational one:
> READING THE BIBLE
The Bible is a TREASURE! We don't read it because it's a chore we have to do. I want you to taste and see the JOY that is found in the Word of God! And since the Bible IS such a treasure, we are going to learn to treasure it well. Pay attention, because starting tomorrow, you will be doing this on your own each day!
`,
    reflectTitle: "MAPS",
    reflections: [
      {
        id: "meditate",
        label: "Meditate",
        prompt: "Mark up your Bible as you read through it. After reading, spend some time reflecting on what it says and means. What stuck out to you, and why?",
        question: "Thinking about 1 John 1:5-6, how would you describe this concept of darkness and light? What makes the light so good? What are the areas of darkness that you feel yourself tempted to run back to?"
      },
      {
        id: "apply",
        label: "Apply",
        prompt: "How does God’s word change the way you live your life? How does this passage transform your thoughts (head), your desires (heart), and/or your actions (hands)?",
        question: "What is your strategy going to be when you are tempted to run back to the darkness? How will you resist the devil and keep your eyes on Jesus?"
      },
      {
        id: "pray",
        label: "Pray",
        prompt: "Write out a prayer, asking the Lord to help you live out what you read and learned today.",
        question: "Write out your prayer to God, asking that he would help you apply this to your life. You don't have to write it out word for word. Feel free to use shorthand and keep what you write brief. Maybe even keep praying and jot down some of the people and things you are praying about. Come back to this list if you need help staying grounded in prayer through the coming day."
      },
      {
        id: "share",
        label: "Share",
        prompt: "Write out how you could share what you learned today with someone in your life.",
        question: "Write down what you could share with a friend. It could be a fellow Christian who you can tell about what God is teaching you, or it could be someone who does not know Jesus and needs to hear about YOUR experience in following Him."
      }
    ]
  },
  {
    day: 3,
    passage: "1 John 2:7-11",
    topic: "The Purpose of Church",
    speaker: null,
    words: ["Family", "Of God"],
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: `
So there is this super old dude named C.S. Lewis. He is a famous Christian, but when he first became a Christian he wouldn't even go to church because he thought the music and the people were annoying. But eventually he realized something super important… He was being superficial! He was so focused on the outward projection that he never stopped to look at the heart of these people. Listen to what he wrote years later.
::: typewriter C.S. Lewis | images/cs-lewis-signature.webp
"When I first became a Christian, about fourteen years ago, I thought that I could do it on my own, by retiring to my room and reading theology [and my Bible], and I wouldn't go to the church . . . I disliked very much their hymns, which I considered to be fifth-rate poems set to sixth-rate music. But as I went on I saw the great merit of it. I came up against different people of quite different outlooks and different education, and then gradually my conceit [my superficial arrogance] just began peeling off. I realized that the hymns (which were still just sixth-rate music) were, nevertheless, being sung with devotion and benefit by an old saint in elastic-side boots in the opposite pew, and then I realized that ==I'm not even fit to clean those boots== [let alone stand beside him and sing praises to our God!]"
:::
C.S. Lewis is saying that it may have taken a while, but he eventually understood **THE purpose of the Church**.
## Community
Here is the thing about C.S. Lewis: I think what he felt is honestly common among new Christians. Maybe it's because of the music, maybe the people, maybe something else… But Satan wants to tempt you into isolating yourself from other Christians. This has been a problem for 2,000 years, and that is why John, all the way back then, wrote what he did in this passage we read today.
Go back and read verses 10-11 one more time. Maybe even mark them up if you haven't yet.
Christian community is so important! But this is not just a warning. We don't go to church because we have to. We go because these are our brothers and sisters in Christ! We build one another up! We spur one another on!
**Worshipping together** on Sundays and Wednesdays is so meaningful!
**Small groups** filled with fellow believers are so powerful!
::: together We are united in worship and study
Even when the music isn't my style
Even if I don't like singing
Even if I'm not dressed the same as the person next to me
Even if we don't all have the same background
Even when we don't have the same interests and hobbies
:::
Our love for CHRIST is what brings us all together, and the unity that we get to experience in His Church is like nothing else in this world.
`,
    questions: [
      { id: "love", label: "In your opinion, what do you think is the difference between the way you have shown love to people in the past and the way Christ has called you to love people as a Christian?" }
    ]
  },
  {
    day: 4,
    passage: "1 John 2:12-17",
    topic: "What Do I Do When I Don’t Feel Like It?",
    speaker: null,
    words: ["Fighting", "Your flesh"],
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: `
The first thing that you need to understand from the outset is this: God and the world are {{mutually exclusive|This means that you can only pick one. You can never have both!}}. It's impossible to mesh them together. You either love God or love the world.
Verse 15 helps us understand this. Go back and read it now!
This verse reminds us that we are constantly going to be tempted to take our eyes off Jesus and allow them to drift back onto meaningless things. We have to resist that temptation!
Check out what verse 16 says. (No, actually go back and read it now.)
I want to break down one key phrase from this verse: "the lust of the flesh."
::: terms
+ LUST
This is not just talking about sexual sin; it's about anything that pulls us away from Jesus. The writer chooses to use this vivid word to help us understand how evil and alluring our desires are for all kinds of sin.
+ FLESH
You need to understand that, even as a Christian — as a new creation in Christ — your mind and your body (AKA your flesh) are still marred by the sin of this world. So you are going to feel yourself pulled toward sin. We have a war happening over our souls: our former _flesh_ vs. the Holy Spirit at work within us.
:::
## Conclusion
Sometimes we will fail. There will be days where, by the power of the Holy Spirit working in you, you will realize that you have gone off course. When those days come, you have to get back on track. But, really, the goal is to stay on track and not go off course. To do this, we have to constantly remind ourselves that JESUS IS BETTER!
Many times, your biggest temptation as a Christian will be to lay off the gas and just coast spiritually. In fact, you may have already experienced that temptation since starting this Bible study. What you will quickly find is that, when you allow yourself to coast spiritually, your eyes WILL quickly drift off of Jesus Christ and onto something else.
So what do I do when I don't feel like it? _I make sure my actions reflect what I KNOW about Jesus, not what I FEEL in my flesh._ I remind myself…
> JESUS. IS. BETTER.
`,
    questions: [
      { id: "temptations", label: "What are some things that tempt you to stray away from Jesus?" },
      { id: "better", label: "How is Jesus better than those things?" }
    ]
  },
  {
    day: 5,
    passage: "1 John 2:18-29",
    topic: "Why Is Life Still Hard?",
    speaker: null,
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: ``,
    questions: [
      { id: "reflection", label: "Now that you've read today's study, what's one specific way you'll put this into practice this week?" }
    ]
  },
  {
    day: 6,
    passage: "1 John 3:1-24",
    topic: "How Do I Deal With Friends Who Think Differently Than Me Now?",
    speaker: null,
    words: ["Redeemed", "Community"],
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: `
When I was reading through this passage today, I underlined a few statements that I thought were very important. Maybe you had some you underlined too! Either way, grab your pen, highlighter, or pencil and follow along with me here. You may just want to mark them up in your Bible too!
## Verse 4: =="Sin is [circle]lawlessness[/circle]"==
John is reminding us, just as he did on Day 2 of our study, that sin is a big deal! We can't miss that!
You may have already noticed this, but just in case — watch how John builds on this idea of sin.
## Verse 6: =="[circle]No one[/circle] [underline]who lives in him[/underline] [squiggle]keeps on sinning.[/squiggle] No one who continues to sin has either seen him or known him"==
Listen, this is not saying that we are perfect. But when you became a Christian, something changed in you. You now have the Holy Spirit inside of you, helping you as you strive toward Jesus. Because, remember, our Christian walk is a journey out of the darkness and into the light.
## Verse 7: =="Do not let [double]anyone[/double] lead you astray"==
As you strive to walk into the light of Jesus, there are going to be people in your life that try to lead you astray. Some will have malicious intentions. Others might actually have good intentions, but they just don't understand what it means to be a Christian and live for Jesus. Even with good intentions, they still might be leading you astray. Because when life gets hard, there are so many counterfeit teachers out there that want you to reject the Gospel for something else. No matter what that thing is, don't let it lead you astray.
## Verse 13: =="[underline]Do not be surprised[/underline]… if the world [circle]hates[/circle] you"==
This is the big culmination of the passage we are reading today. Some of your non-Christian friends will be confused by the way Jesus has changed your life. Others will be frustrated. The reality is that your relationship with some of these friends is going to change. Many of your old friends will become your mission field. But also, like we talked about on Day 3, God is going to give you a new community of friends. That's one of the awesome things about being a part of the church! You have a new community of people who you can draw closer to as you draw closer to the Lord.
`,
    questions: [
      { id: "pursue", label: "Do you have Christians in your life who you need to pursue a deeper friendship with? List them here." },
      { id: "less-time", label: "Are there others who you don't need to spend so much time with? List them here." },
      { id: "one-friend", label: "Thinking about your friends who need Jesus, ask God to help you identify one friend He has uniquely positioned YOU to share Jesus with. Write their name below. Will you commit to praying for them regularly? How do you feel about sharing your faith with that friend?" }
    ]
  },
  {
    day: 7,
    passage: "1 John 4:1-6",
    topic: "God Gave You a Story to Share",
    speaker: null,
    words: ["Sharing", "Your story"],
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: `
Today's passage builds off of something we talked about yesterday: how there are all of these people out there trying to lead you and everyone else astray. There are all kinds of lies being spoken all around you.
::: retype Tap here to fix the mistake
That's why God has positioned Christians **all through the world** to be a voice of truth.
Actually… Let me make myself a little more clear.
That's why God has positioned **YOU** in this world to be a voice of truth!
:::
I'm going to keep it short today, because I want you to spend more time reflecting than reading. I want you to think about YOUR STORY. Because God has done something awesome in YOUR life, and the world needs to know about it!
Yesterday, you identified a friend in your life who God has uniquely positioned you to share Jesus with. One of the best ways to do that is to tell them what Jesus has done in your life. Think about it. This person knows you. They have a front row seat for your story as it plays out. And God has given you an opportunity to help them see behind the scenes — to show them that Jesus is the one that made all the difference.
There is a Christian term for this, and you will hear it from time to time: **Testimony**. This is exactly what we are talking about.
God has given you a story. It's yours to treasure. It's yours to preserve and protect. It's yours to leverage as a bright light in a dark world.
`,
    questions: [
      { id: "story", size: "large", label: "Write out your story. Feel free to keep it short, knowing that you could expound on it in the moment if you were sharing it with someone in person. Consider asking your youth leaders if you'd like help thinking through this." }
    ]
  },
  {
    day: 8,
    passage: "1 John 4:7-5:5",
    topic: "God Is Three. God Is One.",
    speaker: null,
    words: ["The Holy", "Trinity"],
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: `
My goodness, there was tons of good stuff in our reading today! There are so many different ways we could approach this passage. But today, I want to hone in and focus on two specific verses that highlight a thread woven through the whole Bible.
Go back and read 1 John 4:13-14. As you read, underline the three persons of God as they appear: Father, Son, Holy Spirit.
::: trinity
Actually… Let me stop here and acknowledge something:
You may have grown up in church your whole life and you know all of the crazy words we throw around. But if you have not been involved in the church very long, you might be a bit overwhelmed by all of the Christian words you have never heard. (By the way, don't feel ashamed by that! Most of them are not important. And even if they are, there's no pop quiz, I promise.) Here is the deal though: no matter how smart or dumb you feel, today we are all on the same playing field. Because all of us — even your Bible study leaders and pastors — we're all a bit perplexed by this subject.
In fact, just to give you a little behind-the-scenes look at this Bible study, I have spent literally days praying, studying, and meditating on how to articulate this subject in 200 words or less and am hopelessly lost… So I am going to cheat. Do you want to watch a movie instead? I can't hear you, so I'm going to assume that's a yes!
## The Holy Trinity
::: video eAvYmE2YYIU
Listen... If you're still a bit lost, that's okay! This concept of the Trinity takes a lifetime to unpack. But here is why we are talking about this: the triune Godhead, as he has revealed himself in your Bible, is worthy of worship. And my prayer is that as you think about God in all of His confusing, awesome, impossible-to-fully-understand bigness — I pray that it would bring you to worship him more!
The reason we study the Trinity is not to sound smart, and it's not really to share with our unchurched friends either (believe me, your testimony and the Gospel will be much more effective tools for evangelism).
We study, ponder, and meditate on the Trinity as an act of worship. Because the more we comprehend just how incomprehensible He is, the more we stand in awe of God!
And the craziest part is that _this_ incomprehensible God we are studying today knows and loves YOU. Pretty amazing if you ask me.
`,
    questions: [
      { id: "least", label: "Which person of the Trinity do you think about the least? Ponder that person for a few moments. How does understanding this person and work of the triune God deepen your appreciation for the God who saved you?" }
    ]
  },
  {
    day: 9,
    passage: "1 John 5:5-15",
    topic: "God Answers Prayer",
    speaker: null,
    words: ["God", "Hears you"],
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: `
Dear friend,
> GOD. ANSWERS. PRAYER.
(You know what… Let's do it again in case you weren't paying enough attention the first time.)
::: stack
GOD
ANSWERS
PRAYER
:::
I really could do this all day. In fact, let's do it one more time, and maybe even make it a little more personal.
Dear friend,
::: stack
GOD
ANSWERS
**YOUR**
PRAYERS
:::
Do you believe it? I thought I did for a long time, until one day I realized that I actually didn't. Please, learn from my mistakes so you can do better than me.
I was headed home from work and my boss was having a bad day. So, I stopped and prayed for him and texted him to tell him I was praying for him…
Then I suddenly realized that the primary reason I prayed for him was because I thought he would be encouraged to read a stupid text message… and the Holy Spirit began to burn inside of me. Because I was PRAYING — I was interceding on his behalf before the literal God of the universe who is in complete and total control over everything that will come to pass. Oh, and that same God *_let me check my notes from verse 14 real quick_* oh, that's right, He _delights_ in answering the prayers of His people! So much so that we can have confidence that when we go to him earnestly, he will listen!
When I prayed for my boss that night, in my mind the ideal outcome from my prayer was that he would be encouraged by the text I sent him. What a ridiculous aspiration! God is so much bigger than that!
Seriously, go back and read verse 14. Underline it. Bookmark it. Read it slowly. Read over it a couple of times if you need to. Take as much time as you need, because I need you to get this.
Don't fall into the same trap that I fell into. For many years, as a young believer, genuine prayers for me were sparse because I simply never understood the significance of verse 14. I didn't understand that God answers prayers.
## One Final Note
Listen, I don't want to oversimplify it. Prayer is not a magic wand that will give you what you want. And there will be seasons in your life where you feel discouraged because you are praying and it _feels_ like God is not listening. There will be other times where you ask for something, and God does not give you the answer you were hoping for. In all of those situations, it's tough. But don't allow the enemy to harden your heart. You know you have a loving Father who delights in the prayers of his children. He delights in YOU! Sometimes, when you're tempted to stray away because you don't _feel_ it, you have to trust what you _know_ rather than what you _feel_.
::: closing
Dear friend,
God answers prayer.
:::
`,
    questions: [
      { id: "confidence", type: "scale", low: "Not at all", high: "Totally", label: "On a scale from one to ten, how confident do you feel in your ability to pray out loud in front of people without fumbling over your words and feeling embarrassed?" },
      { id: "self-conscious", label: "Does this make you feel self-conscious, even when you are praying privately to the Lord?" },
      { id: "eloquent", label: "Meditating on verse 14: Do you think that God cares how eloquently you speak when you pray to him? Do you think that sounding more put together makes a prayer more powerful?", prompt: "(Spoiler: it doesn't.)" },
      { id: "delights", label: "Meditate on the FACT that God delights in your prayers regardless of how churchy and eloquent they sound, even if you stutter and fumble over every single word! How does this change the way you view prayer?" }
    ]
  },
  {
    day: 10,
    passage: "1 John 5:16-21",
    topic: "Abiding in Christ",
    speaker: "Seth Peacock",
    reflectFirst: true,
    reflectTitle: "MAPS",
    reflections: MAPS_PROMPTS,
    study: ``,
    questions: [
      { id: "reflection", label: "Now that you've read today's study, what's one specific way you'll put this into practice this week?" }
    ]
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
