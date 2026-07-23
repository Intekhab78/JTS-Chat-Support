import React from "react";
import { Handle, Position } from "@xyflow/react";
import { BaseNode } from "./BaseNode.jsx";
import { MessageSquare, ListTree, FileText, Zap, Network, Clock, Globe, Cpu, Bot, CheckCircle } from "lucide-react";

export function MessageNode(props) {
  const { id, data } = props;
  const options = data.options || [];

  return (
    <BaseNode
      {...props}
      title={id}
      icon={MessageSquare}
      colorClass="bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 text-blue-600"
      badgeText="Message (Text)"
    >
      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-medium italic line-clamp-3">
        "{data.message || "No message configured..."}"
      </div>

      {options.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Buttons</div>
          {options.map((opt, idx) => (
            <div
              key={idx}
              className="relative bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 p-2 rounded-lg text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between"
            >
              <span>{opt.text || `Option ${idx + 1}`}</span>
              <span className="text-[9px] opacity-70 font-mono">➜ {opt.next || "—"}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`option-${idx}`}
                className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative pt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>Goes To: {data.next || "End Chat"}</span>
          <Handle
            type="source"
            position={Position.Right}
            id="next"
            className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
          />
        </div>
      )}
    </BaseNode>
  );
}

export function ButtonGroupNode(props) {
  return <MessageNode {...props} />;
}

export function FormNode(props) {
  const { id, data } = props;
  const fields = data.fields || [];

  return (
    <BaseNode
      {...props}
      title={id}
      icon={FileText}
      colorClass="bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-600"
      badgeText="Form Collection"
    >
      <div className="space-y-1.5">
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
          Fields ({fields.length})
        </div>
        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
          {fields.map((f, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-700 dark:text-slate-200">{f.label}</span>
              <span className="text-[9px] font-mono text-indigo-500">{f.type}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>After Submit ➔ {data.next || "—"}</span>
        <Handle
          type="source"
          position={Position.Right}
          id="next"
          className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
        />
      </div>
    </BaseNode>
  );
}

export function ActionNode(props) {
  const { id, data } = props;
  return (
    <BaseNode
      {...props}
      title={id}
      icon={Zap}
      colorClass="bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-600"
      badgeText="Action Logic"
    >
      <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl space-y-1">
        <div className="text-[9px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
          Action: {data.actionType || "escalate"}
        </div>
        {data.department && (
          <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
            Dept: {data.department}
          </div>
        )}
      </div>
      <div className="relative pt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>Then Go To ➔ {data.next || "—"}</span>
        <Handle
          type="source"
          position={Position.Right}
          id="next"
          className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
        />
      </div>
    </BaseNode>
  );
}

export function ConditionNode(props) {
  const { id, data } = props;
  return (
    <BaseNode
      {...props}
      title={id}
      icon={Network}
      colorClass="bg-purple-50/70 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900/40 text-purple-600"
      badgeText="Condition (IF/THEN)"
    >
      <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg text-[10px] font-bold text-purple-700 dark:text-purple-300 text-center">
        IF {data.conditionType === "business_open" ? "Business Hours Open" : "Live Agents Online"}
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="relative bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-2 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span>IF TRUE ➔ {data.trueNext || "—"}</span>
          <Handle
            type="source"
            position={Position.Right}
            id="trueNext"
            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
          />
        </div>
        <div className="relative bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 p-2 rounded-lg text-[10px] font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <span>ELSE (False) ➔ {data.falseNext || "—"}</span>
          <Handle
            type="source"
            position={Position.Right}
            id="falseNext"
            className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
          />
        </div>
      </div>
    </BaseNode>
  );
}

export function DelayNode(props) {
  const { id, data } = props;
  return (
    <BaseNode
      {...props}
      title={id}
      icon={Clock}
      colorClass="bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900/40 text-cyan-600"
      badgeText="Delay Timer"
    >
      <div className="bg-cyan-500/10 border border-cyan-500/20 p-2.5 rounded-xl text-center text-xs font-bold text-cyan-700 dark:text-cyan-300">
        Wait {data.delaySeconds || 5} Seconds
      </div>
      <div className="relative pt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>Next Node ➔ {data.next || "—"}</span>
        <Handle
          type="source"
          position={Position.Right}
          id="next"
          className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
        />
      </div>
    </BaseNode>
  );
}

export function WebhookNode(props) {
  const { id, data } = props;
  return (
    <BaseNode
      {...props}
      title={id}
      icon={Globe}
      colorClass="bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40 text-indigo-600"
      badgeText="Webhook Trigger"
    >
      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 text-[10px] font-mono truncate">
        {data.httpMethod || "POST"} {data.webhookUrl || "https://..."}
      </div>
      <div className="relative pt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>Next ➔ {data.next || "—"}</span>
        <Handle
          type="source"
          position={Position.Right}
          id="next"
          className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
        />
      </div>
    </BaseNode>
  );
}

export function ApiRequestNode(props) {
  return <WebhookNode {...props} />;
}

export function AiResponseNode(props) {
  const { id, data } = props;
  return (
    <BaseNode
      {...props}
      title={id}
      icon={Bot}
      colorClass="bg-violet-50/70 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/40 text-violet-600"
      badgeText="AI Smart Agent"
    >
      <div className="bg-violet-500/10 border border-violet-500/20 p-2.5 rounded-xl space-y-1">
        <div className="text-[9px] font-black uppercase text-violet-600">Model: {data.aiModel || "gpt-4o-mini"}</div>
        <div className="text-[10px] italic line-clamp-2 text-slate-600 dark:text-slate-300">"{data.prompt || "Default Prompt"}"</div>
      </div>
      <div className="relative pt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>Next ➔ {data.next || "—"}</span>
        <Handle
          type="source"
          position={Position.Right}
          id="next"
          className="!w-3 !h-3 !bg-violet-500 !border-2 !border-white dark:!border-slate-900 !-right-1.5"
        />
      </div>
    </BaseNode>
  );
}

export function EndNode(props) {
  const { id } = props;
  return (
    <BaseNode
      {...props}
      title={id}
      icon={CheckCircle}
      colorClass="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200"
      badgeText="End Chat Flow"
    >
      <div className="text-center py-2 text-[11px] font-bold text-slate-500">
        Chat Session Terminates Here
      </div>
    </BaseNode>
  );
}

export const nodeTypes = {
  message: MessageNode,
  button_group: ButtonGroupNode,
  form: FormNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
  webhook: WebhookNode,
  api_request: ApiRequestNode,
  ai_response: AiResponseNode,
  end: EndNode
};
