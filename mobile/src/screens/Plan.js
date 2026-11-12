// What the planning agents produced: the look, the setups, the shot list and each setup's brief.
import { Text, View } from 'react-native';
import { setups } from '../api';
import { Button, Label, Photo, PhotoStack, Screen, Sub, Title } from '../components';
import { C } from '../theme';

export const Look = ({ run, onNext }) => (
  <Screen back="Studio" run={run} footer={<Button label="Plan the shots" onPress={onNext} disabled={!run.groups} />}>
    <Title>Here's the look</Title>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {run.look.tags.map(t => (
        <View key={t} style={{ height: 28, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500' }}>{t}</Text>
        </View>
      ))}
    </View>
    <Sub style={{ marginTop: 12 }}>{run.look.summary}</Sub>
    <Label>Grouped for your shoot</Label>
    {(run.groups || []).map(g => (
      <View key={g.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 28, backgroundColor: C.card, marginBottom: 12 }}>
        <PhotoStack photos={g.photos} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '600' }}>{g.name}</Text>
          <Sub style={{ fontSize: 12 }}>{g.photos.length} photos · {g.note}</Sub>
        </View>
      </View>
    ))}
  </Screen>
);

const ShotRow = ({ shot, n }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 16, backgroundColor: '#fff', marginBottom: 8 }}>
    <Photo n={n} style={{ width: 42, height: 50, borderRadius: 8 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '500' }}>{shot.title}</Text>
      <Sub style={{ fontSize: 12 }}>{shot.note}</Sub>
    </View>
  </View>
);

// The drafted shot list. Under a hands-off contract it is already locked and this is read-only.
export const ShotList = ({ run, waiting, onApprove }) => (
  <Screen back="Girlhood" run={run} footer={<Button label={waiting ? 'Approve shot list' : 'Go to the shoot'} onPress={onApprove} />}>
    <Title>{run.shots.length} shots</Title>
    {setups(run).map((set, i) => (
      <View key={set.name} style={{ borderRadius: 24, backgroundColor: '#f9f8f7', padding: 10, marginTop: 12 }}>
        <Label>Group {i + 1} · {set.name}</Label>
        {set.shots.map((s, j) => <ShotRow key={s.title} shot={s} n={set.photos[j % set.photos.length]} />)}
      </View>
    ))}
  </Screen>
);

export function Brief({ run, onShoot }) {
  const all = setups(run), set = all[0];
  return (
    <Screen back="Girlhood" run={run} footer={<Button label="Start shooting" onPress={onShoot} />}>
      <Title>Setup 1 of {all.length}</Title>
      <Sub>{set.name}</Sub>
      <View style={{ marginTop: 16 }}>
        {set.shots.map((s, j) => <ShotRow key={s.title} shot={s} n={set.photos[j % set.photos.length]} />)}
      </View>
      <View style={{ borderRadius: 20, backgroundColor: C.card, padding: 14, marginTop: 8 }}>
        <Label>Setup</Label>
        <Text style={{ fontSize: 15, fontWeight: '500' }}>{set.shots[0].note}</Text>
      </View>
      <Sub style={{ marginTop: 14 }}>The Review agent checks coverage as soon as you finish.</Sub>
    </Screen>
  );
}
