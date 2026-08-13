# App Store Submission Kit

Everything needed to take Then from TestFlight to the App Store. Copy-paste the
metadata below into App Store Connect, follow the screenshot pipeline, and submit.
Already done as of July 6, 2026: privacy policy URL, support URL, privacy nutrition
labels. Metadata below is current for **1.0.1** (invite links, findability,
rebuilt Your Year).

---

## 1. Metadata (copy-paste)

**Name** (30 chars max)

> ⚠ The live listing still reads **"Then (8f9a79)"** — the placeholder suffix
> assigned when the record was created, because plain "Then" was unavailable.
> It is publicly visible on the store page. The name field is also the strongest
> keyword signal Apple indexes, so it should carry positioning rather than a hash.
>
> **Change it at:** App Store Connect → Apps → Then → **App Information** in the
> left sidebar (NOT the version page) → *Localizable Information* → **Name**.
> The change saves against the editable version and goes live when 1.0.1 is
> approved. The new name must be unique across the whole App Store, so a bare
> "Then" will be rejected — keep a qualifier.

```
Then: Quiet Photo Sharing
```

Alternatives if that one is taken: `Then — A Slower Photo Share`,
`Then: Photos With Your People`.

**Subtitle** (30 chars max — exactly 30)

```
A slower kind of photo sharing
```

**Promotional text** (170 chars max — the ONLY field editable without review)

Because it needs no review, this field should carry what is *new* or seasonal;
the description carries the evergreen pitch. Do not let it restate the
description, which is what the pre-1.0.1 copy did.

```
New: invite a friend with one link and you're connected the moment they join. No requests, no waiting. Just your people, one photo at a time.
```

Swap-ins, ready to paste when the moment fits (all verified under 170):

- *December / Your Year season:* `Every moment you share this year builds a private Yearbook only you can read. Invite your people with one link and start yours.`
- *Contrast angle:* `No algorithm. No follower counts. No ads. Just one photo at a time, shared with the friends you've approved — and now an invite link that connects you instantly.`

**Description** (4000 chars max)

```
Then is a quiet photo-sharing app for people who miss what sharing used to feel like.

One photo, one moment. No video, no reels, no stories — just the picture, a short caption on the front, and a private reflection on the back that only you can read. Once a moment is shared it can be deleted, but never edited. Like a real polaroid.

YOUR PEOPLE, NOT AN AUDIENCE
Nobody sees your moments without your yes. A follow is a request you approve; an invite you send connects you both when your friend accepts. Either way, both people chose it. What you share reaches the friends you actually let in — never the public, never an algorithm's guess at who should see it. No follower counts, no public tallies, no pressure to perform.

BRING YOUR PEOPLE WITH YOU
Send one invite link and you're connected the moment your friend joins — no request to send, nothing to approve. Friends can also look you up by name or handle, so the people who know you can find you. Your photos still wait for your approval, always, and you can stay unlisted whenever you'd rather.

A FEED THAT ENDS
Your feed is simply the latest moments from your people, in order. When you've seen them, you're done. Nothing is ranked, promoted, or engineered to keep you scrolling.

QUIET NOTES
Friends can leave a note on a moment — a small, private conversation around a photo, not a comment section. Notifications are gentle and every kind can be turned off.

WANDER, IF YOU WANT
An optional, chronological way to come across moments from people who've chosen to be discoverable. No trending page, no suggestions. Off by default.

YOUR YEAR, KEPT
Every moment you share builds a private year-in-review — your photos, your captions, your notes to yourself, organized month by month. Look back at any year, any time. Never shared, never ranked. Free, always. A printed edition, someday.

WHAT THEN DOESN'T DO
- No ads, ever
- No subscriptions or paywalls
- No selling your data
- No algorithmic feed
- No follower counts or engagement metrics
- No AI training on your photos

Then is for the friends you'd actually hand a photograph to.
```

**Every claim above was verified against the code on 2026-08-13** — Wander
defaults off (`functions/index.js` `appearInWander: false`), moments are
immutable (`firestore.rules` `allow update: if false` on `/moments`), the back
reflection is author-only in the rules, and no purchase/StoreKit code exists.
**Re-verify before editing any of it.** The pre-1.0.1 copy said "Every follow on
Then is a request you approve", which invite links made false the day they
shipped — a privacy promise in the listing that the code no longer matched. If a
feature ever changes who can see what, this description is part of the change.

**Keywords** (100 chars max, comma-separated — 97 chars)

```
polaroid,photo,sharing,private,friends,film,memories,journal,scrapbook,quiet,no ads,instant,camera
```

**If the app is renamed, rework these.** Apple already indexes every word in the
app name, so under "Then: Quiet Photo Sharing" the terms `photo`, `sharing` and
`quiet` become dead weight. Dropping them frees ~21 characters for terms the
listing can't otherwise rank on:

```
polaroid,private,friends,film,memories,journal,scrapbook,no ads,instant,camera,invite,close friends
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

**What's New (version 1.0.1)** — 1.0.0 shipped without OTA updates, so this is the
first release carrying roughly a dozen fixes made after it was built, plus invite
links, findability, and the rebuilt Your Year. In App Store Connect this needs a
**new 1.0.1 version page**; the 1.0 page is closed.

```
Invite links are here. Send one link and you and your friend are connected the moment they join — no request to send, nothing to approve.

You can also now be found by name or handle in Friends, so people who know you can actually reach you. Your moments still require your approval, always — and you can turn findability off any time in Settings.

