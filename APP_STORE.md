# App Store Submission Kit

Everything needed to take Then from TestFlight to the App Store. Copy-paste the
metadata below into App Store Connect (Apps → Then → 1.0 Prepare for Submission),
follow the screenshot pipeline, and submit. Already done as of July 6, 2026:
privacy policy URL, support URL, privacy nutrition labels, build 23 uploaded.

---

## 1. Metadata (copy-paste)

**Name** (30 chars max)

```
Then
```

**Subtitle** (30 chars max — exactly 30)

```
A slower kind of photo sharing
```

**Promotional text** (170 chars max — editable anytime without review)

```
One photo, one moment, shared only with the friends you've approved. No algorithm, no follower counts, no ads. Like a polaroid — deleted maybe, revised never.
```

**Description** (4000 chars max)

```
Then is a quiet photo-sharing app for people who miss what sharing used to feel like.

One photo, one moment. No video, no reels, no stories — just the picture, a short caption on the front, and a private reflection on the back that only you can read. Once a moment is shared it can be deleted, but never edited. Like a real polaroid.

YOUR PEOPLE, NOT AN AUDIENCE
Every follow on Then is a request you approve. What you share reaches the friends you actually let in — never the public, never an algorithm's guess at who should see it. No follower counts, no public like tallies, no pressure to perform.

A FEED THAT ENDS
Your feed is simply the latest moments from your people, in order. When you've seen them, you're done. Nothing is ranked, promoted, or engineered to keep you scrolling.

QUIET NOTES
Friends can leave a note on a moment — a small, private conversation around a photo, not a comment section. Notifications are gentle and every kind can be turned off.

WANDER, IF YOU WANT
An optional, chronological way to come across moments from people who've chosen to be discoverable. No trending page, no suggestions. Off by default.

YOUR YEAR, KEPT
Every moment you share builds a private year-in-review — your photos, your captions, your notes to yourself, organized month by month. Never shared, never ranked. Free, always. A printed edition, someday.

WHAT THEN DOESN'T DO
- No ads, ever
- No selling your data
- No algorithmic feed
- No follower counts or engagement metrics
- No AI training on your photos

Then is for the friends you'd actually hand a photograph to.
```

**Keywords** (100 chars max, comma-separated — 97 chars)

```
polaroid,photo,sharing,private,friends,film,memories,journal,scrapbook,quiet,no ads,instant,camera
```

**URLs**

| Field | Value |
|---|---|
| Support URL | `https://app.munitor.ai/then/support` |
| Marketing URL (optional) | `https://app.munitor.ai/then` |
| Privacy Policy URL | `https://app.munitor.ai/then/privacy` (already set) |

**Category**

- Primary: **Photo & Video**
- Secondary: **Social Networking**

**What's New (version 1.0)**

```
Then's first release. One photo, one moment, shared with the friends you've approved — and nothing else.
```

---

## 2. Age rating questionnaire

Answer **None** to every content-frequency question (violence, sexual content,
profanity, drugs, horror, gambling, contests). Then:

- Unrestricted Web Access: **No**
- Gambling: **No**
- User-generated content questions: answer truthfully **Yes** where asked —
  Then has photo/text UGC. The required safeguards Apple looks for are already
  in the app: report user, block user (removes relationships both ways), and a
  support contact. Mention these in Review Notes (below).

Expected resulting rating: **4+ or 12+** depending on how the UGC branch
resolves — accept whatever the questionnaire computes.

---

## 3. App Review Information

**Demo account** — CREATED July 6, 2026: `review@munitor.ai`, display name
"Then Review", handle `@thenreview` (password is not stored in this repo - it
lives in App Store Connect → App Review Information → Sign-In Information).

Remaining setup:

1. Approve the follow request from "Then Review" in Jake's app (Friends tab) -
   this puts Jake's real moments in the reviewer's feed.
2. Optional: post 2-3 moments from the demo account (one with a back note) so
   its own Roll/Your Year are non-empty.

**Review Notes (paste into the notes field)**

```
Then is a private photo-sharing app: users share single photos ("moments") with followers they explicitly approve.

The demo account is pre-connected to one friend, so the Home feed shows real content on sign-in. To see discovery, open the Wander tab (opt-in public moments). To post: camera tab -> choose a photo -> "Develop & share".

User-generated content safeguards: every profile and moment has Report and Block actions (block removes the relationship in both directions and hides all content). Moderation reports go to a private queue reviewed by the developer. Support contact: jake@munitor.ai.

No account is required to view the marketing site; an account is required for all in-app content because all content is private-by-default.
```

**Version Release**: choose **Manually release this version** (approval and
launch stay decoupled; release when ready).

---

## 4. Screenshots

App Store Connect needs one portrait set for the **6.9" display** (1320×2868);
it auto-scales for smaller devices.

**Shot list** — take these on an iPhone running the current TestFlight build,
signed into an account with good-looking content (Lauren's family accounts have
real moments; or stage the demo account with 4–5 strong photos):

1. **Home feed** — two polaroid cards visible, warm and full. The hero shot.
2. **Moment detail** — front of a card with a note or two below it.
3. **New moment** — compose screen with a photo picked and the Photo Tone row visible.
4. **Your Year** — the 2026 recap with the fanned cover polaroids.
5. **Friends** — the requests/keeping-up-with view (crop/avoid real emails).
6. *(Optional)* Sign-in screen — "see your people, not the algorithm."

Avoid: personal email addresses, notification-center overlays, low-battery
indicator if you care (nobody was ever rejected for battery level).

**Pipeline** — AirDrop/transfer the raw screenshots to
`C:\Users\jakef\Downloads\then-shots\` (any folder), then:

```powershell
python scripts/appstore-screenshots.py C:\Users\jakef\Downloads\then-shots
```

Upload everything from the generated `appstore\` subfolder to the 6.9" slot in
App Store Connect. The script resizes any modern iPhone screenshot to exactly
1320×2868 (letterboxing onto the app's paper color only if the aspect ratio is
unusual).

---

## 5. Final submission checklist

- [ ] Demo account created, connected, populated (section 3)
- [ ] Screenshots uploaded (section 4)
- [ ] Metadata pasted: subtitle, promo text, description, keywords, URLs, categories (section 1)
- [ ] What's New filled in
- [ ] Age rating questionnaire completed (section 2)
- [ ] App Review sign-in info + notes filled (section 3)
- [ ] Version Release set to Manual
- [ ] Build **23** (or later) selected on the version page
- [ ] Submit for Review

Typical first-review turnaround: 24–48 hours. If rejected, the reason appears
in Resolution Center — fix or clarify, resubmit, no penalty. After approval,
press Release when ready; the store listing goes live within a few hours.
