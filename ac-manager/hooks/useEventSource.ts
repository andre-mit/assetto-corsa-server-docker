"use client";

import { useEffect, useRef, useCallback } from "react";

type SSEEventHandler = (data: any) => void;

interface UseEventSourceOptions {
  onJobUpdate?: SSEEventHandler;
  onServerStatus?: SSEEventHandler;
}

export function useEventSource(options: UseEventSourceOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30_000;

  const connect = useCallback(() => {
    const es = new EventSource("/api/events");

    es.addEventListener("job_update", (e) => {
      try {
        const data = JSON.parse(e.data);
        optionsRef.current.onJobUpdate?.(data);
      } catch {}
    });

    es.addEventListener("server_status", (e) => {
      try {
        const data = JSON.parse(e.data);
        optionsRef.current.onServerStatus?.(data);
      } catch {}
    });

    es.addEventListener("ping", () => {
      // Heartbeat received — connection is healthy
    });

    es.onopen = () => {
      reconnectAttempts.current = 0;
    };

    es.onerror = () => {
      es.close();

      // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttempts.current),
        maxReconnectDelay
      );
      reconnectAttempts.current++;

      setTimeout(() => {
        connect();
      }, delay);
    };

    return es;
  }, []);

  useEffect(() => {
    const es = connect();
    return () => {
      es.close();
    };
  }, [connect]);
}
