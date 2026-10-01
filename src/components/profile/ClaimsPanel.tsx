"use client";

// Every claim on this device, with its photo evidence.
//
// This is the "my collection" surface that the claim buttons feed: what the
// visitor says they hold, which serials, and the pictures they took as proof.
// Nothing here is a valuation — there is no price column because the site has
// no way to know one.

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import ClaimDialog from "@/components/claim/ClaimDialog";
import { useBlobUrls } from "@/lib/useBlobUrl";
import {
  claimById,
  claimsSnapshot,
  NO_CLAIMS,
  removeClaim,
  removeEvidence,
  serialLabel,
  subscribeClaims,
  type Claim,
  type ClaimEntry,
} from "@/lib/claims";

function Thumbs({ claim }: { claim: Claim }) {
  const refs = useMemo(() => claim.evidence.map((e) => e.thumb), [claim.evidence]);
  const urls = useBlobUrls(refs);
  if (claim.evidence.length === 0) return null;
  return (
    <div className="claimThumbs">
      {claim.evidence.map((e, i) => (
        <span className="claimThumb" key={e.id}>
          {urls[i] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={urls[i] as string} alt="实拍证据" />
          ) : (
            <i aria-hidden />
          )}
          <button
            type="button"
            onClick={() => removeEvidence(claim.id, e.id)}
            aria-label="删除这张证据"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function entryOf(c: Claim): ClaimEntry {
  return {
    id: c.id,
    title: c.title,
    player: c.player,
    run: c.run,
    href: c.href,
    scope: c.scope,
    cardNo: c.cardNo,
    variant: c.variant,
  };
}

type Scope = "all" | "card" | "edition";

export default function ClaimsPanel() {
  const claims = useSyncExternalStore(subscribeClaims, claimsSnapshot, () => NO_CLAIMS);
  const [scope, setScope] = useState<Scope>("all");
  const [edit, setEdit] = useState<ClaimEntry | null>(null);

  const shown = claims.filter((c) => (scope === "all" ? true : c.scope === scope));
  const serials = claims.reduce((n, c) => n + c.serials.length, 0);
  const photos = claims.reduce((n, c) => n + c.evidence.length, 0);

  return (
    <div>
      <div className="panelHead">
        <div className="marketTabs">
          {(["all", "card", "edition"] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`chip${scope === s ? " active" : ""}`}
              onClick={() => setScope(s)}
            >
              {s === "all" ? "全部" : s === "card" ? "整卡认领" : "编号认领"}
              <em>
                {s === "all" ? claims.length : claims.filter((c) => c.scope === s).length}
              </em>
            </button>
          ))}
        </div>
        <span className="mut">
          {claims.length} 条认领 · {serials} 个编号 · {photos} 张实拍证据
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: 40 }}>
          <h3 style={{ margin: "0 0 8px" }}>还没有认领任何卡</h3>
          <p className="mut" style={{ margin: "0 0 16px" }}>
            在首页卡谱、版本阶梯或市场详情页点「认领」，可以标记持有的编号并上传实拍照片。
          </p>
          <Link className="btn primary" href="/">
            去卡谱认领 →
          </Link>
        </div>
      ) : (
        <div className="claimGrid">
          {shown.map((c) => (
            <article className="claimItem claimItemRich" key={c.id}>
              <div className="claimItemTop">
                <b>{c.title}</b>
                <span className={`scopeTag ${c.scope}`}>
                  {c.scope === "card" ? "整卡" : "编号"}
                </span>
              </div>
              <span className="mut">
                {c.player}
                {c.run > 1 ? ` · /${c.run}` : ""}
                {c.evidence.length > 0 ? ` · ${c.evidence.length} 张实拍` : ""}
              </span>

              {c.serials.length > 0 &&
                (c.run > 1 ? (
                  <div className="serialChips">
                    {c.serials.map((n) => (
                      <span className="serialChip" key={n}>
                        {serialLabel(n, c.run)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="serialChips">
                    <span className="serialChip">持有 1 张</span>
                  </div>
                ))}

              <Thumbs claim={c} />

              {c.note ? <p className="claimNote">{c.note}</p> : null}

              <div className="watchFoot">
                <Link className="link" href={c.href}>
                  打开 →
                </Link>
                <span className="claimFootBtns">
                  <button type="button" onClick={() => setEdit(entryOf(claimById(c.id) ?? c))}>
                    管理
                  </button>
                  <button type="button" onClick={() => removeClaim(c.id)}>
                    删除
                  </button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {edit ? (
        <ClaimDialog entry={edit} open onClose={() => setEdit(null)} />
      ) : null}
    </div>
  );
}
