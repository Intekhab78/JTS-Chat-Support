import React from "react";
import { FlowBuilderContainer } from "./flow-builder/FlowBuilderContainer.jsx";

export default function FlowBuilder({ website, onUpdate }) {
  return <FlowBuilderContainer website={website} onUpdate={onUpdate} />;
}
