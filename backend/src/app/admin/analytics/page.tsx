"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type UsageStats = {
  totalMessages: number;
  totalThreads: number;
  totalUsers: number;
  totalTokens: number;
  totalCost: number;
  periodStart: string;
  periodEnd: string;
};

type ModelUsage = {
  provider: string;
  model: string;
  messageCount: number;
  tokenCount: number;
  avgLatency: number;
  cost: number;
};

type UserActivity = {
  userId: string;
  userEmail: string;
  userName: string | null;
  messageCount: number;
  threadCount: number;
  lastActive: string;
  totalTokens: number;
};

type DailyUsage = {
  date: string;
  messageCount: number;
  tokenCount: number;
  cost: number;
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const orgId = useMemo(() => (session?.user as any)?.orgId as string | undefined, [session]);

  const [stats, setStats] = useState<UsageStats | null>(null);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range controls
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const canUse = status === "authenticated" && !!orgId;

  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "90d":
        start.setDate(end.getDate() - 90);
        break;
      case "custom":
        start = new Date(customStart);
        end.setTime(new Date(customEnd).getTime());
        break;
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  };

  async function loadAnalytics() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        start,
        end,
        includeModels: "true",
        includeUsers: "true",
        includeDaily: "true"
      });

      const res = await fetch(`/api/admin/orgs/${orgId}/analytics?${params}`, { 
        cache: "no-store" 
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load analytics");

      setStats(data.stats);
      setModelUsage(data.modelUsage || []);
      setUserActivity(data.userActivity || []);
      setDailyUsage(data.dailyUsage || []);
    } catch (e: any) {
      setError(e?.message ?? "Error loading analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canUse) loadAnalytics();
  }, [canUse, dateRange, customStart, customEnd]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (!canUse) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <p>Please sign in to view analytics.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Usage Analytics</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Monitor AI usage, costs, and user activity across your organization.
          </p>
        </header>

        {/* Date Range Controls */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Period:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">From:</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-gray-300">To:</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1 text-sm"
                  />
                </div>
              </>
            )}

            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </section>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          </div>
        )}

        {loading && !stats ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Loading analytics...</p>
          </div>
        ) : stats ? (
          <>
            {/* Overview Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalMessages)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Messages</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalThreads)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Conversations</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalUsers)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalTokens)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalCost)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Cost</div>
              </div>
            </section>

            {/* Model Usage */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Model Usage</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Performance and cost breakdown by AI model</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Provider</th>
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Model</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Messages</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Tokens</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Avg Latency</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelUsage.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No model usage data available
                        </td>
                      </tr>
                    ) : (
                      modelUsage.map((model, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="p-4 text-gray-900 dark:text-white capitalize">{model.provider}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{model.model}</td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{formatNumber(model.messageCount)}</td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{formatNumber(model.tokenCount)}</td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{model.avgLatency.toFixed(0)}ms</td>
                          <td className="p-4 text-right text-green-600 dark:text-green-400">{formatCurrency(model.cost)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* User Activity */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Activity</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Individual user usage and engagement</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-4 font-medium text-gray-900 dark:text-white">User</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Messages</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Conversations</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Tokens</th>
                      <th className="text-right p-4 font-medium text-gray-900 dark:text-white">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userActivity.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No user activity data available
                        </td>
                      </tr>
                    ) : (
                      userActivity.map((user, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="p-4">
                            <div className="text-gray-900 dark:text-white">{user.userName || "Unknown"}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.userEmail}</div>
                          </td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{formatNumber(user.messageCount)}</td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{formatNumber(user.threadCount)}</td>
                          <td className="p-4 text-right text-gray-900 dark:text-white">{formatNumber(user.totalTokens)}</td>
                          <td className="p-4 text-right text-gray-600 dark:text-gray-400">{formatDate(user.lastActive)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Daily Usage Chart */}
            {dailyUsage.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Usage Trend</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Messages and costs over time</p>
                </div>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <div className="flex items-end space-x-2 min-w-full h-[200px]">
                      {dailyUsage.map((day, i) => {
                        const maxMessages = Math.max(...dailyUsage.map(d => d.messageCount));
                        const height = maxMessages > 0 ? (day.messageCount / maxMessages) * 160 : 0;
                        
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 min-w-0">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {formatCurrency(day.cost)}
                            </div>
                            <div
                              className="bg-blue-500 dark:bg-blue-400 rounded-t w-full min-h-[4px] transition-all"
                              style={{ height: `${height}px` }}
                              title={`${formatNumber(day.messageCount)} messages, ${formatCurrency(day.cost)}`}
                            />
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 transform -rotate-45 origin-left">
                              {formatDate(day.date)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
