import { useState } from "react";
import { headshotUrl } from "./stats";

export default function Face({ id, name, ring, size = 40 }: { id: number; name: string; ring?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <span className="face" style={{ width: size, height: size, borderColor: ring }}>
      {failed ? (
        initials
      ) : (
        <img src={headshotUrl(id)} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
