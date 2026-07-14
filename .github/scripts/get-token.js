import { google } from 'googleapis';
import readline from 'readline';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Pokreni sa: GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node get-token.js');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost');

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  prompt: 'consent',
});

console.log('\nOtvori ovaj URL u browseru:\n');
console.log(url);
console.log('\nNakon što odobriš pristup, browser će pokušati da otvori localhost URL.');
console.log('Iz tog URL-a kopiraj vrednost parametra "code=" i unesi ovde:\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Code: ', async (code) => {
  rl.close();
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\nRefresh token (sačuvaj ovo u GitHub Secrets kao GMAIL_REFRESH_TOKEN):\n');
  console.log(tokens.refresh_token);
});
