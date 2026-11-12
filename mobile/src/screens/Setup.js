// Starting a project: name it, set the autonomy contract, add references, set the vision.
import { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Button, Chip, Label, Photo, Screen, Sub, Title } from '../components';
import { C } from '../theme';

export const Studio = ({ onNew }) => (
  <Screen>
    <Title>Studio</Title>
    <Sub>0 projects</Sub>
    <Pressable onPress={onNew} style={{ width: 171, height: 190, marginTop: 40, borderRadius: 46, borderWidth: 1.5, borderStyle: 'dashed',
      borderColor: '#c7c7c7', backgroundColor: '#f9f9f7', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 30, color: C.ink }}>+</Text>
    </Pressable>
    <Text style={{ fontSize: 15, fontWeight: '500', marginTop: 10 }}>New project</Text>
    <Sub>Name it, set a deadline, invite people</Sub>
  </Screen>
);

const TYPES = ['Product launch', 'Brand deal', 'My channel', 'Client shoot'];
export function NewProject({ project, setProject, onNext }) {
  return (
    <Screen back="Studio" footer={<Button label="Start planning" onPress={onNext} disabled={!project.name} />}>
      <Title>What's this shoot for?</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {TYPES.map(t => <Chip key={t} label={t} on={project.type === t} onPress={() => setProject({ ...project, type: t })} />)}
      </View>
      <Label>Name</Label>
      <TextInput value={project.name} onChangeText={name => setProject({ ...project, name })} placeholder="Project name"
        style={{ height: 48, borderRadius: 14, backgroundColor: C.card, paddingHorizontal: 14, fontSize: 15 }} />
      <Label>Description</Label>
      <TextInput value={project.about} onChangeText={about => setProject({ ...project, about })} multiline placeholder="What are you shooting?"
        style={{ minHeight: 72, borderRadius: 14, backgroundColor: C.card, padding: 14, fontSize: 14 }} />
    </Screen>
  );
}

const ASK = [['post', 'Posting anything'], ['reshoot', 'Reshooting a shot'], ['spend', 'Spending money'], ['look', 'Changing the look']];
const JUST_DO = ['Plan shots and due dates', 'Sort and read references', 'Edit, crop and cut videos', 'Draft captions'];
export const Delegate = ({ project, askBefore, setAskBefore, onStart }) => (
  <Screen back={project.name} footer={<Button label="Start project" onPress={onStart} />}>
    <Title>How hands-on do you want to be?</Title>
    <Sub>Set this once. The agents follow it for the whole project.</Sub>
    <Label>Ask me before</Label>
    {ASK.map(([key, label]) => (
      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderRadius: 16,
        backgroundColor: C.card, paddingHorizontal: 16, marginBottom: 10 }}>
        <Text style={{ fontSize: 15, fontWeight: '500' }}>{label}</Text>
        <Switch value={askBefore[key]} onValueChange={v => setAskBefore({ ...askBefore, [key]: v })} trackColor={{ true: C.ink }} />
      </View>
    ))}
    <Label>Everything else, the agents just do</Label>
    {JUST_DO.map(t => <Sub key={t} style={{ color: C.ink, marginBottom: 8 }}>•  {t}</Sub>)}
  </Screen>
);

// The project board. References are the project's bundled set; Scout reads them when asked.
export function Board({ project, run, onRead }) {
  const [added, setAdded] = useState(false);
  return (
    <Screen back="Studio" run={run}
      footer={added ? <Button label="Read the look" onPress={onRead} /> : <Button label="+ Add from camera roll" onPress={() => setAdded(true)} />}>
      <Title>{project.name}</Title>
      {!added ? (
        <View style={{ height: 300, marginTop: 20, borderRadius: 28, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c7c7c7',
          alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Text style={{ fontSize: 17, marginBottom: 8 }}>Nothing on the board yet</Text>
          <Sub style={{ textAlign: 'center' }}>Add photos, links or videos. The Scout agent reads them and pulls out lighting, colors and poses.</Sub>
        </View>
      ) : (
        <>
          <Sub style={{ color: '#1a7340' }}>10 photos added</Sub>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <Photo key={n} n={n} style={{ width: '47%', height: n % 3 ? 150 : 110 }} />)}
          </View>
        </>
      )}
    </Screen>
  );
}

const FEELS = ['Dreamy and playful', 'Clean and minimal', 'Bold and graphic', 'Not sure yet'];
const Bubble = ({ mine, children }) => (
  <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12,
    marginVertical: 6, backgroundColor: mine ? C.ink : C.card }}>
    <Text style={{ fontSize: 14, lineHeight: 18, color: mine ? '#fff' : C.ink }}>{children}</Text>
  </View>
);
// A short chat with the Planning agent about how the photos should feel. Its reply is live.
export function Vision({ project, run, say, onNext }) {
  const [text, setText] = useState('');
  const chat = run?.chat;
  return (
    <Screen back="Studio" run={run} footer={<Button label={chat?.reply ? 'Continue' : 'Skip for now'} kind={chat?.reply ? 'primary' : 'secondary'} onPress={onNext} />}>
      <Title>{project.name}</Title>
      <Bubble>Nice. A {project.type.toLowerCase()} for {project.name}. When someone sees these photos, what should it feel like?</Bubble>
      {!chat && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 }}>
          {FEELS.map(f => <Chip key={f} label={f} onPress={() => say(f)} />)}
        </View>
      )}
      {chat && <Bubble mine>{chat.message}</Bubble>}
      {chat && <Bubble>{chat.reply ?? '…'}</Bubble>}
      {!chat && (
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => text && say(text)} returnKeyType="send"
          placeholder="Tell the agent more about your vision…"
          style={{ height: 52, borderRadius: 26, backgroundColor: C.card, paddingHorizontal: 20, fontSize: 14, marginTop: 20 }} />
      )}
    </Screen>
  );
}
