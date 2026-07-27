import { useEffect } from "react";
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

  useEffect(() => {
    if (!socket || typeof onSync !== "function") return;

    const handleDataChange = (payload) => {
      if (!payload) return;
      
      const { entity, websiteId: eventWebId } = payload;
      
      // If entities list is provided, verify match
      if (entities.length > 0 && !entities.includes(entity)) return;

      // If websiteId filter is provided, verify match
      if (websiteId && eventWebId && String(websiteId) !== String(eventWebId)) return;

      // Trigger automatic live data update
      onSync(payload);
    };

    socket.on("data:change", handleDataChange);

    return () => {
      socket.off("data:change", handleDataChange);
    };
  }, [socket, entities, onSync, websiteId]);
}
