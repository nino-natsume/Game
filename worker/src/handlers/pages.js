function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeHtmlAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;").replace(/`/g, "&#96;");
}

function dateText(ts) {
    if (!ts) return "-";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "-";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + " " +
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

const THEME_CSS = `
:root{--pink:#ffb7c5;--pink-2:#ff8fa3;--pink-3:#ffadc0;--text:#1f2937;--text-2:#6b7280;--bg:#fcfcfc;--card:#ffffff;--border:#e5e7eb;
--shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06);--shadow-lg:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05);}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans SC",Arial,sans-serif;line-height:1.6;color:var(--text);background:var(--bg);}
a{color:var(--pink-2);text-decoration:none;}
a:hover{text-decoration:underline;}
.grad{background:linear-gradient(135deg,var(--pink) 0%,var(--pink-2) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.header{background:var(--card);color:var(--text);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:18px;padding:14px 28px;}
.header .logo{font-size:22px;font-weight:800;letter-spacing:-.5px;white-space:nowrap;}
.header .search{flex:1;max-width:380px;padding:9px 16px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;outline:none;}
.header .search:focus{border-color:var(--pink);box-shadow:0 0 0 3px rgba(255,183,197,.25);}
.header .spacer{flex:1;}
.btn{padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s;font-family:inherit;}
.btn-primary{background:linear-gradient(135deg,var(--pink) 0%,var(--pink-2) 100%);color:#fff;box-shadow:0 4px 6px rgba(0,0,0,.1);}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 7px 12px rgba(255,143,163,.35);}
.btn-ghost{background:var(--bg);color:var(--pink-2);border:1px solid var(--pink);}
.btn-ghost:hover{background:var(--pink);color:#fff;}
.btn-plain{background:transparent;color:var(--text-2);border:1px solid var(--border);}
.btn-plain:hover{border-color:var(--pink);color:var(--pink-2);}
.user-chip{display:inline-flex;align-items:center;gap:8px;color:var(--pink-2);font-weight:600;cursor:pointer;background:var(--bg);padding:6px 14px;border-radius:8px;border:1px solid var(--border);font-size:13px;}
.user-chip:hover{border-color:var(--pink);}
.container{max-width:1100px;margin:0 auto;padding:30px 24px;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px;}
.site-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px 18px;text-align:center;cursor:pointer;transition:all .2s ease;box-shadow:var(--shadow);}
.site-card:hover{border-color:var(--pink);transform:translateY(-4px);box-shadow:var(--shadow-lg);}
.site-icon{width:72px;height:72px;margin:0 auto 14px;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,rgba(255,183,197,.25) 0%,rgba(255,143,163,.15) 100%);display:flex;align-items:center;justify-content:center;border:1px solid var(--border);}
.site-icon img{width:100%;height:100%;object-fit:cover;}
.icon-fallback{font-size:28px;font-weight:700;color:var(--pink-2);}
.site-title{font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;}
.site-desc{font-size:12px;color:var(--text-2);margin-bottom:14px;line-height:1.4;max-height:34px;overflow:hidden;text-overflow:ellipsis;}
.empty{text-align:center;color:var(--text-2);margin-top:100px;font-size:16px;}
.empty .hint{margin-top:10px;font-size:13px;}
.footer{background:var(--card);padding:2.5rem 1rem;text-align:center;margin-top:3rem;border-top:1px solid var(--border);color:var(--text-2);font-size:.9rem;}
  .footer a{color:#ff8fa3;text-decoration:none;font-weight:600;padding:0 2px;}
  .footer a:hover{text-decoration:underline;}
.modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;}
.modal-mask.open{display:flex;}
.modal-card{background:var(--card);border-radius:16px;padding:28px;max-width:360px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,.3),0 10px 10px -5px rgba(0,0,0,.2);position:relative;animation:slideUp .25s ease;}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.modal-card h3{margin:0 0 6px;font-size:20px;font-weight:800;color:var(--text);}
.modal-card .sub{font-size:12px;color:var(--text-2);margin-bottom:16px;}
.modal-card .x{position:absolute;top:14px;right:14px;cursor:pointer;color:var(--text-2);border:none;background:none;font-size:20px;line-height:1;}
.modal-card label{display:block;font-size:12px;color:var(--text-2);margin:12px 0 4px;}
.modal-card input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;outline:none;}
.modal-card input:focus{border-color:var(--pink);}
.modal-card .row{display:flex;gap:10px;margin-top:16px;}
.modal-card .row .btn{flex:1;}
.modal-card .msg{margin-top:12px;font-size:12px;text-align:center;min-height:16px;}
.modal-card .err{color:#ef4444;}
.modal-card .ok{color:#10b981;}
.modal-card .switch{margin-top:12px;text-align:center;font-size:12px;color:var(--text-2);}
.modal-card .switch a{color:var(--pink-2);cursor:pointer;font-weight:600;}
.github-btn{width:100%;margin-top:14px;padding:9px;border:1px solid var(--border);border-radius:8px;background:#fff;color:#24292f;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;transition:all .2s;}
.github-btn:hover{border-color:#24292f;background:#f6f8fa;}
.github-btn svg{width:16px;height:16px;}
.auth-or{display:flex;align-items:center;gap:10px;margin:14px 0 2px;color:var(--text-2);font-size:12px;}
.auth-or::before,.auth-or::after{content:"";flex:1;height:1px;background:var(--border);}
/* ---------- 响应式: 平板/移动端自适应 ---------- */
@media (max-width: 900px){
  .header{padding:12px 16px;gap:10px;}
  .header .logo{font-size:18px;}
  .container{padding:20px 14px;}
}
@media (max-width: 640px){
  .header{flex-wrap:wrap;}
  .header .search{order:3;flex-basis:100%;max-width:100%;}
  .container{padding:14px 12px;}
  .grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
  .site-card{padding:16px 12px;}
  .site-icon{width:60px;height:60px;}
  .modal-mask{padding:14px;}
  .modal-card{padding:20px;border-radius:14px;}
  .btn{padding:7px 12px;font-size:12px;}
  .user-chip{font-size:12px;padding:5px 10px;}
  .profile-wrap{padding:20px 14px;}
  .footer{padding:1.6rem 1rem;}
}
@media (max-width: 480px){
  .header .logo{font-size:16px;}
  .grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;}
}
`;  // THEME_CSS END

export function dashboardHtml(env, url, username, isAdmin, sites) {
    const siteCards = (sites || []).map(s => {
        const icon = s.icon || '';
        const iconSafe = escapeHtmlAttr(icon);
        const iconHtml = icon
            ? `<div class="site-icon"><img src="${iconSafe}" alt="${escapeHtmlAttr(s.title)}" onerror="this.parentElement.innerHTML='<div class=\\'icon-fallback\\'>${escapeHtmlAttr(s.title.charAt(0).toUpperCase())}</div>'"></div>`
            : `<div class="site-icon"><div class="icon-fallback">${escapeHtml(s.title.charAt(0).toUpperCase())}</div></div>`;
        const desc = s.description ? `<div class="site-desc">${escapeHtml(s.description)}</div>` : '';
        const isExternal = s.kind === 'external' && s.external_url;
        const target = isExternal ? s.external_url : `/${encodeURIComponent(s.slug)}`;
        const label = isExternal ? '外部访问' : '开始游玩';
        return `
      <div class="site-card" data-title="${escapeHtmlAttr(s.title.toLowerCase())}" onclick="goSite('${escapeHtmlAttr(target)}','${isExternal ? '1' : ''}')">
        ${iconHtml}
        <div class="site-title">${isExternal ? '🔗 ' : ''}${escapeHtml(s.title)}</div>
        ${desc}
        <button class="btn btn-primary">${label}</button>
      </div>`;
    }).join('');

    const userArea = username
        ? `<a class="user-chip" href="/me">👤 ${escapeHtml(username)}</a><button class="btn btn-plain" onclick="doLogout()">退出</button>`
        : `<button class="btn btn-ghost" onclick="openAuth('/')">登 录</button><button class="btn btn-primary" onclick="openAuth('/')">注 册</button>`;
    const adminLink = isAdmin ? `<a href="/admin" class="btn btn-plain">站点管理</a>` : '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(env.HUB_TITLE || "游戏中心")}</title>
<style>${THEME_CSS}</style>
</head>
<body>
  <div class="header">
    <div class="logo grad">🎮 ${escapeHtml(env.HUB_TITLE || "游戏中心")}</div>
    <input class="search" id="search" placeholder="搜索游戏..." oninput="filterSites()">
    <span class="spacer"></span>
    ${adminLink}
    ${userArea}
  </div>
  <div class="container">
    <div class="grid" id="siteGrid">${siteCards || '<div class="empty">暂无游戏<div class="hint">管理员可前往管理页面添加</div></div>'}</div>
    <div class="empty" id="noResults" style="display:none;">没有找到匹配的游戏</div>
  </div>
  <div class="footer">${escapeHtml(env.HUB_TITLE || "游戏中心")} · Powered by <a href="https://blog.107211.xyz" target="_blank" rel="noopener">夏沐真凉</a> <a href="https://github.com/nino-natsume/eri" target="_blank" rel="noopener">绘里酱</a></div>

  <div class="modal-mask" id="authModal">
    <div class="modal-card">
      <button class="x" onclick="closeAuth()">✕</button>
      <h3 id="authTitle">登录</h3>
      <div class="sub" id="authSub">已有账号,登录后继续游玩</div>
      <label>账号</label><input id="au" autocomplete="username">
      <label>密码</label><input id="ap" type="password" autocomplete="current-password">
      <div class="row">
        <button class="btn btn-ghost" id="authAlt" onclick="toggleAuth()">注册</button>
        <button class="btn btn-primary" onclick="doAuth()">登 录</button>
      </div>
      <div class="auth-or">或</div>
      <button class="github-btn" onclick="ghLogin()">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub 登录
      </button>
      <div class="msg" id="authMsg"></div>
    </div>
  </div>
<script>
  var __target='/';
  var __user=${username ? JSON.stringify(username) : "null"};
  function filterSites(){var q=document.getElementById('search').value.toLowerCase();var cards=document.querySelectorAll('.site-card');var visible=0;cards.forEach(function(c){var match=!q||(c.getAttribute('data-title')||'').indexOf(q)>=0;c.style.display=match?'':'none';if(match)visible++;});document.getElementById('noResults').style.display=visible?'none':'block';}
  function goSite(target,external){if(external==='1'){window.location.href=target;return;}if(__user){window.location.href=target;}else{openAuth(target);}}
  function openAuth(target){__target=target||'/';document.getElementById('authModal').classList.add('open');document.getElementById('ap').focus();}
  function closeAuth(){document.getElementById('authModal').classList.remove('open');}
  window.addEventListener('keydown',function(e){if(e.key==='Escape')closeAuth();});
  var authMode='login';
  function toggleAuth(){authMode=authMode==='login'?'register':'login';document.getElementById('authTitle').textContent=authMode==='login'?'登录':'注册';document.getElementById('authSub').textContent=authMode==='login'?'已有账号,登录后继续游玩':'新用户,注册后即可游玩';document.getElementById('authAlt').textContent=authMode==='login'?'注册':'登录';document.querySelector('#authModal .btn-primary').textContent=authMode==='login'?'登 录':'注 册';}
  function authMsg(t,ok){var e=document.getElementById('authMsg');e.className='msg '+(ok?'ok':'err');e.textContent=t;}
  async function doAuth(){var u=document.getElementById('au').value.trim();var p=document.getElementById('ap').value;if(!u||!p)return authMsg('请输入账号和密码',false);try{var r=await fetch('/api/'+(authMode==='login'?'login':'register'),{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})});var j=await r.json();if(j.ok){authMsg(authMode==='login'?'登录成功':'注册成功',true);setTimeout(function(){window.location.href=__target;},500);}else authMsg(j.error||'操作失败',false);}catch(e){authMsg('网络错误',false);}}
  function doLogout(){fetch('/api/logout',{method:'POST',credentials:'include'}).then(function(){window.location.href='/';});}
  function ghLogin(){window.location.href='/api/github/login';}
  document.getElementById('ap').addEventListener('keydown',function(e){if(e.key==='Enter')doAuth();});
