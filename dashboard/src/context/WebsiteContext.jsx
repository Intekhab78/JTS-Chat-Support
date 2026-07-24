import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const WebsiteContext = createContext(null);

export function WebsiteProvider({ children }) {
  const { user } = useAuth();
  const [websites, setWebsites] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteIdState] = useState(() => {
    return localStorage.getItem("jts_selected_website_id") || "";
  });
  const [loading, setLoading] = useState(false);

  const fetchWebsites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api("/api/websites");
      setWebsites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load websites for context:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, [user?._id]);

  const setSelectedWebsiteId = (id) => {
    const newId = id || "";
    setSelectedWebsiteIdState(newId);
    if (newId) {
      localStorage.setItem("jts_selected_website_id", newId);
    } else {
      localStorage.removeItem("jts_selected_website_id");
    }
  };

  const selectedWebsite = websites.find(w => w._id === selectedWebsiteId) || null;

  return (
    <WebsiteContext.Provider value={{
      websites,
      selectedWebsiteId,
      setSelectedWebsiteId,
      selectedWebsite,
      loading,
      refreshWebsites: fetchWebsites
    }}>
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (!context) {
    return {
      websites: [],
      selectedWebsiteId: "",
      setSelectedWebsiteId: () => {},
      selectedWebsite: null,
      loading: false,
      refreshWebsites: () => {}
    };
  }
  return context;
}
