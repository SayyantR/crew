// Crew demo server: serves the click-through and runs the agents behind it.
// Each agent is a Claude tool-use loop. Every side effect goes through execTool,
// which is where the user's "ask me before" contract is enforced.
import Anthropic from '@anthropic-ai/sdk';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const MODEL = 'claude-opus-5-5';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const photos = Array.from({ length: 10 }, (_, i) =>
  fs.readFileSync(`${root}/photos/${i + 1}.jpg`).toString('base64'));

// ---- run state (one run at a time; /api/start replaces it) ----
let S = null;
function newRun(askBefore) {
  const idle = detail => ({ status: 'Waiting', detail });
  return {
    askBefore, auto: !Object.values(askBefore).some(Boolean), // every switch off = fully hands-off
    mode: 'live', pending: [], log: [], look: null, groups: null, shots: null, drafts: [], posts: [],
    agents: {
      planning: { status: 'Done', detail: 'Set the autonomy contract' },
      scout: idle('Reads your references'), shotlist: idle('Waits for the groups'), editing: idle('Waits for your photos'),
      review: idle('Waits for the shoot'), posting: idle('Needs your final approval'),
    },
    _waits: new Map(), _answers: new Map(), // underscore keys are not sent to the browser
  };
}
const log = (s, agent, text, kind = 'info') => s.log.push({ t: Date.now(), agent, text, kind });
const set = (s, agent, status, detail) => Object.assign(s.agents[agent], status && { status }, detail && { detail });
const WORKING = { scout: 'Reading your references', shotlist: 'Drafting the shot list', editing: 'Editing the shots',
  review: 'Checking the shoot', posting: 'Drafting the posts' };

// Wait for the user (or the UI) to resolve `id`. With `info` it shows as a pending question.
// An answer that arrived early is used straight away, so clicking ahead of the agents is fine.
function wait(s, id, info) {
  if (s._answers.has(id)) return Promise.resolve(s._answers.get(id));
  if (!s._waits.has(id)) {
    let res; const p = new Promise(r => res = r);
    s._waits.set(id, { p, res });
  }
  if (info && !s.pending.some(p => p.id === id)) s.pending.push({ id, ...info });
  return s._waits.get(id).p;
}
function resolve(s, id, answer = 'approved') {
  s._answers.set(id, answer);
  if (id === 'shoot') s.shot = true;
  s.pending = s.pending.filter(p => p.id !== id);
  s._waits.get(id)?.res(answer);
}

// ---- tools ----
const tool = (name, description, properties) => ({
  name, description, strict: true,
  input_schema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
});
const str = { type: 'string' }, list = items => ({ type: 'array', items });
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const TOOLS = {
  report_look: tool('report_look', 'Save the look you read from the reference photos.',
    { tags: list(str), summary: str }),
  group_photos: tool('group_photos', 'Save how the reference photos group into setups for the shoot.',
    { groups: list(obj({ name: str, note: str, photos: list({ type: 'integer' }) })) }),
  draft_shot_list: tool('draft_shot_list', 'Submit the draft shot list. The photographer approves it before the shoot.',
    { shots: list(obj({ title: str, group: str, note: str })) }),
  request_reshoot: tool('request_reshoot', 'Schedule a reshoot of one shot. Costs the photographer time.',
    { shot: str, reason: str, why: str }),
  ask_user: tool('ask_user', 'Ask the photographer to make a call that is a matter of taste. Say which option you would pick.',
    { question: str, options: list(str) }),
  approve_edits: tool('approve_edits', 'Record your review of the edited set against the look.',
    { ok: { type: 'boolean' }, notes: str }),
  post: tool('post', 'Publish one post to a channel.',
    { channel: str, caption: str, photo: { type: 'integer' } }),
};

