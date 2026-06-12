/* CS-FIVE Impostor — avatares de operadores ORIGINAIS (SVG, sem fotos reais) */

function shadeMix(){}

function OperatorAvatar(props){
  var k = props.kit, a = props.accent, id = props.id;
  var skin = props.skin || "#caa07a";
  var dark = "#10151d", mask = "#1b222b", eye = "#11161d";
  var gid = "oav_" + id;

  function Eyes(y){
    y = y || 50;
    return (
      <g>
        <ellipse cx="51" cy={y} rx="3.1" ry="3.6" fill={eye} />
        <ellipse cx="69" cy={y} rx="3.1" ry="3.6" fill={eye} />
        <circle cx="52.1" cy={y-1.2} r="1" fill="#cdd6e2" opacity="0.8" />
        <circle cx="70.1" cy={y-1.2} r="1" fill="#cdd6e2" opacity="0.8" />
      </g>
    );
  }

  var gear;
  switch (k) {
    case "balaclava":
      gear = (
        <g>
          <rect x="50" y="68" width="20" height="22" fill={mask} />
          <ellipse cx="60" cy="48" rx="23" ry="27" fill={mask} />
          <rect x="40" y="42" width="40" height="13" rx="6" fill={skin} />
          {Eyes(48)}
          <rect x="45" y="27" width="30" height="4" rx="2" fill={a} opacity="0.6" />
        </g>
      );
      break;
    case "goggles":
      gear = (
        <g>
          <rect x="50" y="68" width="20" height="22" fill={mask} />
          <ellipse cx="60" cy="48" rx="23" ry="27" fill={mask} />
          <rect x="34" y="42" width="52" height="14" rx="7" fill="#0c1014" stroke={a} strokeWidth="2" />
          <circle cx="50" cy="49" r="5.2" fill={a} opacity="0.5" />
          <circle cx="70" cy="49" r="5.2" fill={a} opacity="0.5" />
          <circle cx="48.4" cy="47.4" r="1.5" fill="#eaf2fb" opacity="0.85" />
          <circle cx="68.4" cy="47.4" r="1.5" fill="#eaf2fb" opacity="0.85" />
        </g>
      );
      break;
    case "helmet":
      gear = (
        <g>
          <ellipse cx="60" cy="56" rx="20" ry="22" fill={skin} />
          <rect x="45" y="60" width="30" height="17" rx="5" fill={mask} />
          <path d="M33,56 A27,27 0 0 1 87,56 Z" fill={dark} />
          <path d="M33,56 A27,27 0 0 1 87,56" fill="none" stroke={a} strokeWidth="2.4" />
          <rect x="40" y="36" width="40" height="9" rx="3" fill={a} opacity="0.75" />
          <rect x="40" y="36" width="40" height="9" rx="3" fill="none" stroke="#0c1014" strokeWidth="1.2" />
          {Eyes(53)}
        </g>
      );
      break;
    case "cap":
      gear = (
        <g>
          <ellipse cx="60" cy="53" rx="21" ry="24" fill={skin} />
          <path d="M40,40 C40,24 80,24 80,40 Z" fill="#16110c" />
          {Eyes(51)}
          <path d="M50 45 q2 -2 4 0" stroke="#3a2c20" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M66 45 q2 -2 4 0" stroke="#3a2c20" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M57 56 q3 2 6 0" stroke="#7a5234" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M37,39 C37,21 83,21 83,39 Z" fill={a} />
          <path d="M30,39 Q60,47 60,39 Z" fill={a} opacity="0.92" />
          <ellipse cx="40" cy="40" rx="13" ry="4" fill={a} />
        </g>
      );
      break;
    case "hood":
      gear = (
        <g>
          <path d="M20,120 C16,66 30,38 60,38 C90,38 104,66 100,120 Z" fill={dark} />
          <path d="M28,120 C26,72 36,48 60,48 C84,48 94,72 92,120" fill="none" stroke={a} strokeWidth="2" opacity="0.7" />
          <ellipse cx="60" cy="60" rx="18" ry="22" fill={skin} />
          {Eyes(56)}
          <rect x="46" y="64" width="28" height="13" rx="5" fill={mask} opacity="0.92" />
        </g>
      );
      break;
    case "beanie":
      gear = (
        <g>
          <ellipse cx="60" cy="55" rx="20" ry="23" fill={skin} />
          {Eyes(54)}
          <path d="M40 49 q2 -2 4 0" stroke="#3a2c20" strokeWidth="1.6" fill="none" strokeLinecap="round" transform="translate(10,-3)" />
          <path d="M38,48 C38,26 82,26 82,48 Z" fill={a} />
          <rect x="38" y="44" width="44" height="9" rx="4" fill="#0c1014" opacity="0.45" />
          <rect x="38" y="44" width="44" height="9" rx="4" fill={a} opacity="0.5" />
        </g>
      );
      break;
    default:
      gear = <ellipse cx="60" cy="50" rx="22" ry="26" fill={mask} />;
  }

  return (
    <svg viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="32%" r="85%">
          <stop offset="0%" stopColor="#1a212b" />
          <stop offset="100%" stopColor="#090d12" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill={"url(#" + gid + ")"} />
      <circle cx="60" cy="44" r="50" fill={a} opacity="0.14" />
      <path d="M8,120 C8,94 32,82 60,82 C88,82 112,94 112,120 Z" fill={dark} />
      <path d="M44,120 L60,90 L76,120 Z" fill={a} opacity="0.8" />
      <path d="M53,86 h14 v6 a7 7 0 0 1 -14 0 Z" fill={a} opacity="0.25" />
      {gear}
      <rect x="0" y="0" width="120" height="120" fill="none" />
    </svg>
  );
}

/* badges */
function BadgeCheck(){ return (
  <span className="ibadge ib-check"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>
);}
function BadgeImpostor(){ return (
  <span className="ibadge ib-imp"><svg viewBox="0 0 24 24" width="16" height="16"><ellipse cx="12" cy="11" rx="8" ry="8.5" fill="#0e0608" /><rect x="5" y="9.5" width="14" height="4.2" rx="2.1" fill="#ffd27a" /><circle cx="9" cy="11.6" r="1.5" fill="#0e0608" /><circle cx="15" cy="11.6" r="1.5" fill="#0e0608" /></svg></span>
);}
function BadgeMiss(){ return (
  <span className="ibadge ib-miss">?</span>
);}

Object.assign(window, {
  OperatorAvatar: OperatorAvatar,
  BadgeCheck: BadgeCheck,
  BadgeImpostor: BadgeImpostor,
  BadgeMiss: BadgeMiss
});
