import Link from "next/link";

export const metadata = {
  title: "Not found — GRIDCARDS",
};

export default function NotFound() {
  return (
    <div className="wrap">
      <div className="notFound">
        <div className="eyebrow">ERROR 404</div>
        <h1>
          这条赛道
          <br />
          不在卡谱里
        </h1>
        <p>
          页面不存在，或者这条 URL 指向的卡／版本还没有被收录进 2020 Topps Chrome
          F1 的 checklist。按 ⌘ K 直接搜车手名、卡号或分区。
        </p>
        <div className="actionRow" style={{ maxWidth: 460 }}>
          <Link className="btn primary" href="/">
            Back to market
          </Link>
          <Link className="btn" href="/archive/">
            1/1 Archive
          </Link>
        </div>
      </div>
    </div>
  );
}
