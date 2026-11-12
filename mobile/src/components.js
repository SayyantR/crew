import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { photo } from '../images';
import { AGENTS, C, busy, serif, tone } from './theme';

export const Title = ({ children }) => <Text style={[serif, { fontSize: 44, color: C.ink, marginBottom: 6 }]}>{children}</Text>;
export const Sub = ({ children, style }) => <Text style={[{ fontSize: 14, lineHeight: 19, color: C.grey }, style]}>{children}</Text>;
export const Label = ({ children }) => (
  <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.9, color: C.grey, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 }}>{children}</Text>
);

export const Button = ({ label, onPress, onLongPress, kind = 'primary', disabled }) => (
  <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={800} disabled={disabled}
    style={{ height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 10, opacity: disabled ? 0.4 : 1,
      backgroundColor: kind === 'primary' ? C.ink : kind === 'secondary' ? C.card : 'transparent' }}>
    <Text style={{ fontSize: 15, fontWeight: '500', color: kind === 'primary' ? '#fff' : kind === 'secondary' ? C.ink : C.grey }}>{label}</Text>
  </Pressable>
);

export const Chip = ({ label, on, onPress }) => (
  <Pressable onPress={onPress} style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center', backgroundColor: on ? C.ink : C.card }}>
    <Text style={{ fontSize: 14, fontWeight: '500', color: on ? '#fff' : C.ink }}>{label}</Text>
  </Pressable>
);

export const Photo = ({ n, style }) => <Image source={photo(n)} resizeMode="cover" style={[{ borderRadius: 10 }, style]} />;

export const PhotoStack = ({ photos }) => (
  <View style={{ width: 110, height: 100 }}>
    {photos.slice(0, 3).map((n, j) => (
      <Photo key={n} n={n} style={{ position: 'absolute', left: j * 16, top: j * 4, width: 72, height: 90, borderWidth: 3, borderColor: '#fff',
        transform: [{ rotate: `${[-8, -2, 6][j]}deg` }] }} />
    ))}
  </View>
);

// One agent row: status, what it last did, and any question it is waiting on.
export function AgentRow({ k, a, question, children }) {
  const on = busy(a);
  return (
    <View style={[{ flexDirection: 'row', paddingVertical: 10, paddingRight: 14 },
      on && { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0de' }]}>
      <Text style={{ width: 56, textAlign: 'center', fontSize: 26, lineHeight: 32, color: tone(k, a) }}>{AGENTS[k][2]}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15.5, fontWeight: '600', color: C.ink }}>{AGENTS[k][0]} agent</Text>
          <Text style={{ fontSize: 12.5, color: on ? C.ink : C.grey, fontWeight: on ? '500' : '400' }}>{a.status}</Text>
        </View>
        <Sub style={{ fontSize: 12.5, lineHeight: 16 }}>{question || a.detail}</Sub>
        {children}
      </View>
    </View>
  );
}

// The header pill: every agent at a glance. Tapping it opens the team.
export function AgentPill({ run }) {
  const [open, setOpen] = useState(false);
  if (!run) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: 'row', gap: 3, paddingHorizontal: 8, height: 35, alignItems: 'center',
        borderRadius: 18, borderWidth: 1.5, borderColor: '#e7e5e4', backgroundColor: '#fff' }}>
        {Object.entries(run.agents).map(([k, a]) => (
          <View key={k} style={[{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
            busy(a) && { borderWidth: 1.5, borderColor: AGENTS[k][1] }]}>
            <Text style={{ fontSize: 14, lineHeight: 17, color: tone(k, a) }}>{AGENTS[k][2]}</Text>
          </View>
        ))}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 32, padding: 20 }}>
            <Text style={[serif, { fontSize: 27, marginBottom: 14 }]}>Your team on Eyewear</Text>
            {Object.entries(run.agents).map(([k, a]) => (
              <AgentRow key={k} k={k} a={a} question={run.pending.find(p => p.agent === k)?.question} />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Page frame: back label, agent pill, scrolling body, pinned footer.
export const Screen = ({ back, run, children, footer }) => (
  <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 64 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, height: 36 }}>
      <Text style={{ fontSize: 12, color: C.ink }}>{back ? `‹ ${back}` : ''}</Text>
      <AgentPill run={run} />
    </View>
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 12 }}>{children}</ScrollView>
    {footer && <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>{footer}</View>}
  </View>
);
