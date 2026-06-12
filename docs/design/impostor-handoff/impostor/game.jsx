/* CS-FIVE Impostor — dados + jogo */

// Operadores fictícios (10). impostor = NÃO pertence à categoria do dia.
// Categoria do dia: "Já levantou um troféu de Major"
var IMP = {
  category: "Já levantou um troféu de Major",
  // posições em um plano 600x580 (centro do card)
  players: [
    { id: "viper",  name: "VIPER",  impostor: true,  kit: "helmet",    accent: "#d2484c", skin: "#caa07a", x: 215, y: 78  },
    { id: "razor",  name: "RAZOR",  impostor: true,  kit: "balaclava", accent: "#4a9fe0",                  x: 385, y: 78  },
    { id: "frost",  name: "FROST",  impostor: false, kit: "goggles",   accent: "#45b6d8",                  x: 150, y: 198 },
    { id: "echo",   name: "ECHO",   impostor: true,  kit: "cap",       accent: "#e2763a", skin: "#8a5a3a", x: 450, y: 198 },
    { id: "nyx",    name: "NYX",    impostor: true,  kit: "hood",      accent: "#8a63d6", skin: "#b97a4e", x: 96,  y: 312 },
    { id: "krieg",  name: "KRIEG",  impostor: false, kit: "helmet",    accent: "#e0a93c", skin: "#b97a4e", x: 504, y: 312 },
    { id: "drift",  name: "DRIFT",  impostor: true,  kit: "balaclava", accent: "#2eb39a",                  x: 150, y: 430 },
    { id: "halo",   name: "HALO",   impostor: false, kit: "goggles",   accent: "#cf5340", skin: "#d9a679",  x: 450, y: 430 },
    { id: "shade",  name: "SHADE",  impostor: false, kit: "beanie",    accent: "#6f7d92", skin: "#8a5a3a", x: 215, y: 545 },
    { id: "saint",  name: "SAINT",  impostor: false, kit: "balaclava", accent: "#4fae54",                  x: 385, y: 545 }
  ]
};

function ImpBrand(props){
  var size = props.size || 30, g = "#e0a93c";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }}>
      <polygon points="32,5 54,18 54,46 32,59 10,46 10,18" fill="#10151d" stroke={g} strokeWidth="3" />
      <circle cx="32" cy="32" r="9" fill="none" stroke={g} strokeWidth="3" />
      <g stroke={g} strokeWidth="3" strokeLinecap="round">
        <line x1="32" y1="14" x2="32" y2="22" /><line x1="32" y1="42" x2="32" y2="50" />
        <line x1="14" y1="32" x2="22" y2="32" /><line x1="42" y1="32" x2="50" y2="32" />
      </g>
      <circle cx="32" cy="32" r="2.5" fill={g} />
    </svg>
  );
}

function ImpHeader(props){
  var sc = props.score;
  return (
    <header className="imp-hdr">
      <div className="imp-hdr-l">
        <button className="imp-ic" title="Estatísticas">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg>
        </button>
        <div className="imp-score"><span className="sc-w">{sc.w}</span><span className="sc-d">–</span><span className="sc-l">{sc.l}</span></div>
      </div>
      <div className="imp-brand">
        <ImpBrand size={30} />
        <span className="imp-wm"><span className="wm-a">CS-</span><span className="wm-b">FIVE</span></span>
      </div>
      <div className="imp-hdr-r">
        <a className="imp-ic" href="#" onClick={function(e){e.preventDefault();}} title="Instagram"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" /></svg></a>
        <a className="imp-ic" href="#" onClick={function(e){e.preventDefault();}} title="X"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>
      </div>
    </header>
  );
}

function PlayerCard(props){
  var p = props.player, st = props.state;
  // st: "idle" | "selected" | "win-correct" | "lose-impostor" | "miss"
  var cls = "pcard pcard-" + st;
  var badge = null;
  if (st === "selected" || st === "win-correct") badge = <BadgeCheck />;
  else if (st === "lose-impostor") badge = <BadgeImpostor />;
  else if (st === "miss") badge = <BadgeMiss />;
  return (
    <button
      className={cls}
      style={{ left: p.x + "px", top: p.y + "px" }}
      onClick={props.onClick}
      disabled={props.locked}
    >
      <div className="pcard-frame">
        <div className="pcard-img"><OperatorAvatar id={p.id} kit={p.kit} accent={p.accent} skin={p.skin} /></div>
        {badge}
      </div>
      <span className="pcard-name">{p.name}</span>
    </button>
  );
}

