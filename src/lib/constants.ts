/** Marker appended to the generation stream when it fails midway. */
export const STREAM_ERROR = "\u0000ERROR:";
/** Appended after the JSON when the stream ends: the tokens it used */
export const STREAM_USAGE = "\u0000USAGE:";

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

export const DEFAULT_MODEL = "gpt-5-mini";

/** The whole carousel: cover + content slides + call to action */
export const MIN_SLIDES = 4;
export const MAX_SLIDES = 13;

export const CTA_ACTIONS = ["save", "like", "comment", "share", "follow"] as const;
