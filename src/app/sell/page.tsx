"use client";

// Sell — the upload → Copy → Listing wizard.
//
// Step 1 pick the catalog card + variant
// Step 2 photograph front (and back); EXIF is stripped on ingest
// Step 3 record what makes this a *specific physical* copy: serial, grade, cert
// Step 4 keep it, or list it for sale
//
// Nothing here talks to a server: images land in IndexedDB, copy metadata in
// localStorage, and the listing goes through the same market engine /orders and
// the edition pages already use. That is also why every price shown is a number
// *you* typed — the site never invents one.

import Link from "next/link";
import { useMemo, useState } from "react";
import { getPlayerNames, getPlayerTiers } from "@/lib/catalog";
import { getAdapter, type UserCardCopy } from "@/lib/storage";
import { createListing } from "@/lib/marketEngine";
import UploadDrop, { type Ingested } from "@/components/upload/UploadDrop";
import EffectPicker from "@/components/upload/EffectPicker";
import { CardEffectsViewer } from "@/components/card-effects/CardEffectsViewer";
import { resolveEffectFromVariant } from "@/components/card-effects/effectProfiles";
import type { CardEffectProfile } from "@/components/card-effects/types";
import { serialLabel } from "@/lib/claims";

type Edition = {
  label: string;
  variant: string;
  cardNo: string;
  printRun: number | null;
};

const STEPS = ["card", "photo", "detail", "list"] as const;
type Step = (typeof STEPS)[number];

const GRADERS = ["", "PSA", "BGS", "SGC", "CGC"];
const CONDITIONS = ["", "Mint", "Near mint", "Excellent", "Good", "Played"];