// Every tool call from every agent lands here. This is the autonomy gate.
async function execTool(s, agent, name, input) {
  const gate = (key, verb) => {
    log(s, agent, s.askBefore[key] ? `Contract says ask before ${verb}. Paused for approval.`
      : `Contract allows ${verb} without asking. Proceeding.`, 'gate');
    return s.askBefore[key];
  };
  const needsYou = async (id, info) => {
    set(s, agent, 'Needs you');
    const answer = await wait(s, id, { agent, ...info });
    set(s, agent, 'Working');
    log(s, 'you', `${answer}`, 'user');
    return answer;
  };
  switch (name) {
    case 'report_look':
      s.look = input; set(s, agent, null, 'Read the look'); log(s, agent, `Look: ${input.tags.join(' · ')}`, 'out'); return 'Saved.';
    case 'group_photos':
      s.groups = input.groups; set(s, agent, null, `Grouped ${photos.length} photos into ${input.groups.length} sets`);
      log(s, agent, `Grouped ${photos.length} photos: ${input.groups.map(g => g.name).join(' · ')}`, 'out');
      return 'Saved.';
    case 'draft_shot_list':
      s.shots = input.shots; log(s, agent, `Drafted ${input.shots.length} shots`, 'out');
      set(s, agent, null, `Drafted ${input.shots.length} shots`);
      if (s.auto) {
        log(s, agent, 'Contract is fully hands-off. Shot list locked without asking.', 'gate');
        set(s, agent, null, `${input.shots.length} shots locked`);
        return 'Approved automatically: the photographer delegated this.';
      }
      await needsYou('shotlist', { question: `Approve the ${input.shots.length}-shot list?`, options: ['Approve shot list'] });
      set(s, agent, null, `Approved · ${input.shots.length} shots locked`);
      return 'Approved by the photographer.';
    case 'request_reshoot':
      log(s, agent, `Wants to reshoot "${input.shot}": ${input.reason}`, 'out');
      set(s, agent, null, '1 question');
      if (!gate('reshoot', 'reshooting a shot')) return s._necklace = 'Reshoot scheduled.';
      return s._necklace = `The photographer answered: ${await needsYou('reshoot',
        { question: input.reason, why: input.why, options: ['Reshoot tomorrow', 'Use the closest photo', 'Skip this shot'] })}`;
    case 'ask_user':
      log(s, agent, `Asks: ${input.question}`, 'out');
      if (s.auto) {
        log(s, agent, 'Contract is fully hands-off. Deciding without asking.', 'gate');
        return 'The photographer delegated this to you. Use your own pick.';
      }
      set(s, agent, null, `Editing ${s.shots?.length ?? 8} shots · 1 question`);
      return `The photographer answered: ${await needsYou('take', input)}`;
    case 'approve_edits':
      s._reviewOk = input.ok; set(s, agent, null, input.ok ? 'Edits match the look' : 'Edits need changes');
      log(s, agent, `${input.ok ? 'Edits match the look' : 'Edits need changes'}: ${input.notes}`, 'out'); return 'Recorded.';
    case 'post':
      s.drafts.push(input); set(s, agent, null, `${s.drafts.length} posts drafted`);
      if (!s._postGate) s._postGate = gate('post', 'posting') ? needsYou('post',
        { question: 'Posts are drafted. Publish them?', options: ['Hold to post'] }) : Promise.resolve();
      await s._postGate;
      s.posts.push(input); set(s, agent, null, `Posted ${s.posts.length} (simulated)`); log(s, agent, `Posted to ${input.channel} (simulated): "${input.caption}"`, 'out');
      return 'Posted.';
  }
  return `Unknown tool ${name}`;
}

// ---- agent loop ----
async function live(system, content, tools, exec) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY (loaded from .env)
  const messages = [{ role: 'user', content }], calls = [];
  for (let turn = 0; turn < 8; turn++) {
    const r = await client.beta.messages.create({
      model: MODEL, max_tokens: 16000, system, tools, messages,
      output_config: { effort: 'low' }, // short structured tasks; keeps the demo quick
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    });
    if (r.stop_reason === 'refusal') throw new Error('the model declined the request');
    const uses = r.content.filter(b => b.type === 'tool_use');
    if (!uses.length) return { calls, text: r.content.find(b => b.type === 'text')?.text };
    messages.push({ role: 'assistant', content: r.content });
    messages.push({
      role: 'user', content: await Promise.all(uses.map(async u => {
        calls.push({ name: u.name, input: u.input });
        return { type: 'tool_result', tool_use_id: u.id, content: await exec(u.name, u.input) };
      })),
    });
  }
  return { calls };
}

