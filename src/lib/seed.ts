import type Database from "better-sqlite3";
import type { Plan } from "./ai";

// 見本データ。⚠️ チームも人も、すべて架空。実在の人やチームの名前を入れない

const TEAMS: [number, string, string, string][] = [
  [1, "ヘルプデスク", "HD", "社内からの問い合わせの窓口"],
  [2, "端末管理", "EP", "PC・スマホの配布と管理"],
  [3, "インフラ運用", "INF", "サーバーと夜間処理の運用"],
  [4, "ネットワーク", "NW", "拠点とクラウドのネットワーク"],
  [5, "セキュリティ", "SEC", "アカウントと情報の守り"],
  [6, "アプリ開発", "APP", "社内システムの開発と保守"],
  [7, "データ基盤", "DATA", "データの集約と分析の基盤"],
  [8, "IT企画", "PLN", "IT 部門の計画と予算"],
];

const USERS: [number, string, number, string][] = [
  [1, "佐藤 美咲", 1, "リーダー"],
  [2, "高橋 健", 1, ""],
  [3, "田中 陽菜", 2, ""],
  [4, "伊藤 蓮", 2, "リーダー"],
  [5, "渡辺 結衣", 3, ""],
  [6, "山本 大翔", 3, "リーダー"],
  [7, "中村 葵", 4, ""],
  [8, "小林 湊", 5, "リーダー"],
  [9, "加藤 紗希", 5, ""],
  [10, "吉田 悠真", 6, ""],
  [11, "山田 凛", 6, "リーダー"],
  [12, "松本 颯太", 7, ""],
  [13, "井上 咲良", 7, "リーダー"],
  [14, "木村 拓海", 8, ""],
];

type SeedPost = {
  id: number;
  kind: "problem" | "solution";
  title: string;
  summary: string;
  body: string;
  category: string;
  tools?: string[];
  tags: string[];
  hours?: number;
  stage?: "challenge" | "success" | "lesson";
  problem?: number;
  author: number;
  daysAgo: number;
};

