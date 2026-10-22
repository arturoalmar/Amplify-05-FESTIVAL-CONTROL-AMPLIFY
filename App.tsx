import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { configureAmplify, createFestivalEvent, deleteFestivalEvent, listFestivalEvents, updateFestivalEvent } from './src/amplify';
import { initialEvents, FestivalEvent, EventStatus } from './src/data';
import { theme as c } from './src/theme';

type Page = 'dashboard' | 'events' | 'form';
const stages = ['MAIN STAGE', 'GARDEN', 'WAREHOUSE', 'RIVER STAGE'];
const statuses: EventStatus[] = ['CONFIRMED', 'DELAYED', 'CANCELLED'];

function Action({ label, onPress, secondary = false, danger = false }: {label: string; onPress: () => void; secondary?: boolean; danger?: boolean}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [s.button, secondary && s.buttonSecondary, danger && s.buttonDanger, pressed && {opacity: .75}]}>
    <Text style={s.buttonText}>{label}</Text>
  </Pressable>;
}
function Status({value}: {value: EventStatus}) {
  const color = value === 'CONFIRMED' ? c.green : value === 'DELAYED' ? c.amber : c.red;
  return <Text style={[s.status, {color}]}>● {value}</Text>;
}
function EventCard({event, onEdit, onStatus, onDelete}: {event: FestivalEvent; onEdit: () => void; onStatus: () => void; onDelete: () => void}) {
  return <View style={s.card}>
    <View style={s.cardHeader}><Text style={s.time}>{event.time}</Text><Status value={event.status}/></View>
    <Text style={s.artist}>{event.artist}</Text>
    <Text style={s.space}>{event.space} · {event.id}</Text>
    <View style={s.cardActions}>
      <Pressable accessibilityRole="button" onPress={onEdit}><Text style={s.actionText}>EDITAR</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onStatus}><Text style={s.actionText}>CAMBIAR ESTADO</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={onDelete}><Text style={[s.actionText,{color:c.red}]}>ELIMINAR</Text></Pressable>
    </View>
  </View>;
}
export default function App() {
  const {width} = useWindowDimensions();
  const wide = width > 860;
  const [page,setPage] = useState<Page>('dashboard');
  const [events,setEvents] = useState<FestivalEvent[]>(initialEvents);
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('TODOS');
  const [editing,setEditing] = useState<string | null>(null);
  const [artist,setArtist] = useState('');
  const [space,setSpace] = useState(stages[0]);
  const [time,setTime] = useState('21:45');
  const [status,setStatus] = useState<EventStatus>('CONFIRMED');
  const [notice,setNotice] = useState('');
  const [backendReady,setBackendReady] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      const ready = await configureAmplify();
      setBackendReady(ready);

      if (!ready) {
        setNotice('Demo local: backend de Amplify no está configurado todavía.');
        return;
      }

      const remoteEvents = await listFestivalEvents();
      if (remoteEvents.length > 0) {
        setEvents(remoteEvents);
        setNotice('Datos cargados desde AWS Amplify.');
      } else {
        setNotice('Backend conectado. Usa "Nuevo evento" para guardar en AWS.');
      }
    };

    void loadInitialData();
  }, []);

  const filtered = useMemo(() => events.filter(e => (filter === 'TODOS' || e.space === filter) && (e.artist.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()))),[events,search,filter]);
  const openNew = () => {setEditing(null);setArtist('');setSpace(stages[0]);setTime('21:45');setStatus('CONFIRMED');setNotice('');setPage('form');};
  const openEdit = (e: FestivalEvent) => {setEditing(e.id);setArtist(e.artist);setSpace(e.space);setTime(e.time);setStatus(e.status);setNotice('');setPage('form');};
  const save = async () => {
    if(!artist.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){setNotice('Introduce un artista y una hora válida (HH:MM).');return;}

    const payload = { artist: artist.trim().toUpperCase(), space, time, status };

    if(editing){
      const updated = await updateFestivalEvent(editing, payload);
      if(updated){
        setEvents(v => v.map(e => e.id === editing ? updated : e));
        setNotice('Evento actualizado en AWS Amplify.');
      } else {
        setEvents(v => v.map(e => e.id === editing ? {...e,...payload} : e));
        setNotice('Evento actualizado (datos locales).');
      }
    } else {
      const created = await createFestivalEvent(payload);
      if(created){
        setEvents(v => [created, ...v]);
        setNotice('Evento creado en AWS Amplify.');
      } else {
        const id='EVT-'+Date.now().toString().slice(-7);
        setEvents(v=>[{id,...payload},...v]);
        setNotice('Evento creado (datos locales).');
      }
    }
    setPage('events');
  };
  const changeStatus = async (id:string) => {
    const current = events.find(e => e.id === id);
    if (!current) return;

    const nextStatus: EventStatus = current.status === 'CONFIRMED' ? 'DELAYED' : current.status === 'DELAYED' ? 'CANCELLED' : 'CONFIRMED';
    const updated = await updateFestivalEvent(id, { ...current, status: nextStatus });

    if(updated){
      setEvents(v=>v.map(e=>e.id===id?updated:e));
      setNotice('Estado actualizado en AWS Amplify.');
    } else {
      setEvents(v=>v.map(e=>e.id===id?{...e,status:nextStatus}:e));
      setNotice('Estado actualizado localmente.');
    }
  };
  const remove = async (id:string) => {
    const removed = await deleteFestivalEvent(id);

    if(removed){
      setEvents(v=>v.filter(e=>e.id!==id));
      setNotice('Evento eliminado de AWS Amplify.');
    } else {
      setEvents(v=>v.filter(e=>e.id!==id));
      setNotice('Evento eliminado localmente.');
    }
  };
  const confirmed = events.filter(e=>e.status==='CONFIRMED').length;
  const delayed = events.filter(e=>e.status==='DELAYED').length;
  return <SafeAreaView style={s.root}>
    <ScrollView contentContainerStyle={[s.container,wide&&{maxWidth:1160,alignSelf:'center',width:'100%'}]}>
      <View style={s.header}>
        <View><Text style={s.brand}>FESTIVAL CONTROL<Text style={{color:c.pink}}> /</Text></Text><Text style={s.kicker}>LIVE OPERATIONS · EXPO WEB</Text></View>
        <Text style={s.live}>● LIVE DEMO</Text>
      </View>
      <View style={s.nav}>
        {([['dashboard','DASHBOARD'],['events','EVENTOS'],['form','+ NUEVO EVENTO']] as const).map(([key,label])=>
          <Pressable key={key} accessibilityRole="button" onPress={()=>key==='form'?openNew():setPage(key)} style={[s.navItem,page===key&&s.navActive]}><Text style={[s.navText,page===key&&{color:c.white}]}>{label}</Text></Pressable>)}
      </View>
      <View style={s.hero}>
        <Text style={s.heroTag}>ZARAGOZA · FESTIVAL OPERATIONS</Text>
        <Text style={[s.heroTitle,wide&&{fontSize:62}]}>THE NIGHT{ '\n' }IS YOURS.</Text>
        <Text style={s.heroSub}>Gestiona la programación en tiempo real. Demo interactiva sin backend.</Text>
      </View>
      {page==='dashboard' && <>
        <Text style={s.section}>PANEL DE CONTROL</Text>
        <View style={[s.stats,wide&&{flexDirection:'row'}]}>
          {[[String(events.length).padStart(2,'0'),'EVENTOS',c.white],[String(confirmed).padStart(2,'0'),'CONFIRMADOS',c.green],[String(delayed).padStart(2,'0'),'RETRASADOS',c.amber],['04','ESCENARIOS',c.pink]].map(([num,label,color])=><View key={label} style={[s.stat,wide&&{flex:1}]}><Text style={[s.statNumber,{color}]}>{num}</Text><Text style={s.statLabel}>{label}</Text></View>)}
        </View>
        <View style={s.sectionRow}><Text style={s.section}>PRÓXIMOS EVENTOS</Text><Pressable onPress={()=>setPage('events')}><Text style={s.link}>VER TODOS →</Text></Pressable></View>
        {events.slice(0,3).map(e=><EventCard key={e.id} event={e} onEdit={()=>openEdit(e)} onStatus={()=>changeStatus(e.id)} onDelete={()=>remove(e.id)}/>)}
        <Action label="＋ CREAR NUEVO EVENTO" onPress={openNew}/>
      </>}
      {page==='events' && <>
        <Text style={s.section}>PROGRAMACIÓN</Text>
        <Text style={s.subtitle}>{filtered.length} eventos · filtra y administra el festival</Text>
        <TextInput accessibilityLabel="Buscar artista o ID" placeholder="Buscar artista o ID..." placeholderTextColor="#777" style={s.input} value={search} onChangeText={setSearch}/>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {['TODOS',...stages].map(v=><Pressable key={v} onPress={()=>setFilter(v)} style={[s.filter,filter===v&&s.filterActive]}><Text style={s.filterText}>{v}</Text></Pressable>)}
        </ScrollView>
        {filtered.length===0&&<Text style={s.subtitle}>No hay eventos con ese filtro.</Text>}
        {filtered.map(e=><EventCard key={e.id} event={e} onEdit={()=>openEdit(e)} onStatus={()=>changeStatus(e.id)} onDelete={()=>remove(e.id)}/>)}
        <Action label="＋ NUEVO EVENTO" onPress={openNew}/>
      </>}
      {page==='form' && <>
        <Text style={s.section}>{editing?'EDITAR EVENTO':'NUEVO EVENTO'}</Text>
        <Text style={s.subtitle}>Completa los datos. Esta demo guarda los cambios sólo en memoria.</Text>
        <View style={s.form}>
          <Text style={s.label}>ARTISTA *</Text>
          <TextInput accessibilityLabel="Artista" placeholder="Ej. TECHNO TITANS" placeholderTextColor="#777" style={s.input} value={artist} onChangeText={setArtist}/>
          <Text style={s.label}>ESCENARIO</Text>
          <View style={s.choices}>{stages.map(v=><Pressable key={v} onPress={()=>setSpace(v)} style={[s.choice,space===v&&s.choiceActive]}><Text style={s.choiceText}>{v}</Text></Pressable>)}</View>
          <Text style={s.label}>HORA (HH:MM) *</Text>
          <TextInput accessibilityLabel="Hora" placeholder="21:45" placeholderTextColor="#777" style={s.input} value={time} onChangeText={setTime}/>
          <Text style={s.label}>ESTADO</Text>
          <View style={s.choices}>{statuses.map(v=><Pressable key={v} onPress={()=>setStatus(v)} style={[s.choice,status===v&&s.choiceActive]}><Text style={s.choiceText}>{v}</Text></Pressable>)}</View>
          <Action label={editing?'GUARDAR CAMBIOS':'CREAR EVENTO'} onPress={save}/>
          <Action label="CANCELAR" secondary onPress={()=>setPage('events')}/>
        </View>
      </>}
      {!!notice && <Text accessibilityRole="alert" style={s.notice}>{notice}</Text>}
      <View style={s.footer}><Text style={s.footerText}>FESTIVAL CONTROL · FRONTEND DEMO · REACT NATIVE + EXPO</Text><Text style={s.footerText}>{backendReady ? 'AWS AMPLIFY BACKEND CONECTADO' : 'SIN CONFIGURACIÓN DE AWS AÚN'}</Text></View>
    </ScrollView>
  </SafeAreaView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.background},container:{padding:20,paddingBottom:60},
  header:{paddingTop:24,paddingBottom:22,flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10},
  brand:{fontSize:20,fontWeight:'900',color:c.white,letterSpacing:1},kicker:{fontSize:10,color:c.muted,letterSpacing:2,marginTop:5},
  live:{color:c.green,fontSize:11,fontWeight:'900'},nav:{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:18},
  navItem:{backgroundColor:'#191919',paddingHorizontal:15,paddingVertical:12,borderRadius:10,borderWidth:1,borderColor:c.border},
  navActive:{backgroundColor:c.pink,borderColor:c.pink},navText:{fontSize:11,fontWeight:'900',color:c.muted},
  hero:{backgroundColor:'#171018',borderColor:'#4C1934',borderWidth:1,borderRadius:22,padding:28,marginBottom:30},
  heroTag:{fontSize:11,color:c.pink,fontWeight:'900',letterSpacing:2,marginBottom:15},
  heroTitle:{fontSize:42,fontWeight:'900',color:c.white,lineHeight:51,letterSpacing:-1},
  heroSub:{color:'#B5B5B5',fontSize:14,marginTop:14,maxWidth:550,lineHeight:22},
  section:{fontSize:22,color:c.white,fontWeight:'900',marginBottom:15},sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14},
  link:{color:c.pink,fontSize:11,fontWeight:'900'},subtitle:{color:c.muted,marginBottom:18,lineHeight:22},
  stats:{gap:12,marginBottom:28},stat:{backgroundColor:c.card,borderRadius:16,borderColor:c.border,borderWidth:1,padding:22},
  statNumber:{fontSize:32,fontWeight:'900'},statLabel:{fontSize:11,fontWeight:'900',color:c.muted,marginTop:7,letterSpacing:1},
  card:{backgroundColor:c.card,borderWidth:1,borderColor:c.border,borderRadius:18,padding:20,marginBottom:14},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  time:{color:c.pink,fontSize:16,fontWeight:'900'},status:{fontSize:11,fontWeight:'900'},
  artist:{color:c.white,fontSize:26,fontWeight:'900',marginTop:12},space:{color:c.muted,fontSize:12,fontWeight:'700',marginTop:6},
  cardActions:{flexDirection:'row',flexWrap:'wrap',gap:20,borderTopWidth:1,borderTopColor:c.border,marginTop:19,paddingTop:17},
  actionText:{color:c.pink,fontSize:11,fontWeight:'900'},
  button:{backgroundColor:c.pink,borderRadius:12,padding:17,alignItems:'center',marginTop:12},
  buttonSecondary:{backgroundColor:'#292929'},buttonDanger:{backgroundColor:'#632233'},buttonText:{color:c.white,fontWeight:'900',fontSize:12},
  input:{backgroundColor:'#171717',color:c.white,borderRadius:12,borderWidth:1,borderColor:'#383838',padding:16,marginBottom:18,fontSize:15},
  filters:{gap:8,paddingBottom:16},filter:{backgroundColor:'#242424',borderRadius:9,padding:11},filterActive:{backgroundColor:c.pink},
  filterText:{color:c.white,fontSize:10,fontWeight:'900'},form:{maxWidth:650,width:'100%'},
  label:{color:c.muted,fontWeight:'900',fontSize:11,letterSpacing:1,marginBottom:8},
  choices:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18},choice:{padding:12,borderWidth:1,borderColor:c.border,backgroundColor:c.card,borderRadius:9},
  choiceActive:{backgroundColor:'#7B1947',borderColor:c.pink},choiceText:{color:c.white,fontSize:11,fontWeight:'800'},
  notice:{marginTop:22,color:c.green,fontWeight:'800'},footer:{borderTopWidth:1,borderTopColor:c.border,marginTop:38,paddingTop:20,gap:7},
  footerText:{fontSize:10,color:'#777',letterSpacing:1}
});