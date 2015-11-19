ちゃたい in sunpro
==================

## 説明書

主にSunProのSlackで動いているちゃたいのソースコードです。

博多市サーバーからHerokuに移行しました。

## 仕組み

* Herokuの無料プランは1日に18時間しか動かせなくなったので、Process Schedulerを使って、12時間ずつ交代で2つのちゃたいに働いてもらいます。
	- 昼ちゃたい (sunpro-chatai-day): 6:00～18:00担当。早起き。
	- 夜ちゃたい (sunpro-chatai-night): 18:00～6:00担当。夜更かし。
* 各種APIキーなどのsecretな情報は、GoogleドライブのSunPro共有フォルダ上にあるchatai_secret.jsonに格納し、Herokuではそれを取得するのに必要な最小限の認証情報を環境変数として保存しています。
* node.js v4.2 LTS で動いています。ソースコードにES5とES6が混じってるのは気にしないで(真顔)

## インストール

開発環境で動かすには、以下が必要です。

* Node v4.2 LTSとそれに対応するnpm
* Redis
* Googleドライブにアクセス可能なAPIキーと、それを取得するためのSlackのAPIキー
* Googleドライブ上の`chatai_secret.json`
	- 雛形はchatai_secret.example.jsonを参照してください。

これらを用意したら、以下のように環境変数を指定してください。設定例はenv.example.cmdを参照してください。

* `REDIS_URL`: redisの接続先。redisプロトコルのURL推奨
* `GOOGLE_CLIENT_SECRETS`: Google API のクライアント登録をするともらえる`client_secrets.json`の内容を丸ごと
* `SECRET_JSON_ID`: Googleドライブの`chatai_secret.json`の`fileId`
* `SLACK_TOKEN`: Slack APIのトークン

また、node_modulesをインストールしておきます。

```
npm install
```

この状態で以下のコマンドを実行すると、ちゃたいが起動します。

```
npm start
```
