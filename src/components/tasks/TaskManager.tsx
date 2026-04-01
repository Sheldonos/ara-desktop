import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo, Clock, Terminal, ShieldCheck, Plus, Play,
  Pause, Trash2, RefreshCw, CheckCircle2, XCircle,
  AlertCircle, Loader2, ChevronRight, Calendar,
  Zap, Eye, X, Check
} from "lucide-react";
import { useAppStore, type CronJob, type TaskItem } from "../../store";
import { useGateway } from "../../hooks/useGateway";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; dot: string; label: string }> = {
    SCHEDULED:   { color: "text-blue-400 bg-blue-900/30 border-blue-700/40",   dot: "bg-blue-400",    label: "Scheduled" },
    IN_PROGRESS: { color: "text-amber-400 bg-amber-900/30 border-amber-700/40", dot: "bg-amber-400 animate-pulse", label: "In Progress" },
    COMPLETED:   { color: "text-emerald-400 bg-emerald-900/30 border-emerald-700/40", dot: "bg-emerald-400", label: "Completed" },
    FAILED:      { color: "text-red-400 bg-red-900/30 border-red-700/40",      dot: "bg-red-400",     label: "Failed" },
    PENDING:     { color: "text-white/40 bg-white/5 border-white/10",          dot: "bg-white/30",    label: "Pending" },
    ok:          { color: "text-emerald-400 bg-emerald-900/30 border-emerald-700/40", dot: "bg-emerald-400", label: "OK" },
    error:       { color: "text-red-400 bg-red-900/30 border-red-700/40",      dot: "bg-red-400",     label: "Error" },
    skipped:     { color: "text-white/40 bg-white/5 border-white/10",          dot: "bg-white/30",    label: "Skipped" },
  };
  const cfg = configs[status] ?? configs.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Cron job card ────────────────────────────────────────────────────────────

