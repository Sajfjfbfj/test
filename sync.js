/* ============================================================
   リアル八節くん - Googleドライブ同期モジュール (sync.js)
   ------------------------------------------------------------
   【使い方】
   1. Google Cloud ConsoleでOAuthクライアントID(ウェブアプリケーション用)
      を作成し、下の GOOGLE_CLIENT_ID にそのIDを貼り付けてください。
      （クライアントIDは秘密情報ではないので、コードに直接書いて
       問題ありません）
   2. このファイルを他のhtmlファイルと同じ場所に置き、
      各ページの <head> 内、他の自作スクリプトより前に
        <script src="sync.js"></script>
      を追加してください。

   【何をするファイルか】
   ・タグ/記録/お気に入り/ノート/設定など「テキスト系のデータ」だけを
     対象に、Googleドライブの「アプリ専用データフォルダ
     (appDataFolder)」へバックアップ・復元します。
     ※ このフォルダはユーザー本人のドライブ内にありますが、
       Googleドライブの画面には表示されない、このアプリ専用の
       隠しスペースです。他のファイルには一切アクセスしません。
   ・動画ファイル本体（IndexedDB内の実データ）は対象外です
     （容量が大きいため、今回は同期しません）。

   【今回の修正点】
   ・アクセストークンをページ内変数だけでなく sessionStorage にも
     保存するようにしました。
     これまでは別ページに移動するたびにトークンがメモリ上から
     消えてしまい、毎回Googleへサイレント再認証をリクエストして
     いたため、本番環境（サードパーティCookie制限やFedCMの影響）
     ではその都度アカウント選択画面が出てしまっていました。
     sessionStorageに保存することで、有効期限内（通常1時間）は
     ページを移動してもGoogleに問い合わせ直さずに済むようになり、
     ログイン選択画面が毎回出る問題が解消されます。
   ============================================================ */