const POSTS: SeedPost[] = [
  {
    id: 1, kind: "problem", author: 2, daysAgo: 41,
    title: "パスワードリセットの問い合わせが月300件。本人確認を毎回手でしている",
    summary: "電話とメールで来るパスワードの問い合わせに、本人確認から手順の案内まで、毎回一人が張り付いている。",
    body: "■ いまのやり方\n電話・メール・Teams で来た依頼に対して、社員番号と上長名で本人確認をし、リセット手順をコピペで案内している。\n\n■ 困っていること\n・月300件ほど。1件あたり5〜10分\n・月曜の朝に集中して、ほかの問い合わせが待たされる\n・案内の文面が人によって違う",
    category: "問い合わせ対応", tags: ["パスワード", "本人確認", "定型対応"], hours: 40,
  },
  {
    id: 2, kind: "solution", author: 1, daysAgo: 30, problem: 1, stage: "success",
    title: "Copilot Studio で、パスワードの一次対応を Teams のボットにした",
    summary: "よくある質問への回答と、セルフリセットの画面への案内をボットに任せた。人が出るのは本人確認が要るときだけ。",
    body: "■ やったこと\n・Copilot Studio で「パスワード」「ロック」などの言葉に反応するトピックを12個作った\n・セルフリセットの画面へ案内し、できなかったときだけ Power Automate で担当者へ回す\n\n■ 結果\n人が受ける件数が月300件 → 約80件に。\n\n■ 横展開するときのポイント\n・トピックの文面はテンプレートとして共有できます（コメントでお声がけください）\n・最初の2週間は、ボットが答えられなかった質問を毎日見て足しました",
    category: "問い合わせ対応", tools: ["Copilot Studio", "Power Automate", "Microsoft Teams"],
    tags: ["パスワード", "チャットボット", "定型対応"], hours: 25,
  },
  {
    id: 3, kind: "problem", author: 3, daysAgo: 35,
    title: "PC キッティングの手順書が古く、毎回口頭で補足している",
    summary: "OS やツールの更新に手順書が追いつかず、新しく入った人が手順書どおりに進めると途中で止まる。",
    body: "■ いまのやり方\nWord の手順書（40ページ）を、気づいた人が気づいたときに直している。\n\n■ 困っていること\n・どこが古いのか、だれにも分からない\n・入社が多い4月と10月に、ベテランが付きっきりになる",
    category: "ドキュメント作成", tags: ["手順書", "キッティング", "入社対応"], hours: 12,
  },
  {
    id: 4, kind: "solution", author: 5, daysAgo: 22, stage: "challenge",
    title: "構成変更の記録から、手順書の更新案を AI に下書きさせる",
    summary: "変更管理のチケットと手順書を突き合わせ、直すべき箇所と書き換え案を Azure OpenAI に出させている。",
    body: "■ やったこと\n・変更管理のチケット（週に20件ほど）を Python で取り出す\n・手順書をページごとに分けて Azure OpenAI に渡し、「このチケットの影響を受ける箇所」と「書き換え案」を出させる\n・人は案を読んで、採るものだけ反映する\n\n■ 結果\n手順書の見直しにかかる時間が、月10時間 → 3時間ほどに。\n\n■ 横展開するときのポイント\nサーバーの手順書で試しています。PC やネットワークの手順書でも、チケットがあれば同じ形で使えるはずです",
    category: "ドキュメント作成", tools: ["Azure OpenAI", "Python"],
    tags: ["手順書", "構成変更", "AI"], hours: 7,
  },
  {
    id: 5, kind: "problem", author: 6, daysAgo: 28,
    title: "夜間バッチのログを、毎朝目視で確認している",
    summary: "60本ほどの夜間処理のログを、朝いちばんに一つずつ開いて、エラーが無いか見ている。",
    body: "■ いまのやり方\n当番が8時半から、ログのフォルダを順に開いて確認する。\n\n■ 困っていること\n・毎朝40分かかる\n・見落としが年に数回あり、気づくのが昼になる",
    category: "監視・運用", tags: ["ログ", "監視", "朝の定型作業"], hours: 20,
  },
  {
    id: 6, kind: "solution", author: 12, daysAgo: 20, problem: 5, stage: "success",
    title: "ログの異常だけを、Teams のチャネルに通知する",
    summary: "ログを Python で毎朝6時に読み、いつもと違う行だけを Teams に流す。人は通知を見るだけになった。",
    body: "■ やったこと\n・ふだん出る行を「いつもの形」として覚えさせ、それと違う行だけを拾う\n・拾った行を Power Automate 経由で Teams のチャネルに投稿\n\n■ 結果\n朝の確認が40分 → 5分。見落としはこの3か月で0件。\n\n■ 横展開するときのポイント\n・最初の1週間は「いつもの形」の学習期間として、通知が多めに出ます\n・ログの置き場所さえ決まっていれば、どのチームでも動きます",
    category: "監視・運用", tools: ["Python", "Power Automate", "Microsoft Teams"],
    tags: ["ログ", "監視", "通知"], hours: 15,
  },
  {
    id: 7, kind: "problem", author: 9, daysAgo: 26,
    title: "退職者アカウントの棚卸しを、5つのシステムの一覧を Excel で突き合わせてやっている",
    summary: "四半期ごとに、人事の退職者一覧と各システムのアカウント一覧を VLOOKUP で照合している。",
    body: "■ いまのやり方\n人事から退職者一覧をもらい、5つのシステムからアカウント一覧を出して、Excel で突き合わせる。\n\n■ 困っていること\n・1回に2日かかる\n・システムごとに ID の形がちがい、手で直している\n・消し漏れが監査で指摘されたことがある",
    category: "アカウント・権限管理", tags: ["棚卸し", "Excel", "退職者", "監査"], hours: 30,
  },
  {
    id: 8, kind: "problem", author: 14, daysAgo: 33,
    title: "各チームの月次報告を、コピペで一つにまとめている",
    summary: "8チームから届く月次報告（Excel と Word が混在）を、部門の報告書に手で貼り合わせている。",
    body: "■ いまのやり方\nメールで届いた報告を開いて、部門の様式に転記する。\n\n■ 困っていること\n・締め日の前後2日がつぶれる\n・様式がチームごとに違う",
    category: "データ集計・レポート", tags: ["月次報告", "集計", "Excel"], hours: 16,
  },
  {
    id: 9, kind: "solution", author: 14, daysAgo: 18, problem: 8, stage: "success",
    title: "SharePoint リスト ＋ Power Automate で、月次報告を自動で集計する",
    summary: "報告を SharePoint リストへの入力に変え、締め日に Power Automate が部門の様式へ流し込む。",
    body: "■ やったこと\n・報告の項目を12個にそろえ、SharePoint リストにした\n・締め日の朝に Power Automate がリストを読み、Excel の様式に書き出してメールで送る\n\n■ 結果\n集計にかかる時間が、月16時間 → 4時間に。\n\n■ 横展開するときのポイント\nリストとフローはパッケージにして渡せます。項目の名前だけ、チームに合わせて替えてください",
    category: "データ集計・レポート", tools: ["SharePoint", "Power Automate", "Excel / VBA"],
    tags: ["月次報告", "集計", "自動化"], hours: 12,
  },
  {
    id: 10, kind: "problem", author: 7, daysAgo: 24,
    title: "機器の保守期限を、台帳とメールの備忘で管理していて、更新漏れが起きる",
    summary: "ルーターやスイッチの保守契約の期限を Excel の台帳で持っているが、だれも期限の前に気づけない。",
    body: "■ いまのやり方\nExcel の台帳に期限を書き、担当が自分の予定表に備忘を入れる。\n\n■ 困っていること\n・担当が替わると、備忘が消える\n・昨年、保守切れのまま3か月使っていた機器があった",
    category: "資産管理", tags: ["保守期限", "台帳", "リマインド"], hours: 6,
  },
  {
    id: 11, kind: "solution", author: 4, daysAgo: 15, stage: "success",
    title: "Power Apps の資産台帳に、期限の30日前のリマインドを付けた",
    summary: "PC とスマホの台帳を Power Apps にして、リース期限の30日前に担当と上長へ Teams で知らせる。",
    body: "■ やったこと\n・Excel の台帳を SharePoint リストに移し、Power Apps で入力と検索の画面を作った\n・毎朝、期限まで30日の機器を拾って Teams で通知\n\n■ 結果\nリースの返却漏れが0件に。台帳を探す時間も減った。\n\n■ 横展開するときのポイント\nPC 用に作りましたが、項目を替えればネットワーク機器やライセンスの期限にも使えるはずです",
    category: "資産管理", tools: ["Power Apps", "Power Automate", "SharePoint"],
    tags: ["台帳", "リマインド", "期限管理"], hours: 5,
  },
  {
    id: 12, kind: "problem", author: 10, daysAgo: 21,
    title: "会議の議事録づくりに、毎回1時間かかる",
    summary: "設計レビューや定例の議事録を、録画を見返しながら書いている。",
    body: "■ いまのやり方\n会議の担当が録画を見返して、決まったことと宿題を Word にまとめる。\n\n■ 困っていること\n・週に5本ほど。若手に偏る\n・まとめ方が人によって違い、あとで探しにくい",
    category: "会議・議事録", tags: ["議事録", "Teams", "要約"], hours: 10,
  },
  {
    id: 13, kind: "solution", author: 11, daysAgo: 16, problem: 12, stage: "success",
    title: "Teams の文字起こしから、議事録を Microsoft 365 Copilot で下書きする（プロンプト集つき）",
    summary: "決定事項・宿題・持ち越しの3つに分けて書かせるプロンプトを、チームでそろえた。",
    body: "■ やったこと\n・会議の文字起こしをオンにするのを、会議の約束ごとにした\n・「決定事項／宿題（担当・期限）／持ち越し」の形で書かせるプロンプトを5種類つくった\n\n■ 結果\n議事録が1本あたり60分 → 15分。形がそろい、探しやすくなった。\n\n■ 横展開するときのポイント\nプロンプト集はこの投稿のコメントに置いてあります。そのまま使えます",
    category: "会議・議事録", tools: ["Microsoft 365 Copilot", "Microsoft Teams"],
    tags: ["議事録", "要約", "プロンプト"], hours: 8,
  },
  {
    id: 14, kind: "problem", author: 2, daysAgo: 19,
    title: "ソフトの利用申請がメールで来て、承認がいまどこにあるか分からない",
    summary: "申請者から「いまどうなっていますか」と聞かれるたびに、メールをさかのぼって探している。",
    body: "■ いまのやり方\n申請者 → 上長 → ヘルプデスク → セキュリティ の順にメールを転送して承認する。\n\n■ 困っていること\n・問い合わせの2割が「申請はいまどこか」\n・転送の途中で止まっていても、だれも気づかない",
    category: "申請・承認", tags: ["申請", "承認フロー", "見える化"], hours: 14,
  },
  {
    id: 15, kind: "solution", author: 8, daysAgo: 12, stage: "challenge",
    title: "セキュリティ例外の申請を、Forms ＋ Power Automate の承認フローにした",
    summary: "申請を Forms で受け、承認の順番を Power Automate で回す。どこで止まっているかは一覧の画面で見える。",
    body: "■ やったこと\n・Forms で申請を受け、Power Automate の承認機能で上長 → セキュリティの順に回す\n・SharePoint リストに状況を書き戻し、申請者も一覧で見られるようにした\n\n■ 結果\n「いまどこですか」の問い合わせがほぼ無くなった。\n\n■ 横展開するときのポイント\n承認の順番と項目を替えれば、ほかの申請にも使えます。フローの中身はお見せできます",
    category: "申請・承認", tools: ["Power Automate", "SharePoint"],
    tags: ["申請", "承認フロー", "見える化"], hours: 6,
  },
  {
    id: 16, kind: "problem", author: 13, daysAgo: 14,
    title: "問い合わせチケットの分類を、人が一件ずつ読んでやっている",
    summary: "ServiceNow に来たチケットを、内容を読んでカテゴリと担当チームに振り分けている。",
    body: "■ いまのやり方\n朝と昼に、当番がチケットを読んで振り分ける。\n\n■ 困っていること\n・振り分けの間違いで、チームの間をチケットが行き来する\n・分類が人によってぶれるので、集計が当てにならない",
    category: "問い合わせ対応", tags: ["チケット", "分類", "AI"], hours: 18,
  },
  {
    id: 17, kind: "solution", author: 13, daysAgo: 6, problem: 16, stage: "challenge",
    title: "Dify で、問い合わせチケットのカテゴリと担当を自動で提案する",
    summary: "チケットの本文を Dify のワークフローに渡し、カテゴリ・担当チーム・理由を出させる。人は確認して確定する。",
    body: "■ やったこと\n・過去のチケット500件から、カテゴリごとの例を20件ずつ選んで Dify の知識に入れた\n・ServiceNow の新しいチケットを1時間ごとに取り出し、提案を書き戻す\n\n■ 結果（試行中）\n提案の8割はそのまま確定できている。\n\n■ 横展開するときのポイント\nカテゴリの一覧と例さえあれば、ほかの窓口でも動きます",
    category: "問い合わせ対応", tools: ["Dify", "Azure OpenAI", "ServiceNow"],
    tags: ["チケット", "分類", "AI"], hours: 12,
  },
  {
    id: 18, kind: "problem", author: 3, daysAgo: 4,
    title: "Microsoft 365 のライセンスの割り当て状況を、毎月手で数えている",
    summary: "部署ごとに何本使っているかを、管理画面から書き出して数えている。",
    body: "■ いまのやり方\n管理画面から CSV を書き出し、Excel のピボットで部署ごとに数える。\n\n■ 困っていること\n・毎月2時間ほど\n・使っていないライセンスの洗い出しまで手が回らない",
    category: "アカウント・権限管理", tags: ["ライセンス", "集計", "Microsoft 365"], hours: 8,
  },
  {
    id: 19, kind: "solution", author: 12, daysAgo: 9, problem: 7, stage: "lesson",
    title: "RPA で5つのシステムの画面からアカウント一覧を取り出そうとしたが、画面が変わるたびに止まった",
    summary: "UiPath で画面を操作して一覧を書き出す形にしたが、システムの更新のたびに直しが要り、続けられなかった。",
    body: "■ やったこと\n・UiPath で、5つのシステムの管理画面からアカウント一覧を書き出すロボットを作った\n\n■ 結果\n最初の月は動いたが、2つのシステムの画面が更新されて止まった。直すのに毎回半日かかった。\n\n■ 学んだこと（次に試す人へ）\n・画面の操作ではなく、各システムの CSV 出力や API で取り出すほうが長持ちする\n・人事の退職者データは、データ基盤に毎日届いているものを使える",
    category: "アカウント・権限管理", tools: ["UiPath"],
    tags: ["棚卸し", "RPA", "退職者"],
  },
];

