import Link from "next/link";
import { CardFace, RarityBadge } from "./CardArt";
import { money, pct } from "@/market/format";
import type { MarketItem } from "@/market/types";

// Grid tile. Grid views never touch WebGL — the hover depth is pure CSS
// (perspective + a sheen sweep), which keeps a 24-tile page at 60fps and
// degrades gracefully under prefers-reduced-motion.

export default function CardTile({
  item,
  footer,
}: {
  item: MarketItem;
  footer?: React.ReactNode;
}) {
  return (
    <Link href={`/market/items/${item.id}/`} className="mTile">
      <div className="mTileArt">
        <CardFace
          art={item.art}
          image={item.image}
          rarity={item.rarity}
          title={`${item.title} · ${item.parallel}`}
          effect={item.effect}
        />
        <span className="mTileSerial">
          {item.printRun ? `${item.printRun}` : "—"}
        </span>
      </div>
      <div className="mTileBody">
        <div className="mTileTop">
          <b title={item.title}>{item.title}</b>
          <RarityBadge tier={item.rarity} size="sm" />
        </div>
        <span className="mTileSub">{item.parallel}</span>
        <div className="mTileFoot">
          <span className="mTilePrice">
            <em>地板价</em>
            <b>{money(item.floorCents)}</b>
          </span>
          <span className={`mTileDelta ${item.change24h >= 0 ? "up" : "down"}`}>
            {pct(item.change24h)}
          </span>
        </div>
        <div className="mTileMeta">
          #{item.cardNumber} · 在售 {item.listedCount}
        </div>
        {footer}
      </div>
    </Link>
  );
}