</script>
</body>
</html>`;
}

export function loginPageHtml(env, url) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(env.HUB_TITLE || "游戏中心")} - 登录</title>
<style>${THEME_CSS}
  .auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
  .brand{text-align:center;margin-bottom:6px;}
  .brand h1{font-size:26px;font-weight:800;letter-spacing:-.5px;}
</style>
</head>
<body>
  <div class="auth-wrap">
    <div class="modal-card">
      <button class="x" onclick="location.href='/'">✕</button>
      <div class="brand"><h1 class="grad">🎮 ${escapeHtml(env.HUB_TITLE || "游戏中心")}</h1></div>
      <div class="sub">一个账号畅玩所有游戏</div>
      <label>账号</label><input id="au" autocomplete="username">
      <label>密码</label><input id="ap" type="password" autocomplete="current-password">
      <div class="row">
        <button class="btn btn-ghost" id="authAlt" onclick="toggleAuth()">注册</button>
        <button class="btn btn-primary" onclick="doAuth()">登 录</button>
      </div>
      <div class="auth-or">或</div>
      <button class="github-btn" onclick="ghLogin()">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub 登录
      </button>
      <div class="msg" id="authMsg"></div>
    </div>
  </div>
<script>
  var authMode='login';
  function ghLogin(){window.location.href='/api/github/login';}
  function toggleAuth(){authMode=authMode==='login'?'register':'login';document.getElementById('authAlt').textContent=authMode==='login'?'注册':'登录';document.querySelector('.btn-primary').textContent=authMode==='login'?'登 录':'注 册';}
  function authMsg(t,ok){var e=document.getElementById('authMsg');e.className='msg '+(ok?'ok':'err');e.textContent=t;}
  async function doAuth(){var u=document.getElementById('au').value.trim();var p=document.getElementById('ap').value;if(!u||!p)return authMsg('请输入账号和密码',false);try{var r=await fetch('/api/'+(authMode==='login'?'login':'register'),{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({username:u,password:p})});var j=await r.json();if(j.ok){authMsg(authMode==='login'?'登录成功':'注册成功',true);setTimeout(function(){window.location.href='/';},500);}else authMsg(j.error||'操作失败',false);}catch(e){authMsg('网络错误',false);}}
  document.getElementById('ap').addEventListener('keydown',function(e){if(e.key==='Enter')doAuth();});
</script>
</body>
</html>`;
}

