// lib/topics.ts

export type LocalizedTopic = {
  ja: string;
  en: string;
};

// i18n.ts で読み込むため、変数名を TOPIC_DATA としています
export const TOPIC_DATA = {
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
};