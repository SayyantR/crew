// Client for the agent server. The server owns the run; the app polls it and sends answers.
import { useEffect, useRef, useState } from 'react';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4173';

export function useRun() {
  const [run, setRun] = useState(null);
  const last = useRef('');
  const take = text => { if (text !== last.current) { last.current = text; setRun(JSON.parse(text)); } };
  const post = (path, body) =>
    fetch(`${API}/api/${path}`, { method: 'POST', body: JSON.stringify(body) }).then(r => r.text()).then(take).catch(() => {});

  useEffect(() => {
    const poll = setInterval(() => fetch(`${API}/api/state`).then(r => r.text()).then(take).catch(() => {}), 500);
    return () => clearInterval(poll);
  }, []);

  return {
    run,
    start: askBefore => post('start', { askBefore }),      // begin a run under the autonomy contract
    resolve: (id, answer) => post('resolve', { id, answer }), // answer a question or signal a step
    say: message => post('chat', { message }),             // talk to the Planning agent
  };
}

export const pending = (run, id) => run?.pending.find(p => p.id === id);

// The shot list split into setups, in the order the groups first appear, with each group's photos.
export const setups = run => [...new Set(run.shots.map(s => s.group))].map(name => ({
  name, shots: run.shots.filter(s => s.group === name),
  photos: run.groups?.find(g => g.name === name)?.photos ?? [1, 2, 3],
}));