(function () {
  'use strict';

  // ↓↓↓ ここにGoogle CloudのOAuthクライアントIDを貼り付けてください ↓↓↓
  var GOOGLE_CLIENT_ID = '134964743683-sb7acs2lha9afcao2a4lo1p5jedaajlj.apps.googleusercontent.com';
  // ↑↑↑ ここまで ↑↑↑

  var SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
  var SYNC_FILE_NAME = 'kyudo_sync_data.json';
  var LAST_SYNC_KEY = 'kyudo_sync_last_synced_at';
  var SIGNED_IN_KEY = 'kyudo_sync_signed_in';
  var RELOAD_GUARD_PREFIX = 'kyudo_sync_reload_guard:';

  // ---- トークンキャッシュ用（ページ遷移をまたいで保持するため sessionStorage を使用） ----
  var TOKEN_KEY = 'kyudo_sync_access_token';
  var TOKEN_EXPIRES_KEY = 'kyudo_sync_token_expires_at';
  var EMAIL_KEY = 'kyudo_sync_email';

  // 同期対象のlocalStorageキー一覧（動画本体は対象外・メタ情報のみ）
  var SYNC_KEYS = [
    'kyudo_notebooks_v1',        // カスタム/マイリスト：ノート内容
    'kyudo_active_notebook',     // 選択中のノート
    'kyudo_custom_notes_v2',     // 旧形式ノート（移行用）
    'kyudo_favorites',           // お気に入り
    'kyudo_practice_logs_v1',    // 稽古ログ：記録
    'kyudo_practice_custom_tags_v1', // 稽古ログ：追加したタグ
    'kyudo_video_meta_v1',       // 動画比較：タイトル/タグ等（動画本体は対象外）
    'kyudo_dark_mode',           // ダークモード設定
    'kyudo_font_scale',          // 文字サイズ設定
    'kyudo_anim'                 // アニメーション設定
  ];

  // ---- ページ読み込み時に sessionStorage からトークンを復元 ----
  var accessToken = null;
  var tokenExpiresAt = 0;
  var currentUserEmail = null;
  (function restoreTokenFromSession() {
    try {
      var savedToken = sessionStorage.getItem(TOKEN_KEY);
      var savedExpires = Number(sessionStorage.getItem(TOKEN_EXPIRES_KEY) || 0);
      if (savedToken && savedExpires && Date.now() < savedExpires - 60000) {
        accessToken = savedToken;
        tokenExpiresAt = savedExpires;
        currentUserEmail = sessionStorage.getItem(EMAIL_KEY) || null;
      }
    } catch (e) { /* sessionStorageが使えない環境（プライベートモード等）は無視 */ }
  })();

  function persistToken() {
    try {
      if (accessToken) {
        sessionStorage.setItem(TOKEN_KEY, accessToken);
        sessionStorage.setItem(TOKEN_EXPIRES_KEY, String(tokenExpiresAt));
        if (currentUserEmail) sessionStorage.setItem(EMAIL_KEY, currentUserEmail);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
        sessionStorage.removeItem(EMAIL_KEY);
      }
    } catch (e) { /* noop */ }
  }

  var tokenClient = null;
  var gisLoadPromise = null;
  var pushTimer = null;
  var listeners = [];

  function notify() {
    var status = window.kyudoSyncStatus();
    listeners.forEach(function (fn) {
      try { fn(status); } catch (e) { /* noop */ }
    });
  }

  window.kyudoSyncOnChange = function (fn) {
    listeners.push(fn);
    fn(window.kyudoSyncStatus());
  };

  window.kyudoSyncStatus = function () {
    return {
      signedIn: !!accessToken,
      email: currentUserEmail,
      lastSyncedAt: localStorage.getItem(LAST_SYNC_KEY) || null,
      configured: !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.indexOf('YOUR_CLIENT_ID') === -1
    };
  };

  function loadGis() {
    if (gisLoadPromise) return gisLoadPromise;
    gisLoadPromise = new Promise(function (resolve, reject) {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Google Identity Servicesの読み込みに失敗しました')); };
      document.head.appendChild(s);
    });
    return gisLoadPromise;
  }

  function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: function () {} // requestToken()内で都度上書き
    });
    return tokenClient;
  }

  function requestToken(promptMode) {
    return loadGis().then(function () {
      return new Promise(function (resolve, reject) {
        var client = ensureTokenClient();
        client.callback = function (resp) {
          if (resp && resp.access_token) {
            accessToken = resp.access_token;
            tokenExpiresAt = Date.now() + (Number(resp.expires_in || 3600) * 1000);
            persistToken();
            fetchUserEmail().then(function () { persistToken(); notify(); resolve(resp); });
          } else {
            reject(resp);
          }
        };
        client.error_callback = function (err) { reject(err); };
        client.requestAccessToken({ prompt: promptMode });
      });
    });
  }

  function fetchUserEmail() {
    if (!accessToken) return Promise.resolve();
    if (currentUserEmail) return Promise.resolve(); // 既に持っていれば再取得不要
    return fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + accessToken }
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) { if (info && info.email) currentUserEmail = info.email; })
      .catch(function () {});
  }

  function ensureFreshToken() {
    // sessionStorageから復元済み、またはメモリ上にまだ有効なトークンがあればそのまま使う
    // （＝ページ遷移してもGoogleへ問い合わせ直さない）
    if (accessToken && Date.now() < tokenExpiresAt - 60000) {
      return Promise.resolve(accessToken);
    }
    // サイレント（ポップアップなし）で再取得を試みる。
    // 失敗した場合は明示的なサインインが必要。
    return requestToken('').then(function () { return accessToken; }).catch(function () {
      accessToken = null;
      persistToken();
      notify();
      return null;
    });
  }

  window.kyudoSyncSignIn = function () {
    return requestToken('consent').then(function () {
      localStorage.setItem(SIGNED_IN_KEY, '1');
      return window.kyudoSyncPull().catch(function () {});
    });
  };

  window.kyudoSyncSignOut = function () {
    var done = function () {
      accessToken = null;
      currentUserEmail = null;
      tokenExpiresAt = 0;
      persistToken();
      localStorage.removeItem(SIGNED_IN_KEY);
      notify();
    };
    if (accessToken && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(accessToken, done); } catch (e) { done(); }
    } else {
      done();
    }
  };

  function collectSyncPayload() {
    var data = {};
    SYNC_KEYS.forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v !== null) data[k] = v;
    });
    return { updatedAt: Date.now(), data: data };
  }

  function findSyncFileId() {
    var q = "name='" + SYNC_FILE_NAME + "'";
    return fetch('https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      spaces: 'appDataFolder',
      q: q,
      fields: 'files(id,name)'
    }), { headers: { Authorization: 'Bearer ' + accessToken } })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        return (json.files && json.files[0]) ? json.files[0].id : null;
      });
  }

  window.kyudoSyncPush = function () {
    return ensureFreshToken().then(function (token) {
      if (!token) throw new Error('not-signed-in');
      var payload = JSON.stringify(collectSyncPayload());
      return findSyncFileId().then(function (fileId) {
        var metadata = { name: SYNC_FILE_NAME, mimeType: 'application/json' };
        if (!fileId) metadata.parents = ['appDataFolder'];
        var boundary = 'kyudosync' + Date.now();
        var body =
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: application/json\r\n\r\n' +
          payload + '\r\n' +
          '--' + boundary + '--';
        var url = fileId
          ? 'https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=multipart'
          : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        return fetch(url, {
          method: fileId ? 'PATCH' : 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'multipart/related; boundary=' + boundary
          },
          body: body
        });
      }).then(function (r) {
        if (!r.ok) throw new Error('upload-failed');
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        notify();
      });
    });
  };

  window.kyudoSyncPull = function () {
    return ensureFreshToken().then(function (token) {
      if (!token) throw new Error('not-signed-in');
      return findSyncFileId().then(function (fileId) {
        if (!fileId) return null;
        return fetch('https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media', {
          headers: { Authorization: 'Bearer ' + token }
        }).then(function (r) { return r.ok ? r.json() : null; });
      });
    }).then(function (remote) {
      if (!remote || !remote.data) return false;
      var changed = false;
      SYNC_KEYS.forEach(function (k) {
        var remoteVal = remote.data[k];
        var localVal = localStorage.getItem(k);
        if (remoteVal !== undefined && remoteVal !== localVal) {
          rawSetItem.call(localStorage, k, remoteVal);
          changed = true;
        }
      });
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      notify();
      return changed;
    });
  };

  // ---- 保存を検知したら自動でアップロード（3秒デバウンス） ----
  var rawSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    rawSetItem.call(this, key, value);
    if (SYNC_KEYS.indexOf(key) !== -1 && accessToken) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(function () {
        window.kyudoSyncPush().catch(function () {});
      }, 3000);
    }
  };

  // ---- ページ読み込み時：以前サインイン済みならサイレントで再認証→最新を取得 ----
  function initialPull() {
    if (localStorage.getItem(SIGNED_IN_KEY) !== '1') return;
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.indexOf('YOUR_CLIENT_ID') !== -1) return;
    ensureFreshToken().then(function (token) {
      if (!token) return;
      return window.kyudoSyncPull().then(function (changed) {
        if (changed) {
          var guardKey = RELOAD_GUARD_PREFIX + location.pathname;
          if (!sessionStorage.getItem(guardKey)) {
            sessionStorage.setItem(guardKey, '1');
            location.reload();
          }
        }
      });
    }).catch(function () {});
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initialPull, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initialPull);
  }
})();
