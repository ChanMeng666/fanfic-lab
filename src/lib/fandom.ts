// Single source of truth for the (currently sole) supported fandom. The app is
// HSR-only today; centralizing the canonical fandom label + RAG namespace here
// removes magic strings from the save path and the agent, and is the seam a
// future multi-fandom config would grow from. (Marketing prose and the knowledge
// pack keep their own inline copy — those aren't config.)

/** Canonical fandom label stored on a Story and used as the embedding context. */
export const FANDOM_LABEL = "崩坏：星穹铁道";

/** Namespace for the knowledge-base RAG chunks + research cache for this fandom. */
export const FANDOM_RAG_NAMESPACE = "hsr";
