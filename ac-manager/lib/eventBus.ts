import { EventEmitter } from "events";

export interface JobUpdateEvent {
  id: string;
  status: string;
  progress: number;
  error?: string;
  result?: any;
  type?: string;
  target?: string;
}

export interface ServerStatusEvent {
  status: "running" | "stopped" | "unknown";
}

class AppEventBus extends EventEmitter {
  private static instance: AppEventBus;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  static getInstance(): AppEventBus {
    if (!AppEventBus.instance) {
      AppEventBus.instance = new AppEventBus();
    }
    return AppEventBus.instance;
  }

  emitJobUpdate(data: JobUpdateEvent) {
    this.emit("job_update", data);
  }

  emitServerStatus(data: ServerStatusEvent) {
    this.emit("server_status", data);
  }
}

const eventBus = AppEventBus.getInstance();
export default eventBus;