function CronJobCard({ job, onToggle, onDelete, onRunNow }: {
  job: CronJob;
  onToggle: () => void;
  onDelete: () => void;
  onRunNow: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-white/5 border border-white/8 hover:border-white/12 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          job.enabled ? "bg-ara-900/60 border border-ara-700/50" : "bg-white/5 border border-white/10"
        }`}>
          <Clock className={`w-4 h-4 ${job.enabled ? "text-ara-400" : "text-white/30"}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-white truncate">{job.name}</p>
            {job.lastStatus && <StatusBadge status={job.lastStatus} />}
          </div>
          <p className="text-xs text-white/40 font-mono mb-1">{job.schedule}</p>
          <p className="text-xs text-white/50 truncate">{job.message}</p>

          {job.nextRunAt && (
            <p className="text-xs text-white/25 mt-1">
              Next run: {new Date(job.nextRunAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRunNow}
            className="p-1.5 rounded-lg hover:bg-ara-700/50 text-white/30 hover:text-ara-400 transition-all"
            title="Run now"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-all"
            title={job.enabled ? "Pause" : "Resume"}
          >
            {job.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-900/30 text-white/30 hover:text-red-400 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onRetry }: { task: TaskItem; onRetry: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    UTILITY_TRANSFER: <Zap className="w-4 h-4 text-amber-400" />,
    USPS_CHANGE:      <CheckCircle2 className="w-4 h-4 text-blue-400" />,
    DMV_UPDATE:       <ShieldCheck className="w-4 h-4 text-purple-400" />,
    ISP_TRANSFER:     <RefreshCw className="w-4 h-4 text-cyan-400" />,
    INSURANCE_UPDATE: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/3 rounded-xl transition-all group">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        {icons[task.type] ?? <ListTodo className="w-4 h-4 text-white/40" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">{task.description}</p>
        <p className="text-xs text-white/35 mt-0.5">
          {task.vendor && <span className="mr-2">{task.vendor}</span>}
          {new Date(task.updatedAt).toLocaleString()}
        </p>
      </div>
      <StatusBadge status={task.status} />
      {task.status === "FAILED" && (
        <button
          onClick={onRetry}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-ara-700/50 text-white/30 hover:text-ara-400 transition-all"
          title="Retry"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── OS Action approval modal ─────────────────────────────────────────────────

interface PendingAction {
  id: string;
  type: "shell" | "browser" | "file" | "network";
  description: string;
  command: string;
  risk: "low" | "medium" | "high";
  sessionKey?: string;
}

function ActionApprovalModal({
  action,
  onApprove,
  onDeny,
}: {
  action: PendingAction;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const riskColors = {
    low:    "text-emerald-400 bg-emerald-900/30 border-emerald-700/40",
    medium: "text-amber-400 bg-amber-900/30 border-amber-700/40",
    high:   "text-red-400 bg-red-900/30 border-red-700/40",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-surface-50 border border-white/12 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Action Approval Required</h3>
            <p className="text-xs text-white/40">ARA is requesting permission to perform an OS-level action</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-3 rounded-xl bg-white/5 border border-white/8">
            <p className="text-xs text-white/40 mb-1">Description</p>
            <p className="text-sm text-white/80">{action.description}</p>
          </div>

          <div className="p-3 rounded-xl bg-black/30 border border-white/8">
            <p className="text-xs text-white/40 mb-1 font-mono">Command</p>
            <p className="text-sm text-white/70 font-mono break-all">{action.command}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Risk level</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${riskColors[action.risk]}`}>
              {action.risk.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-all flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Deny
          </button>
          <button
            onClick={onApprove}
            className="flex-[2] py-3 rounded-xl bg-ara-600 hover:bg-ara-500 text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Approve & Run
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── New cron job form ────────────────────────────────────────────────────────

function NewCronJobForm({ onSave, onCancel }: {
  onSave: (job: Partial<CronJob>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    schedule: "0 9 * * 1-5",
    message: "",
    agentId: "",
  });

  const PRESETS = [
    { label: "Every weekday at 9am", value: "0 9 * * 1-5" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every day at 8am", value: "0 8 * * *" },
    { label: "Every Monday at 10am", value: "0 10 * * 1" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-ara-900/30 border border-ara-700/40"
    >
      <h4 className="text-sm font-medium text-white mb-3">New Scheduled Job</h4>
      <div className="space-y-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Job name (e.g., Daily status check)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-ara-500"
        />
        <div>
          <input
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
            placeholder="Cron expression (e.g., 0 9 * * 1-5)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/25 focus:outline-none focus:border-ara-500 mb-1.5"
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setForm({ ...form, schedule: p.value })}
                className="text-xs px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Message to send to the agent..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-ara-500 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.schedule || !form.message}
            className="flex-[2] py-2 rounded-xl bg-ara-600 hover:bg-ara-500 disabled:opacity-30 text-white text-sm font-medium transition-all"
          >
            Create Job
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main TaskManager ─────────────────────────────────────────────────────────

type Tab = "tasks" | "cron" | "actions";

const DEMO_TASKS: TaskItem[] = [
  { id: "t1", type: "UTILITY_TRANSFER", status: "COMPLETED", description: "Transfer electricity service to 456 Oak Ave", vendor: "Pacific Gas & Electric", sessionKey: undefined, createdAt: Date.now() - 86400000, updatedAt: Date.now() - 3600000 },
  { id: "t2", type: "USPS_CHANGE",      status: "IN_PROGRESS", description: "Submit USPS mail forwarding request", vendor: "USPS", sessionKey: undefined, createdAt: Date.now() - 72000000, updatedAt: Date.now() - 1800000 },
  { id: "t3", type: "DMV_UPDATE",       status: "SCHEDULED",   description: "Update driver's license address with CA DMV", vendor: "CA DMV", sessionKey: undefined, createdAt: Date.now() - 36000000, updatedAt: Date.now() - 900000 },
  { id: "t4", type: "ISP_TRANSFER",     status: "FAILED",      description: "Transfer internet service to new address", vendor: "Comcast", sessionKey: undefined, createdAt: Date.now() - 28800000, updatedAt: Date.now() - 600000, error: "Account verification failed — retry required" },
  { id: "t5", type: "INSURANCE_UPDATE", status: "SCHEDULED",   description: "Update home insurance policy address", vendor: "State Farm", sessionKey: undefined, createdAt: Date.now() - 14400000, updatedAt: Date.now() - 300000 },
];

const DEMO_CRON: CronJob[] = [
  { id: "c1", name: "Daily move status check", schedule: "0 9 * * *", message: "Check the status of all pending relocation tasks and report any issues.", enabled: true, lastRunAt: Date.now() - 86400000, nextRunAt: Date.now() + 3600000, lastStatus: "ok" },
  { id: "c2", name: "Weekly vendor follow-up", schedule: "0 10 * * 1", message: "Follow up with any vendors that haven't responded in 48 hours.", enabled: true, nextRunAt: Date.now() + 432000000, lastStatus: "ok" },
  { id: "c3", name: "Comcast retry", schedule: "0 */4 * * *", message: "Retry the Comcast service transfer that failed.", enabled: false, lastStatus: "error" },
];

const DEMO_ACTIONS: PendingAction[] = [
  { id: "a1", type: "browser", description: "Open USPS.com and fill out the mail forwarding form", command: "open https://moversguide.usps.com/mgo/disclaimer", risk: "low" },
  { id: "a2", type: "shell",   description: "Download CA DMV address change form", command: "curl -o ~/Downloads/dmv-form.pdf https://www.dmv.ca.gov/portal/file/dl-44-pdf/", risk: "low" },
];

export function TaskManager() {
  const { tasks, setTasks, cronJobs, setCronJobs, updateCronJob, updateTask } = useAppStore();
  const { rpc } = useGateway();
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [showNewCron, setShowNewCron] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [currentAction, setCurrentAction] = useState<PendingAction | null>(null);

  // Load demo data if empty
  const displayTasks = tasks.length > 0 ? tasks : DEMO_TASKS;
  const displayCron = cronJobs.length > 0 ? cronJobs : DEMO_CRON;
  const displayActions = pendingActions.length > 0 ? pendingActions : DEMO_ACTIONS;

  const toggleCronJob = async (job: CronJob) => {
    try {
      await rpc("cron.update", { id: job.id, enabled: !job.enabled });
    } catch {}
    updateCronJob(job.id, { enabled: !job.enabled });
  };

  const deleteCronJob = async (id: string) => {
    try {
      await rpc("cron.delete", { id });
    } catch {}
    setCronJobs(displayCron.filter((j) => j.id !== id));
  };

  const runCronNow = async (job: CronJob) => {
    try {
      await rpc("cron.runNow", { id: job.id });
      updateCronJob(job.id, { lastRunAt: Date.now(), lastStatus: "ok" });
    } catch (err) {
      updateCronJob(job.id, { lastStatus: "error" });
    }
  };

  const createCronJob = async (data: Partial<CronJob>) => {
    try {
      const result = await rpc("cron.create", {
        name: data.name,
        schedule: data.schedule,
        message: data.message,
        agentId: data.agentId || undefined,
        enabled: true,
      }) as { id: string };
      setCronJobs([
        ...displayCron,
        { ...data, id: result.id ?? `local-${Date.now()}`, enabled: true } as CronJob,
      ]);
    } catch {
      setCronJobs([
        ...displayCron,
        { ...data, id: `local-${Date.now()}`, enabled: true } as CronJob,
      ]);
    }
    setShowNewCron(false);
  };

  const retryTask = async (task: TaskItem) => {
    updateTask(task.id, { status: "IN_PROGRESS" });
    try {
      await rpc("tasks.retry", { id: task.id });
    } catch {}
  };

  const approveAction = (action: PendingAction) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== action.id));
    setCurrentAction(null);
    window.ara.notify("Action approved", `Running: ${action.description}`);
  };

  const denyAction = (action: PendingAction) => {
    setPendingActions((prev) => prev.filter((a) => a.id !== action.id));
    setCurrentAction(null);
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "tasks", label: "Tasks", icon: <ListTodo className="w-4 h-4" />, count: displayTasks.filter((t) => t.status !== "COMPLETED").length },
    { id: "cron",  label: "Scheduled", icon: <Calendar className="w-4 h-4" />, count: displayCron.filter((j) => j.enabled).length },
    { id: "actions", label: "Approvals", icon: <ShieldCheck className="w-4 h-4" />, count: displayActions.length },
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/8">
        <h1 className="text-lg font-semibold text-white">Task Manager</h1>
        <p className="text-xs text-white/40 mt-0.5">
          Automated tasks, scheduled jobs, and OS action approvals
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-ara-700/60 text-white border border-ara-600/50"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab.id === "actions"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-ara-700/50 text-ara-300"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Total", value: displayTasks.length, color: "text-white" },
                  { label: "In Progress", value: displayTasks.filter((t) => t.status === "IN_PROGRESS").length, color: "text-amber-400" },
                  { label: "Completed", value: displayTasks.filter((t) => t.status === "COMPLETED").length, color: "text-emerald-400" },
                  { label: "Failed", value: displayTasks.filter((t) => t.status === "FAILED").length, color: "text-red-400" },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 rounded-xl bg-white/5 border border-white/8 text-center">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {displayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onRetry={() => retryTask(task)}
                />
              ))}
            </motion.div>
          )}

          {activeTab === "cron" && (
            <motion.div
              key="cron"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNewCron(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ara-600 hover:bg-ara-500 text-white text-sm font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Job
                </button>
              </div>

              {showNewCron && (
                <NewCronJobForm
                  onSave={createCronJob}
                  onCancel={() => setShowNewCron(false)}
                />
              )}

              {displayCron.map((job) => (
                <CronJobCard
                  key={job.id}
                  job={job}
                  onToggle={() => toggleCronJob(job)}
                  onDelete={() => deleteCronJob(job.id)}
                  onRunNow={() => runCronNow(job)}
                />
              ))}
            </motion.div>
          )}

          {activeTab === "actions" && (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {displayActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="w-10 h-10 text-white/15 mb-3" />
                  <p className="text-sm text-white/40">No pending approvals</p>
                  <p className="text-xs text-white/25 mt-1">
                    ARA will ask for your permission before taking any OS-level action
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-700/30 flex items-center gap-2 text-sm text-amber-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{displayActions.length} action{displayActions.length > 1 ? "s" : ""} waiting for your approval</span>
                  </div>

                  {displayActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/8"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center flex-shrink-0">
                          <Terminal className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-white/80">{action.description}</p>
                          <p className="text-xs text-white/40 font-mono mt-1 break-all">{action.command}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                          action.risk === "high" ? "text-red-400 bg-red-900/30 border-red-700/40" :
                          action.risk === "medium" ? "text-amber-400 bg-amber-900/30 border-amber-700/40" :
                          "text-emerald-400 bg-emerald-900/30 border-emerald-700/40"
                        }`}>
                          {action.risk}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => denyAction(action)}
                          className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Deny
                        </button>
                        <button
                          onClick={() => approveAction(action)}
                          className="flex-[2] py-2 rounded-xl bg-ara-600 hover:bg-ara-500 text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action approval modal */}
      <AnimatePresence>
        {currentAction && (
          <ActionApprovalModal
            action={currentAction}
            onApprove={() => approveAction(currentAction)}
            onDeny={() => denyAction(currentAction)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
