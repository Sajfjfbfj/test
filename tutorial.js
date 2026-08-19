/* ============================================================
   リアル八節くん - 初回チュートリアル (tutorial.js)
   ------------------------------------------------------------
   【何をするファイルか】
   ・この端末のブラウザで「本当に初めて」このアプリを開いたときだけ、
     実際の画面上の要素を実物のままスポットライトで指し示しながら
     使い方を案内します（説明カードだけを並べる旧方式ではなく、
     本物のUIをハイライトして見せる「コーチマーク」形式です）。
   ・index.html / カスタム.html / プレビュー.html / マイリスト.html /
     稽古ログ.html / 動画比較.html / 設定.html / 中高生.html …
     どのページが最初に開かれても、そのページ専用の案内内容
     （PAGE_STEPSで定義）が自動的に選ばれて表示されます。
     ページ判定はURLのファイル名を基本とし、判定できない場合は
     ページ内の特徴的な要素の有無から推測します。
   ・各ステップは対象要素がそのページに実在する場合のみ表示され、
     存在しない場合は自動的にスキップされます（保険的なチェック）。
   ・メニュー内のページ一覧を紹介するステップでは、実際にドロワーを
     開閉して見せます。
   ・既読フラグはページごとに別々のlocalStorageキー
     （kyudo_tutorial_seen_v1_ページキー、例：_index, _chukosei, _custom …）
     で管理しています。そのため「このページをこの端末で初めて開いたとき」
     に、ページごとに一度だけ自動表示されます。あるページで最後まで
     進める、または「スキップ」を押すと、そのページ分のフラグだけが
     保存され、他のページのチュートリアルには影響しません。
   ・これらのフラグはsync.jsの同期対象キーには含めていません。
     そのため「他の端末で見た／見ていない」は共有されず、あくまで
     「この端末・このページで初めてかどうか」だけで判定します。

   【使い方】
   他のhtmlファイルと同じ場所に置き、各ページの <head> 内、
   sync.js の直後あたりに
     <script src="tutorial.js"></script>
   を追加してください。

   【新しいページを追加した場合】
   下の PAGE_STEPS に、そのページ用のキーとステップ配列を追加し、
   detectPageKey() にファイル名判定の一行を足してください。
   何も一致しない場合は PAGE_STEPS.default（メニュー案内のみ）が
   使われます。
   ============================================================ */
