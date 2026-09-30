// /takedown — rights-holder route for removing or correcting third-party card
// imagery.
//
// Phase 12 wires this to a `takedown_requests` table; until then it collects a
// target id and hands off to email. The one thing it must never do is nothing:
// every rights request needs a real channel, and the archive ships 515 scans
// this site does not own.

import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";

export const metadata: Metadata = pageMeta({
  title: "Takedown request — GRIDCARDS",
  description:
    "Report card imagery, data or other content you own and want removed from this prototype.",
  path: "/takedown/",
});

export default function TakedownPage() {
  return (
    <div className="wrap">
      <div className="communityHead">
        <div className="eyebrow">LEGAL · RIGHTS HOLDER</div>
        <h1>Takedown request</h1>
        <p>
          档案库里的实体卡照片由第三方藏家公开投稿，本站不主张其权利。若你是某张影像、
          某条数据或其他内容的权利人并希望移除，请通过下面的渠道提交。
        </p>
      </div>

      <div className="noticeList">
        <section className="infoBox noticeItem">
          <b>提交时需要提供</b>
          <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.7 }}>
            1. 卡片的档案 ID（卡片右下角 <code>#编号</code>，例如 <code>#314</code>）或页面链接；
            <br />
            2. 你对该内容享有权利的简要说明；
            <br />
            3. 可回复的联系邮箱。
          </p>
        </section>

        <section className="infoBox noticeItem">
          <b>提交渠道</b>
          <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.7 }}>
            站点留言与数据表通道在 Phase 12 开放。在此之前，请把上述信息发到站点维护邮箱，
            并在标题注明 <b>TAKEDOWN</b>。收到后会下架对应影像，并保留处理记录。
          </p>
          <p className="mut" style={{ margin: "10px 0 0", fontSize: 11 }}>
            处理时效与留存记录会在 Phase 12 的后台中一并落地。
          </p>
        </section>

        <section className="infoBox noticeItem">
          <b>相关页面</b>
          <p className="mut" style={{ margin: "7px 0 0", lineHeight: 1.7 }}>
            来源与许可状态见 <Link className="link" href="/notices/">Third-party notices</Link>；
            影像清单见 <Link className="link" href="/archive/">1/1 Digital Archive</Link>。
          </p>
        </section>
      </div>
    </div>
  );
}
