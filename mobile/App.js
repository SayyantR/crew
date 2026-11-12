// Crew: a photographer's team of agents. This is the phone app; the agents run in ../server.js.
// Each screen is the designed frame with tap targets from the prototype map, and the parts
// the agents produce (look, groups, shot list, questions, statuses, posts) drawn from live state.
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { PHOTOS, SCREENS } from './images';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4173';
const AGENTS = {
  planning: ['Planning', '#3b82f6', '●'], scout: ['Scout', '#22b455', '★'], shotlist: ['Shot list', '#f5c518', '■'],
  editing: ['Editing', '#ff4f8b', '▲'], review: ['Review', '#8b5cf6', '✤'], posting: ['Posting', '#ff8a3d', '⬢'],
};
const GREY = '#737373', CARD = '#f4f4f2';
const busy = a => a.status === 'Working' || a.status === 'Needs you';
const tint = a => (a.status === 'Waiting' ? '#b8b8b5' : null);

// ---- small building blocks, all positioned in the 402 x 874 design frame ----
const Box = ({ x, y, w, h, style, children, touch }) => (
  <View pointerEvents={touch ? 'auto' : 'none'} style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, style]}>
    {children}
  </View>
);
const Txt = ({ x, y, w, h, bg, lines = 1, style, children }) => (
  <Box x={x} y={y} w={w} h={h} style={{ backgroundColor: bg, justifyContent: 'center' }}>
    <Text numberOfLines={lines} style={[{ color: '#121212' }, style]}>{children}</Text>
  </Box>
);
const Thumb = ({ x, y, w, h, n, style }) => (
  <Box x={x} y={y} w={w} h={h} style={[{ borderRadius: 8, overflow: 'hidden' }, style]}>
    <Image source={PHOTOS[Math.min(10, Math.max(1, n || 1))]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
  </Box>
);
const T = {
  head: { fontSize: 11, fontWeight: '600', letterSpacing: 0.9, textTransform: 'uppercase' },
  title: { fontSize: 15, fontWeight: '500' },
  sub: { fontSize: 12.5, color: GREY },
};

function Bar({ color }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={{ position: 'absolute', left: 80, top: 74, width: 250, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: color + '33' }}>
      <Animated.View style={{ width: 112, height: 8, borderRadius: 4, backgroundColor: color,
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 138] }) }] }} />
    </View>
  );
}

// The shot list split into setups, in the order the groups first appear, with each group's photos.
const setups = st => [...new Set(st.shots.map(s => s.group))].map(name => ({
  name, shots: st.shots.filter(s => s.group === name),
  photos: st.groups?.find(g => g.name === name)?.photos ?? [1, 2, 3],
}));

