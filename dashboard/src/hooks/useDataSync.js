import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext.jsx";

/**
 * useDataSync Hook
 * Listens for real-time `data:change` socket events from the backend.
 * Automatically executes the `onSync` callback when a matching entity/action changes.
 * 
 * @param {Object} options
 * @param {Array<string>} options.entities - List of entities to listen for (e.g. ["customer", "crm", "website", "ticket"])
 * @param {Function} options.onSync - Callback function to trigger data refetch (e.g. loadData)
 * @param {string} [options.websiteId] - Optional website ID to filter events for a specific website
 */
export function useDataSync({ entities = [], onSync, websiteId = null }) {
  const socket = useSocket();
  const onSyncRef = useRef(onSync);
  const entitiesRef = useRef(entities);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    entitiesRef.current = Array.isArray(entities) ? entities : [];
  }, [entities]);

  useEffect(() => {
    if (!socket) return;

    const handleDataChange = (payload) => {
      if (!payload || typeof onSyncRef.current !== "function") return;
      
      const { entity, websiteId: eventWebId } = payload;
      const activeEntities = entitiesRef.current;
      
      // If entities list is provided, verify match
      if (activeEntities.length > 0 && !activeEntities.includes(entity)) return;

      // If websiteId filter is provided, verify match
      if (websiteId && eventWebId && String(websiteId) !== String(eventWebId)) return;

      // Trigger automatic live data update
      onSyncRef.current(payload);
    };

    socket.on("data:change", handleDataChange);

    return () => {
      socket.off("data:change", handleDataChange);
    };
  }, [socket, websiteId]);
}
