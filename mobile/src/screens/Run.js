// After the shoot: watch the agents, answer what they ask, approve the posts, read the receipt.
import { Text, View } from 'react-native';
import { AgentRow, Button, Label, Photo, Screen, Sub, Title } from '../components';
import { C } from '../theme';

// "You can go." Shows the agents that matter right now: planners before the shoot, finishers after.
export function Working({ run }) {
  const keys = run.shot ? ['editing', 'review', 'posting'] : ['scout', 'shotlist', 'editing'];
  return (
    <Screen back="Studio" run={run}>
      <Label>{run.shot ? 'After the shoot' : '10 references · planning'}</Label>
      <Title>You can go.</Title>
      <Sub>We'll ping you when something needs you.</Sub>
      <View style={{ marginTop: 20, gap: 12 }}>
        {keys.map(k => <AgentRow key={k} k={k} a={run.agents[k]} />)}
      </View>
    </Screen>
  );
}

// An agent was stopped by the contract and needs a decision. It says what is missing and why it is asking.
export const Question = ({ run, q, onAnswer }) => (
  <Screen run={run}>
    <Label>{q.agent} agent needs you</Label>
    <Title>One question</Title>
    <Sub>{q.question}</Sub>
    <View style={{ marginTop: 20 }}>
      {q.options.map((o, i) => <Button key={o} label={o} kind={['primary', 'secondary', 'plain'][Math.min(i, 2)]} onPress={() => onAnswer(o)} />)}
    </View>
    {q.why && (
      <View style={{ borderRadius: 24, backgroundColor: C.card, padding: 16, marginTop: 24 }}>
        <Label>Why I'm asking</Label>
        <Sub style={{ fontSize: 12.5 }}>{q.why}</Sub>
      </View>
    )}
  </Screen>
);

// The Posting agent's drafts. Holding the button is the approval the contract asked for.
export const ReadyToPost = ({ run, onPost }) => (
  <Screen back="Studio" run={run} footer={<Button label="Hold to post" onLongPress={onPost} />}>
    <Label>{run.drafts.length} posts drafted</Label>
    <Title>Ready to post</Title>
    {run.drafts.map((d, i) => (
      <View key={i} style={{ borderRadius: 28, borderWidth: 1, borderColor: C.line, overflow: 'hidden', marginTop: 14 }}>
        <Photo n={d.photo} style={{ width: '100%', height: 220, borderRadius: 0 }} />
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.grey }}>{d.channel.toUpperCase()}</Text>
          <Text style={{ fontSize: 14, marginTop: 4 }}>{d.caption}</Text>
        </View>
      </View>
    ))}
  </Screen>
);

export const Receipt = ({ run, onDone }) => (
  <Screen run={run} footer={<Button label="Back to Studio" kind="secondary" onPress={onDone} />}>
    <Label>{run.posts.length} posts · all live</Label>
    <Title>Posted</Title>
    {run.posts.map((p, i) => (
      <View key={i} style={{ flexDirection: 'row', gap: 14, padding: 10, borderRadius: 24, backgroundColor: C.card, marginTop: 12 }}>
        <Photo n={p.photo} style={{ width: 70, height: 88, borderRadius: 12 }} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '500' }}>{p.channel}</Text>
          <Sub style={{ fontSize: 12 }}>{p.caption}</Sub>
        </View>
      </View>
    ))}
    <Label>Activity</Label>
    {run.log.filter(l => l.kind === 'gate' || l.kind === 'user').map((l, i) => (
      <Sub key={i} style={{ fontSize: 12, marginBottom: 6 }}>{l.agent === 'you' ? 'You' : `${l.agent} agent`}: {l.text}</Sub>
    ))}
  </Screen>
);
