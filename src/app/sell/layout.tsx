import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "出售卡牌",
  description:
    "上传正反面照片建立实体卡副本（自动剥离 EXIF / GPS），填写编号与评级后挂单。照片仅保存在本机浏览器。",
  path: "/sell/",
});

export default function SellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
