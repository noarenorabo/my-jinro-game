import { ROLES, TEAMS } from "./gameConstants";

export type Language = "ja" | "en";

// 1つの項目に対する日英定義
type LocaleText = {
  ja: string;
  en: string;
};

// 関数型の場合の定義 (引数を受け取って日英オブジェクトを返す)
type LocaleFunc = (...args: any[]) => LocaleText;

// --- 辞書データ (Source of Truth) ---
// ここで日本語と英語を並べて管理します
const dictionary = {
  landing: {
    title: { ja: "人狼ゲーム", en: "VILLAGE OF WEREWOLF" },
    subtitle: { ja: "対面・通話プレイ専用進行ツール", en: "Face-to-face / Voice call tool" },
    createVillage: { ja: "新しく村を作る", en: "Create New Village" },
    joinVillage: { ja: "村に参加する", en: "Join Village" },
  },
  lobby: {
    yourName: { ja: "プレイヤー名", en: "Player Name" },
    inputNamePlaceholder: { ja: "名前を入力...", en: "Enter name..." },
    saveName: { ja: "名前を保存", en: "Save Name" },
    nameUpdated: { ja: "名前を更新しました", en: "Name update" },
    loading: { ja: "読み込み中...", en: "Loading..." },
    unknownMode: { ja: "未知のゲームモード", en: "Unknown Game Mode" },
    notImplemented: { ja: "このモードはまだ実装されていません。", en: "This mode is not implemented yet." },
    
    // 広告関連
    adBlockBtn: { ja: "🚫 全員の広告を非表示 (￥200)", en: "🚫 Hide All Ads ($1.50 / ¥200)" },
    adBlockPersonalBtn: { ja: "🚫 自分だけ非表示 (￥100)", en: "🚫 Hide My Ads ($0.80 / ¥100)" },
    adBlockConfirm: { 
      ja: "【模擬決済】\n200円で参加者全員の広告を非表示にしますか？", 
      en: "[Demo Payment]\nHide ads for EVERYONE in this room?" 
    },
    adBlockPersonalConfirm: { 
      ja: "【模擬決済】\n100円で自分の画面の広告だけ非表示にしますか？", 
      en: "[Demo Payment]\nHide ads for YOURSELF only?" 
    },
    adBlockSuccess: { ja: "購入ありがとうございます！この部屋の広告を非表示にしました。", en: "Thank you! Ads are now hidden for everyone." },
    adBlockPersonalSuccess: { ja: "購入ありがとうございます！あなたの広告を非表示にしました。", en: "Thank you! Ads are now hidden for you." },

    gameMode: { ja: "ゲームモード", en: "Game Mode" },
    selectMode: { ja: "モードを選択", en: "Select Mode" },
    memberList: { ja: "参加メンバー", en: "Members" },
    showQR: { ja: "QRコードを表示", en: "Show QR Code" },
    hideQR: { ja: "QRコードを隠す", en: "Hide QR Code" },
    scanToJoin: { ja: "スキャンして参加", en: "Scan to join" },
    modes: {
      werewolf: { ja: "人狼ゲーム", en: "Werewolf Game" },
      sukikirai: { ja: "好き嫌い人狼", en: "Like/Dislike Werewolf" },
    }
  },

//プライバシーポリシー
  footer: {
    privacy: { ja: "プライバシーポリシー", en: "Privacy Policy" },
    contact: { ja: "お問い合わせ", en: "Contact" },
    x: { ja: "開発者X (旧Twitter)", en: "Dev X (Twitter)" },
    copyright: { ja: "© 2026 Werewolf Party Game. All Rights Reserved.", en: "© 2026 Werewolf Party Game. All Rights Reserved." }
  },
// lib/i18n.ts の dictionary オブジェクト内の privacy セクションを以下のように書き換えてください

  privacy: {
    title: { ja: "プライバシーポリシー", en: "Privacy Policy" },
    back: { ja: "戻る", en: "Back" },
    content: {
      ja: `
        <div class="space-y-8 text-sm md:text-base leading-relaxed text-slate-300">
          
          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">1. 収集する情報について</h3>
            <p>本アプリ（人狼ゲーム / 好き嫌い人狼）では、ゲームの進行と同期のために以下の情報を一時的に収集・保存します。</p>
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-slate-400">
              <li>匿名化されたユーザーID (Firebase Authentication)</li>
              <li>ユーザーが入力したプレイヤー名</li>
              <li>ゲームルーム内の投票・アクションデータ</li>
            </ul>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">2. 広告配信について（Google AdSense）</h3>
            <p>当アプリでは、第三者配信事業者である Google が提供する広告配信サービス「Google AdSense」を利用しています。</p>
            <div class="mt-3 p-4 bg-slate-800 rounded-xl border border-slate-700 text-xs md:text-sm text-slate-400">
              <ul class="list-disc list-outside ml-4 space-y-2">
                <li>Google などの第三者配信事業者が Cookie を使用して、ユーザーが当サイトや他のウェブサイトに過去にアクセスした際の情報に基づいて広告を配信します。</li>
                <li>Google が広告 Cookie を使用することにより、ユーザーが当サイトや他のサイトにアクセスした際の情報に基づいて、Google やそのパートナーが適切な広告をユーザーに表示できます。</li>
                <li>ユーザーは、<a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">広告設定</a>でパーソナライズ広告を無効にできます。また、<a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">www.aboutads.info</a> にアクセスすれば、パーソナライズ広告に使われる第三者配信事業者の Cookie を無効にできます。</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">3. アクセス解析ツールについて</h3>
            <p>当アプリでは、Googleによるアクセス解析ツール「Googleアナリティクス」を利用しています。このGoogleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。</p>
            <p class="mt-2 text-xs text-slate-500">この機能はCookieを無効にすることで収集を拒否することが出来ますので、お使いのブラウザの設定をご確認ください。</p>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">4. 免責事項</h3>
            <p>本アプリの利用により生じたトラブル（プレイヤー間の口論など）や損害について、開発者は一切の責任を負いません。ゲームはマナーを守って楽しくプレイしてください。</p>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">5. お問い合わせ</h3>
            <p>本アプリの個人情報の取り扱いに関するお問い合わせは、以下のフォームよりご連絡ください。</p>
            <div class="mt-4 text-center">
              <a href="https://forms.gle/YOUR_FORM_ID" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all border border-slate-600 hover:border-emerald-500 group">
                <span class="mr-2">📩</span> お問い合わせフォーム (Google Form)
                <span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </section>

        </div>
      `,
      en: `
        <div class="space-y-8 text-sm md:text-base leading-relaxed text-slate-300">
          
          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">1. Information Collection</h3>
            <p>We collect and temporarily store the following information to facilitate game progression:</p>
            <ul class="list-disc list-inside ml-4 mt-2 space-y-1 text-slate-400">
              <li>Anonymous User IDs (Firebase Authentication)</li>
              <li>Player names entered by the user</li>
              <li>In-game actions and voting data</li>
            </ul>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">2. Advertising (Google AdSense)</h3>
            <p>This app uses Google AdSense to serve ads.</p>
            <div class="mt-3 p-4 bg-slate-800 rounded-xl border border-slate-700 text-xs md:text-sm text-slate-400">
              <ul class="list-disc list-outside ml-4 space-y-2">
                <li>Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.</li>
                <li>Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.</li>
                <li>Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">Ads Settings</a>. (Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">www.aboutads.info</a>.)</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">3. Analytics</h3>
            <p>We use Google Analytics to analyze traffic. It uses cookies to collect anonymous data.</p>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">4. Disclaimer</h3>
            <p>The developer is not responsible for any trouble or damages caused by the use of this app. Please play responsibly.</p>
          </section>

          <section>
            <h3 class="text-xl font-bold text-white mb-3 border-l-4 border-emerald-500 pl-3">5. Contact</h3>
            <p>For inquiries regarding privacy, please contact us via the form below.</p>
            <div class="mt-4 text-center">
              <a href="https://forms.gle/YOUR_FORM_ID" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all border border-slate-600 hover:border-emerald-500 group">
                <span class="mr-2">📩</span> Contact Form (Google Form)
                <span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </section>

        </div>
      `
    }
  },
  roles: {
    [ROLES.WEREWOLF]: { ja: "人狼", en: "Werewolf" },
    [ROLES.SEER]: { ja: "占い師", en: "Seer" },
    [ROLES.VILLAGER]: { ja: "村人", en: "Villager" },
    [ROLES.HUNTER]: { ja: "狩人", en: "Hunter" },
    [ROLES.MADMAN]: { ja: "狂人", en: "Madman" },
    [ROLES.MEDIUM]: { ja: "霊媒師", en: "Medium" },
    [ROLES.FOX]: { ja: "妖狐", en: "Fox" },
    [ROLES.TWINS]: { ja: "双子", en: "Twins" },
  },
  teams: {
    [TEAMS.VILLAGERS]: { ja: "村人陣営", en: "Villagers" },
    [TEAMS.WEREWOLVES]: { ja: "人狼陣営", en: "Werewolves" },
    [TEAMS.FOX]: { ja: "妖狐", en: "Fox" },
  },
  phases: {
    waiting: { ja: "待機中", en: "Waiting" },
    role_check: { ja: "配役確認", en: "Role Check" },
    night_announce: { ja: "夜の訪れ", en: "Nightfall" },
    night: { ja: "夜", en: "Night" },
    night_result: { ja: "朝の結果", en: "Morning Result" },
    discussion_announce: { ja: "議論開始", en: "Discussion Start" },
    discussion: { ja: "議論", en: "Discussion" },
    voting_announce: { ja: "投票開始", en: "Voting Start" },
    voting: { ja: "投票", en: "Voting" },
    finished: { ja: "終了", en: "Finished" },
    day_result: { ja: "投票結果", en: "Vote Result" },
  },
  actions: {
    extend: { ja: "⏱️ 延長 (+1分)", en: "⏱️ Extend (+1m)" },
    extended: { ja: "延長済み", en: "Extended" },
    finishVote: { ja: "✋ 議論終了", en: "✋ End Disc." },
    finishVoted: { ja: "終了に投票済", en: "Voted End" },
    startGame: { ja: "ゲームを開始する", en: "Start Game" },
    vote: { ja: "投票する", en: "Vote" },
    nightAction: { ja: "行動を確定", en: "Confirm Action" },
    sleep: { ja: "夜を過ごす", en: "Sleep" },
    confirm: { ja: "確認", en: "OK" },
    fakeRole: { ja: "騙る役職", en: "Fake Role" },
    decide: { ja: "決定", en: "Decide" },
    backToTop: { ja: "トップに戻る", en: "Back to Top" },
    backToLobby: { ja: "ロビーに戻る", en: "Back to Lobby" },
    playAgain: { ja: "再戦する", en: "Play Again" },
  },
  messages: {
    youDied: { ja: "💀 あなたは死亡しました", en: "💀 YOU DIED" },
    morningNews: { ja: "📢 朝のニュース", en: "📢 Morning News" },
    peaceful: { ja: "平和な朝を迎えました！", en: "A peaceful morning has come!" },
    // 関数もここで定義可能
    victim: (name: string) => ({ 
      ja: `昨晩、P-${name} が無残な姿で発見されました。`, 
      en: `P-${name} was found dead last night.` 
    }),
    cursed: (name: string) => ({ 
      ja: `さらに、P-${name} も謎の死を遂げました。`, 
      en: `P-${name} also died mysteriously.` 
    }),
    exiled: (name: string) => ({ 
      ja: `投票の結果、P-${name} が追放されました。`, 
      en: `P-${name} was exiled by vote.` 
    }),
    waiting: { ja: "他の人を待っています...", en: "Waiting for others..." },
    waitingForHost: { ja: "ホストの操作を待っています...", en: "Waiting for host..." },
    winner: (team: string) => ({
      ja: team === TEAMS.FOX ? "🦊 妖狐の一人勝ち" : team === TEAMS.VILLAGERS ? "🎉 村人の勝利" : "🐺 人狼の勝利",
      en: team === TEAMS.FOX ? "🦊 FOX WINS" : team === TEAMS.VILLAGERS ? "🎉 VILLAGERS WIN" : "🐺 WEREWOLVES WIN"
    }),
    roleCheck: { ja: "役職の答え合わせ", en: "Role Reveal" },
    seerTitle: { ja: "水晶の啓示", en: "Crystal Revelation" },
    mediumTitle: { ja: "霊媒結果", en: "Medium Result" },
    wolfTitle: { ja: "🐺 仲間の作戦", en: "🐺 Ally Actions" },
    twinTitle: { ja: "相方", en: "Partner" },
    isWolf: { ja: "人狼", en: "Werewolf" },
    isHuman: { ja: "人間", en: "Human" },
    priority: { ja: ["何となく", "優先的"], en: ["Random", "Priority"] }, // 配列も可
    voteProgress: { ja: "終了投票", en: "End Votes" },
    majoritySkip: { ja: "過半数でスキップ", en: "Majority to skip" },
    selectTarget: { ja: "対象を選択", en: "Select Target" },
    selectExile: { ja: "追放したい人を選択", en: "Select player to exile" },
    firstDaySeer: { ja: "初日のため行動済み", en: "Already acted for Day 1" },
  },
  sukikirai: {
    title: { ja: "好き嫌い人狼", en: "Like/Dislike Werewolf" },
    description: { 
      ja: "お題に対して「はい」「いいえ」で答え、少数派（人狼）が多数派になりすまして議論するゲームです。", 
      en: "Answer Yes/No to a topic. The minority (Wolf) tries to blend in with the majority." 
    },
    genreNormal: { ja: "ノーマル", en: "Normal" },
    genreNormalDesc: { ja: "日常の好みや習慣。誰とでも遊べる平和なジャンル", en: "Daily habits and preferences. Safe for everyone." },
    genreRomance: { ja: "ロマンス", en: "Romance" },
    genreRomanceDesc: { ja: "恋愛観についての話題。", en: "Love stories and dating views. Sweet or spicy." },
    genreTaboo: { ja: "タブー", en: "Taboo" },
    genreTabooDesc: { ja: "性癖についての話題", en: "NTR, Fetishes, etc. *Ads are automatically hidden in this mode." },
    customTopic: { ja: "自由入力（Adブロック特典）", en: "Custom Topic (Premium)" },
    adBlockRequired: { ja: "自由入力はAdブロック購入後に解放されます", en: "Unlock custom input with Ad Block." },
    startAnswering: { ja: "回答開始", en: "Start" },
    selectYes: { ja: "はい", en: "YES" },
    selectNo: { ja: "いいえ", en: "NO" },
    discussion: { ja: "議論タイム", en: "Discussion" },
    votingTitle: { ja: "誰が少数派（人狼）？", en: "Who is the Minority?" },
    voteBtn: { ja: "この人を疑う", en: "Vote" },
    voteDone: { ja: "投票完了！結果を待っています...", en: "Voted! Waiting for results..." },
    resultTitle: { ja: "結果発表", en: "Results" },
    minority: { ja: "少数派（人狼）", en: "Minority (Wolf)" },
    majority: { ja: "多数派", en: "Majority" },
    minorityWas: { ja: "少数派（人狼）は...", en: "The Minority (Wolf) was..." },
    winnerMajority: { ja: "多数派の勝利！", en: "Majority Wins!" },
    winnerMinority: { ja: "少数派（人狼）の勝利！", en: "Minority (Wolf) Wins!" },
    noOneExiled: { ja: "投票が割れたため、追放者はなし...", en: "Vote tied. No one was exiled." },
    reselectTopic: { ja: "お題を再選択する", en: "Reselect Topic" },
    reselectConfirm: { ja: "現在のお題を破棄して選び直しますか？", en: "Discard current topic and select again?" },
    ratioPreview: { ja: "回答の割合を確認", en: "Check Answer Ratio" },
    warningNoMinority: { ja: "※少数派がいないため、ゲームが成立しません。お題をやり直してください。", en: "*Game cannot proceed as there is no minority. Please reselect the topic." },
    startDiscussion: { ja: "この割合で議論を開始する", en: "Start Discussion with this ratio" },
    showAnswerDetails: { ja: "回答の内訳を公開する", en: "Reveal Answer Details" },
    showAnswerDetailsDesc: { ja: "リザルトで誰がどちらを選んだか表示します", en: "Show who voted for which option in results" },
    yesPlayers: { ja: "YESを選んだ人", en: "Voted YES" },
    noPlayers: { ja: "NOを選んだ人", en: "Voted NO" },
    rematch: { ja: "もう一度遊ぶ（お題選択へ）", en: "Play Again (Select Topic)" },
    tabooDailyLimit: { ja: "本日の無料枠は終了しました", en: "Daily free limit reached" },
    tabooLimitDesc: { ja: "Adブロックを購入すると、タブーモードを無制限で楽しめます！", en: "Purchase Ad Block to enjoy Taboo mode without limits!" },
    tabooFreeOnce: { ja: "（1日1回無料）", en: "(Free once a day)" },
    voteInstruction: (count: number) => ({ 
      ja: `少数派と思われる人を ${count} 名選んでください`, 
      en: `Select ${count} player(s) you suspect are the minority` 
    }),
    voteSubmit: { ja: "投票を確定する", en: "Submit Vote" },
    perfectWin: { ja: "完全的中！多数派の勝利", en: "Perfect Win! Majority wins." },
    minorityEscaped: { ja: "逃げ切り成功！少数派の勝利", en: "Escape Successful! Minority wins." },
  },
  // ★ ここにお題データを統合
  topics: {
    normal: [
      { ja: "きのこの山よりたけのこの里が好き？", en: "Do you prefer 'Bamboo Shoot' snacks over 'Mushroom' ones?" },
      { ja: "ポテトチップスはコンソメパンチ派？", en: "Do you prefer Consommé flavor chips over Salted?" },
      { ja: "朝食はパンよりもご飯派？", en: "Do you prefer Rice over Bread for breakfast?" },
      { ja: "夏よりも冬の方が好き？", en: "Do you like Winter more than Summer?" },
      { ja: "遊園地では絶叫マシンに乗りたい？", en: "Do you love thrill rides/roller coasters?" },
      { ja: "犬より猫派？", en: "Are you a Cat person rather than a Dog person?" },
      { ja: "目玉焼きには醤油をかける？", en: "Do you put Soy Sauce on fried eggs?" },
      { ja: "ラーメンのスープは全部飲む派？", en: "Do you drink all the Ramen broth?" },
      { ja: "お風呂は朝より夜に入るべき？", en: "Should you take a bath at night rather than in the morning?" },
      { ja: "宝くじが当たったら貯金する？", en: "Would you save the money if you won the lottery?" }
    ],
    romance: [
      { ja: "初対面で「この人いいな」と思うポイントは顔？", en: "Is 'Looks' the deciding factor for a first impression?" },
      { ja: "恋人とは毎日連絡を取り合いたい？", en: "Do you want to contact your partner every day?" },
      { ja: "過去の恋人のプレゼントは捨てずに取っておく？", en: "Do you keep gifts from your ex-partners?" },
      { ja: "ぶっちゃけ、友情より恋愛を優先するタイプ？", en: "Do you prioritize Love over Friendship?" },
      { ja: "恋人に求めるのは「包容力」より「刺激」？", en: "Do you seek 'Excitement' over 'Stability' in a partner?" },
      { ja: "一目惚れを信じる？", en: "Do you believe in love at first sight?" },
      { ja: "男女の友情は成立すると思う？", en: "Can men and women be just friends?" },
      { ja: "デート代は割り勘にするべき？", en: "Should date costs be split 50/50?" }
    ],
    taboo: [
      { ja: "実は「NTR（寝取られ）」のシチュエーションに興奮する？", en: "Does the idea of 'NTR' (Cuckolding) excite you?" },
      { ja: "特定の「フェチ（足、声、匂いなど）」が強すぎて引かれるレベル？", en: "Do you have a fetish strong enough to scare others?" },
      { ja: "パートナー以外の人に惹かれてしまうのは仕方のないことだと思う？", en: "Is it inevitable to be attracted to others while in a relationship?" },
      { ja: "支配されるよりも「支配したい」欲求の方が強い？", en: "Is your desire to 'Dominate' stronger than being 'Dominated'?" },
      { ja: "SNSの裏垢で誰にも言えない性癖を語っている？", en: "Do you talk about your kinks on a secret social media account?" },
      { ja: "「浮気」の境界線は二人きりで会うことだと思う？", en: "Is meeting someone 1-on-1 considered 'Cheating'?" },
      { ja: "お金で愛は買えると思う？", en: "Can money buy love?" },
      { ja: "誰にも言えない「黒歴史」がある？", en: "Do you have a 'Dark Past' you can never tell anyone?" }
    ]
  }
};

// --- ヘルパー関数: 辞書データを再帰的に処理して、ja/en のツリーを生成する ---
function buildTranslations(source: any, lang: Language): any {
  if (typeof source !== "object" || source === null) {
    return source;
  }

  // 配列の場合（priority: ["A", "B"] など）
  if (Array.isArray(source)) {
    // 配列の中身を再帰的に処理する
    return source.map(item => buildTranslations(item, lang));
  }

  // { ja: "...", en: "..." } の形（葉ノード）の場合
  if ("ja" in source && "en" in source && Object.keys(source).length === 2) {
    return source[lang];
  }

  // オブジェクトを再帰的に処理
  const result: any = {};
  for (const key in source) {
    const value = source[key];
    
    if (typeof value === "function") {
      // 関数の場合、実行結果の {ja, en} から lang を取り出すラッパー関数を作る
      result[key] = (...args: any[]) => {
        const res = value(...args);
        return res[lang];
      };
    } else {
      result[key] = buildTranslations(value, lang);
    }
  }
  return result;
}

// --- エクスポート ---
// translations.ja.topics.normal で日本語の配列にアクセスできるようになります
export const translations = {
  ja: buildTranslations(dictionary, "ja"),
  en: buildTranslations(dictionary, "en"),
};