(function () {
  'use strict';

  var SEEN_KEY_PREFIX = 'kyudo_tutorial_seen_v1_';
  var SPOTLIGHT_PAD = 8;
  var TRANSITION_MS = 340;

  /* ページ共通で使う「メニューを開いてページ一覧を見る」ステップ群 */
  var MENU_STEPS = [
    {
      icon: 'menu',
      title: 'ページを切り替える',
      body: 'ここをタップすると、他のページへ移動できるメニューが開きます。',
      selector: '#menuToggleBtn'
    },
    {
      icon: 'view_list',
      title: '目的に合わせてページを選択',
      body: '一般用・中高生用・3D編集・稽古ログ・動画比較など、目的に応じたページにここから移動できます。',
      selector: '#sideDrawer',
      requiresDrawerOpen: true
    }
  ];

  /* ページごとの専用ステップ定義
     selector: null なら画面中央のウェルカムカード表示
               指定されていれば、そのページにその要素が存在する場合のみ
               実物をスポットライトでハイライトして表示
     requiresDrawerOpen: true の場合、表示前に実際にドロワーを開く      */
  var PAGE_STEPS = {

    /* 一般用（標準モード） index.html */
    index: [
      {
        icon: 'sports_martial_arts',
        title: 'ようこそ「リアル八節くん」へ',
        body: '弓道の射法八節を3Dモデルでいつでも確認できる学習アプリです。実際の画面を見ながら、かんたんに使い方をご紹介します。',
        selector: null
      },
      {
        icon: '3d_rotation',
        title: '3Dモデルを操作する',
        body: '画面をドラッグすると、3Dモデルを自由な角度から確認できます。指先やマウスで回してみてください。',
        selector: '#viewer'
      },
      {
        icon: 'view_carousel',
        title: 'ステージを切り替える',
        body: 'ここをタップすると、足踏み〜残心まで射法八節の各姿勢に切り替えられます。',
        selector: '#stageTabs'
      },
      {
        icon: 'play_circle',
        title: '動きを再生する',
        body: 'このボタンを押すと、その段階の一連の動きをアニメーションで確認できます。',
        selector: '#playBtn'
      },
      {
        icon: 'fitness_center',
        title: '使う筋肉を確認する',
        body: '主動筋タグをタップすると、その筋肉が3Dモデル上でハイライトされます。動きと筋肉のつながりが直感的にわかります。',
        selector: '#primaryTags'
      },
      {
        icon: 'account_circle',
        title: 'アカウントで同期する',
        body: 'アカウントと連携すると、記録やお気に入りを他の端末とも同期できます。設定ページからログインできます。',
        selector: '#authHeaderBtn'
      }
    ].concat(MENU_STEPS),

    /* 中高生用（やさしい解説） 中高生.html */
    chukosei: [
      {
        icon: 'school',
        title: 'ようこそ「リアル八節くん」へ',
        body: '弓道の8つの動き（射法八節）を、3Dモデルとやさしい解説で学べるページです。実際の画面を見ながら使い方を確認しましょう。',
        selector: null
      },
      {
        icon: '3d_rotation',
        title: '3Dモデルを動かしてみよう',
        body: '画面を指でドラッグすると、モデルをぐるっと回して好きな角度から見られます。',
        selector: '#viewer'
      },
      {
        icon: 'view_carousel',
        title: 'ステージを選ぼう',
        body: 'ここをタップすると、足踏み〜残心までの8つの姿勢を切り替えられます。',
        selector: '#stageTabs'
      },
      {
        icon: 'play_circle',
        title: '動きを再生しよう',
        body: 'ボタンを押すと、その姿勢の一連の動きをアニメーションで見られます。',
        selector: '#playBtn'
      },
      {
        icon: 'menu_book',
        title: 'もっと詳しく知りたいときは',
        body: 'ここを開くと、この使い方ガイドをいつでも読み返せます。',
        selector: '#accordionGuide'
      },
      {
        icon: 'account_circle',
        title: 'アカウントで同期する',
        body: 'アカウントと連携すると、記録やお気に入りを他の端末とも同期できます。',
        selector: '#authHeaderBtn'
      }
    ].concat(MENU_STEPS),

    /* 3Dカスタマイズ（エディタ） カスタム.html */
    custom: [
      {
        icon: 'edit_note',
        title: '3Dカスタムエディタへようこそ',
        body: '射法八節の解説文や使用筋肉を自分の言葉で書き換え、オリジナルのノートとして残せるページです。実際の画面で使い方を見ていきましょう。',
        selector: null
      },
      {
        icon: 'book',
        title: 'ノートを切り替える',
        body: 'ここから、複数のノートを作ったり切り替えたりできます。用途ごとにノートを分けるのがおすすめです。',
        selector: '.uq-notebook-btn'
      },
      {
        icon: '3d_rotation',
        title: '3Dモデルで確認しながら編集',
        body: 'ドラッグで回転・ピンチで拡大しながら、姿勢を確認しつつ編集できます。',
        selector: '#viewer'
      },
      {
        icon: 'view_carousel',
        title: '編集するステージを選ぶ',
        body: 'ここで足踏み〜残心のどの段階を編集するか切り替えられます。',
        selector: '#stageTabs'
      },
      {
        icon: 'toggle_on',
        title: '編集モード／プレビュー',
        body: '「編集モード」で内容を書き込み、「プレビュー」で実際の見え方を確認できます。',
        selector: '.uq-mode-tabs'
      },
      {
        icon: 'save',
        title: '保存を忘れずに',
        body: '編集した内容はここから保存します。共有やインポートも同じ並びのボタンから行えます。',
        selector: '[onclick="saveAll()"]'
      }
    ].concat(MENU_STEPS),

    /* 閲覧専用ビュー プレビュー.html */
    preview: [
      {
        icon: 'visibility',
        title: '閲覧専用ビューへようこそ',
        body: 'ファイルや共有URLから読み込んだノートを、3Dモデルと一緒に閲覧するためのページです。',
        selector: null
      },
      {
        icon: 'file_open',
        title: 'ノートを読み込む',
        body: 'ここから、書き出したJSONファイルや共有URLを読み込んで内容を表示できます。',
        selector: '#fileInput'
      },
      {
        icon: '3d_rotation',
        title: '3Dモデルを確認する',
        body: '画面をドラッグすると、モデルを自由な角度から見られます。',
        selector: '#viewer'
      },
      {
        icon: 'view_carousel',
        title: 'ステージを切り替える',
        body: 'ここをタップすると、足踏み〜残心の各姿勢に切り替えられます。',
        selector: '#stageTabs'
      },
      {
        icon: 'star',
        title: 'お気に入りに保存する',
        body: '気に入ったノートはここからお気に入りに保存でき、マイリストページからいつでも呼び出せます。',
        selector: '[onclick="saveToFavorites()"]'
      }
    ].concat(MENU_STEPS),

    /* マイリスト マイリスト.html */
    mylist: [
      {
        icon: 'bookmarks',
        title: 'マイリストへようこそ',
        body: '編集中のノートと、お気に入り保存したノートをまとめて確認できるページです。',
        selector: null
      },
      {
        icon: 'edit_document',
        title: '編集中のノート',
        body: 'カスタムエディタで作成・編集中のノートがここに一覧表示されます。タップして編集を再開できます。',
        selector: '#editing-root'
      },
      {
        icon: 'star',
        title: 'お気に入り保存済みノート',
        body: '閲覧専用ビューで保存したお気に入りのノートは、ここにまとまります。',
        selector: '#favorites-root'
      }
    ].concat(MENU_STEPS),

    /* 稽古ログ 稽古ログ.html */
    log: [
      {
        icon: 'edit_calendar',
        title: '稽古ログへようこそ',
        body: '日々の稽古を記録して、振り返りに役立てるページです。実際の画面で使い方を見ていきましょう。',
        selector: null
      },
      {
        icon: 'analytics',
        title: '稽古の集計',
        body: '今月の稽古回数・累計回数・累計射数が自動で集計され、ここに表示されます。',
        selector: '.uq-stats-grid'
      },
      {
        icon: 'add_circle',
        title: '新しい記録を書く',
        body: 'ここを押すと入力フォームが開き、日付・場所・射数・気づきなどを記録できます。',
        selector: '#toggleFormBtn'
      },
      {
        icon: 'filter_alt',
        title: 'タグで絞り込む',
        body: '記録に付けたテーマタグで、過去のログを絞り込んで見返せます。',
        selector: '#tagFilter'
      },
      {
        icon: 'history',
        title: '稽古の履歴',
        body: 'これまでの記録が新しい順に並びます。タップすると詳細を確認・編集できます。',
        selector: '#logs-root'
      }
    ].concat(MENU_STEPS),

    /* 動画比較 動画比較.html */
    compare: [
      {
        icon: 'compare',
        title: '動画比較へようこそ',
        body: '2つの動画を並べて同期再生し、フォームの違いを見比べられるページです。',
        selector: null
      },
      {
        icon: 'splitscreen',
        title: '動画を2つ並べる',
        body: 'AとBそれぞれのスロットに動画を選んで、並べて比較できます。',
        selector: '#compareGrid'
      },
      {
        icon: 'view_column',
        title: 'レイアウトを切り替える',
        body: '左右並び・上下並びをここで切り替えられます。画面の広さに合わせてお使いください。',
        selector: '#layoutToggleBtn'
      },
      {
        icon: 'play_circle',
        title: '同期して再生する',
        body: 'ここから2つの動画を同時に再生・一時停止・コマ送りできます。シークバーで好きな位置に移動も可能です。',
        selector: '#playPauseBtn'
      },
      {
        icon: 'video_call',
        title: '動画を追加する',
        body: 'ここから新しい動画をライブラリに追加できます。',
        selector: '#addVideoBtn'
      },
      {
        icon: 'video_library',
        title: '保存済みの動画一覧',
        body: '追加した動画はここに一覧表示され、いつでもA・Bスロットに呼び出して比較できます。',
        selector: '#library-root'
      }
    ].concat(MENU_STEPS),

    /* 設定 設定.html */
    settings: [
      {
        icon: 'settings',
        title: '設定へようこそ',
        body: '表示やアカウント連携など、アプリの使い方を自分好みに調整できるページです。',
        selector: null
      },
      {
        icon: 'dark_mode',
        title: 'ダークモード',
        body: 'ここをオンにすると、暗い背景の画面に切り替わり、目の負担を軽減できます。',
        selector: '#darkToggle'
      },
      {
        icon: 'format_size',
        title: '文字サイズを調整する',
        body: 'スライダーで文字の大きさを変更できます。読みやすいサイズに調整してみてください。',
        selector: '#fontSlider'
      },
      {
        icon: 'cloud_sync',
        title: '他端末との同期',
        body: 'Googleアカウントでログインすると、タグ・記録・お気に入り・ノートなどを他の端末とも同期できます。',
        selector: '#syncBody'
      }
    ].concat(MENU_STEPS),

    /* 判定できなかった場合の最低限のフォールバック */
    default: [
      {
        icon: 'sports_martial_arts',
        title: 'ようこそ「リアル八節くん」へ',
        body: '弓道の射法八節を3Dモデルで学べる学習アプリです。まずはメニューの使い方をご案内します。',
        selector: null
      }
    ].concat(MENU_STEPS)
  };

  var STEPS = [];
  var activeSteps = [];
  var currentIndex = 0;

  var overlayEl = null;      // 中央ウェルカムカード用
  var curtainEls = null;     // スポットライト用4分割カーテン
  var ringEl = null;         // ハイライト枠
  var tooltipEl = null;      // スポットライト用吹き出し
  var drawerOpenedByUs = false;
  var reflowHandler = null;
  var currentTargetEl = null;
  var currentPageKey = null;   // このページの判定結果（ページ別の既読フラグに使う）

  /* ---------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById('ktStyles')) return;
    var style = document.createElement('style');
    style.id = 'ktStyles';
    style.textContent =
      /* --- 共通カードスタイル（ウェルカム／吹き出し兼用） --- */
      '.kt-card-body{font-family:var(--font-family,"Noto Sans JP",sans-serif);box-sizing:border-box;}' +
      '.kt-skip{position:absolute;top:14px;right:14px;background:none;border:none;' +
      'font-size:12px;font-weight:700;color:var(--text-muted,#999);padding:6px 8px;' +
      'cursor:pointer;font-family:inherit;z-index:2;}' +
      '.kt-skip:hover{color:var(--text,#111);}' +
      '.kt-icon{width:44px;height:44px;border-radius:50%;' +
      'background:var(--uq-red-light,#FFF0F0);color:var(--uq-red,#E60012);' +
      'display:flex;align-items:center;justify-content:center;margin-bottom:14px;flex-shrink:0;}' +
      '.kt-icon .material-symbols-outlined{font-size:22px;}' +
      '.kt-title{font-size:15px;font-weight:900;color:var(--text,#111);' +
      'margin-bottom:6px;line-height:1.4;}' +
      '.kt-body{font-size:13px;color:var(--text-sub,#666);line-height:1.7;margin-bottom:16px;}' +
      '.kt-dots{display:flex;gap:6px;margin-bottom:16px;}' +
      '.kt-dot{width:6px;height:6px;border-radius:50%;background:var(--line,#E5E5E5);' +
      'transition:background .2s,width .2s;flex-shrink:0;}' +
      '.kt-dot.active{background:var(--uq-red,#E60012);width:16px;border-radius:3px;}' +
      '.kt-actions{display:flex;gap:8px;}' +
      '.kt-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;' +
      'gap:6px;padding:10px 16px;border-radius:var(--radius-sm,6px);font-size:13px;' +
      'font-weight:700;border:1px solid var(--line,#E5E5E5);background:var(--bg,#fff);' +
      'color:var(--text,#111);cursor:pointer;font-family:inherit;white-space:nowrap;}' +
      '.kt-btn.primary{background:var(--uq-red,#E60012)!important;color:#FFFFFF!important;' +
      'border-color:var(--uq-red,#E60012)!important;}' +
      '.kt-btn-back{flex:0 0 40px;padding:10px 0;}' +

      /* --- ウェルカム／中央カード用オーバーレイ --- */
      '.kt-overlay{position:fixed;inset:0;background:rgba(17,17,17,0.55);z-index:9000;' +
      'display:flex;align-items:flex-end;justify-content:center;opacity:0;' +
      'pointer-events:none;transition:opacity .2s ease;}' +
      '@media (min-width:640px){.kt-overlay{align-items:center;padding:20px;}}' +
      '.kt-overlay.show{opacity:1;pointer-events:auto;}' +
      '.kt-card{background:var(--bg,#fff);width:100%;max-width:380px;' +
      'border-radius:16px 16px 0 0;padding:22px;position:relative;' +
      'box-shadow:var(--shadow-lg,0 12px 32px rgba(0,0,0,0.2));' +
      'transform:translateY(20px);transition:transform .25s cubic-bezier(.16,1,.3,1);}' +
      '@media (min-width:640px){.kt-card{border-radius:var(--radius-md,12px);' +
      'transform:translateY(0) scale(.95);}}' +
      '.kt-overlay.show .kt-card{transform:translateY(0) scale(1);}' +

      /* --- スポットライト用カーテン（対象要素の周りだけ穴が開いた暗幕） --- */
      '.kt-curtain{position:fixed;background:rgba(17,17,17,0.6);z-index:9000;' +
      'transition:top .34s cubic-bezier(.4,0,.2,1),left .34s cubic-bezier(.4,0,.2,1),' +
      'width .34s cubic-bezier(.4,0,.2,1),height .34s cubic-bezier(.4,0,.2,1),opacity .2s ease;' +
      'opacity:0;pointer-events:none;}' +
      '.kt-curtain.show{opacity:1;pointer-events:auto;}' +

      /* --- 対象要素を囲む枠＋パルス --- */
      '.kt-ring{position:fixed;z-index:9001;border-radius:14px;' +
      'border:2px solid var(--uq-red,#E60012);pointer-events:none;' +
      'box-shadow:0 0 0 4px rgba(230,0,18,0.15);' +
      'transition:top .34s cubic-bezier(.4,0,.2,1),left .34s cubic-bezier(.4,0,.2,1),' +
      'width .34s cubic-bezier(.4,0,.2,1),height .34s cubic-bezier(.4,0,.2,1),opacity .2s ease;' +
      'opacity:0;}' +
      '.kt-ring.show{opacity:1;}' +
      '.kt-ring::after{content:"";position:absolute;inset:-6px;border-radius:inherit;' +
      'border:2px solid var(--uq-red,#E60012);animation:ktPulse 1.7s ease-out infinite;}' +
      '@keyframes ktPulse{0%{opacity:.7;transform:scale(1);}100%{opacity:0;transform:scale(1.14);}}' +

      /* --- 吹き出し（スポットライト時のツールチップ） --- */
      '.kt-tooltip{position:fixed;z-index:9002;width:min(320px,calc(100vw - 32px));' +
      'background:var(--bg,#fff);border-radius:var(--radius-md,12px);padding:18px;' +
      'box-shadow:var(--shadow-lg,0 12px 32px rgba(0,0,0,0.24));opacity:0;' +
      'transform:translateY(6px) scale(.98);' +
      'transition:opacity .22s ease,transform .22s ease,top .34s cubic-bezier(.4,0,.2,1),' +
      'left .34s cubic-bezier(.4,0,.2,1);pointer-events:none;}' +
      '.kt-tooltip.show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}' +
      '.kt-tooltip .kt-icon{margin-bottom:10px;}' +
      '.kt-arrow{position:absolute;width:14px;height:14px;background:var(--bg,#fff);' +
      'transform:rotate(45deg);}' +
      '.kt-arrow.top{top:-7px;box-shadow:-2px -2px 4px rgba(0,0,0,0.03);}' +
      '.kt-arrow.bottom{bottom:-7px;box-shadow:2px 2px 4px rgba(0,0,0,0.03);}';
    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------- */
  /* 既読フラグはページごとに別キーで管理する
     （例：kyudo_tutorial_seen_v1_index / kyudo_tutorial_seen_v1_chukosei …）
     これにより「そのページを初めて開いたときだけ表示」を
     ページ単位で実現できる。 */
  function getSeenKey(pageKey) {
    return SEEN_KEY_PREFIX + (pageKey || 'default');
  }

  function markSeen() {
    try { localStorage.setItem(getSeenKey(currentPageKey), '1'); } catch (e) { /* noop */ }
  }

  function getDrawer() { return document.getElementById('sideDrawer'); }
  function getDrawerOverlay() { return document.getElementById('drawerOverlay'); }

  function isDrawerOpen() {
    var d = getDrawer();
    return !!(d && d.classList.contains('open'));
  }

  function setDrawerOpen(open) {
    var d = getDrawer();
    if (!d) return;
    var isOpen = d.classList.contains('open');
    if (isOpen === open) return;
    if (typeof window.toggleDrawer === 'function') {
      window.toggleDrawer();
    } else {
      d.classList.toggle('open');
      var ov = getDrawerOverlay();
      if (ov) ov.classList.toggle('show');
    }
  }

  /* ドロワーの開閉状態をステップの要求に合わせ、遷移完了後にcbを呼ぶ */
  function ensureDrawerState(wantOpen, cb) {
    var d = getDrawer();
    if (!d) { cb(); return; }
    var isOpen = d.classList.contains('open');
    if (isOpen === wantOpen) { cb(); return; }
    if (wantOpen) drawerOpenedByUs = true;
    setDrawerOpen(wantOpen);
    setTimeout(cb, TRANSITION_MS);
  }

  /* ---------------------------------------------------------- */
  /* 第1層：URLのファイル名から判定 */
  function detectByFilename() {
    var path = '';
    try { path = decodeURIComponent(window.location.pathname || ''); } catch (e) { path = window.location.pathname || ''; }
    var file = path.split('/').pop() || '';

    if (file.indexOf('中高生') !== -1) return 'chukosei';
    if (file.indexOf('カスタム') !== -1) return 'custom';
    if (file.indexOf('プレビュー') !== -1) return 'preview';
    if (file.indexOf('マイリスト') !== -1) return 'mylist';
    if (file.indexOf('稽古ログ') !== -1) return 'log';
    if (file.indexOf('動画比較') !== -1) return 'compare';
    if (file.indexOf('設定') !== -1) return 'settings';
    if (file === '' || file.toLowerCase() === 'index.html') return 'index';
    return null;
  }

  /* 第2層：<title>タグの文言から判定（ローカルサーバーの構成差異に強い） */
  function detectByTitle() {
    var title = document.title || '';
    if (title.indexOf('中高生向け') !== -1) return 'chukosei';
    if (title.indexOf('3Dカスタム') !== -1 || title.indexOf('エディタ') !== -1) return 'custom';
    if (title.indexOf('閲覧用プレビュー') !== -1) return 'preview';
    if (title.indexOf('マイリスト') !== -1) return 'mylist';
    if (title.indexOf('稽古ログ') !== -1) return 'log';
    if (title.indexOf('動画比較') !== -1) return 'compare';
    if (title.indexOf('設定') !== -1) return 'settings';
    if (title.indexOf('射法八節') !== -1 && title.indexOf('中高生向け') === -1) return 'index';
    return null;
  }

  /* 第3層：ページ内の特徴的な要素の有無から推測（最終フォールバック） */
  function detectByFingerprint() {
    if (document.getElementById('toggleFormBtn') || document.getElementById('statThisMonth')) return 'log';
    if (document.getElementById('compareGrid') || document.getElementById('addVideoBtn')) return 'compare';
    if (document.getElementById('darkToggle') || document.getElementById('fontSlider')) return 'settings';
    if (document.getElementById('editing-root') || document.getElementById('favorites-root')) return 'mylist';
    if (document.getElementById('tabBtnEdit') || document.querySelector('.uq-notebook-btn')) return 'custom';
    if (document.getElementById('urlModal') || document.getElementById('welcomeBox')) return 'preview';
    /* index.html と 中高生.html は構造がほぼ同じで要素だけでは区別できないため、
       ここまで来た場合は一般用（index）を既定として扱う */
    if (document.getElementById('viewer')) return 'index';
    return 'default';
  }

  function detectPageKey() {
    return detectByFilename() || detectByTitle() || detectByFingerprint();
  }

  function buildActiveSteps() {
    return STEPS.filter(function (s) {
      if (!s.selector) return true;
      try { return !!document.querySelector(s.selector); } catch (e) { return false; }
    });
  }

  /* ---------------------------------------------------------- */
  function ensureCurtainEls() {
    if (curtainEls) return;
    var sides = ['top', 'bottom', 'left', 'right'];
    curtainEls = {};
    sides.forEach(function (side) {
      var el = document.createElement('div');
      el.className = 'kt-curtain';
      el.addEventListener('click', close);
      document.body.appendChild(el);
      curtainEls[side] = el;
    });
    ringEl = document.createElement('div');
    ringEl.className = 'kt-ring';
    document.body.appendChild(ringEl);
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'kt-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function showCurtain() {
    ensureCurtainEls();
    Object.keys(curtainEls).forEach(function (k) { curtainEls[k].classList.add('show'); });
    ringEl.classList.add('show');
    tooltipEl.classList.add('show');
  }

  function hideCurtain() {
    if (!curtainEls) return;
    Object.keys(curtainEls).forEach(function (k) { curtainEls[k].classList.remove('show'); });
    ringEl.classList.remove('show');
    tooltipEl.classList.remove('show');
  }

  function removeCurtain() {
    if (!curtainEls) return;
    Object.keys(curtainEls).forEach(function (k) {
      if (curtainEls[k].parentNode) curtainEls[k].parentNode.removeChild(curtainEls[k]);
    });
    if (ringEl && ringEl.parentNode) ringEl.parentNode.removeChild(ringEl);
    if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
    curtainEls = null;
    ringEl = null;
    tooltipEl = null;
  }

  function positionOnTarget(targetEl) {
    if (!curtainEls || !targetEl) return;
    var rect = targetEl.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pad = SPOTLIGHT_PAD;

    var r = {
      left: Math.max(0, rect.left - pad),
      top: Math.max(0, rect.top - pad),
      right: Math.min(vw, rect.right + pad),
      bottom: Math.min(vh, rect.bottom + pad)
    };
    var w = Math.max(0, r.right - r.left);
    var h = Math.max(0, r.bottom - r.top);

    curtainEls.top.style.cssText = 'left:0;top:0;width:' + vw + 'px;height:' + r.top + 'px;';
    curtainEls.bottom.style.cssText = 'left:0;top:' + r.bottom + 'px;width:' + vw + 'px;height:' + Math.max(0, vh - r.bottom) + 'px;';
    curtainEls.left.style.cssText = 'left:0;top:' + r.top + 'px;width:' + r.left + 'px;height:' + h + 'px;';
    curtainEls.right.style.cssText = 'left:' + r.right + 'px;top:' + r.top + 'px;width:' + Math.max(0, vw - r.right) + 'px;height:' + h + 'px;';

    ringEl.style.left = r.left + 'px';
    ringEl.style.top = r.top + 'px';
    ringEl.style.width = w + 'px';
    ringEl.style.height = h + 'px';

    positionTooltip(r);
  }

  function positionTooltip(r) {
    var margin = 14;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var tw = tooltipEl.offsetWidth || 320;
    var th = tooltipEl.offsetHeight || 160;

    var spaceBelow = vh - r.bottom;
    var spaceAbove = r.top;
    var placement, top;

    if (spaceBelow >= th + margin) {
      placement = 'bottom';
      top = r.bottom + margin;
    } else if (spaceAbove >= th + margin) {
      placement = 'top';
      top = r.top - th - margin;
    } else {
      placement = 'bottom';
      top = Math.max(12, Math.min(vh - th - 12, r.bottom + margin));
    }

    var targetCenter = (r.left + r.right) / 2;
    var left = targetCenter - tw / 2;
    left = Math.max(12, Math.min(vw - tw - 12, left));

    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';

    var existingArrow = tooltipEl.querySelector('.kt-arrow');
    if (existingArrow) existingArrow.parentNode.removeChild(existingArrow);
    var arrow = document.createElement('div');
    arrow.className = 'kt-arrow ' + (placement === 'bottom' ? 'top' : 'bottom');
    var arrowLeft = Math.max(20, Math.min(tw - 20, targetCenter - left));
    arrow.style.left = arrowLeft + 'px';
    arrow.style.marginLeft = '-7px';
    tooltipEl.appendChild(arrow);
  }

  function attachReflow(targetEl) {
    detachReflow();
    reflowHandler = function () { positionOnTarget(targetEl); };
    window.addEventListener('resize', reflowHandler);
    window.addEventListener('scroll', reflowHandler, true);
  }

  function detachReflow() {
    if (!reflowHandler) return;
    window.removeEventListener('resize', reflowHandler);
    window.removeEventListener('scroll', reflowHandler, true);
    reflowHandler = null;
  }

  /* ---------------------------------------------------------- */
  function close() {
    markSeen();
    detachReflow();
    hideCurtain();
    removeCurtain();
    if (drawerOpenedByUs) {
      setDrawerOpen(false);
      drawerOpenedByUs = false;
    }
    if (overlayEl) {
      var el = overlayEl;
      overlayEl = null;
      el.classList.remove('show');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 220);
    }
    // sync.js が「表示中はページのリロードを保留する」ために参照するフラグ。
    // ここで false に戻し、待機中のリロードがあれば進めてよいことを伝える。
    window.kyudoTutorialActive = false;
    try {
      window.dispatchEvent(new CustomEvent('kyudoTutorialClosed'));
    } catch (e) {
      // 古い環境でCustomEventが使えない場合は無視（sync.js側のタイムアウトで救済される）
    }
  }

  function buildDots(total, index) {
    var html = '';
    for (var i = 0; i < total; i++) {
      html += '<div class="kt-dot' + (i === index ? ' active' : '') + '"></div>';
    }
    return html;
  }

  function buildActionsHtml(isFirst, isLast) {
    var backBtnHtml = !isFirst
      ? '<button class="kt-btn kt-btn-back" type="button" data-kt-back aria-label="戻る">' +
        '<span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>'
      : '';
    return '<div class="kt-actions">' + backBtnHtml +
      '<button class="kt-btn primary" type="button" data-kt-next>' +
      (isLast ? 'はじめる' : '次へ') + '</button></div>';
  }

  function bindCardEvents(root, isLast) {
    var skipBtn = root.querySelector('[data-kt-skip]');
    if (skipBtn) skipBtn.addEventListener('click', close);
    var nextBtn = root.querySelector('[data-kt-next]');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (isLast) { close(); return; }
      goToStep(currentIndex + 1);
    });
    var backBtn = root.querySelector('[data-kt-back]');
    if (backBtn) backBtn.addEventListener('click', function () {
      goToStep(Math.max(0, currentIndex - 1));
    });
  }

  /* --- ウェルカム／中央カード表示（対象要素なしのステップ用） --- */
  function renderCenteredStep(step) {
    hideCurtain();
    detachReflow();

    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'kt-overlay';
      overlayEl.innerHTML = '<div class="kt-card"></div>';
      overlayEl.addEventListener('click', function (e) {
        if (e.target === overlayEl) close();
      });
      document.body.appendChild(overlayEl);
    }

    var isLast = currentIndex === activeSteps.length - 1;
    var card = overlayEl.querySelector('.kt-card');
    card.innerHTML =
      '<button class="kt-skip" type="button" data-kt-skip>スキップ</button>' +
      '<div class="kt-icon"><span class="material-symbols-outlined">' + step.icon + '</span></div>' +
      '<div class="kt-title">' + step.title + '</div>' +
      '<div class="kt-body">' + step.body + '</div>' +
      '<div class="kt-dots">' + buildDots(activeSteps.length, currentIndex) + '</div>' +
      buildActionsHtml(currentIndex === 0, isLast);

    bindCardEvents(card, isLast);

    requestAnimationFrame(function () { overlayEl.classList.add('show'); });
  }

  /* --- 実要素をスポットライトで指し示すステップ表示 --- */
  function renderSpotlightStep(step) {
    if (overlayEl) {
      var oldOverlay = overlayEl;
      overlayEl = null;
      oldOverlay.classList.remove('show');
      setTimeout(function () {
        if (oldOverlay.parentNode) oldOverlay.parentNode.removeChild(oldOverlay);
      }, 220);
    }

    var targetEl = document.querySelector(step.selector);
    if (!targetEl) { goToStep(currentIndex + 1, true); return; }
    currentTargetEl = targetEl;

    ensureDrawerState(!!step.requiresDrawerOpen, function () {
      ensureCurtainEls();
      hideCurtain();

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      setTimeout(function () {
        var isLast = currentIndex === activeSteps.length - 1;
        tooltipEl.innerHTML =
          '<button class="kt-skip" type="button" data-kt-skip>スキップ</button>' +
          '<div class="kt-icon"><span class="material-symbols-outlined">' + step.icon + '</span></div>' +
          '<div class="kt-title">' + step.title + '</div>' +
          '<div class="kt-body">' + step.body + '</div>' +
          '<div class="kt-dots">' + buildDots(activeSteps.length, currentIndex) + '</div>' +
          buildActionsHtml(currentIndex === 0, isLast);

        bindCardEvents(tooltipEl, isLast);

        positionOnTarget(targetEl);
        showCurtain();
        attachReflow(targetEl);
      }, 380);
    });
  }

  /* ---------------------------------------------------------- */
  function renderStep() {
    var step = activeSteps[currentIndex];
    if (!step) { close(); return; }
    if (step.selector) {
      renderSpotlightStep(step);
    } else {
      hideCurtain();
      // ドロワーがチュートリアルで開いたままなら、中央カードに移る前に閉じる
      if (drawerOpenedByUs) {
        drawerOpenedByUs = false;
        ensureDrawerState(false, function () { renderCenteredStep(step); });
      } else {
        renderCenteredStep(step);
      }
    }
  }

  function goToStep(index, isAutoSkip) {
    if (index < 0) return;
    if (index >= activeSteps.length) { close(); return; }
    currentIndex = index;
    renderStep();
  }

  /* ---------------------------------------------------------- */
  function start() {
    if (!document.body) return;
    injectStyles();
    STEPS = PAGE_STEPS[currentPageKey] || PAGE_STEPS.default;
    activeSteps = buildActiveSteps();
    if (activeSteps.length === 0) { markSeen(); return; }
    currentIndex = 0;
    drawerOpenedByUs = false;
    // sync.js が同期後のページリロードを保留するために参照するフラグ。
    // close() が呼ばれるまで true のままにしておく。
    window.kyudoTutorialActive = true;
    renderStep();
  }

  /* ページ判定はDOMの要素（fingerprint判定）にも依存するため、
     既読チェックもDOM構築後（DOMContentLoaded後）に行う。 */
  function run() {
    if (!document.body) return;
    currentPageKey = detectPageKey();

    var seen;
    try { seen = localStorage.getItem(getSeenKey(currentPageKey)); } catch (e) { seen = '1'; }
    if (seen === '1') return;

    start();
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  init();
})();
