import { useEffect, useMemo, useState } from "react";
import { UB_DISTRICTS, OTHER_LOCATION } from "@/data/ubDistricts";

type Props = {
  value: string;
  onChange: (composed: string) => void;
};

// Format: "{district}, {khoroo}-р хороо, {detail}" эсвэл "{OTHER}, {detail}"
function parse(value: string) {
  const parts = value.split(",").map((s) => s.trim());
  const district = parts[0] || "";
  let khoroo = "";
  let detail = "";
  const districtMatch = UB_DISTRICTS.find((d) => d.name === district);
  if (districtMatch) {
    // second part like "12-р хороо"
    const kh = parts[1] || "";
    const m = kh.match(/^(\d+)-р хороо$/);
    if (m) {
      khoroo = m[1];
      detail = parts.slice(2).join(", ");
    } else {
      detail = parts.slice(1).join(", ");
    }
  } else if (district === OTHER_LOCATION) {
    detail = parts.slice(1).join(", ");
  } else {
    detail = value;
  }
  return { district: districtMatch ? district : district === OTHER_LOCATION ? OTHER_LOCATION : "", khoroo, detail };
}

export default function AddressSelector({ value, onChange }: Props) {
  const initial = useMemo(() => parse(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [district, setDistrict] = useState(initial.district);
  const [khoroo, setKhoroo] = useState(initial.khoroo);
  const [detail, setDetail] = useState(initial.detail || (initial.district ? "" : value));

  const khorooCount = UB_DISTRICTS.find((d) => d.name === district)?.khoroos ?? 0;

  useEffect(() => {
    let composed = "";
    if (district && district !== OTHER_LOCATION) {
      composed = district;
      if (khoroo) composed += `, ${khoroo}-р хороо`;
      if (detail.trim()) composed += `, ${detail.trim()}`;
    } else if (district === OTHER_LOCATION) {
      composed = `${OTHER_LOCATION}${detail.trim() ? ", " + detail.trim() : ""}`;
    } else {
      composed = detail.trim();
    }
    onChange(composed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, khoroo, detail]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setKhoroo("");
          }}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Дүүрэг сонгох *</option>
          {UB_DISTRICTS.map((d) => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
          <option value={OTHER_LOCATION}>{OTHER_LOCATION}</option>
        </select>
        {district && district !== OTHER_LOCATION && (
          <select
            value={khoroo}
            onChange={(e) => setKhoroo(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Хороо сонгох *</option>
            {Array.from({ length: khorooCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}-р хороо</option>
            ))}
          </select>
        )}
      </div>
      <input
        placeholder={
          district === OTHER_LOCATION
            ? "Аймаг/сум/багийн нэр, дэлгэрэнгүй хаяг *"
            : "Байр, хороолол, орц, тоот *"
        }
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
