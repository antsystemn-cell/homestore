import { useState, useEffect, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Globe, Users, Eye, Clock, TrendingDown, Monitor, Smartphone, Tablet, Loader2 } from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
];

type TimeRange = "7d" | "14d" | "30d";

interface AnalyticsData {
  metrics?: {
    visitors?: { total: number; timeseries: { date: string; value: number }[] };
    pageviews?: { total: number; timeseries: { date: string; value: number }[] };
    pageviewsPerVisit?: { total: number; timeseries: { date: string; value: number }[] };
    sessionDuration?: { total: number; timeseries: { date: string; value: number }[] };
    bounceRate?: { total: number; timeseries: { date: string; value: number }[] };
  };
  dimensions?: {
    page?: { value: string; count: number }[];
    source?: { value: string; count: number }[];
    device?: { value: string; count: number }[];
    country?: { value: string; count: number }[];
  };
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}с`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}м ${secs}с`;
};

const deviceIcon = (device: string) => {
  switch (device.toLowerCase()) {
    case "mobile": return <Smartphone className="h-4 w-4" />;
    case "tablet": return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
};

const WebAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = usePersistedState<TimeRange>("admin.webanalytics.range", "7d");

  const fetchAnalytics = async (timeRange: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);

      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];

      const { data: result, error: fnError } = await supabase.functions.invoke("get-analytics", {
        body: { startDate, endDate, granularity: "daily" },
      });

      if (fnError) throw fnError;
      setData(result);
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError("Аналитик мэдээлэл ачаалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const visitorsTimeseries = useMemo(() =>
    data?.metrics?.visitors?.timeseries?.map(t => ({ date: formatDate(t.date), visitors: t.value })) || [],
    [data]
  );

  const pageviewsTimeseries = useMemo(() =>
    data?.metrics?.pageviews?.timeseries?.map(t => ({ date: formatDate(t.date), pageviews: t.value })) || [],
    [data]
  );

  const pageData = useMemo(() =>
    data?.dimensions?.page?.slice(0, 10).map(p => ({ name: p.value === "/" ? "Нүүр хуудас" : p.value, views: p.count })) || [],
    [data]
  );

  const sourceData = useMemo(() =>
    data?.dimensions?.source?.map(s => ({ name: s.value, value: s.count })) || [],
    [data]
  );

  const deviceData = useMemo(() =>
    data?.dimensions?.device?.map(d => ({
      name: d.value === "mobile" ? "Утас" : d.value === "desktop" ? "Компьютер" : "Таблет",
      value: d.count,
      key: d.value,
    })) || [],
    [data]
  );

  const countryData = useMemo(() =>
    data?.dimensions?.country?.slice(0, 8).map(c => ({ name: c.value, value: c.count })) || [],
    [data]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Ачааллаж байна...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-2xl p-8 border border-border text-center space-y-3">
        <Globe className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Аналитик мэдээллийг Lovable тохиргоо хэсгийн Analytics табаас харна уу.
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => fetchAnalytics(range)} className="text-sm text-primary hover:underline">
            Дахин оролдох
          </button>
          <a
            href="https://lovable.dev/projects/76cda098-2c2e-4b20-b1fe-0f10f7df909a/settings?tab=analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Lovable Analytics нээх →
          </a>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Нийт зочин",
      value: data?.metrics?.visitors?.total ?? 0,
      icon: Users,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Хуудас үзэлт",
      value: data?.metrics?.pageviews?.total ?? 0,
      icon: Eye,
      color: "bg-green-500/10 text-green-600",
    },
    {
      label: "Дундаж хугацаа",
      value: formatDuration(data?.metrics?.sessionDuration?.total ?? 0),
      icon: Clock,
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      label: "Bounce Rate",
      value: `${data?.metrics?.bounceRate?.total ?? 0}%`,
      icon: TrendingDown,
      color: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Time range picker */}
      <div className="flex gap-2">
        {([
          { key: "7d" as TimeRange, label: "7 хоног" },
          { key: "14d" as TimeRange, label: "14 хоног" },
          { key: "30d" as TimeRange, label: "30 хоног" },
        ]).map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              range === r.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-card rounded-2xl p-5 border border-border">
              <div className={`h-9 w-9 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-xl font-extrabold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Visitors + Pageviews charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-4">Өдөр тутмын зочид</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorsTimeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="visitors" name="Зочид" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-4">Хуудас үзэлт</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pageviewsTimeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Line type="monotone" dataKey="pageviews" name="Үзэлт" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top pages + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-4">Шилдэг хуудсууд</h3>
          <div className="space-y-2">
            {pageData.map((page, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-foreground truncate max-w-[200px]">{page.name}</span>
                <span className="text-sm font-semibold text-muted-foreground">{page.views}</span>
              </div>
            ))}
            {pageData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Мэдээлэл байхгүй</p>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-4">Трафик эх үүсвэр</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Devices + Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Devices */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-4">Төхөөрөмж</h3>
          <div className="space-y-3">
            {deviceData.map((device, i) => {
              const total = deviceData.reduce((s, d) => s + d.value, 0);
              const pct = total > 0 ? Math.round((device.value / total) * 100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {deviceIcon(device.key)}
                      <span>{device.name}</span>
                    </div>
                    <span className="font-semibold">{device.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {deviceData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Мэдээлэл байхгүй</p>
            )}
          </div>
        </div>

        {/* Countries */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <h3 className="text-sm font-bold mb-4">Улс орон</h3>
          <div className="space-y-2">
            {countryData.map((country, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm">{country.name}</span>
                <span className="text-sm font-semibold text-muted-foreground">{country.value}</span>
              </div>
            ))}
            {countryData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Мэдээлэл байхгүй</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebAnalytics;