export default function SellPage() {
  const [step, setStep] = useState<Step>("card");
  const [player, setPlayer] = useState("");
  const [edition, setEdition] = useState<Edition | null>(null);
  const [front, setFront] = useState<Ingested | null>(null);
  const [back, setBack] = useState<Ingested | null>(null);
  const [effect, setEffect] = useState<CardEffectProfile>("original");
  const [serial, setSerial] = useState<number>(1);
  const [grader, setGrader] = useState("");
  const [grade, setGrade] = useState("");
  const [cert, setCert] = useState("");
  const [condition, setCondition] = useState("");
  const [mode, setMode] = useState<"keep" | "list">("keep");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<UserCardCopy | null>(null);

  const names = useMemo(() => getPlayerNames(), []);
  const editions = useMemo<Edition[]>(() => {
    if (!player) return [];
    return getPlayerTiers(player)
      .flatMap((t) => t.cards)
      .map((c) => ({
        label: c.label,
        variant: c.variant,
        cardNo: c.cardNo,
        printRun: c.printRun ?? null,
      }));
  }, [player]);

  const variantId = edition ? `edition:${player}:${edition.variant}` : "";
  const run = edition?.printRun ?? null;

  const pickEdition = (e: Edition) => {
    setEdition(e);
    setEffect(resolveEffectFromVariant(e.variant));
    setSerial(1);
  };

  const canPhoto = Boolean(edition);
  const canDetail = canPhoto && Boolean(front);
  const canFinish = canDetail && (mode === "keep" || Number(price) > 0);

  const save = async () => {
    if (!edition || !front) return;
    setBusy(true);
    setError(null);
    try {
      const adapter = getAdapter();
      const id = `C-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      // Three sizes for the front; the back gets its own key namespace so it
      // cannot overwrite the front's "full" blob.
      const [fullRef, , thumbRef] = await Promise.all([
        adapter.putImage(front.result.full, id, "full"),
        adapter.putImage(front.result.card, id, "card"),
        adapter.putImage(front.result.thumb, id, "thumb"),
      ]);
      const backRef = back
        ? await adapter.putImage(back.result.full, `${id}:back`, "full")
        : null;

      const copy = await adapter.upsertCopy({
        id,
        ownerId: "you",
        cardId: edition.cardNo,
        variantId,
        frontImage: fullRef,
        thumbImage: thumbRef,
        backImage: backRef,
        effectProfile: effect,
        effectMode: "flat",
        gradingCompany: grader || null,
        grade: grade || null,
        certNumber: cert || null,
        serialNumber: run ? String(serial) : edition.cardNo,
        serialIndex: run ? serial : null,
        serialTotal: run,
        condition: condition || null,
        verificationStatus: "unverified",
      });
      if (mode === "list") {
        // The form collects yuan; the engine stores integer cents.
        const res = createListing(
          variantId,
          run ? serial : 0,
          Math.round(Number(price) * 100),
          id,
        );
        if (!res.ok) setError(res.error);
      }
      setDone(copy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="wrap">
        <div className="sectionTitle">
          <div>
            <div className="eyebrow">COPY CREATED</div>
            <h1>已创建实体 Copy</h1>
            <p className="mut">
              {run ? `${serialLabel(serial, run)} · ` : ""}
              {edition?.label} · {effect}
              {mode === "list" ? " · 已挂单" : " · 已收入收藏"}
            </p>
          </div>
        </div>
        <div className="dataToolbar">
          <Link className="btn primary" href={`/copy/?id=${done.id}`}>
            查看这张卡 →
          </Link>
          <Link className="btn" href="/my-copies/">
            我的实体卡 →
          </Link>
          <Link className="btn" href="/">
            回到市场 →
          </Link>
        </div>
        {error && <div className="uploadError">{error}</div>}
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="sectionTitle">
        <div>
          <div className="eyebrow">SELLER UPLOAD</div>
          <h1>创建一张实体卡 Copy</h1>
          <p className="mut">
            照片只存在这台设备的浏览器里（IndexedDB），不上传服务器、不进 Git，
            EXIF/GPS 在重编码时即被剥离。
          </p>
        </div>
        <div className="sellSteps">
          {STEPS.map((s, i) => (
            <span key={s} className={`pill ${s === step ? "active" : ""}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      {step === "card" && (
        <section className="panel">
          <h3>1 · 选择卡与版本</h3>
          <div className="sellGrid">
            <label className="field">
              <span>车手 / 对象</span>
              <input
                list="sell-players"
                value={player}
                onChange={(e) => {
                  setPlayer(e.target.value);
                  setEdition(null);
                }}
                placeholder="输入车手名，如 Lewis Hamilton"
              />
              <datalist id="sell-players">
                {names.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
          </div>
          {editions.length > 0 && (
            <div className="variantList">
              {editions.map((e) => (
                <button
                  key={e.variant}
                  type="button"
                  className={`variantBtn ${edition?.variant === e.variant ? "on" : ""}`}
                  onClick={() => pickEdition(e)}
                >
                  <b>{e.variant}</b>
                  <span className="mut">#{e.cardNo}</span>
                  <span className="mut">{e.printRun ? `/${e.printRun}` : "unnumbered"}</span>
                </button>
              ))}
            </div>
          )}
          <div className="sellNav">
            <button
              className="btn primary"
              type="button"
              disabled={!canPhoto}
              onClick={() => setStep("photo")}
            >
              下一步：拍照 →
            </button>
          </div>
        </section>
      )}

      {step === "photo" && (
        <section className="panel">
          <h3>2 · 上传正反面</h3>
          <div className="sellGrid two">
            <UploadDrop label="正面 Front" onIngested={setFront} onClear={() => setFront(null)} />
            <UploadDrop label="反面 Back" onIngested={setBack} onClear={() => setBack(null)} />
          </div>
          {front && (
            <div className="sellPreview">
              <div className="sellPreviewCard">
                <CardEffectsViewer
                  frontUrl={front.previewUrl}
                  backUrl={back?.previewUrl ?? null}
                  effect={effect}
                  autoRotate
                />
              </div>
              <div>
                <EffectPicker value={effect} onChange={setEffect} />
                <p className="mut" style={{ marginTop: 10, fontSize: 11.5 }}>
                  拖拽旋转、滚轮缩放{back ? "、双击或点「反面」翻面" : "；上传反面影像后即可翻面"}。
                  默认效果按版本名自动推断（Gold→烫金、Refractor→折射、SuperFractor→彩虹），可手动改。
                </p>
              </div>
            </div>
          )}
          <div className="sellNav">
            <button className="btn" type="button" onClick={() => setStep("card")}>
              ← 上一步
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={!canDetail}
              onClick={() => setStep("detail")}
            >
              下一步：填写信息 →
            </button>
          </div>
        </section>
      )}

      {step === "detail" && (
        <section className="panel">
          <h3>3 · 这张卡的身份</h3>
          <div className="sellGrid two">
            {run ? (
              <label className="field">
                <span>编号 Serial（1–{run}）</span>
                <input
                  type="number"
                  min={1}
                  max={run}
                  value={serial}
                  onChange={(e) => setSerial(Math.max(1, Math.min(run, Number(e.target.value))))}
                />
                <small className="mut">{serialLabel(serial, run)}</small>
              </label>
            ) : (
              <div className="field">
                <span>编号</span>
                <b>未编号版本 · 卡号 #{edition?.cardNo}</b>
              </div>
            )}
            <label className="field">
              <span>评级公司</span>
              <select value={grader} onChange={(e) => setGrader(e.target.value)}>
                {GRADERS.map((g) => (
                  <option key={g} value={g}>
                    {g || "未评级"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>分数 Grade</span>
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="如 10" />
            </label>
            <label className="field">
              <span>证书号 Cert</span>
              <input value={cert} onChange={(e) => setCert(e.target.value)} placeholder="可留空" />
            </label>
            <label className="field">
              <span>品相 Condition</span>
              <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c || "未填写"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="sellNav">
            <button className="btn" type="button" onClick={() => setStep("photo")}>
              ← 上一步
            </button>
            <button className="btn primary" type="button" onClick={() => setStep("list")}>
              下一步：上架或收藏 →
            </button>
          </div>
        </section>
      )}

      {step === "list" && (
        <section className="panel">
          <h3>4 · 收藏还是挂单</h3>
          <div className="sellGrid two">
            <button
              type="button"
              className={`variantBtn ${mode === "keep" ? "on" : ""}`}
              onClick={() => setMode("keep")}
            >
              <b>Keep in collection</b>
              <span className="mut">先存着，之后可以再挂单</span>
            </button>
            <button
              type="button"
              className={`variantBtn ${mode === "list" ? "on" : ""}`}
              onClick={() => setMode("list")}
            >
              <b>List for sale</b>
              <span className="mut">立刻挂一个固定价</span>
            </button>
          </div>
          {mode === "list" && (
            <label className="field" style={{ maxWidth: 260, marginTop: 12 }}>
              <span>挂单价（元）</span>
              <input
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="520"
              />
              <small className="mut">你自己填的价格；站点不会生成任何市场价格</small>
            </label>
          )}
          {error && <div className="uploadError">{error}</div>}
          <div className="sellNav">
            <button className="btn" type="button" onClick={() => setStep("detail")}>
              ← 上一步
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={!canFinish || busy}
              onClick={save}
            >
              {busy ? "保存中…" : mode === "list" ? "创建并挂单" : "收入收藏"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