// [投稿, 人] うちも困っている
const METOO: [number, number][] = [
  [1, 3], [1, 10], [1, 13],
  [3, 5], [3, 7],
  [5, 7], [5, 10],
  [7, 1], [7, 11], [7, 13], [7, 4], [7, 14],
  [8, 1], [8, 6], [8, 8],
  [10, 4], [10, 6],
  [12, 14], [12, 13], [12, 1], [12, 9],
  [14, 4], [14, 14], [14, 10],
  [16, 1], [16, 3],
  [18, 8], [18, 14],
];

// [投稿, 人] うちでも使いたい（成功事例）・参考になった（学び）
const WANT: [number, number][] = [
  [2, 3], [2, 11],
  [6, 6], [6, 7],
  [9, 1], [9, 6], [9, 8], [9, 11],
  [11, 7], [11, 14],
  [13, 1], [13, 9], [13, 14], [13, 13], [13, 4],
  [19, 9], [19, 13],
];

// [投稿, 人] 一緒にやりたい（挑戦中）
const JOIN: [number, number][] = [
  [4, 3], [4, 7],
  [15, 2], [15, 1],
  [17, 2], [17, 1],
];

// [解決策, 入れたチーム, 人, ひとこと, 何日前]
const ADOPTIONS: [number, number, number, string, number][] = [
  [2, 2, 3, "端末のロック解除の問い合わせにも使えた", 12],
  [6, 3, 6, "そのまま入れた。朝の当番がなくなった", 14],
  [6, 4, 7, "機器のログにも使えるように手を入れた", 5],
  [9, 1, 1, "項目を2つ増やして使っています", 10],
  [9, 3, 6, "", 9],
  [9, 5, 8, "", 3],
  [13, 8, 14, "部門会議の議事録に使っています", 11],
  [13, 1, 2, "", 8],
  [13, 7, 12, "プロンプトを1つ足しました（コメント参照）", 6],
  [13, 5, 9, "", 2],
];