// Runs one agent live and saves its tool calls. If the live call fails (no key, network),
// or REPLAY=1 is set, it replays the last saved run through the same gate instead.
async function runAgent(s, key, system, content, toolNames, saveAs = key) {
  set(s, key, 'Working', WORKING[key]);
  const exec = (name, input) => execTool(s, key, name, input);
  const file = `${root}/saved-runs/${saveAs}.json`;
  let done;
  if (!process.env.REPLAY) try {
    done = await live(system, content, toolNames.map(n => TOOLS[n]), exec);
    fs.writeFileSync(file, JSON.stringify(done, null, 2));
  } catch (e) {
    log(s, key, `Live call failed (${e.message}). Replaying the saved run.`, 'error');
  }
  if (!done) {
    s.mode = 'replay';
    done = JSON.parse(fs.readFileSync(file));
    await sleep(1500);
    for (const c of done.calls) await exec(c.name, c.input);
  }
  s.agents[key].summary = done.text;
  set(s, key, 'Done');
}

const BRAND = 'The brand is Girlhood: jewelry, clothing and sunglasses. Dreamy, playful, a little surreal.';
// The Planning agent's chat on the vision screen: one live reply to what the photographer says the shoot should feel like.
async function chat(s, message) {
  const fallback = "Got it. Show me what that looks like: photos, links, screenshots or a video.";
  s.chat = { message, reply: null }; s.vision = message;
  log(s, 'you', message, 'user'); set(s, 'planning', 'Working', 'Setting the vision');
  try {
    const { text } = await live(
      `You are the Planning agent on a photographer's crew, setting the creative vision for a shoot. The brand is Girlhood: jewelry, clothing and sunglasses. ` +
      'The project is a product launch due Nov 20. You asked what the photos should feel like. Reply to the answer in at most 110 characters: ' +
      'reflect it back in your own words, then ask to see references (photos, links, screenshots or a video). Plain text, no emoji.',
      message);
    s.chat.reply = text?.trim() || fallback;
  } catch (e) {
    log(s, 'planning', `Live call failed (${e.message}).`, 'error');
    s.chat.reply = fallback;
  }
  log(s, 'planning', s.chat.reply, 'out'); set(s, 'planning', 'Done', `Vision: ${message}`);
}

