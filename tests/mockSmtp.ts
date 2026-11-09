import net from 'node:net';

/**
 * A mail server that accepts everything and keeps it, for the tests.
 *
 * Just enough SMTP for nodemailer: greeting, EHLO, AUTH PLAIN, MAIL, RCPT,
 * DATA, QUIT. No TLS is offered, so nodemailer sends in the clear on
 * localhost. Nothing leaves the machine.
 */
export interface Captured {
  from: string;
  to: string[];
  subject: string;
  raw: string;
}

export async function startMockSmtp(port: number) {
  const mails: Captured[] = [];

  const server = net.createServer((socket) => {
    let buffer = '';
    let inData = false;
    let current: { from: string; to: string[]; data: string } = { from: '', to: [], data: '' };
    const say = (line: string) => socket.write(line + '\r\n');
    say('220 mock ESMTP');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      while (true) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          current.data += buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          // Long headers are folded onto continuation lines; unfold first.
          const headers = current.data.split(/\r\n\r\n/)[0].replace(/\r\n[ \t]+/g, ' ');
          const subject = /^Subject: (.*)$/im.exec(headers)?.[1]?.trim() || '';
          mails.push({ from: current.from, to: current.to, subject: decodeSubject(subject), raw: current.data });
          current = { from: '', to: [], data: '' };
          say('250 queued');
          continue;
        }
        const nl = buffer.indexOf('\r\n');
        if (nl === -1) return;
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') {
          socket.write('250-mock\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
        } else if (cmd === 'AUTH') {
          say('235 ok');
        } else if (cmd === 'MAIL') {
          current.from = /<([^>]*)>/.exec(line)?.[1] || '';
          say('250 ok');
        } else if (cmd === 'RCPT') {
          current.to.push(/<([^>]*)>/.exec(line)?.[1] || '');
          say('250 ok');
        } else if (cmd === 'DATA') {
          inData = true;
          say('354 go on');
        } else if (cmd === 'QUIT') {
          say('221 bye');
          socket.end();
        } else {
          say('250 ok');
        }
      }
    });
    socket.on('error', () => { /* client went away */ });
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    mails,
    env: { SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port), SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'kcc@test.local', SMTP_SECURE: 'false' },
    /** Mail arrives just after the response; give it a moment. */
    async waitFor(match: (m: Captured) => boolean, ms = 3000) {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        const hit = mails.find(match);
        if (hit) return hit;
        await new Promise((r) => setTimeout(r, 50));
      }
      return undefined;
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** "=?UTF-8?Q?...?=" and "=?UTF-8?B?...?=" headers, as nodemailer writes them. */
function decodeSubject(s: string): string {
  // Whitespace between two encoded words is not part of the text (RFC 2047).
  return s.replace(/\?=\s+=\?/g, '?==?').replace(/=\?UTF-8\?([QB])\?([^?]*)\?=/gi, (_, enc, text) =>
    enc.toUpperCase() === 'B'
      ? Buffer.from(text, 'base64').toString('utf8')
      : Buffer.from(
          text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_m: string, h: string) => `%${h}`),
          'utf8'
        ).toString('utf8').replace(/%([0-9A-F]{2})/gi, '%$1')
          .replace(/(%[0-9A-F]{2})+/gi, (m: string) => decodeURIComponent(m))
  ).replace(/\s+/g, ' ');
}