// [投稿, 人, 本文, 何日前]
const COMMENTS: [number, number, string, number][] = [
  [2, 3, "端末のロック解除でも同じ悩みがありました。トピックの文面、いただけますか？", 13],
  [2, 1, "もちろんです。チャットで送りますね。", 13],
  [7, 13, "データ基盤側に人事の退職者データが毎日届いています。突き合わせの元として使えるかもしれません。", 20],
  [7, 9, "それは助かります！一度お話しさせてください。", 19],
  [13, 12, "「技術的な論点」を別に書き出すプロンプトを足しました。設計レビューで便利です。", 6],
  [14, 8, "セキュリティ例外の申請で、ちょうど同じ形のものを試しています（SOL-0015）。", 11],
  [16, 2, "ヘルプデスクの一次受付でも試してみたいです。", 5],
];

// 賢者の工房の見本（AI につないでいなくても、企画書の画面が見られるように）
const FORGE: {
  user: number; daysAgo: number; worry: string;
  messages: { role: "user" | "assistant"; content: string }[];
  plan?: Plan; problemPost?: number; solutionPost?: number;
}[] = [
  {
    user: 1, daysAgo: 2,
    worry: "毎週月曜の朝に、先週の問い合わせ件数を Excel で集計して上に報告している。正直めんどう",
    messages: [
      { role: "assistant", content: "月曜の朝の集計、地味に効きますよね。まず状況を教えてください。集計には毎回どのくらい時間がかかっていて、何人で担当していますか？ 元のデータはどこにありますか？" },
      { role: "user", content: "ServiceNow から CSV を出して、ピボットで分類ごとに数えて、グラフを貼って、コメントを書いてメールしてる。1回90分くらい。私ともう1人の交代制。" },
      { role: "assistant", content: "ありがとうございます。では、本当はどうなっていてほしいですか？ 報告を受ける側は、その数字を見て何を決めていますか？" },
      { role: "user", content: "本当は数字は勝手にできていて、私は「先週なにが起きたか」のコメントだけ書きたい。上は増えた分類を見て、応援の人を回すかどうか決めてる。" },
      { role: "assistant", content: "いい整理です。社内では SOL-0009「SharePoint リスト ＋ Power Automate で、月次報告を自動で集計する」（IT企画）が、集計の自動化で月16時間を4時間にしています。CSV を出す所から自動にできるか、ServiceNow の権限は確かめられそうですか？" },
      { role: "user", content: "レポートの定期実行は使えるはず。メールで CSV が届くようにはできると思う。" },
      { role: "assistant", content: "材料がそろいました。「企画書にまとめる」を押すと、あるべき姿・問題・課題・解決策の形に整理します。" },
    ],
    plan: {
      title: "週次の問い合わせ報告を、数字づくりから解放する",
      to_be: "月曜の朝には先週の数字とグラフができあがっていて、担当者は「何が起きたか」のコメントを書くことだけに時間を使っている。上長は増えた分類をすぐ見て、応援の判断ができている。",
      as_is: "毎週月曜に、ServiceNow から CSV を出し、Excel のピボットで分類ごとに数え、グラフを貼ってメールで報告している。1回90分、2人の交代制。",
      problem: "判断に使う数字をつくる作業に、毎週90分の人手がかかっている。肝心のコメントを考える時間が削られ、数字が出るのも月曜の昼になる。",
      issues: ["CSV の取り出しを人の手から外す", "集計とグラフを決まった形で自動でつくる", "コメントを書く場所と、届け方を決める"],
      solutions: [
        {
          name: "定期レポート＋自動集計",
          summary: "ServiceNow の定期レポートで CSV をメールで受け取り、Power Automate が集計して SharePoint のリストとグラフを更新する。",
          approach: "ServiceNow のスケジュールレポートで、毎週月曜6時に CSV を共有メールボックスへ送る。Power Automate が添付を読み、分類ごとの件数を SharePoint リストに書く。グラフは Excel Online か Power BI でリストを参照する。担当者はコメント欄だけを埋めて、Teams に投稿する。",
          tools: ["ServiceNow", "Power Automate", "SharePoint", "Microsoft Teams"],
          steps: [
            { title: "報告の形を決める", detail: "いまの報告から、必ず要る数字とグラフを3つに絞る", duration: "2日" },
            { title: "定期レポートを設定する", detail: "ServiceNow で週次の CSV を共有メールボックスへ送る", duration: "1日" },
            { title: "集計のフローを作る", detail: "SOL-0009 のフローを借りて、CSV からリストへ書き込む形に替える", duration: "1週間" },
            { title: "2週間並べて試す", detail: "手作業の数字と比べて、ずれが無いか確かめる", duration: "2週間" },
          ],
          difficulty: "易しい",
          estimate: { times_per_month: 4, minutes_per_time: 90, people: 1, reduction_rate: 0.75, assumptions: "回数・時間・人数は対話から（週1回・90分・交代制なので1人分）。削減率は、コメントを書く20分ほどが残るとして推定。" },
          impact_path: { output: "週の集計作業が90分 → 20分ほどに", outcome: "月曜の朝いちばんに数字が出て、応援の判断が半日早くなる", impact: "問い合わせの待ち時間が減り、依頼する社員の満足度が上がる" },
          risks: ["ServiceNow の分類が変わると、フローも直す必要がある", "フローの持ち主を2人にしておく"],
        },
        {
          name: "AI がコメントの下書きまで書く",
          summary: "自動集計に加えて、先週との差と目立つチケットから、AI が「何が起きたか」の下書きを書く。",
          approach: "案1の仕組みに、Azure OpenAI でコメントの下書きをつくる手順を足す。増えた分類と、その分類の代表的なチケットの件名を渡し、3行の下書きを作らせる。担当者は直して送るだけ。",
          tools: ["Power Automate", "Azure OpenAI", "SharePoint", "Microsoft Teams"],
          steps: [
            { title: "案1を動かす", detail: "まず自動集計を安定させる", duration: "3週間" },
            { title: "下書きの型を決める", detail: "良かった過去のコメントを5つ選び、型にする", duration: "3日" },
            { title: "下書きを足す", detail: "フローに AI の手順を足し、Teams に下書きとして出す", duration: "1週間" },
          ],
          difficulty: "ふつう",
          estimate: { times_per_month: 4, minutes_per_time: 90, people: 1, reduction_rate: 0.9, assumptions: "案1に加えて、コメントの20分が数分になるとして推定。" },
          impact_path: { output: "週の作業が90分 → 10分ほどに", outcome: "コメントの観点がそろい、週ごとの比較がしやすくなる", impact: "問い合わせの傾向に早く手を打てるようになり、問い合わせそのものが減る" },
          risks: ["チケットの件名に個人の情報が入ることがあるので、渡す項目を絞る", "下書きをそのまま送らず、必ず人が読む"],
        },
      ],
      recommended_index: 0,
      recommended_reason: "SOL-0009 の仕組みを借りられるので、2週間ほどで効果が出せる。AI の下書きは、数字が安定してから足すほうが失敗が小さい。",
      related_case_ids: [9, 6],
      first_step: "今週の報告から、上長が実際に見ている数字とグラフを3つに絞って書き出す。",
      category: "データ集計・レポート",
      tags: ["週次報告", "集計", "ServiceNow", "自動化"],
    },
  },
  {
    user: 10, daysAgo: 1,
    worry: "テスト環境を使いたい人からの依頼が Teams のチャットでばらばらに来て、だれがいつ使っているか分からなくなる",
    messages: [
      { role: "assistant", content: "依頼がばらばらに来ると、管理する側は大変ですね。まず状況を教えてください。依頼は月に何件くらいで、1件の対応にどのくらいかかっていますか？" },
      { role: "user", content: "月に30件くらい。空きを確かめて返事して、表に書くのに1件10分くらい。たまにダブルブッキングする。" },
    ],
  },
];