export function profilePageHtml(env, url, username, createdAt, isAdmin, nickname, github) {
    const displayName = nickname || username;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>个人中心 - ${escapeHtml(env.HUB_TITLE || "游戏中心")}</title>
<style>${THEME_CSS}
  .profile-wrap{max-width:520px;margin:0 auto;padding:40px 24px;}
  .avatar{width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,var(--pink) 0%,var(--pink-2) 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;margin:0 auto 14px;box-shadow:0 8px 20px rgba(255,143,163,.4);}
  .profile-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;box-shadow:var(--shadow);}
  .profile-card .name{font-size:22px;font-weight:800;text-align:center;}
  .badge-admin{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:600;background:linear-gradient(135deg,var(--pink),var(--pink-2));color:#fff;}
  .badge-github{display:inline-block;margin-top:6px;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:600;background:#f6f8fa;color:#24292f;border:1px solid #e5e7eb;}
  .meta{text-align:center;color:var(--text-2);font-size:13px;margin-top:6px;}
  .sep{border-top:1px solid var(--border);margin:22px 0 4px;}
  .profile-card label{display:block;font-size:12px;color:var(--text-2);margin:12px 0 4px;}
  .profile-card input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:14px;outline:none;}
  .profile-card input:focus{border-color:var(--pink);}
  .profile-card .btn{width:100%;margin-top:14px;}
  .msg{margin-top:12px;font-size:12px;text-align:center;min-height:16px;}
  .msg.err{color:#ef4444;}
  .msg.ok{color:#10b981;}
  .save-row{display:flex;gap:10px;}
  .save-row .btn{flex:1;margin-top:12px;}
  @media (max-width:640px){.profile-wrap{padding:16px 12px;}.profile-card{padding:20px 16px;}.avatar{width:70px;height:70px;font-size:28px;}}
</style>
</head>
<body>
  <div class="header">
    <div class="logo grad">🎮 ${escapeHtml(env.HUB_TITLE || "游戏中心")}</div>
    <span class="spacer"></span>
    <a href="/" class="btn btn-plain">← 返回主页</a>
    <button class="btn btn-plain" onclick="doLogout()">退出</button>
  </div>
  <div class="profile-wrap">
    <div class="avatar">${escapeHtml((username || "?").charAt(0).toUpperCase())}</div>
    <div class="profile-card">
      <div class="name">${escapeHtml(displayName)}</div>
      <div class="meta">登录名: ${escapeHtml(username)} · 注册时间: ${dateText(createdAt)}</div>
      <div style="text-align:center;margin-top:4px;">
        ${isAdmin ? '<span class="badge-admin">管理员</span> ' : ''}
        ${github ? '<span class="badge-github">GitHub 账号</span>' : ''}
      </div>
      <div class="sep"></div>
      <label>自定义用户名(显示昵称, 1-24 字符)</label>
      <div class="save-row">
        <input id="nick" maxlength="24" value="${escapeHtmlAttr(displayName)}">
        <button class="btn btn-ghost" onclick="saveNick()">保存</button>
      </div>
      <div class="msg" id="nickMsg"></div>
      <div class="sep"></div>
      <label>当前密码</label><input id="oldPw" type="password" autocomplete="current-password">
      <label>新密码</label><input id="newPw" type="password" autocomplete="new-password">
      <button class="btn btn-primary" onclick="changePw()">修改密码</button>
      <div class="msg" id="pwMsg"></div>
    </div>
  </div>
<script>
  function nickMsg(t,ok){var e=document.getElementById('nickMsg');e.className='msg '+(ok?'ok':'err');e.textContent=t;}
  async function saveNick(){var n=document.getElementById('nick').value.trim();if(!n)return nickMsg('请输入名字',false);try{var r=await fetch('/api/me',{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({nickname:n})});var j=await r.json();if(j.ok){nickMsg('已保存,刷新中…',true);setTimeout(function(){location.reload();},800);}else nickMsg(j.error||'保存失败',false);}catch(e){nickMsg('网络错误',false);}}
  function pwMsg(t,ok){var e=document.getElementById('pwMsg');e.className='msg '+(ok?'ok':'err');e.textContent=t;}
  async function changePw(){var o=document.getElementById('oldPw').value;var n=document.getElementById('newPw').value;if(!o||!n)return pwMsg('请填写完整',false);try{var r=await fetch('/api/password',{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({oldPassword:o,newPassword:n})});var j=await r.json();if(j.ok){pwMsg('密码已修改,请重新登录',true);setTimeout(function(){window.location.href='/login';},1200);}else pwMsg(j.error||'修改失败',false);}catch(e){pwMsg('网络错误',false);}}
  function doLogout(){fetch('/api/logout',{method:'POST',credentials:'include'}).then(function(){window.location.href='/';});}
  document.getElementById('nick').addEventListener('keydown',function(e){if(e.key==='Enter')saveNick();});
</script>
</body>
</html>`;
}

export function adminPageHtml(env, url, username, sites) {
    const siteRows = (sites || []).map(s => {
        const statusBadge = s.enabled ? '<span class="badge badge-ok">启用</span>' : '<span class="badge badge-off">禁用</span>';
        const kindIcon = s.kind === 'external' ? '🔗' : s.kind === 'enisia' ? '🎮' : '📦';
        return `<tr><td>${s.id}</td><td><code>${escapeHtml(s.slug)}</code></td><td>${kindIcon} ${escapeHtml(s.title)}</td><td>${statusBadge}</td><td class="actions"><button class="btn-sm btn-danger" onclick="deleteSite(${s.id},'${escapeHtml(s.slug)}')">删除</button></td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>站点管理 - ${escapeHtml(env.HUB_TITLE || "游戏中心")}</title>
<style>${THEME_CSS}
  .section{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;margin-bottom:24px;box-shadow:var(--shadow);}
  .section h2{font-size:16px;font-weight:800;color:var(--text);margin-bottom:16px;}
  .form-row{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;}
  .form-row label{display:block;font-size:12px;color:var(--text-2);margin-bottom:4px;width:100%;}
  .form-row input,.form-row textarea,.form-row select{flex:1;min-width:180px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;outline:none;}
  .form-row input:focus,.form-row textarea:focus,.form-row select:focus{border-color:var(--pink);}
  .form-row textarea{resize:vertical;min-height:60px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text-2);font-weight:600;}
  td{padding:10px 12px;border-bottom:1px solid var(--border);}
  code{background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px;color:var(--pink-2);border:1px solid var(--border);}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;}
  .badge-ok{background:rgba(16,185,129,.12);color:#10b981;}
  .badge-off{background:rgba(239,68,68,.12);color:#ef4444;}
  .btn-sm{padding:4px 12px;border:none;border-radius:6px;cursor:pointer;font-size:12px;}
  .btn-danger{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);}
  .btn-danger:hover{background:rgba(239,68,68,.2);}
  .msg{margin-top:10px;font-size:12px;min-height:16px;}
  .msg.err{color:#ef4444;}
  .msg.ok{color:#10b981;}
  .hint-box{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px;margin-top:14px;font-size:12px;color:var(--text-2);line-height:1.7;}
  .hint-box code{background:var(--card);}
  .hint-box h4{color:var(--text);margin-bottom:8px;font-size:13px;}
</style>
</head>
<body>
  <div class="header">
    <div class="logo grad">⚙ 站点管理</div>
    <span class="spacer"></span>
    <a href="/" class="btn btn-plain">← 返回主页</a>
  </div>
  <div class="container" style="max-width:900px;">
    <div class="section">
      <h2>添加站点</h2>
      <div class="form-row">
        <div><label>站点标题 *</label><input id="f-title" placeholder="如: 艾妮希雅与契约纹"></div>
        <div><label>Slug (访问路径) *</label><input id="f-slug" placeholder="如: enisia"></div>
      </div>
      <div class="form-row">
        <div><label>图标 URL</label><input id="f-icon" placeholder="https://..."></div>
        <div><label>主题色</label><input id="f-color" type="color" value="#ffb7c5"></div>
      </div>
      <div class="form-row">
        <div><label>类型</label>
          <select id="f-kind">
            <option value="r2">本站托管 (R2 通用桶)</option>
            <option value="enisia">原 enisia 兼容 (enisia-game-* 桶)</option>
            <option value="external">外部链接</option>
          </select>
        </div>
        <div><label>外部链接 (external 类型)</label><input id="f-url" placeholder="https://..."></div>
      </div>
      <div class="form-row">
        <div style="width:100%"><label>描述</label><textarea id="f-desc" placeholder="简短描述这个游戏…"></textarea></div>
      </div>
      <button class="btn btn-primary" onclick="addSite()">添加站点</button>
      <div class="msg" id="addMsg"></div>
      <div class="hint-box">
        <h4>添加步骤</h4>
        1. 填写表单,点击「添加站点」<br>
        2. external 类型: 填写外部链接,主页卡片直接跳转<br>
        3. enisia 类型: 直接复用 enisia-game-assets / enisia-game-saves,无需新桶<br>
        4. r2 类型: 创建 R2 bucket:<br>
        &nbsp;&nbsp;<code>wrangler r2 bucket create hub-site-{slug}-assets</code><br>
        &nbsp;&nbsp;<code>wrangler r2 bucket create hub-site-{slug}-saves</code><br>
        并在 wrangler.toml 追加 <code>{SLUG}_ASSETS</code> / <code>{SLUG}_SAVES</code> 绑定后重新部署
      </div>
    </div>
    <div class="section">
      <h2>已添加站点</h2>
      <table>
        <thead><tr><th>ID</th><th>Slug</th><th>标题</th><th>状态</th><th>操作</th></tr></thead>
        <tbody id="siteTable">${siteRows || '<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:30px;">暂无站点</td></tr>'}</tbody>
      </table>
    </div>
  </div>
<script>
  function showMsg(id,text,ok){var e=document.getElementById(id);e.className='msg '+(ok?'ok':'err');e.textContent=text;}
  async function addSite(){var title=document.getElementById('f-title').value.trim();var slug=document.getElementById('f-slug').value.trim().toLowerCase();var desc=document.getElementById('f-desc').value.trim();var icon=document.getElementById('f-icon').value.trim();var color=document.getElementById('f-color').value;var kind=document.getElementById('f-kind').value;var url=document.getElementById('f-url').value.trim();if(!title||!slug)return showMsg('addMsg','标题和 Slug 必填',false);try{var r=await fetch('/api/sites',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({slug:slug,title:title,description:desc,icon:icon,theme_color:color,kind:kind,external_url:url})});var j=await r.json();if(j.ok){showMsg('addMsg','添加成功!',true);setTimeout(function(){location.reload();},1200);}else showMsg('addMsg',j.error||'添加失败',false);}catch(e){showMsg('addMsg','网络错误',false);}}
  async function deleteSite(id,slug){if(!confirm('确定删除站点 "'+slug+'" ？'))return;try{var r=await fetch('/api/sites/'+id,{method:'DELETE',credentials:'include'});var j=await r.json();if(j.ok){location.reload();}else alert(j.error||'删除失败');}catch(e){alert('网络错误');}}
</script>
</body>
</html>`;
}

function gameShell(env, url, username, site, assetPrefix, saveBase, cloudApiBase, baseHref) {
    const base = url.origin;
    const slug = site.slug;
    const gameTitle = site.title;
    const assets = assetPrefix;
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
${baseHref ? '<base href="' + escapeHtml(baseHref) + '">' : ''}
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="viewport" content="user-scalable=no">
<link rel="icon" href="${assets}/icon/icon.png" type="image/png">
<link rel="apple-touch-icon" href="${assets}/icon/icon.png">
<link rel="stylesheet" type="text/css" href="${assets}/css/game.css">
<title>${escapeHtml(gameTitle)}</title>
<style>
  body{margin:0;background:#000;overflow:hidden;}
  #cloudbar{position:fixed;top:0;left:0;right:0;height:38px;z-index:9999;background:#ffffff;color:#1f2937;display:flex;align-items:center;padding:0 14px;gap:10px;font:13px/-apple-system,'Segoe UI','Noto Sans SC',sans-serif;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.08);}
  #cloudbar .user{color:#ff8fa3;font-weight:700;white-space:nowrap;}
  #cloudbar .spacer{flex:1;}
  #cloudbar .site-title{color:#6b7280;font-size:12px;}
  #cloudbar button{margin-left:8px;padding:4px 12px;background:#fff;color:#ff8fa3;border:1px solid #ffb7c5;border-radius:6px;cursor:pointer;font-size:12px;font-family:inherit;}
  #cloudbar button:hover{background:#ffb7c5;color:#fff;}
  #cloudbar .back{color:#6b7280;border-color:#e5e7eb;}
  #acctModal{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);}
  #acctModal.open{display:flex;}
  .modal-card{width:320px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px;color:#1f2937;font-family:-apple-system,'Segoe UI','Noto Sans SC',sans-serif;box-shadow:0 20px 25px -5px rgba(0,0,0,.3);}
  .modal-card h3{margin:0 0 14px;font-size:16px;font-weight:800;display:flex;justify-content:space-between;align-items:center;}
  .modal-card .x{cursor:pointer;color:#6b7280;border:none;background:none;font-size:18px;}
  .modal-card label{display:block;font-size:12px;color:#6b7280;margin:10px 0 4px;}
  .modal-card input{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fcfcfc;color:#1f2937;font-size:13px;outline:none;box-sizing:border-box;}
  .modal-card input:focus{border-color:#ffb7c5;}
  .modal-card button{width:100%;margin-top:12px;padding:9px;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-family:inherit;}
  .modal-card .primary{background:linear-gradient(135deg,#ffb7c5,#ff8fa3);color:#fff;font-weight:700;}
  .modal-card .secondary{background:#fcfcfc;color:#ff8fa3;border:1px solid #ffb7c5;}
  .modal-card .sep{border-top:1px solid #e5e7eb;margin:16px 0 4px;}
  .modal-card .hint{font-size:11px;color:#6b7280;margin:10px 0 0;text-align:center;min-height:14px;}
  .modal-card .err{color:#ef4444;}
  .modal-card .ok{color:#10b981;}
  .modal-card .filebtn{position:relative;overflow:hidden;}
  .modal-card .filebtn input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;}
  #rotateOverlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:linear-gradient(160deg,#fff 0%,#ffeef3 45%,#ffd7e2 100%);color:#1f2937;font-family:-apple-system,'Segoe UI','Noto Sans SC',sans-serif;text-align:center;padding:30px;flex-direction:column;}
  #rotateOverlay.open{display:flex;}
  .rot-scene{position:relative;width:150px;height:150px;margin-bottom:22px;}
  .rot-halo{position:absolute;inset:10px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,183,197,.55),rgba(255,183,197,0));animation:halo 2.2s ease-in-out infinite;}
  .rot-phone{position:absolute;top:0;left:50%;transform:translateX(-50%);width:76px;height:132px;border-radius:18px;background:linear-gradient(145deg,#fff,#ffeef2);border:3px solid #ffb7c5;box-shadow:0 14px 30px rgba(255,143,163,.35);animation:galaxy-rotate 2.6s cubic-bezier(.45,.05,.55,.95) infinite;display:flex;align-items:center;justify-content:center;}
  .rot-phone::before{content:"";position:absolute;top:7px;left:50%;width:22px;height:5px;transform:translateX(-50%);border-radius:4px;background:#ffd7e2;}
  .rot-phone::after{content:"";width:36px;height:36px;border-radius:50%;background:conic-gradient(from 0deg,#ffb7c5,#ff5c85,#ffb7c5);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));animation:spin 1.1s linear infinite;}
  @keyframes galaxy-rotate{0%,100%{transform:translateX(-50%) rotate(-30deg) translateY(-3px);}50%{transform:translateX(-50%) rotate(30deg) translateY(5px);}}
  @keyframes halo{0%,100%{transform:scale(.88);opacity:.55;}50%{transform:scale(1.18);opacity:1;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  #rotateOverlay h2{font-size:22px;font-weight:800;letter-spacing:.5px;background:linear-gradient(135deg,#ff8fa3,#ff5c85);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin:0 0 10px;animation:fadeUp 1s ease both;}
  #rotateOverlay p{font-size:14px;color:#9b6b76;margin:0;animation:fadeUp 1s .18s ease both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
  @media (max-width:640px){#cloudbar .site-title{display:none;}#cloudbar{padding:0 8px;}#cloudbar button{padding:4px 8px;font-size:11px;}}
</style>
</head>
<body style="background-color:black">
  <div id="rotateOverlay"><div class="rot-scene"><div class="rot-halo"></div><div class="rot-phone"></div></div><h2>请横屏游玩</h2><p>将设备旋转至横向,获得更好的游戏体验</p></div>
  <div id="cloudbar">
    <a class="back" href="/" style="color:#6b7280;text-decoration:none;font-weight:600;">← 主页</a>
    <span class="site-title">${escapeHtml(gameTitle)}</span>
    <span class="spacer"></span>
    <button id="fsBtn" onclick="fsToggle()">全屏</button>
    <span class="user">👤 ${escapeHtml(username)}</span>
    <button onclick="openAcct()">账号</button>
    <button onclick="logout()">退出登录</button>
  </div>

  <div id="acctModal">
    <div class="modal-card">
      <h3>账号「${escapeHtml(username)}」<button class="x" onclick="closeAcct()">✕</button></h3>
      <div>
        <label>当前密码</label><input id="oldPw" type="password" autocomplete="current-password">
        <label>新密码</label><input id="newPw" type="password" autocomplete="new-password">
        <button class="primary" onclick="changePw()">修改密码</button>
      </div>
      <div class="sep"></div>
      <button class="secondary" onclick="exportSave()">导出存档</button>
      <button class="secondary filebtn">导入存档
        <input type="file" accept="application/json,.json" onchange="importSave(event)">
      </button>
      <div class="hint" id="acctMsg"></div>
    </div>
  </div>

  <script>
    window.CloudSaveConfig = { apiBase: '${cloudApiBase}', username: '${escapeHtml(username)}' };
    function logout(){fetch('/api/logout',{method:'POST',credentials:'include'}).then(function(){window.location.href='/';});}
    function openAcct(){document.getElementById('acctModal').classList.add('open');}
    function closeAcct(){document.getElementById('acctModal').classList.remove('open');}
    window.addEventListener('keydown',function(e){if(e.key==='Escape')closeAcct();});
    function acctMsg(t,ok){var e=document.getElementById('acctMsg');e.className='hint '+(ok?'ok':'err');e.textContent=t;}
    async function changePw(){var o=document.getElementById('oldPw').value;var n=document.getElementById('newPw').value;if(!o||!n)return acctMsg('请填写完整',false);try{var r=await fetch('/api/password',{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({oldPassword:o,newPassword:n})});var j=await r.json();if(j.ok){acctMsg('密码已修改,请重新登录',true);setTimeout(function(){window.location.href='/login';},1200);}else acctMsg(j.error||'修改失败',false);}catch(e){acctMsg('网络错误',false);}}
    async function exportSave(){try{var r=await fetch('${saveBase}',{method:'GET',credentials:'include'});var j=await r.json();if(!j.ok)return acctMsg('读取存档失败',false);var blob=new Blob([JSON.stringify(j.data,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='${escapeHtml(slug)}-save-${escapeHtml(username)}-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);acctMsg('已导出,请妥善保存到本地',true);}catch(e){acctMsg('网络错误',false);}}
    async function importSave(event){var file=event.target.files[0];if(!file)return;if(!confirm('导入将覆盖云端存档,确定继续?')){event.target.value='';return;}try{var text=await file.text();var data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))return acctMsg('文件格式不对',false);var r=await fetch('${saveBase}',{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({data:data})});var j=await r.json();if(j.ok){acctMsg('导入成功,刷新中…',true);setTimeout(function(){location.reload();},1000);}else acctMsg(j.error||'导入失败',false);}catch(e){acctMsg('文件解析失败',false);}event.target.value='';}
    (function(){var isTouch=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);var ov=document.getElementById('rotateOverlay');function check(){if(isTouch&&window.innerHeight>window.innerWidth){ov.classList.add('open');}else{ov.classList.remove('open');}}window.addEventListener('resize',check);window.addEventListener('orientationchange',check);check();})();
    var fsBtn=document.getElementById('fsBtn');
    function isFS(){return !!(document.fullscreenElement||document.webkitFullscreenElement||document.msFullscreenElement);}
    function callNoop(){}
    var fsEl=document.documentElement;
    var fsSupported=!!(fsEl.requestFullscreen||fsEl.webkitRequestFullscreen||fsEl.msRequestFullscreen);
    function requestFS(){
      if(!fsSupported)return fsHint();
      var r=fsEl.requestFullscreen||fsEl.webkitRequestFullscreen||fsEl.msRequestFullscreen;
      try{var p=r.call(fsEl);if(p&&p.catch)p.catch(function(){});return p;}catch(e){return null;}
    }
    function exitFS(){var d=document;(d.exitFullscreen||d.webkitExitFullscreen||d.msExitFullscreen||callNoop).call(d);}
    function fsToggle(){if(isFS())exitFS();else requestFS();}
    function syncFs(){
      // 触屏设备(手机/平板)全屏时隐藏整行按钮,用设备默认方式退出后本行恢复显示
      var coarse=window.matchMedia&&matchMedia('(any-pointer: coarse)').matches;
      var bar=document.getElementById('cloudbar');
      if(bar)bar.style.display=(coarse&&isFS())?'none':'';
      if(fsBtn){fsBtn.textContent=isFS()?'退出全屏':'全屏';}
    }
    document.addEventListener('fullscreenchange',syncFs);
    document.addEventListener('webkitfullscreenchange',syncFs);
    // 进入游戏默认全屏: 加载即请求; 若被浏览器拦截, 首次用户交互(点击/触摸/按键)时立即再请求
    requestFS();
    var fsArmed=true;
    function fsArm(){if(!fsArmed)return;fsArmed=false;if(!isFS())requestFS();}
    ['pointerdown','touchstart','keydown'].forEach(function(ev){document.addEventListener(ev,fsArm,{passive:true});});
    // 不支持网页全屏的环境(如 iOS Safari)给个提示
    var fsHintTimer=null;
    function fsHint(){
      if(fsHintTimer)return;
      var d=document.createElement('div');
      d.textContent='当前浏览器不支持网页全屏,可在浏览器菜单或设备上开启,或添加到主屏幕全屏游玩';
      d.style.cssText='position:fixed;left:50%;bottom:16%;transform:translateX(-50%);background:rgba(60,20,35,.92);color:#fff;padding:10px 16px;border-radius:12px;font-size:13px;z-index:99999;max-width:82%;text-align:center;pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.25);';
      document.body.appendChild(d);
      fsHintTimer=setTimeout(function(){d.remove();fsHintTimer=null;},3500);
    }
    syncFs();
  </script>
  <script type="text/javascript" src="${assets}/js/plugins/CloudSave.js"></script>
  <script type="text/javascript" src="${assets}/js/main.js"></script>
</body>
</html>`;
}

export function enisiaGamePageHtml(env, url, username, site) {
    return gameShell(env, url, username, site, "/enisia/assets", "/enisia/api/save", "/enisia", "/enisia/");
}

export function gamePageHtml(env, url, username, site) {
    const slug = site.slug;
    const assets = `/${slug}/assets`;
    return gameShell(env, url, username, site, assets, `/${slug}/api/save`, `/${slug}`);
}