# Khinkali Chess: put it online (about 10 minutes)

You need Node.js installed (nodejs.org, LTS) and your Netlify account.

1. Unzip this folder somewhere, e.g. Desktop/khinkali-chess.
2. Open a terminal in that folder:
   - Windows: open the folder, click the address bar, type `cmd`, press Enter.
   - Mac: right-click the folder → New Terminal at Folder.
3. Run these one at a time:

   npm install
   npx netlify-cli login
   npx netlify-cli deploy --prod

4. When it asks:
   - "Create & configure a new project" → yes
   - Team → your team
   - Project name → khinkali-chess (or anything free)
   - Publish directory → just press Enter (it's already set to `.`)

5. It prints your link, like https://khinkali-chess.netlify.app. That's the app.

## Install it on your phone
- iPhone: open the link in Safari → Share → Add to Home Screen.
- Android: open in Chrome → ⋮ → Add to Home screen (or "Install app").

## Play your friend
Create a game → tap "Send invite" → pick iMessage. He taps the link, types his name, joins. No accounts.

## Updating later
Replace index.html (or anything else) in this folder and run `npx netlify-cli deploy --prod` again.

## Good to know
- Anyone with the link can open the app, so only share it with people you play.
- Netlify's drag-and-drop deploy won't work here: the live game sync is a Netlify function, and only the CLI (or a Git deploy) uploads it.
- If your phone's home-screen app ever asks your name again, tap "I'm Ioane" to keep your stats.
