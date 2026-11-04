import { graphService, type GraphService } from "./graphService";
import { createMusicBrainzGraphService } from "./musicBrainzGraphService";

export type GraphMode = "demo" | "live";

const services = new Map<GraphMode, GraphService>();

export function getGraphService(mode: GraphMode): GraphService {
  let service = services.get(mode);
  if (!service) {
    service =
      mode === "demo" ? graphService : createMusicBrainzGraphService();
    services.set(mode, service);
  }
  return service;
}