async function run(s) {
  try {
    await wait(s, 'photos');
    await runAgent(s, 'scout',
      `You are Scout, the reference-reading agent on a photographer's crew. ${BRAND} Look at the reference photos. ` +
      'First call report_look with exactly 5 tags covering light, colour, scale and composition, plus a one-sentence summary. ' +
      'Tags are shown as small chips: 2-3 words, at most 16 characters, sentence case, for example "Soft pale light". ' +
      'Then call group_photos, sorting every photo into exactly 3 groups the shoot can be organised around. ' +
      'Group names are at most 20 characters, sentence case, for example "Hands + rings". Notes are at most 22 characters, for example "same light, close up".',
      [...photos.flatMap((data, i) => [{ type: 'text', text: `Photo ${i + 1}` },
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }]),
      { type: 'text', text: 'These are the 10 references the photographer added to the board.' }],
      ['report_look', 'group_photos']);

    await runAgent(s, 'shotlist',
      `You are the Shot list agent on a photographer's crew. ${BRAND} Using the look and the groups, call draft_shot_list with exactly 8 shots. ` +
      'Each shot has a short title, the group it belongs to, and a one-line note on light or angle. ' +
      'Exactly one shot features the pearl necklace, and name the product in every title. ' +
      'Order the shots by group: 3 for the first group, 3 for the second, 2 for the third. Titles are at most 28 characters, ' +
      'sentence case, for example "Signet ring, hand to camera". Notes are at most 60 characters.',
      `Look: ${JSON.stringify(s.look)}\nGroups: ${JSON.stringify(s.groups)}\n` +
      'Products in this drop: signet ring, pearl necklace, silver rings, cat-eye sunglasses, baby tee.' +
      (s.vision ? `\nThe photographer wants the photos to feel: ${s.vision}.` : ''),
      ['draft_shot_list']);

    await wait(s, 'shoot'); // even hands-off, the photographer still has to shoot
    const shots = `Shot list: ${JSON.stringify(s.shots)}`;
    // The shoot results are a fixed script; name the affected shots from the real list so they are unambiguous.
    const shot = re => s.shots.find(x => re.test(x.title))?.title ?? s.shots[0].title;
    const necklace = shot(/pearl|necklace/i), ring = shot(/ring/i);
    await runAgent(s, 'review',
      `You are the Review agent on a photographer's crew. ${BRAND} During the shoot you check coverage against the shot list. ` +
      'If a must-have shot has no usable take, call request_reshoot. "reason" tells the photographer what is missing in at most 130 characters. ' +
      '"why" says why it matters and what is already covered in at most 150 characters. If coverage is complete, just say so.',
      `${shots}\nShoot results so far:\n- Every shot has a sharp, well-exposed take, with one exception.\n` +
      `- "${necklace}": the clasp is cropped out of frame in every take. It is a must-have for the product page.`,
      ['request_reshoot'], 'review-coverage');
    set(s, 'review', 'Waiting', 'Waits for edits');

    await runAgent(s, 'editing',
      `You are the Editing agent on a photographer's crew. ${BRAND} You pick takes, crop and edit without asking. ` +
      'If two takes are near-identical and the choice is taste, call ask_user. The question is at most 150 characters and says which you would pick. ' +
      'Give exactly two options of at most 12 characters, for example "Use Take 4". Then finish with a one-sentence summary of the edit.',
      `${shots}\nShoot results:\n- "${necklace}" was missing its clasp. ${s._necklace ?? 'No decision was needed.'}\n` +
      `- "${ring}": takes 4 and 7 are near-identical. Take 4 has sharper detail, take 7 has warmer light.\n` +
      '- Every other shot has one clear best take.',
      ['ask_user']);

    await runAgent(s, 'review',
      `You are the Review agent on a photographer's crew. ${BRAND} Check the edit summary against the look and call approve_edits with a one-sentence note. ` +
      'A reshoot or take choice the photographer has already decided is settled, not a reason to block.',
      `Look: ${JSON.stringify(s.look)}\nEdit summary: ${s.agents.editing.summary}`,
      ['approve_edits']);
    if (!s._reviewOk) throw new Error('Review did not approve the edits, so nothing was posted');

    await runAgent(s, 'posting',
      `You are the Posting agent on a photographer's crew. ${BRAND} Publish the drop: call post five times in one turn, in this order: ` +
      'Instagram, TikTok, Email, Instagram, Product page. Each post has a caption of at most 60 characters in the brand voice and the number (1-10) of the photo it uses. Use a different photo for each.',
      `Look: ${JSON.stringify(s.look)}\nGroups: ${JSON.stringify(s.groups)}` +
      (s.vision ? `\nThe photographer wants the photos to feel: ${s.vision}.` : ''),
      ['post']);
    log(s, 'planning', 'Run complete', 'info');
  } catch (e) {
    log(s, 'planning', `Run stopped: ${e.message}`, 'error');
  }
}

// ---- http ----
const types = { '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    let body = ''; for await (const c of req) body += c;
    const data = body ? JSON.parse(body) : {};
    if (url.pathname === '/api/start') { S = newRun(data.askBefore); run(S); }
    if (url.pathname === '/api/resolve' && S) resolve(S, data.id, data.answer);
    if (url.pathname === '/api/chat' && S) chat(S, String(data.message).slice(0, 200));
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(S, (k, v) => k.startsWith('_') ? undefined : v));
  }
  const file = path.join(root, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep) || file.includes(`${path.sep}.`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(4173, '127.0.0.1', () => console.log('Crew demo: http://localhost:4173'));