Your Year is rebuilt: pick any year, see your private back-of-card reflections alongside each photo, and find every moment you dated that year, complete and in order.

Plus a long list of fixes. The heart and "..." menu now respond on every moment, the app-icon badge clears properly, notification taps open reliably, photo tones are richer and less hazy, and the whole app loads quicker and quieter.
```

The findability paragraph is deliberate: new accounts default to findable as of
1.0.1, and a privacy-relevant default that changes should be stated plainly in
release notes rather than discovered later.

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

**Verify before every submission:** the notes claim the demo account has an
approved friend, so a reviewer signs in to a populated feed. If that is no longer
true they land on an empty app, which is exactly the shape of the 2.1 rejections
this app already took twice. Confirm it, don't assume it.

1. Approve the follow request from "Then Review" in Jake's app (Friends tab) -
   this puts Jake's real moments in the reviewer's feed.
2. Optional: post 2-3 moments from the demo account (one with a back note) so
   its own Roll/Your Year are non-empty.

Rotate the demo password after each review passes; it gets pasted into chats and
tickets and should not be long-lived.

**Review Notes (paste into the notes field)**

```
Then is a private photo-sharing app: users share single photos ("moments") with followers they explicitly approve.

The demo account is pre-connected to a friend, so the Home feed shows real content on sign-in. To see discovery, open the Wander tab (opt-in public moments). To post: camera tab -> choose a photo -> "Develop & share".

New in 1.0.1: invite links. Friends tab -> the envelope icon mints a link (app.munitor.ai/then/invite/CODE) that connects both people as approved friends on redemption. Tapping such a link opens the app directly; "Have an invite code?" on the Friends tab accepts a code by hand.

User-generated content safeguards: every profile and moment has Report and Block actions (block removes the relationship in both directions and hides all content). Moderation reports go to a private queue reviewed by the developer. Support contact: jake@munitor.ai.

No account is required to view the marketing site; an account is required for all in-app content because all content is private-by-default.
```

**Release settings** — the three toggles at the bottom of the version page:

| Setting | Choose | Why |
|---|---|---|
| App Store Version Release | **Manually release this version** | Approval and launch stay decoupled, so TestFlight can be re-verified before the public gets it. |
| Phased Release | **Release to all users immediately** | Phased exists to limit blast radius across a large install base. With a handful of users stuck on a buggy build, staging the fix over 7 days is pure delay. |
| Reset Summary Rating | **Keep existing rating** | Irreversible, and there are no ratings to reset. Never take an irreversible action for zero gain. |

---

## 4. Screenshots

**Required sizes are per display class, and ASC rejects anything else.** The
1.0.1 version page asked for these two slots:

| Slot | Accepted portrait sizes | Generate with |
|---|---|---|
| iPhone 6.5"/6.7" | 1242×2688 or **1284×2778** | `--size=1284x2778` |
| iPad 12.9"/13" | 2048×2732 or 2064×2752 | `--size=2048x2732` |

The 6.9" size (1320×2868) is the pipeline's default but was **not** accepted on
this version page — always read the slot's own dimension list rather than
assuming, since it varies by app record and by year.

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

### Pipeline A — compose framed shots from raw captures

AirDrop the raw screenshots to `C:\Users\jakef\Downloads\then-shots\`, then:

```powershell
python scripts/appstore-marketing.py C:\Users\jakef\Downloads\then-shots --size=1284x2778
```

This mounts each capture as a **polaroid on the app's paper background** — serif
headline, handwritten terracotta sub-caption, tilted card with a warm shadow —
instead of a bare screen grab. Captions, ordering and source filenames live in
the `SHOTS` list at the top of the script. Every layout constant scales off the
canvas width, so any `--size` renders natively sharp rather than resizing a
finished image; always generate at the target size instead of scaling after.

### Pipeline B — conform already-finished images

For artwork made elsewhere (Figma, an image generator) that just needs to fit:

```powershell
python scripts/appstore-format.py <folder> --size=1284x2778
python scripts/appstore-format.py <folder> --size=2048x2732
```

Within 2% of the target aspect it scales-and-crops (invisible); otherwise it
scales to fit and centers on the brand paper. That matters for iPad: a 9:16
composition on a 3:4 canvas gets wide side margins, but since these designs
already sit on the same paper colour the seam is invisible. It warns loudly when
a source is smaller than the target and will upscale soft — **heed that**, since
images pasted through a chat window arrive at roughly a quarter resolution.

(`scripts/appstore-screenshots.py` predates both and only letterboxes to
1320×2868. Kept for that one size; prefer the two above.)

---

## 5. Final submission checklist

- [ ] **App name fixed** — "Then (8f9a79)" is live and public; change it under
      App Information, not the version page (section 1)
- [ ] **Build 24 attached** to the **1.0.1** version page (1.0 is released and closed —
      a new version page is required, not a new build on the old one)
- [ ] Demo account connected and populated, and the claim in Review Notes re-verified (section 3)
- [ ] Screenshots uploaded to **both** slots, iPhone and iPad (section 4)
- [ ] Metadata pasted: subtitle, promo text, description, keywords, URLs, categories (section 1)
- [ ] What's New filled in (section 1)
- [ ] Age rating questionnaire completed (section 2)
- [ ] App Review sign-in info + notes filled (section 3)
- [ ] Three release settings chosen (section 3)
- [ ] Submit for Review

Typical first-review turnaround: 24–48 hours. If rejected, the reason appears
in Resolution Center — fix or clarify, resubmit, no penalty. After approval,
press Release when ready; the store listing goes live within a few hours.
