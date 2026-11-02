import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 投稿やリアクションは、開くたびに DB から読む。
  // create-next-app が入れる Cache Components（事前生成）は、DB を同期で読むこのアプリでは
  // 古い中身を焼き付けてしまうので使わない。
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