// The team list: every agent's live status. The agent that is working or waiting on the user
// is expanded; a pending take choice gets answer buttons when `onPick` is given.
function Team({ st, y, h, onPick }) {
  return (
    <Box x={44} y={y} w={314} h={h} style={{ backgroundColor: '#fff', overflow: 'hidden' }} touch={!!onPick}>
      {Object.entries(st.agents).map(([k, a], i) => {
        const q = st.pending.find(p => p.agent === k && p.question);
        const on = busy(a);
        return (
          <View key={k}>
            {i > 0 && <View style={{ height: 16, width: 2, marginLeft: 29, backgroundColor: '#e0e0de' }} />}
            <View style={[{ flexDirection: 'row', minHeight: 35, paddingRight: 14 },
              on && { backgroundColor: CARD, borderWidth: 1, borderColor: '#e0e0de', borderRadius: 20, paddingVertical: 15 }]}>
              <Text style={{ width: 60, textAlign: 'center', fontSize: 27, lineHeight: 32, color: tint(a) ?? AGENTS[k][1] }}>{AGENTS[k][2]}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15.5, fontWeight: '600', lineHeight: 19 }}>{AGENTS[k][0]} agent</Text>
                  <Text style={[T.sub, { lineHeight: 19 }, on && { color: '#121212', fontWeight: '500' }]}>{a.status}</Text>
                </View>
                <Text numberOfLines={on ? 6 : 1} style={[T.sub, { lineHeight: 16 }]}>{q?.question || a.detail}</Text>
                {q?.id === 'take' && onPick && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {q.options.slice(0, 2).map((label, n) => (
                      <Pressable key={label} onPress={() => onPick(n)} style={{ flex: 1, height: 34, borderRadius: 17, borderWidth: 1,
                        alignItems: 'center', justifyContent: 'center', borderColor: n ? '#d6d6d3' : '#121212', backgroundColor: n ? '#fff' : '#121212' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: n ? '#121212' : '#fff' }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </Box>
  );
}

// The header pill drawn from live status: grey while waiting, coloured once started, ringed while working.
const Pill = ({ st }) => (
  <Box x={224} y={64} w={154} h={35} style={{ backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e7e5e4', borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
    {Object.entries(st.agents).map(([k, a]) => (
      <View key={k} style={[{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
        busy(a) && { borderWidth: 1.5, borderColor: AGENTS[k][1] }]}>
        <Text style={{ fontSize: 14, lineHeight: 17, color: tint(a) ?? AGENTS[k][1] }}>{AGENTS[k][2]}</Text>
      </View>
    ))}
  </Box>
);

// ---- what the agents produced, drawn over each screen ----
const LIVE = {
  10: ({ st }) => st.look && (
    <Box x={20} y={192} w={362} h={106} style={{ backgroundColor: '#fff', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 4, overflow: 'hidden' }}>
      {st.look.tags.map(t => (
        <View key={t} style={{ height: 25, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 13, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '500' }}>{t}  ×</Text>
        </View>
      ))}
      <View style={{ height: 29, paddingHorizontal: 10, borderRadius: 15, backgroundColor: CARD, justifyContent: 'center' }}>
        <Text style={{ fontSize: 12 }}>+ Add</Text>
      </View>
    </Box>
  ),
  13: ({ st }) => (st.groups || []).slice(0, 3).map((g, i) => {
    const y = 193 + 148 * i;
    return (
      <View key={g.name} pointerEvents="none">
        <Box x={167} y={y + 24} w={188} h={50} style={{ backgroundColor: CARD }}>
          <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', lineHeight: 21, marginTop: 4 }}>{g.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: GREY, marginTop: 4 }}>{g.photos.length} photos · {g.note}</Text>
        </Box>
        <Box x={38} y={y + 12} w={126} h={110} style={{ backgroundColor: CARD, borderRadius: 12 }}>
          {g.photos.slice(0, 3).map((n, j) => (
            <Image key={n} source={PHOTOS[n]} resizeMode="cover" style={{ position: 'absolute', left: 6 + j * 16, top: 4 + j * 4, width: 74, height: 92,
              borderWidth: 3, borderColor: '#fff', borderRadius: 10, transform: [{ rotate: `${[-8, -2, 6][j]}deg` }] }} />
          ))}
        </Box>
      </View>
    );
  }),
  14: ({ st }) => <Team st={st} y={229} h={361} />,
  16: ({ st }) => st.shots && [[0, 160, [197, 267, 337]], [1, 424, [461, 531]]].map(([gi, hy, ys]) => {
    const set = setups(st)[gi];
    return set && (
      <View key={gi} pointerEvents="none">
        <Txt x={24} y={hy - 3} w={270} h={18} bg="#f9f8f7" style={T.head}>Group {gi + 1} · {set.name}</Txt>
        {set.shots.slice(0, ys.length).map((sh, j) => (
          <View key={sh.title}>
            <Txt x={84} y={ys[j] - 3} w={255} h={22} bg="#fff" style={T.title}>{sh.title}</Txt>
            <Thumb x={30} y={ys[j] - 5} w={42} h={50} n={set.photos[j % set.photos.length]} />
          </View>
        ))}
      </View>
    );
  }),
  17: ({ st }) => {
    if (!st.shots) return null;
    const set = setups(st)[0];
    return (
      <>
        <Txt x={24} y={202} w={354} h={20} bg="#fff" style={{ fontSize: 14, color: GREY }}>{set.name} · Sat 4:30</Txt>
        {set.shots.slice(0, 3).map((sh, j) => (
          <View key={sh.title} pointerEvents="none">
            <Txt x={88} y={[263, 350, 430][j] - 2} w={255} h={22} bg="#fff" style={T.title}>{sh.title}</Txt>
            <Thumb x={34} y={[256, 334, 414][j]} w={42} h={50} n={set.photos[j % set.photos.length]} />
          </View>
        ))}
        <Txt x={38} y={512} w={326} h={38} bg={CARD} lines={2} style={{ fontSize: 15, fontWeight: '500', lineHeight: 18 }}>{set.shots[0].note}</Txt>
      </>
    );
  },
  // Hands-off: the only time the agents come back to the user is to say the plan is ready to shoot.
  21: ({ st }) => st.auto && !st.shot && st.shots && (
    <>
      <Box x={8} y={462} w={386} h={108} style={{ backgroundColor: '#f5dfe4' }} />
      <Box x={16} y={576} w={370} h={118} style={{ backgroundColor: '#fdf8f8', borderRadius: 28, paddingTop: 16, paddingLeft: 82, paddingRight: 16 }}>
        <Text style={{ position: 'absolute', left: 18, top: 14, fontSize: 34, lineHeight: 36, color: AGENTS.shotlist[1] }}>■</Text>
        <Text style={[T.head, { fontSize: 10, color: '#8a6d00' }]}>Shot list agent · now</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 6 }}>{st.shots.length} shots planned. Time to shoot.</Text>
        <Text style={[T.sub, { marginTop: 10 }]}>First setup: {setups(st)[0].name}. Tap to start.</Text>
      </Box>
    </>
  ),
  22: ({ st }) => {
    const q = st.pending.find(p => p.id === 'reshoot');
    return q && (
      <>
        <Txt x={24} y={198} w={354} h={56} bg="#fff" lines={3} style={{ fontSize: 14, lineHeight: 17, color: GREY }}>{q.question}</Txt>
        <Txt x={40} y={702} w={322} h={50} bg={CARD} lines={3} style={{ fontSize: 12, lineHeight: 15, color: GREY }}>{q.why}</Txt>
      </>
    );
  },
  // The three agent cards: planning agents before the shoot, finishing agents after it.
  23: ({ st }) => {
    const before = st.auto && !st.shot;
    let waiting = 0;
    return (
      <>
        <Pill st={st} />
        {before && <Txt x={24} y={124} w={240} h={18} bg="#fff" style={T.head}>10 references · planning</Txt>}
        <Box x={20} y={333} w={362} h={328} style={{ backgroundColor: '#fff' }} />
        {(before ? ['scout', 'shotlist', 'editing'] : ['editing', 'review', 'posting']).map((k, i) => {
          const a = st.agents[k], on = busy(a), col = AGENTS[k][1];
          return (
            <View key={k} pointerEvents="none">
              {i > 0 && <Box x={63} y={321 + 112 * i} w={2} h={16} style={{ backgroundColor: '#d6d6d3' }} />}
              <Box x={24} y={337 + 112 * i} w={354} h={96} style={{ borderRadius: 28, backgroundColor: on ? col + '22' : CARD }}>
                <Text style={{ position: 'absolute', left: 16, top: 24, width: 48, textAlign: 'center', fontSize: 42, lineHeight: 48, color: tint(a) ?? col }}>{AGENTS[k][2]}</Text>
                <Text style={{ position: 'absolute', left: 80, top: 24, fontSize: 16, fontWeight: '500' }}>{AGENTS[k][0]} agent</Text>
                <Text numberOfLines={1} style={{ position: 'absolute', left: 80, top: 48, right: 90, fontSize: 13, color: GREY }}>{a.detail}</Text>
                {a.status === 'Working' ? <Bar color={col} /> : (
                  <View style={{ position: 'absolute', right: 14, top: 38, borderWidth: 1, borderColor: '#d6d6d3', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#fff' }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.6 }}>
                      {a.status === 'Done' ? 'DONE' : on ? 'NEEDS YOU' : waiting++ ? 'LATER' : 'NEXT'}
                    </Text>
                  </View>
                )}
              </Box>
            </View>
          );
        })}
      </>
    );
  },
  '23b': ({ st, pick }) => <Team st={st} y={120} h={592} onPick={st.pending.some(p => p.id === 'take') ? pick : undefined} />,
  25: ({ st }) => {
    const [a, b] = st.drafts || [];
    return (
      <>
        {a && <Thumb x={24} y={269} w={228} h={284} n={a.photo} style={{ borderRadius: 0 }} />}
        {a && <Txt x={34} y={558} w={212} h={48} bg="#fff" lines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{a.caption}</Txt>}
        {b && <Thumb x={268} y={225} w={134} h={400} n={b.photo} style={{ borderRadius: 0, borderTopLeftRadius: 28, borderBottomLeftRadius: 28 }} />}
        {b && <Txt x={282} y={572} w={120} h={22} style={{ fontSize: 13, fontWeight: '500', color: '#fff' }}>{b.caption}</Txt>}
      </>
    );
  },
  26: ({ st }) => st.posts.slice(0, 5).map((p, i) => {
    const y = 166 + 120 * i;
    return (
      <View key={i} pointerEvents="none">
        <Thumb x={34} y={y + 10} w={70} h={88} n={p.photo} style={{ borderRadius: 12 }} />
        <Box x={116} y={y + 14} w={230} h={42} style={{ backgroundColor: CARD }}>
          <Text style={{ fontSize: 15, fontWeight: '500', lineHeight: 18, marginTop: 4 }}>{p.channel}</Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: GREY, marginTop: 6 }}>OCT {10 + i} · {p.caption}</Text>
        </Box>
      </View>
    );
  }),
};

const NO_PILL = ['1', '4', '6', '13', '14', '19', '20', '21', '23b'];
const TOGGLES = { post: 331, reshoot: 393, spend: 455, look: 517 };

export default function App() {
  const { width, height } = useWindowDimensions();
  const [at, setAt] = useState(0);
  const [st, setSt] = useState(null); // the run on the server: agents, pending questions, outputs
  const [modal, setModal] = useState(false);
  // "Ask me before" switches. With every switch off the agents run end to end and only stop for the shoot.
  const [askBefore, setAskBefore] = useState({ post: true, reshoot: true, spend: true, look: false });
  const handsOff = !Object.values(askBefore).some(Boolean);
  const auto = st ? st.auto : handsOff, shot = !!st?.shot;

  // Screens in story order. taps: [x, y, w, h, to?] in frame points; `to` defaults to the next screen.
  // auto: ms before moving on by itself; wait: what the agents must have produced first.
  const screens = [
    { id: '1', taps: [[20, 436, 181, 34]] },
    { id: '2', taps: [[16, 768, 370, 35]], toggles: true },
    { id: '3', taps: [[308, 772, 57, 36]] },
    { id: '4', taps: [[76, 451, 98, 34]] },
    { id: '5', taps: [[246, 771, 140, 33]], next: handsOff ? '23' : '6' },
    { id: '6', taps: [[142, 750, 117, 34]] },
    { id: '7', taps: [[138, 537, 94, 32]] },
    { id: '8', taps: [[16, 760, 370, 34]] },
    { id: '9', taps: [[261, 773, 108, 36]] },
    { id: '10', auto: 2500, wait: s => s.look },
    { id: '11', taps: [[18, 208, 366, 116]] },
    { id: '12', taps: [[18, 432, 83, 35]] },
    { id: '13', taps: [[219, 59, 164, 45]] },
    { id: '14', taps: [[317, 172, 46, 46]] },
    { id: '15', taps: [[181, 788, 57, 35]] },
    { id: '16', taps: [[135, 754, 133, 40]] },
    { id: '17', taps: [[143, 757, 121, 36]] },
    { id: '19', auto: 2500 },
    { id: '20', auto: 2500, next: askBefore.reshoot ? '21' : '23',
      wait: s => !askBefore.reshoot || s.pending.some(p => p.id === 'reshoot') || s.agents.editing.status !== 'Waiting' },
    { id: '21', taps: [[16, 576, 370, 118]], next: auto && !shot ? '17' : '22' },
    { id: '22', taps: [[24, 472, 354, 56], [24, 540, 354, 52], [24, 602, 354, 36]] },
    { id: '23', auto: 3000, next: !auto ? '23b' : shot ? '26' : '21',
      wait: s => s.auto ? (s.shot ? s.agents.posting.status === 'Done' : s.agents.shotlist.status === 'Done')
        : s.pending.some(p => p.id === 'take') || s.agents.editing.status === 'Done' },
    { id: '23b', taps: [[106, 516, 113, 31], [229, 516, 113, 31]] },
    { id: '24', taps: [[146, 775, 224, 32, askBefore.post ? '25' : '26']] },
    { id: '25', taps: [[141, 703, 120, 120]], hold: true },
    { id: '26', taps: [[0, 760, 402, 114, '1']] }, // tap the bottom of the receipt to start over
  ];
  const s = screens[at];
  const ready = !s.wait || !st || !!s.wait(st);

  const api = (path, body) => fetch(`${API}/api/${path}`, { method: 'POST', body: JSON.stringify(body) })
    .then(r => r.json()).then(setSt).catch(() => {});
  // What leaving each screen tells the agents. `n` is the index of the tapped target.
  const leave = {
    2: () => api('start', { askBefore }),
    5: () => api('resolve', { id: 'photos' }),
    16: () => api('resolve', { id: 'shotlist', answer: 'Approve shot list' }),
    17: () => api('resolve', { id: 'shoot' }),
    22: n => api('resolve', { id: 'reshoot', answer: ['Reshoot the necklace tomorrow', 'Use the closest photo', 'Skip this shot'][n ?? 0] }),
    '23b': (n = 0) => api('resolve', { id: 'take', answer: st?.pending.find(p => p.id === 'take')?.options[n] ?? ['Use Take 4', 'Use Take 7'][n] }),
    25: () => api('resolve', { id: 'post', answer: 'Held to post' }),
  };
  const go = (to, n) => {
    const i = typeof to === 'string' ? screens.findIndex(x => x.id === to) : to;
    if (i < 0 || i >= screens.length) return;
    if (i > at) leave[s.id]?.(n);
    setModal(false);
    setAt(i);
  };
  const next = (to, n) => go(to ?? s.next ?? at + 1, n);

  // Follow the run on the server.
  const last = useRef('');
  useEffect(() => {
    const poll = setInterval(() => fetch(`${API}/api/state`).then(r => r.text()).then(text => {
      if (text !== last.current) { last.current = text; setSt(JSON.parse(text)); }
    }).catch(() => {}), 500);
    return () => clearInterval(poll);
  }, []);

  // Timed screens move on by themselves, but only once the agents have produced what the screen shows.
  useEffect(() => {
    if (!s.auto || !ready) return;
    const timer = setTimeout(() => next(), s.auto);
    return () => clearTimeout(timer);
  }, [at, ready]);

  const Live = LIVE[s.id];
  const k = Math.min(width / 402, height / 874);
  return (
    <View style={{ flex: 1, backgroundColor: '#1b1b1b', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 402, height: 874, transform: [{ scale: k }], borderRadius: 48, overflow: 'hidden', backgroundColor: '#fff' }}>
        <Pressable style={{ position: 'absolute', width: 402, height: 874 }} onPress={() => s.auto && ready && next()}>
          <Image source={SCREENS[s.id]} style={{ width: 402, height: 874 }} />
        </Pressable>

        {(s.taps || []).map(([x, y, w, h, to], n) => (
          <Pressable key={n} style={{ position: 'absolute', left: x, top: y, width: w, height: h }}
            {...(s.hold ? { onLongPress: () => next(to, n), delayLongPress: 800 } : { onPress: () => next(to, n) })} />
        ))}
        {!NO_PILL.includes(s.id) && (
          <Pressable style={{ position: 'absolute', left: 224, top: 64, width: 154, height: 35 }} onPress={() => setModal(true)} />
        )}
        {s.toggles && Object.entries(TOGGLES).map(([key, cy]) => (
          <Pressable key={key} accessibilityRole="switch" accessibilityState={{ checked: askBefore[key] }}
            onPress={() => setAskBefore({ ...askBefore, [key]: !askBefore[key] })}
            style={{ position: 'absolute', left: 322, top: cy - 12, width: 44, height: 24, borderRadius: 12, backgroundColor: askBefore[key] ? '#121212' : '#e6e6e3' }}>
            <View style={{ position: 'absolute', top: 2, left: askBefore[key] ? 22 : 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
          </Pressable>
        ))}

        <View pointerEvents="box-none" style={{ position: 'absolute', width: 402, height: 874 }}>
          {st && Live && <Live st={st} pick={n => next(undefined, n)} />}
          {st && modal && (
            <>
              <Pressable style={{ position: 'absolute', width: 402, height: 874, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setModal(false)} />
              <Box x={24} y={150} w={354} h={470} style={{ backgroundColor: '#fff', borderRadius: 32 }} />
              <Txt x={44} y={170} w={260} h={36} style={{ fontSize: 27, fontFamily: 'Georgia' }}>Your team on Eyewear</Txt>
              <Box x={322} y={170} w={36} h={36} style={{ backgroundColor: CARD, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Box>
              <Team st={st} y={222} h={380} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}
