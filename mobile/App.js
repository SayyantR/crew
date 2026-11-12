// Crew: a photographer's team of agents. This is the phone app; the agents run in ../server.js.
// Setup screens are a simple sequence. Once a run starts, the screen follows the run's state:
// whatever the agents have produced, or whatever they are waiting on, decides what is shown.
import { useState } from 'react';
import { pending, useRun } from './src/api';
import { Board, Delegate, NewProject, Studio, Vision } from './src/screens/Setup';
import { Brief, Look, ShotList } from './src/screens/Plan';
import { Question, ReadyToPost, Receipt, Working } from './src/screens/Run';

export default function App() {
  const { run, start, resolve, say } = useRun();
  const [step, setStep] = useState('studio');
  const [project, setProject] = useState({ name: 'Girlhood', type: 'Product launch', about: 'A piece-drop of jewelry, clothing and sunglasses.' });
  // "Ask me before" switches. With every switch off the agents only stop for the shoot.
  const [askBefore, setAskBefore] = useState({ post: true, reshoot: true, spend: true, look: false });
  const [seen, setSeen] = useState({}); // results the photographer has already looked at

  if (step === 'studio') return <Studio onNew={() => setStep('new')} />;
  if (step === 'new') return <NewProject project={project} setProject={setProject} onNext={() => setStep('delegate')} />;
  if (step === 'delegate') {
    return <Delegate project={project} askBefore={askBefore} setAskBefore={setAskBefore}
      onStart={() => { setSeen({}); start(askBefore); setStep('board'); }} />;
  }
  if (step === 'board') {
    return <Board project={project} run={run} onRead={() => { resolve('photos'); setStep(run?.auto ? 'run' : 'vision'); }} />;
  }
  if (step === 'vision') return <Vision project={project} run={run} say={say} onNext={() => setStep('run')} />;

  // From here the run decides.
  if (!run) return <Studio onNew={() => setStep('new')} />;
  const done = () => { setStep('studio'); };
  const question = pending(run, 'reshoot') || pending(run, 'take');

  if (!run.shot) {
    if (!run.look) return <Working run={run} />;
    if (!run.auto && !seen.look) return <Look run={run} onNext={() => setSeen({ ...seen, look: true })} />;
    if (!run.shots) return <Working run={run} />;
    const waiting = !!pending(run, 'shotlist');
    if (waiting || !seen.shots) {
      return <ShotList run={run} waiting={waiting} onApprove={() => { if (waiting) resolve('shotlist', 'Approve shot list'); setSeen({ ...seen, shots: true }); }} />;
    }
    return <Brief run={run} onShoot={() => resolve('shoot')} />;
  }
  if (question) return <Question run={run} q={question} onAnswer={answer => resolve(question.id, answer)} />;
  if (pending(run, 'post')) return <ReadyToPost run={run} onPost={() => resolve('post', 'Held to post')} />;
  if (run.agents.posting.status === 'Done') return <Receipt run={run} onDone={done} />;
  return <Working run={run} />;
}