export function seed(db: Database.Database) {
  const run = db.transaction(() => {
    const team = db.prepare("INSERT INTO teams (id, name, code, mission) VALUES (?, ?, ?, ?)");
    for (const t of TEAMS) team.run(...t);

    const user = db.prepare("INSERT INTO users (id, name, team_id, role) VALUES (?, ?, ?, ?)");
    for (const u of USERS) user.run(...u);

    const teamOf = new Map(USERS.map(([id, , teamId]) => [id, teamId]));
    const ago = (d: number) => `-${d} days`;

    const post = db.prepare(`
      INSERT INTO posts (id, kind, title, summary, body, category, tools, tags, hours, stage,
                         problem_id, author_id, team_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
    for (const p of POSTS) {
      post.run(
        p.id, p.kind, p.title, p.summary, p.body, p.category,
        JSON.stringify(p.tools ?? []), JSON.stringify(p.tags), p.hours ?? null, p.stage ?? null,
        p.problem ?? null, p.author, teamOf.get(p.author), ago(p.daysAgo),
      );
    }

    const reaction = db.prepare("INSERT INTO reactions (post_id, user_id, type) VALUES (?, ?, ?)");
    for (const [p, u] of METOO) reaction.run(p, u, "metoo");
    for (const [p, u] of WANT) reaction.run(p, u, "want");
    for (const [p, u] of JOIN) reaction.run(p, u, "join");

    const adoption = db.prepare(`
      INSERT INTO adoptions (solution_id, team_id, user_id, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now', ?))`);
    for (const [s, t, u, note, d] of ADOPTIONS) adoption.run(s, t, u, note, ago(d));

    const comment = db.prepare(`
      INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, datetime('now', ?))`);
    for (const [p, u, body, d] of COMMENTS) comment.run(p, u, body, ago(d));

    const forge = db.prepare(`
      INSERT INTO forge_sessions (user_id, team_id, worry, messages, plan, problem_post_id, solution_post_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`);
    for (const f of FORGE) {
      forge.run(
        f.user, teamOf.get(f.user), f.worry, JSON.stringify(f.messages), f.plan ? JSON.stringify(f.plan) : null,
        f.problemPost ?? null, f.solutionPost ?? null, ago(f.daysAgo), ago(f.daysAgo),
      );
    }
  });
  run();
}
