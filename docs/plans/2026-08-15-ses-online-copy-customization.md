# SES Online Copy Customization Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** Create an independent public duplicate of the SES landing page with the requested contact, copy, price-card, and thank-you page changes.

**Architecture:** The project serves static HTML through `dist/boot.js`; therefore `index.html` and `dist/index.html` must remain in sync. The lead form will redirect to a standalone `thanks.html` after a successful server response.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner.

---

### Task 1: Verify required public-page content

**Files:**
- Create: `tests/site-content.test.js`
- Test: `tests/site-content.test.js`

**Step 1: Write the failing test**

Assert that the source and served landing pages contain the supplied phone, email, offer and price-card text; assert that the thank-you page exists and the form redirects to it after a successful submission.

**Step 2: Run test — confirm it fails**

Command: `node --test tests/site-content.test.js`

Expected: FAIL because the thank-you page and redirect do not yet exist.

### Task 2: Add thank-you flow

**Files:**
- Create: `thanks.html`
- Create: `dist/thanks.html`
- Modify: `index.html`
- Modify: `dist/index.html`

**Step 1: Implement minimal changes**

Create a white standalone page with the specified centered confirmation message. Redirect the successful form submission to `/thanks.html`; keep all requested contact and copy replacements intact in both served and source HTML.

**Step 2: Run tests — confirm they pass**

Command: `node --test tests/site-content.test.js && npm run check && npm run build`

Expected: all checks pass.

### Task 3: Publish duplicate repository

**Files:**
- Modify: repository history only

**Step 1: Commit and push**

Command: `git add . && git commit -m "feat: customize SES landing page copy" && git push origin main`

**Step 2: Verify remote**

Command: `git ls-remote --heads origin main`

Expected: the remote `main` head matches the local commit.
