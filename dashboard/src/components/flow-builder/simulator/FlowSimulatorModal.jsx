import React, { useState, useEffect } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { convertReactFlowToDict } from "../utils/graphConverter.js";
import { Bot, RefreshCw, X, Send, User, CheckCircle2 } from "lucide-react";

export function FlowSimulatorModal() {
  const showSimulator = useFlowStore((s) => s.showSimulator);
  const setShowSimulator = useFlowStore((s) => s.setShowSimulator);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const [messages, setMessages] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState("root");
  const [formData, setFormData] = useState({});

  const flowDict = convertReactFlowToDict(nodes, edges);

  const restartSimulator = () => {
    setMessages([]);
    setFormData({});
    setCurrentNodeId("root");
  };

  useEffect(() => {
    if (showSimulator) {
      restartSimulator();
    }
  }, [showSimulator]);

  useEffect(() => {
    if (!showSimulator || !currentNodeId || !flowDict[currentNodeId]) return;

    const node = flowDict[currentNodeId];

    // Push bot message
    const botMsg = {
      id: Date.now(),
      sender: "bot",
      type: node.type,
      text: node.message || (node.type === "action" ? `Executing Action: ${node.actionType}` : ""),
      options: node.options || [],
      fields: node.fields || [],
      nodeId: currentNodeId
    };

    setMessages((prev) => [...prev, botMsg]);

    // Handle auto-advance for Action, Delay, Webhook, AI
    if (node.type === "action" || node.type === "delay" || node.type === "webhook" || node.type === "ai_response") {
      const timer = setTimeout(() => {
        if (node.next && flowDict[node.next]) {
          setCurrentNodeId(node.next);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }

    // Handle Condition auto-advance
    if (node.type === "condition") {
      const isTrue = true; // Simulator simulates TRUE condition path
      const target = isTrue ? node.trueNext : node.falseNext;
      const timer = setTimeout(() => {
        if (target && flowDict[target]) {
          setCurrentNodeId(target);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentNodeId, showSimulator]);

  if (!showSimulator) return null;

  const handleOptionClick = (opt) => {
    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: opt.text }]);
    if (opt.next && flowDict[opt.next]) {
      setCurrentNodeId(opt.next);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: "Submitted form details." }]);
    const currNode = flowDict[currentNodeId];
    if (currNode?.next && flowDict[currNode.next]) {
      setCurrentNodeId(currNode.next);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-white/10 flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">Flow Simulator</h3>
              <p className="text-[10px] text-indigo-100 font-medium">Testing live chatbot logic</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={restartSimulator} title="Restart Flow" className="p-1.5 hover:bg-white/20 rounded-lg">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setShowSimulator(false)} className="p-1.5 hover:bg-white/20 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs space-y-2 ${
                  msg.sender === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-xs"
                }`}
              >
                {msg.text && <p>{msg.text}</p>}

                {/* Form fields if form type */}
                {msg.sender === "bot" && msg.type === "form" && msg.nodeId === currentNodeId && (
                  <form onSubmit={handleFormSubmit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {msg.fields.map((f, fIdx) => (
                      <div key={fIdx} className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">{f.label}</label>
                        <input
                          type={f.type || "text"}
                          required={f.required}
                          value={formData[f.name] || ""}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                      </div>
                    ))}
                    <button type="submit" className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold mt-2">
                      Submit Form
                    </button>
                  </form>
                )}

                {/* Buttons options */}
                {msg.sender === "bot" && msg.nodeId === currentNodeId && msg.options && msg.options.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {msg.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionClick(opt)}
                        className="w-full text-left p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-bold text-xs transition-all border border-indigo-100 dark:border-indigo-900/40"
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