function Impostor(){
  var players = IMP.players;
  var SKEY = "csfive_imp_state", CKEY = "csfive_imp_score";

  var initState = { selected: [], phase: "playing", revealed: false };
  try { var s = JSON.parse(localStorage.getItem(SKEY)); if (s && s.selected) initState = s; } catch (e) {}
  var initScore = { w: 0, l: 0 };
  try { var c = JSON.parse(localStorage.getItem(CKEY)); if (c) initScore = c; } catch (e) {}

  var a = React.useState(initState.selected); var selected = a[0], setSelected = a[1];
  var b = React.useState(initState.phase);    var phase = b[0], setPhase = b[1];
  var r = React.useState(initState.revealed); var revealed = r[0], setRevealed = r[1];
  var sc = React.useState(initScore);         var score = sc[0], setScore = sc[1];

  React.useEffect(function(){
    try { localStorage.setItem(SKEY, JSON.stringify({ selected: selected, phase: phase, revealed: revealed })); } catch (e) {}
  }, [selected, phase, revealed]);

  function toggle(id){
    if (phase !== "playing") return;
    setSelected(function(prev){
      return prev.indexOf(id) === -1 ? prev.concat([id]) : prev.filter(function(x){ return x !== id; });
    });
  }

  var correctIds = players.filter(function(p){ return !p.impostor; }).map(function(p){ return p.id; });
  var selImp = selected.filter(function(id){ var p = byIdImp(id); return p && p.impostor; });
  var missed = correctIds.filter(function(id){ return selected.indexOf(id) === -1; });
  var won = selImp.length === 0 && missed.length === 0;

  function byIdImp(id){ for (var i=0;i<players.length;i++){ if (players[i].id===id) return players[i]; } return null; }

  function check(){
    if (phase !== "playing") return;
    var w = selImp.length === 0 && missed.length === 0;
    setPhase("result");
    if (w) setRevealed(true);
    var ns = { w: score.w + (w?1:0), l: score.l + (w?0:1) };
    setScore(ns);
    try { localStorage.setItem(CKEY, JSON.stringify(ns)); } catch (e) {}
  }

  function reset(){
    setSelected([]); setPhase("playing"); setRevealed(false);
  }

  function stateFor(p){
    var isSel = selected.indexOf(p.id) !== -1;
    if (phase === "playing") return isSel ? "selected" : "idle";
    // result
    if (isSel && p.impostor) return "lose-impostor";
    if (isSel && !p.impostor) return "win-correct";
    if (!isSel && !p.impostor && revealed) return "miss";
    return "idle";
  }

  var result = phase === "result";

  return (
    <div className="imp-app">
      <ImpHeader score={score} />
      <main className="imp-main">
        <h1 className="imp-title"><span className="t-a">CS-</span><span className="t-b">FIVE</span> <span className="t-c">IMPOSTOR</span></h1>

        <div className="pitch-frame">
          <div className="pitch" id="pitch">
            {/* centro */}
            {!result ? (
              <div className="center-block">
                <div className="center-cap-label">A categoria é:</div>
                <div className="cat-box">{IMP.category}</div>
                <div className="avoid">Evite os <span className="avoid-red">IMPOSTORES</span></div>
              </div>
            ) : (
              <div className="center-block">
                <div className={"result-pill " + (won ? "rp-win" : "rp-lose")}>{won ? "Você venceu!" : "Você perdeu"}</div>
                <div className="result-sub">
                  {won
                    ? "Você desmascarou todos os impostores."
                    : (<span>Você selecionou <b className="rs-red">{selImp.length} impostor{selImp.length!==1?"es":""}</b> e errou {missed.length} jogador{missed.length!==1?"es":""} correto{missed.length!==1?"s":""}</span>)}
                </div>
              </div>
            )}

            {players.map(function(p){
              return <PlayerCard key={p.id} player={p} state={stateFor(p)} locked={result} onClick={function(){ toggle(p.id); }} />;
            })}
          </div>
        </div>

        {!result ? (
          <button className="check-btn" onClick={check}>Verificar</button>
        ) : (
          <div className="result-foot">
            <div className="rf-cat">A categoria de hoje era: <span className="rf-cat-b">{IMP.category}</span></div>
            <div className="rf-tom">Volte amanhã para um novo desafio!</div>
            <div className="rf-actions">
              {!won && !revealed ? (
                <button className="reveal-btn" onClick={function(){ setRevealed(true); }}>Revelar jogadores corretos</button>
              ) : null}
              <button className="again-btn" onClick={reset}>Jogar de novo</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

Object.assign(window, { Impostor: Impostor });
